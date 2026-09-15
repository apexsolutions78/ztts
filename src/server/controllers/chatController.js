import { routeQuery } from '../services/aiRouter.js';
import { logAuditAction } from '../models/index.js';

export async function getChatPage(req, res, next) {
  try {
    res.render('admin/chat/index', {
      title: 'AI Travel Assistant'
    });
  } catch (error) {
    next(error);
  }
}

export async function postChatMessage(req, res, next) {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const result = await routeQuery(message.trim(), {
      booking: req.session.lastBooking || null
    });

    // Log the interaction
    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'AI_CHAT',
      entity_type: 'chat',
      entity_id: null,
      details: `Intent: ${result.intent} | Provider: ${result.provider} | Query: ${message.substring(0, 100)}`
    });

    res.json({
      success: true,
      response: result.response,
      intent: result.intent,
      provider: result.provider,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('[Chat] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process your message. Please try again.'
    });
  }
}
