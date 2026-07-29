import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

export default function registerUserHandlers(io, socket) {
  const userId = socket.user._id.toString();

  // Room Joiner
  socket.on('join_chat', async (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.user.username} joined room: ${chatId}`);
    try {
      const result = await Message.updateMany(
        { chat: chatId, readBy: { $ne: userId } },
        { 
          $addToSet: { 
            readBy: userId,
            deliveredTo: userId
          } 
        }
      );
      if (result.modifiedCount > 0) {
        io.to(chatId).emit('messages_read_update', {
          chatId,
          userId
        });
      }
    } catch (err) {
      console.error('Error marking messages as read on join_chat:', err);
    }
  });

  // Room Leaver
  socket.on('leave_chat', (chatId) => {
    socket.leave(chatId);
    console.log(`User ${socket.user.username} left room: ${chatId}`);
  });

  // Typing indicators
  socket.on('typing', ({ chatId }) => {
    socket.to(chatId).emit('typing', { chatId, userId, username: socket.user.username });
  });

  socket.on('stop_typing', ({ chatId }) => {
    socket.to(chatId).emit('stop_typing', { chatId, userId });
  });
}
