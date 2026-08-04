import Chat from '../models/Chat.js';

// Map: chatId -> Set of userIds currently in the voice call room
export const activeVoiceRooms = new Map();

export default function registerCallHandlers(io, socket) {
  console.log(`[Socket] registerCallHandlers initialized for socket ${socket.id}`);
  const currentUserId = socket.user._id.toString();

  // Helper to broadcast room status to all connected clients
  const broadcastRoomStatus = (chatId) => {
    const userSet = activeVoiceRooms.get(chatId);
    const count = userSet ? userSet.size : 0;
    const isActive = count > 0;

    console.log(`[Socket Broadcast] call:room_status_changed for chatId: ${chatId} | isActive: ${isActive} | count: ${count}`);

    io.emit('call:room_status_changed', {
      chatId,
      isActive,
      count
    });
  };

  // Join Voice Call Room
  socket.on('call:join_room', ({ chatId }) => {
    if (!chatId) return;

    if (!activeVoiceRooms.has(chatId)) {
      activeVoiceRooms.set(chatId, new Set());
    }
    const participantSet = activeVoiceRooms.get(chatId);
    participantSet.add(socket.id); // Track by socket ID to allow multiple devices/tabs

    // Track active rooms on socket instance for disconnect cleanup
    if (!socket.activeCallRooms) socket.activeCallRooms = new Set();
    socket.activeCallRooms.add(chatId);

    console.log(`User ${socket.user.username} (Socket: ${socket.id}) joined voice room ${chatId}. Active count: ${participantSet.size}`);
    broadcastRoomStatus(chatId);
  });

  // Leave Voice Call Room
  socket.on('call:leave_room', ({ chatId }) => {
    if (!chatId) return;

    if (activeVoiceRooms.has(chatId)) {
      const participantSet = activeVoiceRooms.get(chatId);
      participantSet.delete(socket.id);
      if (participantSet.size === 0) {
        activeVoiceRooms.delete(chatId);
      }
    }

    if (socket.activeCallRooms) {
      socket.activeCallRooms.delete(chatId);
    }

    console.log(`User ${socket.user.username} (Socket: ${socket.id}) left voice room ${chatId}`);
    broadcastRoomStatus(chatId);
  });

  // Fetch all active voice rooms (e.g. on client connect / chat switch)
  socket.on('call:get_active_rooms', (callback) => {
    const result = {};
    activeVoiceRooms.forEach((participantSet, chatId) => {
      if (participantSet.size > 0) {
        result[chatId] = { isActive: true, count: participantSet.size };
      }
    });
    console.log(`[Socket] call:get_active_rooms requested by ${socket.id}. Returning:`, result);
    if (typeof callback === 'function') {
      callback(result);
    }
  });

  // Clean up user on socket disconnect
  socket.on('disconnect', () => {
    if (socket.activeCallRooms && socket.activeCallRooms.size > 0) {
      socket.activeCallRooms.forEach(chatId => {
        if (activeVoiceRooms.has(chatId)) {
          const participantSet = activeVoiceRooms.get(chatId);
          participantSet.delete(socket.id);
          if (participantSet.size === 0) {
            activeVoiceRooms.delete(chatId);
          }
          broadcastRoomStatus(chatId);
        }
      });
    }
  });
}
