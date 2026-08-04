import express from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { auth } from '../middleware/auth.js';
import Chat from '../models/Chat.js';
import { activeVoiceRooms } from '../socket/callHandler.js';

const router = express.Router();

router.get('/debug-rooms', (req, res) => {
  const result = {};
  activeVoiceRooms.forEach((participantSet, chatId) => {
    result[chatId] = Array.from(participantSet);
  });
  res.json(result);
});

/**
 * POST /api/calls/token
 * Generates a LiveKit access token for joining a voice call room associated with a chat.
 */
router.post('/token', auth, async (req, res) => {
  try {
    const { chatId, roomName } = req.body;
    if (!chatId && !roomName) {
      return res.status(400).json({ error: 'chatId or roomName is required.' });
    }

    const targetRoom = roomName || `chat_${chatId}`;

    // If chatId is provided, verify user is a member of the chat
    if (chatId) {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found.' });
      }
      const isMember = chat.members.some(
        m => m.toString() === req.user._id.toString()
      );
      if (!isMember) {
        return res.status(403).json({ error: 'You are not a member of this chat.' });
      }
    }

    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret_key_alaap_livekit_2026_x987';
    const livekitUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';

    const uniqueId = `${req.user._id.toString()}_${Math.random().toString(36).substring(2, 10)}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: uniqueId,
      name: req.user.username,
      metadata: JSON.stringify({
        avatar: req.user.avatar || '',
        username: req.user.username
      }),
      ttl: '4h'
    });

    at.addGrant({
      roomJoin: true,
      room: targetRoom,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    const token = await at.toJwt();

    return res.json({
      token,
      url: livekitUrl,
      roomName: targetRoom
    });
  } catch (err) {
    console.error('Error generating LiveKit token:', err);
    return res.status(500).json({ error: 'Failed to generate call token.' });
  }
});

export default router;
