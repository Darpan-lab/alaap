import express from 'express';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Helper to filter latestMessage based on clearedHistory
const filterLatestMessage = (chat, userId, userRole) => {
  if (!chat) return chat;
  const chatObj = typeof chat.toObject === 'function' ? chat.toObject() : chat;

  // Root user can see everything, no filtering needed
  if (userRole === 'Root') return chatObj;

  const clearedEntry = chatObj.clearedHistory?.find(
    entry => entry.user.toString() === userId.toString()
  );
  
  if (clearedEntry && chatObj.latestMessage) {
    const clearedAt = new Date(clearedEntry.clearedAt).getTime();
    const messageCreatedAt = new Date(chatObj.latestMessage.createdAt || chatObj.latestMessage).getTime();
    
    if (messageCreatedAt <= clearedAt) {
      chatObj.latestMessage = null;
    }
  }
  return chatObj;
};

// Get list of chats for the current user
router.get('/', auth, async (req, res) => {
  try {
    const query = {
      members: { $elemMatch: { $eq: req.user._id } }
    };
    if (req.user.role !== 'Root') {
      query.hiddenBy = { $ne: req.user._id };
    }

    const chats = await Chat.find(query)
    .populate('members', 'username profilePic status isAdmin blockedUsers')
    .populate('creator', 'username')
    .populate({
      path: 'latestMessage',
      populate: {
        path: 'sender',
        select: 'username profilePic'
      }
    })
    .sort({ updatedAt: -1 });

    const processedChats = chats.map(chat => filterLatestMessage(chat, req.user._id, req.user.role));
    res.json(processedChats);
  } catch (error) {
    console.error('Fetch Chats Error:', error);
    res.status(500).json({ error: 'Internal server error while fetching chats.' });
  }
});

// Create or Access a Chat (Direct Message or Group Chat)
router.post('/', auth, async (req, res) => {
  try {
    const { userId, isGroup, name, members, description } = req.body;

    // 1. Group Chat creation
    if (isGroup) {
      if (!name || !members || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json({ error: 'Group name and members are required.' });
      }

      // Add self to group members
      const allMembers = [...new Set([...members, req.user._id.toString()])];

      const groupChat = new Chat({
        name,
        isGroup: true,
        members: allMembers,
        creator: req.user._id,
        adminMembers: [req.user._id]
      });

      await groupChat.save();

      const fullGroupChat = await Chat.findById(groupChat._id)
        .populate('members', 'username profilePic status isAdmin blockedUsers')
        .populate('creator', 'username');

      // Notify all members in real-time
      allMembers.forEach(memId => {
        if (req.io) {
          req.io.to(`user_${memId}`).emit('new_chat', fullGroupChat);
        }
      });

      return res.status(201).json(fullGroupChat);
    }

    // 2. Direct Message creation or lookup
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required for a direct chat.' });
    }

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    // Check block list status
    const currentUser = await User.findById(req.user._id);
    if (currentUser && currentUser.blockedUsers && currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({ error: 'You have blocked this user. Unblock them to start a chat.' });
    }
    if (targetUser && targetUser.blockedUsers && targetUser.blockedUsers.includes(req.user._id.toString())) {
      return res.status(400).json({ error: 'You cannot message this user.' });
    }

    // Find existing direct chat between these two users
    let directChat = await Chat.findOne({
      isGroup: false,
      $and: [
        { members: { $elemMatch: { $eq: req.user._id } } },
        { members: { $elemMatch: { $eq: userId } } }
      ]
    })
    .populate('members', 'username profilePic status isAdmin blockedUsers')
    .populate('latestMessage');

    if (directChat) {
      if (directChat.hiddenBy && directChat.hiddenBy.length > 0) {
        directChat.hiddenBy = directChat.hiddenBy.filter(
          id => id.toString() !== req.user._id.toString() && id.toString() !== userId.toString()
        );
        await directChat.save();
      }
      if (req.io) {
        const targetUser = directChat.members.find(m => m._id.toString() === userId.toString());
        const targetUserRole = targetUser ? targetUser.role : 'Regular';
        const targetFilteredChat = filterLatestMessage(directChat, userId, targetUserRole);
        req.io.to(`user_${userId}`).emit('new_chat', targetFilteredChat);
      }
      return res.json(filterLatestMessage(directChat, req.user._id, req.user.role));
    }

    // Create new direct chat
    const newChat = new Chat({
      name: 'Direct Message',
      isGroup: false,
      members: [req.user._id, userId]
    });

    await newChat.save();

    const fullChat = await Chat.findById(newChat._id)
      .populate('members', 'username profilePic status isAdmin blockedUsers');

    if (req.io) {
      req.io.to(`user_${userId}`).emit('new_chat', fullChat);
    }

    res.status(201).json(fullChat);

  } catch (error) {
    console.error('Create Chat Error:', error);
    res.status(500).json({ error: 'Internal server error while creating chat.' });
  }
});

// Get details of a single chat
router.get('/:chatId', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    let chat;

    if (req.user.isAdmin) {
      chat = await Chat.findById(chatId)
        .populate('members', 'username profilePic status isAdmin blockedUsers')
        .populate('creator', 'username')
        .populate({
          path: 'latestMessage',
          populate: {
            path: 'sender',
            select: 'username profilePic'
          }
        });
    } else {
      chat = await Chat.findOne({
        _id: chatId,
        members: { $elemMatch: { $eq: req.user._id } }
      })
      .populate('members', 'username profilePic status isAdmin blockedUsers')
      .populate('creator', 'username')
      .populate({
        path: 'latestMessage',
        populate: {
          path: 'sender',
          select: 'username profilePic'
        }
      });
    }

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found or access denied.' });
    }

    res.json(filterLatestMessage(chat, req.user._id, req.user.role));
  } catch (error) {
    console.error('Fetch Chat Details Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Fetch messages for a specific chat
router.get('/:chatId/messages', auth, async (req, res) => {
  try {
    const { chatId } = req.params;

    // Check if user is a member of the chat, or if user is an admin
    let chat;
    if (req.user.isAdmin) {
      chat = await Chat.findById(chatId);
    } else {
      chat = await Chat.findOne({
        _id: chatId,
        members: { $elemMatch: { $eq: req.user._id } }
      });
    }

    if (!chat) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this chat.' });
    }

    const clearedEntry = chat.clearedHistory?.find(
      entry => entry.user.toString() === req.user._id.toString()
    );
    const clearedAt = clearedEntry ? clearedEntry.clearedAt : null;

    let query = { chat: chatId };
    if (clearedAt && req.user.role !== 'Root') {
      query.createdAt = { $gt: clearedAt };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username profilePic status')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username' }
      })
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Fetch Messages Error:', error);
    res.status(500).json({ error: 'Internal server error while fetching messages.' });
  }
});

// Add member to group chat
router.post('/:chatId/add', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    if (!chat.isGroup) {
      return res.status(400).json({ error: 'Cannot add members to a direct chat.' });
    }

    // Only creator or admin members can add members
    const isAdmin = chat.adminMembers.includes(req.user._id.toString()) || chat.creator.toString() === req.user._id.toString();
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied. Only group admins can add members.' });
    }

    if (chat.members.includes(userId)) {
      return res.status(400).json({ error: 'User is already a member of this group.' });
    }

    chat.members.push(userId);
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('members', 'username profilePic status isAdmin blockedUsers')
      .populate('creator', 'username');

    // Notify newly added user in real-time
    if (req.io) {
      req.io.to(`user_${userId}`).emit('new_chat', updatedChat);
      // Notify existing group room members
      req.io.to(chatId).emit('chat_members_updated', updatedChat);
    }

    res.json(updatedChat);
  } catch (error) {
    console.error('Add Member Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Remove member from group chat
router.post('/:chatId/remove', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    if (!chat.isGroup) {
      return res.status(400).json({ error: 'Cannot remove members from a direct chat.' });
    }

    // Only creator or admin members can remove members
    const isAdmin = chat.adminMembers.includes(req.user._id.toString()) || chat.creator.toString() === req.user._id.toString();
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied. Only group admins can remove members.' });
    }

    // Cannot remove the group creator
    if (chat.creator.toString() === userId) {
      return res.status(400).json({ error: 'Cannot remove the group creator.' });
    }

    if (!chat.members.includes(userId)) {
      return res.status(400).json({ error: 'User is not a member of this group.' });
    }

    // Remove user from members list
    chat.members = chat.members.filter(m => m.toString() !== userId);

    // Also remove from admin list if present
    chat.adminMembers = chat.adminMembers.filter(m => m.toString() !== userId);

    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('members', 'username profilePic status isAdmin blockedUsers')
      .populate('creator', 'username');

    // Notify the removed user in real-time
    if (req.io) {
      req.io.to(`user_${userId}`).emit('chat_deleted', { chatId });
      // Notify remaining group members
      req.io.to(chatId).emit('chat_members_updated', updatedChat);
    }

    res.json(updatedChat);
  } catch (error) {
    console.error('Remove Member Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Leave group chat
router.post('/:chatId/leave', auth, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    if (!chat.isGroup) {
      return res.status(400).json({ error: 'Cannot leave a direct chat.' });
    }

    // Remove self from members list
    chat.members = chat.members.filter(m => m.toString() !== req.user._id.toString());
    
    // Also remove from admin list if present
    chat.adminMembers = chat.adminMembers.filter(m => m.toString() !== req.user._id.toString());

    // If no members are left, we can delete or keep it. Let's keep it but delete if empty.
    if (chat.members.length === 0) {
      await Chat.findByIdAndDelete(chatId);
      await Message.deleteMany({ chat: chatId });
      return res.json({ message: 'Group deleted because no members remain.' });
    }

    // If creator left, assign a new creator
    if (chat.creator.toString() === req.user._id.toString()) {
      chat.creator = chat.members[0];
      if (!chat.adminMembers.includes(chat.members[0].toString())) {
        chat.adminMembers.push(chat.members[0]);
      }
    }

    await chat.save();
    res.json({ message: 'You have left the group chat.' });
  } catch (error) {
    console.error('Leave Group Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Clear Chat History (Delete all messages in a chat)
router.delete('/:chatId/history', auth, async (req, res) => {
  try {
    const { chatId } = req.params;

    // Check if chat exists and if user is a member
    const chat = await Chat.findOne({
      _id: chatId,
      members: { $elemMatch: { $eq: req.user._id } }
    });

    if (!chat) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this chat.' });
    }

    // If the clearing user is the Root user, permanently delete history for everyone!
    if (req.user.role === 'Root') {
      await Message.deleteMany({ chat: chatId });
      
      // Clear latestMessage reference and clearedHistory in Chat
      chat.latestMessage = null;
      chat.clearedHistory = [];
      await chat.save();

      // Notify all members via socket to clear their UI messages
      if (req.io) {
        chat.members.forEach(memberId => {
          req.io.to(`user_${memberId.toString()}`).emit('chat_history_cleared', { chatId });
        });
      }
      return res.json({ message: 'Chat history deleted permanently from database.' });
    }

    // Add user history clear entry
    if (!chat.clearedHistory) {
      chat.clearedHistory = [];
    }
    const clearedIndex = chat.clearedHistory.findIndex(
      entry => entry.user.toString() === req.user._id.toString()
    );
    if (clearedIndex > -1) {
      chat.clearedHistory[clearedIndex].clearedAt = new Date();
    } else {
      chat.clearedHistory.push({
        user: req.user._id,
        clearedAt: new Date()
      });
    }
    await chat.save();

    // Notify only the clearing user via socket to clear their UI messages
    if (req.io) {
      req.io.to(`user_${req.user._id.toString()}`).emit('chat_history_cleared', { chatId });
    }

    res.json({ message: 'Chat history cleared successfully.' });
  } catch (error) {
    console.error('Clear Chat History Error:', error);
    res.status(500).json({ error: 'Internal server error while clearing chat history.' });
  }
});

// Update group settings (group name and group photo)
router.post('/:chatId/update', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { name, groupPic } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    if (!chat.isGroup) {
      return res.status(400).json({ error: 'Cannot update settings of a direct chat.' });
    }

    // Only creator or admin members can update group settings
    const isAdmin = chat.adminMembers.includes(req.user._id.toString()) || chat.creator.toString() === req.user._id.toString() || req.user.isAdmin;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied. Only group admins can update group settings.' });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'Group name cannot be empty.' });
      }
      chat.name = name.trim();
    }

    if (groupPic !== undefined) {
      chat.groupPic = groupPic;
    }

    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('members', 'username profilePic status isAdmin blockedUsers')
      .populate('creator', 'username');

    // Notify all members via socket to update their UI
    if (req.io) {
      // 1. Notify the group room
      req.io.to(chatId).emit('chat_members_updated', updatedChat);
      
      // 2. Notify each member individually to update their sidebar
      updatedChat.members.forEach(member => {
        const memberId = member._id ? member._id.toString() : member.toString();
        req.io.to(`user_${memberId}`).emit('chat_members_updated', updatedChat);
      });
    }

    res.json(updatedChat);
  } catch (error) {
    console.error('Update Group Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Delete Chat Box / Conversation
router.delete('/:chatId', auth, async (req, res) => {
  try {
    const { chatId } = req.params;

    // Check if chat exists and if user is a member
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    if (!chat.members.includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this chat.' });
    }

    // If the deleting user is the Root user, permanently delete the conversation and all messages from the database!
    if (req.user.role === 'Root') {
      const members = chat.members;
      await Message.deleteMany({ chat: chatId });
      await Chat.findByIdAndDelete(chatId);

      // Notify all members via socket that the chat was deleted
      if (req.io) {
        members.forEach(memberId => {
          req.io.to(`user_${memberId.toString()}`).emit('chat_deleted', { chatId });
        });
      }
      return res.json({ message: 'Conversation deleted permanently from database.' });
    }

    // Soft-delete/hide the chat box for the current user
    if (!chat.hiddenBy) {
      chat.hiddenBy = [];
    }
    if (!chat.hiddenBy.includes(req.user._id)) {
      chat.hiddenBy.push(req.user._id);
    }

    // Automatically soft-clear history for this user as well
    if (!chat.clearedHistory) {
      chat.clearedHistory = [];
    }
    const clearedIndex = chat.clearedHistory.findIndex(
      entry => entry.user.toString() === req.user._id.toString()
    );
    if (clearedIndex > -1) {
      chat.clearedHistory[clearedIndex].clearedAt = new Date();
    } else {
      chat.clearedHistory.push({
        user: req.user._id,
        clearedAt: new Date()
      });
    }

    await chat.save();

    // Notify the user who deleted/hid the chat box
    if (req.io) {
      req.io.to(`user_${req.user._id}`).emit('chat_deleted', { chatId });
    }

    return res.json({ message: 'Chat removed successfully.' });
  } catch (error) {
    console.error('Delete Chat Error:', error);
    res.status(500).json({ error: 'Internal server error while deleting chat.' });
  }
});

export default router;

