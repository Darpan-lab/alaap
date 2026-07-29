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
import { spawn } from 'child_process';
import crypto from 'crypto';

// Models
import User from './models/User.js';
import Chat from './models/Chat.js';
import Message from './models/Message.js';
import Setting from './models/Setting.js';

// Routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import chatsRoutes from './routes/chats.js';
import adminRoutes, { getSetting } from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import jellyfinRoutes, { getJellyfinConfig, getJellyfinAuth } from './routes/jellyfin.js';

import bcrypt from 'bcryptjs';

import { getYtdlpBinary, getYtdlpTitleArgs, getYtdlpDownloadArgs } from './config/ytdlpConfig.js';

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
const syncPlayDir = path.join(__dirname, '../uploads/syncplay');
if (!fs.existsSync(syncPlayDir)) {
  fs.mkdirSync(syncPlayDir, { recursive: true });
}

// Track active background downloads in memory: videoKey -> { progress: number, chatIds: Set<string> }
const activeDownloads = new Map();

function getVideoKey(url) {
  if (!url) return '';
  const ytId = extractYouTubeId(url);
  if (ytId) return ytId;
  const isYtId = /^[a-zA-Z0-9_-]{11}$/.test(url.trim());
  if (isYtId) return url.trim();
  return crypto.createHash('md5').update(url).digest('hex');
}

function getDownloadUrl(input) {
  const key = getVideoKey(input);
  if (key.length === 11 && !input.includes('http')) {
    return `https://www.youtube.com/watch?v=${key}`;
  }
  return input;
}

function extractYouTubeId(url) {
  if (!url) return '';
  const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : '';
}

function isYouTubeUrl(url) {
  if (!url) return false;
  const trimmed = url.trim();
  return !!(
    extractYouTubeId(trimmed) || 
    /^[a-zA-Z0-9_-]{11}$/.test(trimmed) || 
    trimmed.includes('youtube.com') || 
    trimmed.includes('youtu.be')
  );
}

function getVideoTitle(url) {
  return new Promise((resolve) => {
    let defaultTitle = 'Video';
    try {
      if (url.includes('http')) {
        const parsed = new URL(url);
        const filename = path.basename(parsed.pathname);
        if (filename && filename.includes('.')) {
          defaultTitle = filename;
        }
      } else {
        defaultTitle = url;
      }
    } catch (e) {}

    const binary = getYtdlpBinary();
    const args = getYtdlpTitleArgs(url);

    const child = spawn(binary, args);
    let title = '';
    
    const timeout = setTimeout(() => {
      try {
        child.kill();
      } catch (e) {}
      resolve(defaultTitle);
    }, 5000);

    child.stdout.on('data', (data) => {
      title += data.toString();
    });

    child.on('close', () => {
      clearTimeout(timeout);
      resolve(title.trim() || defaultTitle);
    });
  });
}

function isValidTitle(title, inputUrl = '') {
  if (!title || typeof title !== 'string') return false;
  const trimmed = title.trim();
  if (!trimmed || trimmed === 'Video') return false;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('www.')) return false;
  if (inputUrl && trimmed === inputUrl.trim()) return false;
  return true;
}

async function findOrFetchVideoTitle(videoInput, videoKey) {
  if (!videoKey) {
    videoKey = getVideoKey(videoInput);
  }
  const relativeUrl = `/uploads/syncplay/${videoKey}.mp4`;

  // 1. Search DB across all chats for existing title
  try {
    const chatsWithVideo = await Chat.find({
      $or: [
        { "syncPlay.videoUrl": relativeUrl },
        { "syncPlay.history.videoUrl": relativeUrl },
        { "syncPlay.videoId": videoInput },
        { "syncPlay.history.videoId": videoInput },
        { "syncPlay.videoId": videoKey },
        { "syncPlay.history.videoId": videoKey }
      ]
    }).lean();

    for (const chat of chatsWithVideo) {
      if (chat.syncPlay && Array.isArray(chat.syncPlay.history)) {
        for (const h of chat.syncPlay.history) {
          if (
            (h.videoUrl === relativeUrl || h.videoId === videoInput || h.videoId === videoKey || getVideoKey(h.videoId) === videoKey) &&
            isValidTitle(h.videoTitle, videoInput)
          ) {
            console.log(`[Title Lookup] Found cached title in chat history: "${h.videoTitle}" for key ${videoKey}`);
            return h.videoTitle;
          }
        }
      }
      if (
        chat.syncPlay &&
        (chat.syncPlay.videoUrl === relativeUrl || chat.syncPlay.videoId === videoInput || chat.syncPlay.videoId === videoKey || getVideoKey(chat.syncPlay.videoId) === videoKey) &&
        isValidTitle(chat.syncPlay.videoTitle, videoInput)
      ) {
        console.log(`[Title Lookup] Found cached title in syncPlay root: "${chat.syncPlay.videoTitle}" for key ${videoKey}`);
        return chat.syncPlay.videoTitle;
      }
    }
  } catch (err) {
    console.error('[Title Lookup] DB search error:', err);
  }

  // 2. Fallback: Title not found in DB or generic/invalid -> fetch title using yt-dlp
  console.log(`[Title Lookup] Title not found in DB for key ${videoKey}. Fetching via yt-dlp fallback...`);
  try {
    const downloadUrl = getDownloadUrl(videoInput);
    const fetchedTitle = await getVideoTitle(downloadUrl);
    if (isValidTitle(fetchedTitle, videoInput)) {
      console.log(`[Title Lookup] Successfully fetched title via yt-dlp: "${fetchedTitle}" for key ${videoKey}`);
      
      // Retroactively update DB records with generic title for this video URL
      Chat.updateMany(
        { "syncPlay.history.videoUrl": relativeUrl, "syncPlay.history.videoTitle": { $in: ['', 'Video'] } },
        { $set: { "syncPlay.history.$.videoTitle": fetchedTitle } }
      ).catch(e => console.error('[Title Lookup] Error retroactively updating history titles:', e));

      return fetchedTitle;
    }
  } catch (err) {
    console.error('[Title Lookup] yt-dlp title fetch error:', err);
  }

  // 3. Ultimate Fallback: Extract filename from URL or use default
  let fallbackTitle = 'Video';
  try {
    if (videoInput.includes('http')) {
      const parsed = new URL(videoInput);
      const filename = path.basename(parsed.pathname);
      if (filename && filename.includes('.')) {
        fallbackTitle = filename;
      }
    } else if (videoInput) {
      fallbackTitle = videoInput;
    }
  } catch (e) {}

  return fallbackTitle;
}

function broadcastToChats(chatIds, io, event, data) {
  for (const cid of chatIds) {
    io.to(cid).emit(event, {
      chatId: cid,
      ...data
    });
  }
}

async function cleanupSyncPlayStorage(syncplayDir, limitBytes = 5 * 1024 * 1024 * 1024) {
  try {
    if (!fs.existsSync(syncplayDir)) {
      return;
    }
    
    const files = await fs.promises.readdir(syncplayDir);
    const fileInfos = [];
    
    for (const file of files) {
      if (file === '.' || file === '..') continue;
      const filePath = path.join(syncplayDir, file);
      try {
        const stats = await fs.promises.stat(filePath);
        if (stats.isFile() && file.endsWith('.mp4')) {
          fileInfos.push({
            name: file,
            path: filePath,
            size: stats.size,
            mtime: stats.mtime.getTime()
          });
        }
      } catch (err) {
        console.error(`Error statting file ${filePath}:`, err);
      }
    }

    let totalSize = fileInfos.reduce((sum, f) => sum + f.size, 0);
    console.log(`[Storage Safety] Current SyncPlay storage size: ${(totalSize / (1024 * 1024 * 1024)).toFixed(3)} GB / ${(limitBytes / (1024 * 1024 * 1024)).toFixed(1)} GB limit`);

    if (totalSize <= limitBytes) {
      return;
    }

    // Sort files by modification time (oldest first)
    fileInfos.sort((a, b) => a.mtime - b.mtime);

    for (const fileInfo of fileInfos) {
      if (totalSize <= limitBytes) break;

      console.log(`[Storage Safety] limit exceeded. Deleting oldest video: ${fileInfo.name} (${(fileInfo.size / (1024 * 1024)).toFixed(2)} MB)`);
      
      try {
        await fs.promises.unlink(fileInfo.path);
        totalSize -= fileInfo.size;

        // Reset corresponding chat entries in the database
        const relativeUrl = `/uploads/syncplay/${fileInfo.name}`;
        const updateResult = await Chat.updateMany(
          { "syncPlay.videoUrl": relativeUrl },
          { 
            $set: { 
              "syncPlay.downloadStatus": "idle", 
              "syncPlay.videoUrl": "", 
              "syncPlay.downloadProgress": 0,
              "syncPlay.downloadError": ""
            } 
          }
        );
        console.log(`[Storage Safety] Reset DB status for video ${fileInfo.name}. Matched: ${updateResult.matchedCount}, Modified: ${updateResult.modifiedCount}`);
      } catch (err) {
        console.error(`[Storage Safety] Failed to delete file ${fileInfo.path}:`, err);
      }
    }
  } catch (err) {
    console.error('[Storage Safety] Error during storage cleanup:', err);
  }
}

async function updateChatAndBroadcastCompleted(chatId, videoId, videoKey, io, userId, username, videoTitle = 'Video') {
  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return;

    if (!isValidTitle(videoTitle, videoId)) {
      videoTitle = await findOrFetchVideoTitle(videoId, videoKey);
    }
    
    const localUrl = `/uploads/syncplay/${videoKey}.mp4`;
    const savedHistory = chat.syncPlay?.history || [];
    savedHistory.push({
      videoId: videoId,
      videoTitle: videoTitle,
      videoUrl: localUrl,
      addedBy: userId,
      addedByName: username || 'User',
      addedAt: new Date()
    });
    
    chat.syncPlay = {
      active: true,
      videoId: videoId,
      videoTitle: videoTitle,
      videoUrl: localUrl,
      downloadStatus: 'completed',
      downloadProgress: 100,
      currentTime: 0,
      isPlaying: false,
      lastUpdatedBy: userId,
      lastUpdatedAt: new Date(),
      history: savedHistory
    };
    await chat.save();
    
    // Trigger storage safety limit cleanup in background
    cleanupSyncPlayStorage(syncPlayDir).catch(err => {
      console.error('[Storage Safety] Cleanup error:', err);
    });
    
    io.to(chatId).emit('sync_play_broadcast', {
      chatId,
      videoId: chat.syncPlay.videoId,
      videoTitle: chat.syncPlay.videoTitle,
      videoUrl: chat.syncPlay.videoUrl,
      downloadStatus: 'completed',
      downloadProgress: 100,
      action: 'change_video',
      currentTime: 0,
      isPlaying: false,
      senderId: userId,
      senderName: username,
      history: chat.syncPlay.history
    });
  } catch (err) {
    console.error('Error updating chat status to completed:', err);
  }
}

function startVideoDownload(chatId, inputUrl, io, userId, username) {
  const videoKey = getVideoKey(inputUrl);
  const downloadUrl = getDownloadUrl(inputUrl);
  const outputFilePath = path.join(syncPlayDir, `${videoKey}.mp4`);
  
  if (fs.existsSync(outputFilePath)) {
    findOrFetchVideoTitle(inputUrl, videoKey).then(resolvedTitle => {
      updateChatAndBroadcastCompleted(chatId, inputUrl, videoKey, io, userId, username, resolvedTitle);
    }).catch(() => {
      updateChatAndBroadcastCompleted(chatId, inputUrl, videoKey, io, userId, username, 'Video');
    });
    return;
  }
  
  if (activeDownloads.has(videoKey)) {
    const download = activeDownloads.get(videoKey);
    download.chatIds.add(chatId);
    
    io.to(chatId).emit('sync_play_download_progress', {
      chatId,
      status: 'downloading',
      progress: download.progress
    });
    return;
  }
  
  const downloadInfo = {
    progress: 0,
    chatIds: new Set([chatId])
  };
  activeDownloads.set(videoKey, downloadInfo);
  
  const binary = getYtdlpBinary();
  const args = getYtdlpDownloadArgs(downloadUrl, outputFilePath);
  
  console.log(`Spawning ${binary} with args: ${args.join(' ')}`);
  
  const child = spawn(binary, args);
  let buffer = '';
  
  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/[\r\n]+/);
    buffer = lines.pop();
    
    for (const line of lines) {
      const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
      if (match) {
        const progress = parseFloat(match[1]);
        if (progress > downloadInfo.progress) {
          downloadInfo.progress = progress;
          broadcastToChats(downloadInfo.chatIds, io, 'sync_play_download_progress', {
            status: 'downloading',
            progress
          });
        }
      }
    }
  });
  
  child.stderr.on('data', (data) => {
    console.error(`yt-dlp stderr [${videoKey}]:`, data.toString());
  });
  
  child.on('close', async (code) => {
    activeDownloads.delete(videoKey);
    
    let resolvedTitle = 'Video';
    const infoJsonPaths = [
      outputFilePath.replace(/\.[a-zA-Z0-9]+$/, '') + '.info.json',
      outputFilePath + '.info.json'
    ];
    
    for (const infoJsonPath of infoJsonPaths) {
      if (fs.existsSync(infoJsonPath)) {
        try {
          const rawData = await fs.promises.readFile(infoJsonPath, 'utf8');
          const metadata = JSON.parse(rawData);
          if (metadata && metadata.title) {
            resolvedTitle = metadata.title;
          }
          await fs.promises.unlink(infoJsonPath);
          break;
        } catch (err) {
          console.error('Error reading info JSON:', err);
        }
      }
    }
    
    if (code === 0 && fs.existsSync(outputFilePath)) {
      console.log(`yt-dlp download completed successfully for key ${videoKey}`);
      for (const cid of downloadInfo.chatIds) {
        await updateChatAndBroadcastCompleted(cid, inputUrl, videoKey, io, userId, username, resolvedTitle);
      }
    } else {
      console.error(`yt-dlp download failed with exit code ${code} for key ${videoKey}`);
      
      if (fs.existsSync(outputFilePath)) {
        console.log(`File exists despite exit code. Marking as completed.`);
        for (const cid of downloadInfo.chatIds) {
          await updateChatAndBroadcastCompleted(cid, inputUrl, videoKey, io, userId, username, resolvedTitle);
        }
        return;
      }
      
      broadcastToChats(downloadInfo.chatIds, io, 'sync_play_download_progress', {
        status: 'failed',
        progress: 0,
        error: `Download failed with exit code ${code}`
      });
      
      for (const cid of downloadInfo.chatIds) {
        try {
          const chat = await Chat.findById(cid);
          if (chat) {
            chat.syncPlay = {
              ...chat.syncPlay,
              downloadStatus: 'failed',
              downloadProgress: 0,
              downloadError: `Download failed with code ${code}`
            };
            await chat.save();
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Serve uploaded files statically with CORS headers enabled
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Routes configuration
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/jellyfin', jellyfinRoutes);

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
      if (!chat.members.map(m => m.toString()).includes(userId)) {
        chat.members.push(userId);
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
      const { messageId, content, fileUrl, fileName, fileType, fileSize } = data;
      if (!messageId) return;

      const message = await Message.findById(messageId);
      if (!message) return;

      // Check if user is member of chat to allow collaboration on images,
      // but restrict text content editing to the message sender.
      const chat = await Chat.findById(message.chat);
      const isMember = chat && (chat.members.includes(userId) || socket.user.isAdmin);
      if (!isMember) {
        return socket.emit('error_message', 'You are not a member of this chat.');
      }

      if (content !== undefined && message.sender.toString() !== userId) {
        return socket.emit('error_message', 'You can only edit the text of your own messages.');
      }

      // Update fields if provided
      if (content !== undefined) {
        message.content = content;
      }
      if (fileUrl !== undefined) {
        message.fileUrl = fileUrl;
      }
      if (fileName !== undefined) {
        message.fileName = fileName;
      }
      if (fileType !== undefined) {
        message.fileType = fileType;
      }
      if (fileSize !== undefined) {
        message.fileSize = fileSize;
      }

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
      const { chatId, videoId, action, currentTime, isPlaying, durationSec } = data;
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

      if (action === 'change_video' && videoId) {
        let targetVideoId = videoId;
        
        // Handle Jellyfin videos
        if (targetVideoId.startsWith('jellyfin:') || targetVideoId.includes('/api/jellyfin/stream/')) {
          const itemId = targetVideoId.replace('jellyfin:', '').replace(/.*\/api\/jellyfin\/stream\//, '');
          let title = 'Jellyfin Media';
          let fetchedDurationSec = durationSec || 0;
          try {
            const config = await getJellyfinConfig();
            if (config.isConfigured) {
              const { token, userId } = await getJellyfinAuth(config);
              const res = await fetch(`${config.jellyfinUrl}/Users/${userId}/Items/${itemId}`, {
                headers: { 'Authorization': `MediaBrowser Token="${token}"` }
              });
              if (res.ok) {
                const itemData = await res.json();
                title = itemData.Name || 'Jellyfin Media';
                if (itemData.SeriesName) {
                  const s = itemData.ParentIndexNumber ? `S${String(itemData.ParentIndexNumber).padStart(2, '0')}` : '';
                  const e = itemData.IndexNumber ? `E${String(itemData.IndexNumber).padStart(2, '0')}` : '';
                  title = `${itemData.SeriesName} ${s}${e} - ${itemData.Name}`;
                } else if (itemData.ProductionYear) {
                  title = `${itemData.Name} (${itemData.ProductionYear})`;
                }
                if (itemData.RunTimeTicks) {
                  fetchedDurationSec = itemData.RunTimeTicks / 10000000;
                }
              }
            }
          } catch (err) {
            console.error('Error fetching Jellyfin title:', err);
          }

          const streamUrl = `/api/jellyfin/stream/${itemId}`;
          const savedHistory = chat.syncPlay?.history || [];
          savedHistory.push({
            videoId: `jellyfin:${itemId}`,
            videoTitle: title,
            videoUrl: streamUrl,
            durationSec: fetchedDurationSec,
            addedBy: userId,
            addedByName: socket.user.username || 'User',
            addedAt: new Date()
          });

          chat.syncPlay = {
            active: true,
            videoId: `jellyfin:${itemId}`,
            videoTitle: title,
            videoUrl: streamUrl,
            downloadStatus: 'completed',
            downloadProgress: 100,
            downloadError: '',
            currentTime: 0,
            durationSec: fetchedDurationSec,
            isPlaying: false,
            lastUpdatedBy: userId,
            lastUpdatedAt: new Date(),
            history: savedHistory
          };
          await chat.save();

          io.to(chatId).emit('sync_play_broadcast', {
            chatId,
            videoId: chat.syncPlay.videoId,
            videoTitle: chat.syncPlay.videoTitle,
            videoUrl: chat.syncPlay.videoUrl,
            downloadStatus: 'completed',
            downloadProgress: 100,
            downloadError: '',
            action: 'change_video',
            currentTime: 0,
            durationSec: fetchedDurationSec,
            isPlaying: false,
            senderId: userId,
            senderName: socket.user.username,
            history: chat.syncPlay.history
          });
          return;
        }
        
        // If it's a search query rather than a direct URL/ID, check database history for title matches first
        if (!targetVideoId.startsWith('http') && !targetVideoId.includes('www.') && !targetVideoId.includes('youtube.com') && !targetVideoId.includes('youtu.be') && targetVideoId.trim().length > 2) {
          const matchedChat = await Chat.findOne({
            "syncPlay.history.videoTitle": { $regex: new RegExp(targetVideoId.trim(), 'i') }
          });
          
          if (matchedChat && matchedChat.syncPlay && matchedChat.syncPlay.history) {
            const matchedEntry = matchedChat.syncPlay.history.find(h => 
              h.videoTitle && h.videoTitle.toLowerCase().includes(targetVideoId.trim().toLowerCase())
            );
            if (matchedEntry) {
              console.log(`[Search Match] Re-using cached video ID ${matchedEntry.videoId} for query "${targetVideoId}"`);
              targetVideoId = matchedEntry.videoId;
            }
          }
        }

        const videoKey = getVideoKey(targetVideoId);
        const outputFilePath = path.join(syncPlayDir, `${videoKey}.mp4`);
        const alreadyExists = fs.existsSync(outputFilePath);

        if (alreadyExists) {
          const title = await findOrFetchVideoTitle(targetVideoId, videoKey);
          await updateChatAndBroadcastCompleted(chatId, targetVideoId, videoKey, io, userId, socket.user.username, title);
          return;
        } else {
          // Video deleted from uploads or not found -> re-download again as usual
          const savedHistory = chat.syncPlay?.history || [];
          chat.syncPlay = {
            active: true,
            videoId: targetVideoId,
            videoTitle: 'Video',
            videoUrl: '',
            downloadStatus: 'downloading',
            downloadProgress: 0,
            downloadError: '',
            currentTime: 0,
            durationSec: durationSec || 0,
            isPlaying: false,
            lastUpdatedBy: userId,
            lastUpdatedAt: new Date(),
            history: savedHistory
          };
          await chat.save();

          startVideoDownload(chatId, targetVideoId, io, userId, socket.user.username);
          return;
        }
      }

      // Update in DB
      chat.syncPlay = {
        active: true,
        videoId: videoId || chat.syncPlay?.videoId || '',
        videoTitle: chat.syncPlay?.videoTitle || '',
        videoUrl: chat.syncPlay?.videoUrl || '',
        downloadStatus: chat.syncPlay?.downloadStatus || 'idle',
        downloadProgress: chat.syncPlay?.downloadProgress || 0,
        downloadError: chat.syncPlay?.downloadError || '',
        currentTime: currentTime || 0,
        durationSec: durationSec !== undefined ? durationSec : (chat.syncPlay?.durationSec || 0),
        isPlaying: isPlaying !== undefined ? isPlaying : (action === 'play'),
        lastUpdatedBy: userId,
        lastUpdatedAt: new Date(),
        history: chat.syncPlay?.history || []
      };
      await chat.save();

      // Broadcast update to all members of the group
      io.to(chatId).emit('sync_play_broadcast', {
        chatId,
        videoId: chat.syncPlay.videoId,
        videoTitle: chat.syncPlay.videoTitle,
        videoUrl: chat.syncPlay.videoUrl,
        downloadStatus: chat.syncPlay.downloadStatus,
        downloadProgress: chat.syncPlay.downloadProgress,
        downloadError: chat.syncPlay.downloadError,
        action,
        currentTime: chat.syncPlay.currentTime,
        durationSec: chat.syncPlay.durationSec,
        isPlaying: chat.syncPlay.isPlaying,
        senderId: userId,
        senderName: socket.user.username,
        history: chat.syncPlay.history
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
          if (videoId.startsWith('jellyfin:') || videoId.includes('/api/jellyfin/stream/')) {
            const itemId = videoId.replace('jellyfin:', '').replace(/.*\/api\/jellyfin\/stream\//, '');
            chat.syncPlay.videoId = `jellyfin:${itemId}`;
            chat.syncPlay.videoUrl = `/api/jellyfin/stream/${itemId}`;
            chat.syncPlay.downloadStatus = 'completed';
            chat.syncPlay.downloadProgress = 100;
            chat.syncPlay.downloadError = '';
          } else {
            const videoKey = getVideoKey(videoId);
            const outputFilePath = path.join(syncPlayDir, `${videoKey}.mp4`);
            const alreadyExists = fs.existsSync(outputFilePath);

            chat.syncPlay.videoId = videoId;
            chat.syncPlay.videoUrl = alreadyExists ? `/uploads/syncplay/${videoKey}.mp4` : '';
            chat.syncPlay.downloadStatus = alreadyExists ? 'completed' : 'downloading';
            chat.syncPlay.downloadProgress = alreadyExists ? 100 : 0;
            chat.syncPlay.downloadError = '';

            if (!alreadyExists) {
              startVideoDownload(chatId, videoId, io, userId, socket.user.username);
            }
          }
        }
        chat.syncPlay.lastUpdatedBy = userId;
        chat.syncPlay.lastUpdatedAt = new Date();
      } else {
        chat.syncPlay.videoId = '';
        chat.syncPlay.videoUrl = '';
        chat.syncPlay.downloadStatus = 'idle';
        chat.syncPlay.downloadProgress = 0;
        chat.syncPlay.downloadError = '';
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
    
    // Storage safety cleanup on startup
    cleanupSyncPlayStorage(syncPlayDir).catch(err => {
      console.error('[Storage Safety] Startup cleanup error:', err);
    });
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });
