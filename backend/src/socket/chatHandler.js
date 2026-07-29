import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { socketUserMap } from './index.js';

export default function registerChatHandlers(io, socket) {
  const userId = socket.user._id.toString();

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
}
