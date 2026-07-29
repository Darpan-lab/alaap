import Chat from '../models/Chat.js';
import User from '../models/User.js';

export default function registerSyncPlayHandlers(io, socket) {
  const userId = socket.user._id.toString();

  // Sync Play Real-time Sync Sockets
  socket.on('sync_play_update', async (data) => {
    try {
      const { chatId, videoId, action, currentTime, isPlaying } = data;
      if (!chatId) return;

      const chat = await Chat.findById(chatId);
      if (!chat || !chat.members.includes(userId)) return;

      // Check if it's a direct chat and if either member blocked the other
      if (!chat.isGroup) {
        const otherUserId = chat.members.find(m => m.toString() !== userId);
        if (otherUserId) {
          const user = await User.findById(userId);
          const otherUser = await User.findById(otherUserId);
          if (
            (user && user.blockedUsers && user.blockedUsers.includes(otherUserId)) ||
            (user && user.role !== 'Root' && otherUser && otherUser.blockedUsers && otherUser.blockedUsers.includes(userId))
          ) {
            return;
          }
        }
      }

      // Update in DB
      chat.syncPlay = {
        active: true,
        videoId: videoId || chat.syncPlay?.videoId || '',
        currentTime: currentTime || 0,
        isPlaying: isPlaying !== undefined ? isPlaying : (action === 'play'),
        lastUpdatedBy: userId,
        lastUpdatedAt: new Date()
      };
      await chat.save();

      // Broadcast update to all members of the group
      io.to(chatId).emit('sync_play_broadcast', {
        chatId,
        videoId: chat.syncPlay.videoId,
        action,
        currentTime: chat.syncPlay.currentTime,
        isPlaying: chat.syncPlay.isPlaying,
        senderId: userId,
        senderName: socket.user.username
      });

    } catch (err) {
      console.error('Error in sync_play_update:', err);
    }
  });

  socket.on('sync_play_toggle', async ({ chatId, active, videoId }) => {
    try {
      if (!chatId) return;
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.members.includes(userId)) return;

      // Check if it's a direct chat and if either member blocked the other
      if (!chat.isGroup) {
        const otherUserId = chat.members.find(m => m.toString() !== userId);
        if (otherUserId) {
          const user = await User.findById(userId);
          const otherUser = await User.findById(otherUserId);
          if (
            (user && user.blockedUsers && user.blockedUsers.includes(otherUserId)) ||
            (user && user.role !== 'Root' && otherUser && otherUser.blockedUsers && otherUser.blockedUsers.includes(userId))
          ) {
            return;
          }
        }
      }

      if (!chat.syncPlay) {
        chat.syncPlay = { active: false };
      }
      chat.syncPlay.active = active;
      if (active) {
        if (videoId) {
          chat.syncPlay.videoId = videoId;
        }
        chat.syncPlay.lastUpdatedBy = userId;
        chat.syncPlay.lastUpdatedAt = new Date();
      } else {
        chat.syncPlay.videoId = '';
        chat.syncPlay.currentTime = 0;
        chat.syncPlay.isPlaying = false;
      }
      await chat.save();

      io.to(chatId).emit('sync_play_toggled', {
        chatId,
        active,
        syncPlay: chat.syncPlay,
        senderId: userId,
        senderName: socket.user.username
      });
    } catch (err) {
      console.error('Error in sync_play_toggle:', err);
    }
  });
}
