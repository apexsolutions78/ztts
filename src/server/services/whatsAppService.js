import { env } from '../config/env.js';

export async function sendWhatsApp({ to, message }) {
  if (!env.whatsapp.apiToken || !env.whatsapp.phoneNumberId) {
    console.log('[Apex Solutions WhatsApp] WhatsApp API not configured – logging message only:', { to, message: message.substring(0, 80) });
    return { success: true, simulated: true };
  }

  const url = `https://graph.facebook.com/v18.0/${env.whatsapp.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.whatsapp.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/[^0-9]/g, ''),
        type: 'text',
        text: { body: message }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Apex Solutions WhatsApp] API error:', data);
      return { success: false, error: data.error?.message || 'WhatsApp API error' };
    }

    console.log('[Apex Solutions WhatsApp] Sent:', data.messages?.[0]?.id);
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error('[Apex Solutions WhatsApp] Send failed:', error.message);
    return { success: false, error: error.message };
  }
}

export function buildETicketWhatsAppMessage({ customerName, bookingRef, airline, flightNumber, origin, destination, departureDate, cabinClass, portalUrl }) {
  return [
    `*ZAHABIA TRAVEL & TOURISM*`,
    ``,
    `Hello ${customerName},`,
    ``,
    `Your E-Ticket has been issued!`,
    ``,
    `*PNR:* ${bookingRef}`,
    `*Flight:* ${airline} ${flightNumber}`,
    `*Route:* ${origin} → ${destination}`,
    `*Departure:* ${new Date(departureDate).toLocaleString()}`,
    `*Class:* ${cabinClass}`,
    ``,
    `View your full e-ticket:`,
    `${portalUrl}`,
    ``,
    `For support: support@zahabiatravel.com`,
    `_Powered by Apex Solutions_`
  ].join('\n');
}

export function buildTourConfirmationWhatsAppMessage({ customerName, tourTitle, destination, travelDate, totalTravelers, totalAmount, portalUrl }) {
  return [
    `*ZAHABIA TRAVEL & TOURISM*`,
    ``,
    `Hello ${customerName},`,
    ``,
    `Your tour booking is confirmed!`,
    ``,
    `*Tour:* ${tourTitle}`,
    `*Destination:* ${destination}`,
    `*Travel Date:* ${travelDate}`,
    `*Travelers:* ${totalTravelers}`,
    `*Total:* $${Number(totalAmount).toFixed(2)}`,
    ``,
    `View booking details:`,
    `${portalUrl}`,
    ``,
    `For support: support@zahabiatravel.com`,
    `_Powered by Apex Solutions_`
  ].join('\n');
}
