import { Ollama } from 'ollama';
import axios from 'axios';

const ollama = new Ollama({ host: 'http://localhost:11434' });
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const INTENT_PATTERNS = {
  visa_research: ['visa', 'visa requirements', 'do i need visa', 'documents for visa', 'visa process', 'visa fee', 'embassy'],
  travel_planning: ['itinerary', 'places to visit', 'best time to visit', 'what to pack', 'travel tips', 'things to do', 'tourist spots', 'how many days'],
  flight_status: ['flight status', 'is my flight', 'flight delayed', 'flight time', 'track flight', 'flight number'],
  booking_query: ['my booking', 'booking status', 'cancel booking', 'change booking', 'refund', 'ticket number', 'pnr'],
  weather: ['weather', 'temperature', 'forecast', 'rain', 'what to wear', 'climate', 'season'],
  general: []
};

const SYSTEM_PROMPTS = {
  visa_research: 'You are a visa research assistant for a Pakistan-based travel agency. Provide accurate visa requirements. If unsure, recommend checking official embassy websites. Be concise.',
  travel_planning: 'You are a travel planning expert. Create detailed itineraries, suggest best times to visit, packing tips. Focus on popular destinations for Pakistani travelers (Dubai, Turkey, Europe, Saudi Arabia).',
  flight_status: 'You are a flight information assistant. Explain how to check flight status. If user provides flight number, guide them to track it on airline websites or flight tracking apps.',
  booking_query: 'You are a customer support assistant for a travel agency. Help with booking changes, cancellations, refunds. Be empathetic and professional. Ask for booking reference if needed.',
  weather: 'You are a weather assistant. Provide general climate info and packing recommendations. Suggest checking weather apps for current forecasts.',
  general: 'You are a friendly travel assistant for a Pakistan-based air ticketing company called Zahabia Travel & Tourism. Answer questions about travel, tourism, flights, hotels. Be informative and friendly.'
};

const MODEL_STRATEGY = {
  visa_research: 'gemini',
  travel_planning: 'gemini',
  flight_status: 'groq',
  booking_query: 'groq',
  weather: 'groq',
  general: 'groq'
};

export async function routeQuery(query, context = {}) {
  const intent = classifyIntent(query);
  const strategy = MODEL_STRATEGY[intent] || 'local';
  let response, provider;

  try {
    let fullPrompt = `${SYSTEM_PROMPTS[intent]}\n\nUser: ${query}`;
    if (context.booking) {
      fullPrompt += `\n\nCustomer's booking:\n- Ref: ${context.booking.ref_code}\n- Route: ${context.booking.origin_city || 'N/A'} → ${context.booking.destination_city || 'N/A'}\n- Status: ${context.booking.status}`;
    }

    if (strategy === 'gemini' && GEMINI_API_KEY) {
      response = await queryGemini(fullPrompt);
      provider = 'Gemini (Free)';
    } else if (strategy === 'groq' && GROQ_API_KEY) {
      const model = intent === 'flight_status' || intent === 'booking_query' ? 'llama-3.2-3b-preview' : 'llama-3.1-8b-instant';
      response = await queryGroq(fullPrompt, model);
      provider = `Groq ${model}`;
    } else {
      const model = intent === 'flight_status' || intent === 'booking_query' ? 'llama3.2:3b' : 'mistral:7b';
      response = await queryOllama(fullPrompt, model);
      provider = `${model} (Local)`;
    }
  } catch (err) {
    console.error('[AI Router] Primary error:', err.message);
    try {
      // Fallback chain: try providers that weren't already attempted
      if (provider !== 'Groq' && GROQ_API_KEY) {
        const fbModel = intent === 'flight_status' || intent === 'booking_query' ? 'llama-3.2-3b-preview' : 'llama-3.1-8b-instant';
        response = await queryGroq(`${SYSTEM_PROMPTS[intent]}\n\n${query}`, fbModel);
        provider = `Groq ${fbModel} (Fallback)`;
      } else if (provider !== 'Gemini' && GEMINI_API_KEY) {
        response = await queryGemini(`${SYSTEM_PROMPTS[intent]}\n\n${query}`);
        provider = 'Gemini (Fallback)';
      } else {
        response = await queryHuggingFace(`${SYSTEM_PROMPTS[intent]}\n\n${query}`);
        provider = 'Mistral (Hugging Face Free)';
      }
    } catch {
      response = 'I apologize, but I\'m having trouble processing your request. Please try again or contact support.';
      provider = 'Fallback';
    }
  }

  return { intent, response, provider, metadata: { model: provider, intent } };
}

function classifyIntent(query) {
  const lowerQuery = query.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_PATTERNS)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) return intent;
  }
  return 'general';
}

async function queryGemini(prompt) {
  const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
  }, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 });
  return response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
}

async function queryGroq(prompt, model = 'llama-3.1-8b-instant') {
  const response = await axios.post(GROQ_URL, {
    model,
    messages: [
      { role: 'system', content: 'You are a helpful travel assistant for Zahabia Travel & Tourism.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 1024
  }, {
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 8000
  });
  return response.data.choices?.[0]?.message?.content || 'No response';
}

async function queryOllama(prompt, model = 'mistral:7b') {
  const response = await ollama.chat({
    model,
    messages: [{ role: 'user', content: prompt }],
    stream: false,
    options: { temperature: 0.7, num_predict: 1024 }
  });
  return response.message.content || 'No response';
}

async function queryHuggingFace(prompt) {
  const HF_API_KEY = process.env.HF_API_KEY;
  if (!HF_API_KEY) throw new Error('HF key not configured');
  const response = await axios.post(
    'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
    { inputs: prompt },
    { headers: { 'Authorization': `Bearer ${HF_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 15000 }
  );
  return response.data?.[0]?.generated_text || 'No response';
}

export function extractFlightNumber(query) {
  const match = query.match(/([A-Z]{2,3}[- ]?\d{3,4})/i);
  return match ? match[1].replace(/[- ]/g, '').toUpperCase() : null;
}

export function extractLocation(query) {
  const patterns = [/weather in ([a-z\s]+)/i, /([a-z\s]+) weather/i, /forecast for ([a-z\s]+)/i];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}
