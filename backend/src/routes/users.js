import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Search users by username (matches prefix/partial, case-insensitive, excludes self, and excludes users who blocked the current user)
router.get('/search', auth, async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    // Find users who have blocked the currently logged-in user
    const usersWhoBlockedMe = await User.find({ blockedUsers: req.user._id }).select('_id');
    const blockedByList = usersWhoBlockedMe.map(u => u._id);

    const users = await User.find({
      username: { $regex: username, $options: 'i' },
      _id: { 
        $ne: req.user._id, // exclude self
        $nin: blockedByList // exclude users who blocked me
      }
    })
    .select('username profilePic status isAdmin role')
    .limit(10);

    res.json(users);
  } catch (error) {
    console.error('Search Users Error:', error);
    res.status(500).json({ error: 'Internal server error while searching users.' });
  }
});

// Update Profile (Password & Profile Pic for all; Username only for Admins)
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, password, profilePic } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Handle username update
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

    // Handle password update
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    // Handle profile picture update
    if (profilePic !== undefined) {
      user.profilePic = profilePic;
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
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        username: user.username,
        isAdmin: user.isAdmin,
        profilePic: user.profilePic,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: 'Internal server error while updating profile.' });
  }
});

// Block a user
router.post('/block', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required to block.' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot block yourself.' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User to block not found.' });
    }

    if (targetUser.role === 'Root') {
      return res.status(400).json({ error: 'You cannot block the Root user.' });
    }

    // Add to blocked list if not already present
    await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { blockedUsers: userId } }
    );

    // Deactivate Sync Play in their direct chat if active
    const directChat = await Chat.findOne({
      isGroup: false,
      members: { $all: [req.user._id, userId] }
    });
    if (directChat && directChat.syncPlay && directChat.syncPlay.active) {
      directChat.syncPlay.active = false;
      await directChat.save();
      
      // Emit socket update to end sync play for anyone in that room
      req.io.to(directChat._id.toString()).emit('sync_play_toggled', {
        chatId: directChat._id.toString(),
        active: false,
        syncPlay: directChat.syncPlay
      });
    }

    // Notify participants in real-time
    req.io.to(`user_${req.user._id.toString()}`).emit('block_status_changed', {
      blockerId: req.user._id.toString(),
      blockedId: userId,
      isBlocked: true
    });
    req.io.to(`user_${userId}`).emit('block_status_changed', {
      blockerId: req.user._id.toString(),
      blockedId: userId,
      isBlocked: true
    });

    res.json({ message: `Blocked ${targetUser.username} successfully.` });
  } catch (error) {
    console.error('Block User Error:', error);
    res.status(500).json({ error: 'Internal server error while blocking user.' });
  }
});

// Unblock a user
router.post('/unblock', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required to unblock.' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User to unblock not found.' });
    }

    // Remove from blocked list
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { blockedUsers: userId } }
    );

    // Notify participants in real-time
    req.io.to(`user_${req.user._id.toString()}`).emit('block_status_changed', {
      blockerId: req.user._id.toString(),
      blockedId: userId,
      isBlocked: false
    });
    req.io.to(`user_${userId}`).emit('block_status_changed', {
      blockerId: req.user._id.toString(),
      blockedId: userId,
      isBlocked: false
    });

    res.json({ message: `Unblocked ${targetUser.username} successfully.` });
  } catch (error) {
    console.error('Unblock User Error:', error);
    res.status(500).json({ error: 'Internal server error while unblocking user.' });
  }
});

export default router;
