import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

// Models
import User from './models/User.js';
import Chat from './models/Chat.js';
import Message from './models/Message.js';
import Setting from './models/Setting.js';

// Routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import chatsRoutes from './routes/chats.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';

import bcrypt from 'bcryptjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*', // For development
    methods: ['GET', 'POST']
  }
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Routes configuration
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', app: 'Alaap Backend', timestamp: new Date() });
});

// Serve frontend static files
const frontendDistDir = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistDir));

// Fallback to index.html for Single Page App client-side routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(frontendDistDir, 'index.html'));
});

// Socket.io Connection & Events Handler
const socketUserMap = new Map(); // tracks user id -> socket.id for status notifications

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

  // Map user to their socket
  socketUserMap.set(userId, socket.id);

  // Update status to online in database
  await User.findByIdAndUpdate(userId, { status: 'online' });
  io.emit('user_status_change', { userId, status: 'online' });

  // Join self room for private user updates
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

  // Sending message
  socket.on('send_message', async (data) => {
    try {
      const { chatId, content, fileUrl, fileName, fileType, fileSize, replyTo } = data;

      if (!chatId) return;

      // Double check member status
      const chat = await Chat.findById(chatId);
      if (!chat || (!chat.members.includes(userId) && !socket.user.isAdmin)) {
        return socket.emit('error_message', 'You are not a member of this chat.');
      }

      // Check if it's a direct chat and if either member blocked the other
      if (!chat.isGroup) {
        const otherUserId = chat.members.find(m => m.toString() !== userId);
        if (otherUserId) {
          const user = await User.findById(userId);
          const otherUser = await User.findById(otherUserId);
          
          if (user && user.blockedUsers && user.blockedUsers.includes(otherUserId)) {
            return socket.emit('error_message', 'You have blocked this user. Unblock them to send messages.');
          }
          if (user && user.role !== 'Root' && otherUser && otherUser.blockedUsers && otherUser.blockedUsers.includes(userId)) {
            return socket.emit('error_message', 'You cannot send messages to this user.');
          }
        }
      }

      // Check who is currently online/reading in this chat
      const socketsInRoom = io.sockets.adapter.rooms.get(chatId) || new Set();
      const readUsers = [userId];
      const deliveredUsers = [userId];

      chat.members.forEach(memberId => {
        const memStr = memberId.toString();
        if (memStr === userId) return;

        const memberSocketId = socketUserMap.get(memStr);
        if (memberSocketId) {
          deliveredUsers.push(memberId);
          if (socketsInRoom.has(memberSocketId)) {
            readUsers.push(memberId);
          }
        }
      });

      // Create new message
      const newMessage = new Message({
        sender: userId,
        content: content || '',
        chat: chatId,
        fileUrl: fileUrl || '',
        fileName: fileName || '',
        fileType: fileType || '',
        fileSize: fileSize || 0,
        replyTo: replyTo || null,
        deliveredTo: deliveredUsers,
        readBy: readUsers
      });

      await newMessage.save();

      // Update latest message in Chat and unhide it for all members
      chat.latestMessage = newMessage._id;
      if (chat.hiddenBy && chat.hiddenBy.length > 0) {
        chat.hiddenBy = [];
      }
      await chat.save();

      // Populate sender and replyTo before broadcasting
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('sender', 'username profilePic status')
        .populate({
          path: 'replyTo',
          populate: { path: 'sender', select: 'username' }
        });

      // Send to all members in room
      io.to(chatId).emit('receive_message', populatedMessage);

      // Notify members who are NOT in the room
      chat.members.forEach((memberId) => {
        const memStr = memberId.toString();
        if (memStr !== userId) {
          // Check if socket is connected
          const memberSocketId = socketUserMap.get(memStr);
          if (memberSocketId) {
            // Check if socket is in this chat room
            const socketsInRoom = io.sockets.adapter.rooms.get(chatId);
            const isSocketInRoom = socketsInRoom && socketsInRoom.has(memberSocketId);

            if (!isSocketInRoom) {
              // Send notification event
              io.to(`user_${memStr}`).emit('message_notification', {
                chatId,
                message: populatedMessage
              });
            }
          }
        }
      });

    } catch (err) {
      console.error('Error saving/sending message:', err);
      socket.emit('error_message', 'Failed to send message.');
    }
  });

  // Reaction to message listener
  socket.on('react_message', async (data) => {
    try {
      const { messageId, emoji } = data;
      if (!messageId) return;

      const message = await Message.findById(messageId);
      if (!message) return;

      // Find if this user already reacted to this message with this emoji
      const existingReactionIndex = message.reactions.findIndex(
        r => r.user.toString() === userId && r.emoji === emoji
      );

      if (existingReactionIndex > -1) {
        // If they reacted with the same emoji, remove it
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Remove any previous reaction from this user
        message.reactions = message.reactions.filter(r => r.user.toString() !== userId);
        
        // Add new reaction
        message.reactions.push({ user: userId, emoji });
      }

      await message.save();

      // Emit the update to the chat room
      io.to(message.chat.toString()).emit('message_reaction_update', {
        messageId: message._id,
        reactions: message.reactions
      });

    } catch (err) {
      console.error('Error adding reaction:', err);
      socket.emit('error_message', 'Failed to add reaction.');
    }
  });

  // Edit message listener
  socket.on('edit_message', async (data) => {
    try {
      const { messageId, content } = data;
      if (!messageId || !content) return;

      const message = await Message.findById(messageId);
      if (!message) return;

      // Only the sender can edit
      if (message.sender.toString() !== userId) {
        return socket.emit('error_message', 'You can only edit your own messages.');
      }

      message.content = content;
      message.isEdited = true;
      await message.save();

      // Populate sender and replyTo
      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'username profilePic status')
        .populate({
          path: 'replyTo',
          populate: { path: 'sender', select: 'username' }
        });

      // Emit update to everyone in the chat room
      io.to(message.chat.toString()).emit('message_updated', populatedMessage);

    } catch (err) {
      console.error('Error editing message:', err);
      socket.emit('error_message', 'Failed to edit message.');
    }
  });

  // Delete message listener
  socket.on('delete_message', async (data) => {
    try {
      const { messageId } = data;
      if (!messageId) return;

      const message = await Message.findById(messageId);
      if (!message) return;

      // Only sender or root can delete
      const user = await User.findById(userId);
      const isSender = message.sender.toString() === userId;
      const isRoot = user && user.role === 'Root';

      if (!isSender && !isRoot) {
        return socket.emit('error_message', 'You are not authorized to delete this message.');
      }

      const chatId = message.chat.toString();
      await Message.findByIdAndDelete(messageId);

      // Update latest message in Chat if needed
      const chat = await Chat.findById(chatId);
      let latestMessage = null;
      if (chat && chat.latestMessage && chat.latestMessage.toString() === messageId) {
        const latest = await Message.findOne({ chat: chatId }).sort({ createdAt: -1 });
        chat.latestMessage = latest ? latest._id : null;
        await chat.save();
        
        if (chat.latestMessage) {
          latestMessage = await Message.findById(chat.latestMessage)
            .populate('sender', 'username profilePic status');
        }
      }

      // Emit deletion event to the room
      io.to(chatId).emit('message_deleted', { messageId, chatId, latestMessage });

    } catch (err) {
      console.error('Error deleting message:', err);
      socket.emit('error_message', 'Failed to delete message.');
    }
  });

  // Typing indicators
  socket.on('typing', ({ chatId }) => {
    socket.to(chatId).emit('typing', { chatId, userId, username: socket.user.username });
  });

  socket.on('stop_typing', ({ chatId }) => {
    socket.to(chatId).emit('stop_typing', { chatId, userId });
  });

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

  // Disconnection
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

// Database connection & Seeding
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/alaap';

const seedDatabase = async () => {
  try {
    // 1. Seed global configurations
    let signupSetting = await Setting.findOne({ key: 'signupEnabled' });
    if (!signupSetting) {
      await new Setting({ key: 'signupEnabled', value: true }).save();
      console.log('Seeded setting: signupEnabled = true');
    }

    let inviteOnlySetting = await Setting.findOne({ key: 'inviteOnlyEnabled' });
    if (!inviteOnlySetting) {
      await new Setting({ key: 'inviteOnlyEnabled', value: false }).save();
      console.log('Seeded setting: inviteOnlyEnabled = false');
    }

    let inviteCodesSetting = await Setting.findOne({ key: 'inviteCodes' });
    if (!inviteCodesSetting) {
      await new Setting({ key: 'inviteCodes', value: [] }).save();
      console.log('Seeded setting: inviteCodes = []');
    }

    // 2. Seed initial admin user if database is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123456', salt);

      const adminUser = new User({
        username: 'admin',
        password: passwordHash,
        isAdmin: true,
        status: 'offline'
      });

      await adminUser.save();
      console.log('--------------------------------------------------');
      console.log('DATABASE IS EMPTY. SEEDED INITIAL ADMIN USER:');
      console.log('Username: admin');
      console.log('Password: admin123456');
      console.log('--------------------------------------------------');
    }

  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    await seedDatabase();
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });
