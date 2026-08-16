import express from 'express';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import Setting from '../models/Setting.js';
import VideoDeletionRequest from '../models/VideoDeletionRequest.js';
import ExternalVideo from '../models/ExternalVideo.js';
import { auth, adminAuth } from '../middleware/auth.js';
import { clearJellyfinCache } from './jellyfin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const externalDir = path.join(__dirname, '../../uploads/external');

const router = express.Router();

// Helper to get or create setting
export const getSetting = async (key, defaultValue) => {
  let setting = await Setting.findOne({ key });
  return setting ? setting.value : defaultValue;
};

export const getOrCreateSetting = async (key, defaultValue) => {
  let setting = await Setting.findOne({ key });
  if (!setting) {
    setting = new Setting({ key, value: defaultValue });
    await setting.save();
  }
  return setting.value;
};

// Update a setting
export const updateSetting = async (key, value) => {
  await Setting.findOneAndUpdate(
    { key },
    { value },
    { upsert: true, new: true }
  );
};

// GET Dashboard Stats & Configuration Settings
router.get('/settings', auth, adminAuth, async (req, res) => {
  try {
    const signupEnabled = await getOrCreateSetting('signupEnabled', true);
    const inviteOnlyEnabled = await getOrCreateSetting('inviteOnlyEnabled', false);
    const inviteCodes = await getOrCreateSetting('inviteCodes', []);
    const jellyfinUrl = await getOrCreateSetting('jellyfinUrl', '');
    const jellyfinUsername = await getOrCreateSetting('jellyfinUsername', '');
    const jellyfinPassword = await getOrCreateSetting('jellyfinPassword', '');
    const jellyfinEnabledSetting = await getOrCreateSetting('jellyfinEnabled', 'true');
    const jellyfinEnabled = String(jellyfinEnabledSetting) === 'true' || jellyfinEnabledSetting === true;

    const userCount = await User.countDocuments();
    const chatCount = await Chat.countDocuments();
    const messageCount = await Message.countDocuments();

    // Get all users for admin list
    const users = await User.find({})
      .select('username isAdmin role status profilePic jellyfinEnabled externalVideosEnabled externalVideosUploadEnabled createdAt')
      .sort({ createdAt: -1 });

    // Helper to get the primary / first root user (earliest created root user or earliest user in DB)
    const firstRootUser = await User.findOne({ role: 'Root' }).sort({ createdAt: 1 }) || await User.findOne().sort({ createdAt: 1 });

    const mappedUsers = users.map(u => {
      const uObj = u.toObject();
      const isFirst = firstRootUser && u._id.toString() === firstRootUser._id.toString();
      if (isFirst || (uObj.isAdmin && (!uObj.role || uObj.role === 'Regular'))) {
        uObj.role = 'Root';
      }
      uObj.isFirstRoot = isFirst;
      uObj.jellyfinEnabled = !!uObj.jellyfinEnabled;
      uObj.externalVideosEnabled = !!uObj.externalVideosEnabled;
      uObj.externalVideosUploadEnabled = !!uObj.externalVideosUploadEnabled;
      return uObj;
    });

    res.json({
      stats: {
        totalUsers: userCount,
        totalChats: chatCount,
        totalMessages: messageCount
      },
      settings: {
        signupEnabled,
        inviteOnlyEnabled,
        inviteCodes,
        jellyfinUrl,
        jellyfinUsername,
        jellyfinPassword: jellyfinPassword ? '********' : '',
        jellyfinEnabled
      },
      users: mappedUsers
    });
  } catch (error) {
    console.error('Admin Settings Fetch Error:', error);
    res.status(500).json({ error: 'Internal server error while fetching admin configuration.' });
  }
});

// Update registration settings & Jellyfin settings
router.post('/settings', auth, adminAuth, async (req, res) => {
  try {
    const { signupEnabled, inviteOnlyEnabled, jellyfinUrl, jellyfinUsername, jellyfinPassword, jellyfinEnabled } = req.body;

    if (signupEnabled !== undefined) {
      await updateSetting('signupEnabled', signupEnabled);
    }
    if (inviteOnlyEnabled !== undefined) {
      await updateSetting('inviteOnlyEnabled', inviteOnlyEnabled);
    }
    if (jellyfinUrl !== undefined) {
      await updateSetting('jellyfinUrl', jellyfinUrl);
    }
    if (jellyfinUsername !== undefined) {
      await updateSetting('jellyfinUsername', jellyfinUsername);
    }
    if (jellyfinPassword !== undefined && jellyfinPassword !== '********') {
      await updateSetting('jellyfinPassword', jellyfinPassword);
    }
    if (jellyfinEnabled !== undefined) {
      await updateSetting('jellyfinEnabled', jellyfinEnabled);
    }

    if (req.io) {
      req.io.emit('admin_settings_updated');
    }

    res.json({ message: 'Settings updated successfully.' });
  } catch (error) {
    console.error('Admin Settings Update Error:', error);
    res.status(500).json({ error: 'Internal server error while updating settings.' });
  }
});

// Generate a random Invite Code
router.post('/invite-codes', auth, adminAuth, async (req, res) => {
  try {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    let setting = await Setting.findOne({ key: 'inviteCodes' });
    if (!setting) {
      setting = new Setting({ key: 'inviteCodes', value: [code] });
    } else {
      setting.value.push(code);
      setting.markModified('value');
    }
    
    await setting.save();
    res.status(201).json({ code, inviteCodes: setting.value });
  } catch (error) {
    console.error('Invite Code Generation Error:', error);
    res.status(500).json({ error: 'Internal server error while generating invite code.' });
  }
});

// Delete an Invite Code
router.delete('/invite-codes/:code', auth, adminAuth, async (req, res) => {
  try {
    const { code } = req.params;
    
    const setting = await Setting.findOne({ key: 'inviteCodes' });
    if (setting) {
      setting.value = setting.value.filter(c => c !== code);
      setting.markModified('value');
      await setting.save();
    }
    
    res.json({ message: 'Invite code deleted successfully.', inviteCodes: setting ? setting.value : [] });
  } catch (error) {
    console.error('Invite Code Deletion Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Toggle User Jellyfin Permission (Root only)
router.put('/users/:userId/toggle-jellyfin', auth, adminAuth, async (req, res) => {
  try {
    const isRoot = req.user.role === 'Root' || (req.user.isAdmin && !req.user.role);
    if (!isRoot) {
      return res.status(403).json({ error: 'Only Root users can toggle Jellyfin permissions for users.' });
    }
    const { userId } = req.params;
    const { enabled } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    user.jellyfinEnabled = enabled !== undefined ? Boolean(enabled) : !user.jellyfinEnabled;
    await user.save();
    if (req.io) {
      req.io.emit('jellyfin_status_updated');
    }
    res.json({
      success: true,
      message: `Jellyfin access ${user.jellyfinEnabled ? 'enabled' : 'disabled'} for ${user.username}.`,
      jellyfinEnabled: user.jellyfinEnabled
    });
  } catch (error) {
    console.error('Toggle User Jellyfin Error:', error);
    res.status(500).json({ error: 'Failed to update user Jellyfin permission.' });
  }
});

// Toggle User External Videos Permission (Root only)
router.put('/users/:userId/toggle-external-videos', auth, adminAuth, async (req, res) => {
  try {
    const isRoot = req.user.role === 'Root' || (req.user.isAdmin && !req.user.role);
    if (!isRoot) {
      return res.status(403).json({ error: 'Only Root users can toggle External Videos permissions for users.' });
    }
    const { userId } = req.params;
    const { enabled } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    user.externalVideosEnabled = enabled !== undefined ? Boolean(enabled) : !user.externalVideosEnabled;
    if (!user.externalVideosEnabled) {
      user.externalVideosUploadEnabled = false; // Automatically disable upload if main access is disabled
    }
    await user.save();
    if (req.io) {
      req.io.emit('external_videos_status_updated');
    }
    res.json({
      success: true,
      message: `External videos access ${user.externalVideosEnabled ? 'enabled' : 'disabled'} for ${user.username}.`,
      externalVideosEnabled: user.externalVideosEnabled,
      externalVideosUploadEnabled: user.externalVideosUploadEnabled
    });
  } catch (error) {
    console.error('Toggle User External Videos Error:', error);
    res.status(500).json({ error: 'Failed to update user external videos permission.' });
  }
});

// Toggle User External Videos Upload Permission (Root only)
router.put('/users/:userId/toggle-external-videos-upload', auth, adminAuth, async (req, res) => {
  try {
    const isRoot = req.user.role === 'Root' || (req.user.isAdmin && !req.user.role);
    if (!isRoot) {
      return res.status(403).json({ error: 'Only Root users can toggle External Videos upload permissions.' });
    }
    const { userId } = req.params;
    const { enabled } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (!user.externalVideosEnabled && (enabled === true || (enabled === undefined && !user.externalVideosUploadEnabled))) {
      return res.status(400).json({ error: 'Cannot enable upload access when Server Folder access is disabled.' });
    }
    user.externalVideosUploadEnabled = enabled !== undefined ? Boolean(enabled) : !user.externalVideosUploadEnabled;
    await user.save();
    if (req.io) {
      req.io.emit('external_videos_status_updated');
    }
    res.json({
      success: true,
      message: `External videos upload access ${user.externalVideosUploadEnabled ? 'enabled' : 'disabled'} for ${user.username}.`,
      externalVideosUploadEnabled: user.externalVideosUploadEnabled
    });
  } catch (error) {
    console.error('Toggle User External Videos Upload Error:', error);
    res.status(500).json({ error: 'Failed to update user external videos upload permission.' });
  }
});

// Get all pending video deletion requests (Root only)
router.get('/video-deletion-requests', auth, adminAuth, async (req, res) => {
  try {
    const isRoot = req.user.role === 'Root' || (req.user.isAdmin && !req.user.role);
    if (!isRoot) {
      return res.status(403).json({ error: 'Only Root users can access video deletion requests.' });
    }

    const requests = await VideoDeletionRequest.find({ status: 'pending' })
      .populate('requestedBy', 'username role profilePic')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Fetch Video Deletion Requests Error:', error);
    res.status(500).json({ error: 'Failed to fetch video deletion requests.' });
  }
});

// Approve & Delete Video Request (Root only)
router.delete('/video-deletion-requests/:requestId', auth, adminAuth, async (req, res) => {
  try {
    const isRoot = req.user.role === 'Root' || (req.user.isAdmin && !req.user.role);
    if (!isRoot) {
      return res.status(403).json({ error: 'Only Root users can approve video deletions.' });
    }

    const { requestId } = req.params;
    const request = await VideoDeletionRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Deletion request not found.' });
    }

    // Delete physical file from /uploads/external/
    const filePath = path.join(externalDir, path.basename(request.filename));
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        console.error(`Failed to delete physical file ${request.filename}:`, err);
      }
    }

    // Delete request & any duplicate pending requests for same file
    await VideoDeletionRequest.deleteMany({ filename: request.filename });
    await ExternalVideo.deleteMany({ filename: request.filename });

    if (req.io) {
      req.io.emit('video_deletion_request_updated');
      req.io.emit('external_videos_status_updated');
    }

    res.json({
      success: true,
      message: `Video file "${request.filename}" deleted successfully.`
    });
  } catch (error) {
    console.error('Approve Video Deletion Error:', error);
    res.status(500).json({ error: 'Failed to delete video file.' });
  }
});

// Reject Video Deletion Request (Root only)
router.put('/video-deletion-requests/:requestId/reject', auth, adminAuth, async (req, res) => {
  try {
    const isRoot = req.user.role === 'Root' || (req.user.isAdmin && !req.user.role);
    if (!isRoot) {
      return res.status(403).json({ error: 'Only Root users can reject video deletion requests.' });
    }

    const { requestId } = req.params;
    const request = await VideoDeletionRequest.findByIdAndDelete(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Deletion request not found.' });
    }

    if (req.io) {
      req.io.emit('video_deletion_request_updated');
      req.io.emit('external_videos_status_updated');
    }

    res.json({
      success: true,
      message: `Deletion request for "${request.filename}" dismissed.`
    });
  } catch (error) {
    console.error('Reject Video Deletion Error:', error);
    res.status(500).json({ error: 'Failed to reject deletion request.' });
  }
});

// Create User by Admin
router.post('/users', auth, adminAuth, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const targetRole = role || 'Regular';

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (!['Regular', 'Admin', 'Root'].includes(targetRole)) {
      return res.status(400).json({ error: 'Invalid user class.' });
    }

    // If current user is an Admin, they can ONLY create a 'Regular' user
    if (req.user.role === 'Admin' && targetRole !== 'Regular') {
      return res.status(403).json({ error: 'Admins can only create Regular users.' });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      username: username.toLowerCase(),
      password: passwordHash,
      isAdmin: targetRole === 'Admin' || targetRole === 'Root',
      role: targetRole,
      status: 'offline'
    });

    await newUser.save();
    res.status(201).json({
      message: 'User created successfully.',
      user: {
        id: newUser._id,
        username: newUser.username,
        isAdmin: newUser.isAdmin,
        role: newUser.role,
        profilePic: newUser.profilePic,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Admin Create User Error:', error);
    res.status(500).json({ error: 'Internal server error while creating user.' });
  }
});

// Delete User by Admin
router.delete('/users/:userId', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: "You can't delete yourself" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const firstRootUser = await User.findOne({ role: 'Root' }).sort({ createdAt: 1 }) || await User.findOne().sort({ createdAt: 1 });
    if (firstRootUser && user._id.toString() === firstRootUser._id.toString()) {
      return res.status(403).json({ error: 'The primary system administrator account cannot be deleted.' });
    }

    if (req.user.role === 'Admin') {
      if (user.role === 'Root') {
        return res.status(403).json({ error: 'You do not have permission to delete root class user' });
      }
      if (user.role === 'Admin' || user.isAdmin) {
        return res.status(403).json({ error: 'You do not have permission to delete Admin class user' });
      }
    }

    // 1. Find all direct chats of this user, delete their messages, emit 'chat_deleted', and delete the chats
    const directChats = await Chat.find({
      isGroup: false,
      members: userId
    });
    const directChatIds = directChats.map(c => c._id);
    if (directChatIds.length > 0) {
      await Message.deleteMany({ chat: { $in: directChatIds } });
      await Chat.deleteMany({ _id: { $in: directChatIds } });

      // Notify the remaining member of each direct chat in real-time
      if (req.io) {
        directChats.forEach(chat => {
          chat.members.forEach(memberId => {
            const memStr = memberId.toString();
            if (memStr !== userId) {
              req.io.to(`user_${memStr}`).emit('chat_deleted', { chatId: chat._id });
            }
          });
        });
      }
    }

    // 2. Reassign creator in group chats if the deleted user was the creator
    const groupsWhereCreator = await Chat.find({ isGroup: true, creator: userId });
    for (const group of groupsWhereCreator) {
      const remainingMembers = group.members.filter(m => m.toString() !== userId);
      if (remainingMembers.length > 0) {
        group.creator = remainingMembers[0];
        if (!group.adminMembers.includes(remainingMembers[0].toString())) {
          group.adminMembers.push(remainingMembers[0]);
        }
        await group.save();
      }
    }

    // 3. Remove user from all group chats and notify remaining members of the group
    const groupChats = await Chat.find({ isGroup: true, members: userId });
    for (const group of groupChats) {
      group.members = group.members.filter(m => m.toString() !== userId);
      group.adminMembers = group.adminMembers.filter(m => m.toString() !== userId);
      await group.save();

      const updatedGroup = await Chat.findById(group._id)
        .populate('members', 'username profilePic status isAdmin')
        .populate('creator', 'username');

      if (req.io) {
        req.io.to(group._id.toString()).emit('chat_members_updated', updatedGroup);
      }
    }

    // 4. Clean up any empty group chats
    const emptyChats = await Chat.find({ members: { $size: 0 } });
    for (const chat of emptyChats) {
      await Message.deleteMany({ chat: chat._id });
      await Chat.findByIdAndDelete(chat._id);
    }

    // 5. Force-logout the deleted user if they are online
    if (req.io) {
      req.io.to(`user_${userId}`).emit('force_logout', { message: 'Your account has been deleted.' });
    }

    // 6. Delete the user
    await User.findByIdAndDelete(userId);

    res.json({ message: `User "${user.username}" deleted successfully.` });
  } catch (error) {
    console.error('Admin Delete User Error:', error);
    res.status(500).json({ error: 'Internal server error while deleting user.' });
  }
});

// Edit User Details by Admin
router.put('/users/:userId', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, password, role } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const firstRootUser = await User.findOne({ role: 'Root' }).sort({ createdAt: 1 }) || await User.findOne().sort({ createdAt: 1 });
    if (firstRootUser && user._id.toString() === firstRootUser._id.toString() && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'The primary system administrator account cannot be edited by other users.' });
    }

    if (req.user.role === 'Admin') {
      const isSelf = userId === req.user._id.toString();
      if (!isSelf) {
        if (user.role === 'Root') {
          return res.status(403).json({ error: 'You do not have permission to edit root class user' });
        }
        if (user.role === 'Admin' || user.isAdmin) {
          return res.status(403).json({ error: 'You do not have permission to edit Admin class user' });
        }
        if (role !== undefined && role !== 'Regular') {
          return res.status(403).json({ error: 'Admins cannot elevate user roles.' });
        }
      } else {
        if (role !== undefined && role !== user.role) {
          return res.status(403).json({ error: 'Admins cannot change their own user role.' });
        }
      }
    }

    // Handle username change
    if (username && username.toLowerCase() !== user.username) {
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ error: 'Username must be between 3 and 30 characters.' });
      }

      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }

      user.username = username.toLowerCase();
    }

    // Handle password change
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    // Handle role change
    if (role !== undefined) {
      if (!['Regular', 'Admin', 'Root'].includes(role)) {
        return res.status(400).json({ error: 'Invalid user class.' });
      }
      if (userId === req.user._id.toString() && role !== req.user.role) {
        return res.status(400).json({ error: 'You cannot change your own user class.' });
      }
      user.role = role;
      user.isAdmin = role === 'Admin' || role === 'Root';
    }

    await user.save();

    req.io.emit('user_updated', {
      _id: user._id,
      username: user.username,
      profilePic: user.profilePic,
      isAdmin: user.isAdmin,
      role: user.role
    });

    res.json({
      message: 'User updated successfully.',
      user: {
        id: user._id,
        username: user.username,
        isAdmin: user.isAdmin,
        role: user.role,
        profilePic: user.profilePic,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Admin Edit User Error:', error);
    res.status(500).json({ error: 'Internal server error while editing user.' });
  }
});

// GET all listed groups
router.get('/groups', auth, adminAuth, async (req, res) => {
  try {
    if (req.user.role === 'Admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const groups = await Chat.find({ isGroup: true })
      .populate('members', 'username profilePic status isAdmin')
      .populate('creator', 'username')
      .populate({
        path: 'latestMessage',
        populate: { path: 'sender', select: 'username profilePic' }
      })
      .sort({ createdAt: -1 });

    res.json(groups);
  } catch (error) {
    console.error('Admin Fetch Groups Error:', error);
    res.status(500).json({ error: 'Internal server error while fetching groups.' });
  }
});

// DELETE a group by Admin
router.delete('/groups/:groupId', auth, adminAuth, async (req, res) => {
  try {
    if (req.user.role === 'Admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const { groupId } = req.params;

    const chat = await Chat.findById(groupId);
    if (!chat) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    if (!chat.isGroup) {
      return res.status(400).json({ error: 'This chat is not a group.' });
    }

    const members = chat.members;
    await Message.deleteMany({ chat: groupId });
    await Chat.findByIdAndDelete(groupId);

    // Notify all members that chat was deleted
    if (req.io) {
      members.forEach(memberId => {
        req.io.to(`user_${memberId}`).emit('chat_deleted', { chatId: groupId });
      });
    }

    res.json({ message: 'Group deleted successfully by admin.' });
  } catch (error) {
    console.error('Admin Delete Group Error:', error);
    res.status(500).json({ error: 'Internal server error while deleting group.' });
  }
});

// GET Conversation between any two users
router.get('/conversation/:user1Id/:user2Id', auth, adminAuth, async (req, res) => {
  try {
    if (req.user.role === 'Admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const { user1Id, user2Id } = req.params;

    // Find the chat containing exactly these two members and is NOT a group chat
    const chat = await Chat.findOne({
      isGroup: false,
      members: { $all: [user1Id, user2Id], $size: 2 }
    });

    if (!chat) {
      return res.status(404).json({ error: 'No conversation history found between these two users.' });
    }

    const messages = await Message.find({ chat: chat._id })
      .populate('sender', 'username profilePic status')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username' }
      })
      .sort({ createdAt: 1 });

    res.json({
      chat,
      messages
    });
  } catch (error) {
    console.error('Admin Fetch Conversation Error:', error);
    res.status(500).json({ error: 'Internal server error while fetching conversation.' });
  }
});

// DELETE Conversation between two users permanently by Root
router.delete('/conversation/:chatId', auth, adminAuth, async (req, res) => {
  try {
    if (req.user.role === 'Admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const members = chat.members;
    await Message.deleteMany({ chat: chatId });
    await Chat.findByIdAndDelete(chatId);

    // Notify all members that chat was deleted
    if (req.io) {
      members.forEach(memberId => {
        req.io.to(`user_${memberId}`).emit('chat_deleted', { chatId });
      });
    }

    res.json({ message: 'Conversation deleted permanently.' });
  } catch (error) {
    console.error('Admin Delete Conversation Error:', error);
    res.status(500).json({ error: 'Internal server error while deleting conversation.' });
  }
});

// DELETE a message permanently by Root
router.delete('/messages/:messageId', auth, adminAuth, async (req, res) => {
  try {
    if (req.user.role === 'Admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found.' });
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

    // Notify all room members via socket
    if (req.io) {
      req.io.to(chatId).emit('message_deleted', { messageId, chatId, latestMessage });
    }

    res.json({ message: 'Message deleted permanently.', messageId, chatId, latestMessage });
  } catch (error) {
    console.error('Admin Delete Message Error:', error);
    res.status(500).json({ error: 'Internal server error while deleting message.' });
  }
});

export default router;
