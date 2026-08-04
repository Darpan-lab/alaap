import express from 'express';
import { WebhookReceiver } from 'livekit-server-sdk';
import { activeVoiceRooms } from '../socket/callHandler.js';

const router = express.Router();

// Initialize the WebhookReceiver using the same credentials used to create tokens
const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret_key_alaap_livekit_2026_x987';
const receiver = new WebhookReceiver(apiKey, apiSecret);

/**
 * POST /api/webhooks/livekit
 * Endpoint to receive LiveKit room events (participant_joined, participant_left, room_finished).
 * Requires raw body string for signature validation.
 */
router.post('/livekit', express.raw({ type: 'application/webhook+json' }), async (req, res) => {
  try {
    // req.body is a Buffer/String here because of express.raw()
    const event = await receiver.receive(req.body.toString('utf8'), req.get('Authorization'));
    console.log(`[LiveKit Webhook] Full Event Payload:`, JSON.stringify(event, null, 2));
    console.log(`[LiveKit Webhook] Event: ${event.event} for room: ${event.room?.name}`);

    const roomName = event.room?.name;
    if (!roomName || !roomName.startsWith('chat_')) {
      return res.status(200).send();
    }
    const chatId = roomName.replace('chat_', '');

    if (!activeVoiceRooms.has(chatId)) {
      activeVoiceRooms.set(chatId, new Set());
    }
    const participantSet = activeVoiceRooms.get(chatId);

    if (event.event === 'participant_joined') {
      participantSet.add(event.participant.identity);
    } else if (event.event === 'participant_left') {
      participantSet.delete(event.participant.identity);
      if (participantSet.size === 0) activeVoiceRooms.delete(chatId);
    } else if (event.event === 'room_finished') {
      activeVoiceRooms.delete(chatId);
    }

    // Broadcast updated state to all connected clients
    if (req.io) {
      const count = activeVoiceRooms.has(chatId) ? activeVoiceRooms.get(chatId).size : 0;
      req.io.emit('call:room_status_changed', {
        chatId,
        isActive: count > 0,
        count
      });
    }

    res.status(200).send();
  } catch (error) {
    console.error('[LiveKit Webhook] Signature validation failed:', error.message);
    res.status(401).send();
  }
});

export default router;
