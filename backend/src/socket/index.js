import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import registerChatHandlers from './chatHandler.js';
import registerSyncPlayHandlers from './syncPlayHandler.js';
import registerUserHandlers from './userHandler.js';
import registerCallHandlers from './callHandler.js';

// Global map tracks user id -> socket.id for status notifications and delivery checks
export const socketUserMap = new Map();

export function initSocket(io) {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'alaap_super_secret_session_key_987654321_jwt');
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket authentication failed:', err.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User connected: ${socket.user.username} (${userId})`);

    // Map user to their active socket
    socketUserMap.set(userId, socket.id);

    // Update status to online in database
    await User.findByIdAndUpdate(userId, { status: 'online' });
    io.emit('user_status_change', { userId, status: 'online' });

    // Join self room for private user updates / push notifications
    socket.join(`user_${userId}`);

    // Mark all un-delivered messages in user's chats as delivered on connection
    try {
      const userChats = await Chat.find({ members: userId });
      const chatIds = userChats.map(c => c._id);
      const result = await Message.updateMany(
        { chat: { $in: chatIds }, deliveredTo: { $ne: userId } },
        { $addToSet: { deliveredTo: userId } }
      );
      if (result.modifiedCount > 0) {
        chatIds.forEach(chatId => {
          io.to(chatId.toString()).emit('messages_delivered_update', {
            chatId: chatId.toString(),
            userId
          });
        });
      }
    } catch (err) {
      console.error('Error marking messages as delivered on connection:', err);
    }

    // Register handlers
    console.log(`Registering chat handlers...`);
    registerChatHandlers(io, socket);
    console.log(`Registering sync play handlers...`);
    registerSyncPlayHandlers(io, socket);
    console.log(`Registering user handlers...`);
    registerUserHandlers(io, socket);
    console.log(`Registering call handlers...`);
    registerCallHandlers(io, socket);
    console.log(`All handlers registered!`);

    // Disconnection handler
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username}`);
      socketUserMap.delete(userId);

      // Update status to offline after a small delay in case of page reload
      setTimeout(async () => {
        // Only set offline if they didn't reconnect on another socket
        if (!socketUserMap.has(userId)) {
          await User.findByIdAndUpdate(userId, { status: 'offline' });
          io.emit('user_status_change', { userId, status: 'offline' });
        }
      }, 3000);
    });
  });
}
