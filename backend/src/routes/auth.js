import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Setting from '../models/Setting.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Helper to get system settings
const getSetting = async (key, defaultValue) => {
  const setting = await Setting.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Get public registration settings (unauthenticated)
router.get('/signup-settings', async (req, res) => {
  try {
    const signupEnabled = await getSetting('signupEnabled', true);
    const inviteOnlyEnabled = await getSetting('inviteOnlyEnabled', false);
    res.json({ signupEnabled, inviteOnlyEnabled });
  } catch (error) {
    console.error('Fetch Signup Settings Error:', error);
    res.status(500).json({ error: 'Internal server error while fetching registration settings.' });
  }
});

// Register User
router.post('/register', async (req, res) => {
  try {
    const { username, password, inviteCode } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Check if registration is enabled
    const signupEnabled = await getSetting('signupEnabled', true);
    if (!signupEnabled) {
      return res.status(403).json({ error: 'Public registration is currently disabled by the administrator.' });
    }

    // Check if invite-only registration is enabled
    const inviteOnlyEnabled = await getSetting('inviteOnlyEnabled', false);
    if (inviteOnlyEnabled) {
      if (!inviteCode) {
        return res.status(400).json({ error: 'Invite-only mode is active. An invite code is required to register.' });
      }

      // Check if invite code is valid
      const inviteCodes = await getSetting('inviteCodes', []);
      if (!inviteCodes.includes(inviteCode)) {
        return res.status(400).json({ error: 'Invalid invite code.' });
      }

      // Remove the used invite code
      await Setting.findOneAndUpdate(
        { key: 'inviteCodes' },
        { $pull: { value: inviteCode } }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Check if this is the first user overall. If yes, make them Root.
    const userCount = await User.countDocuments();
    const isAdmin = userCount === 0;
    const role = isAdmin ? 'Root' : 'Regular';

    const user = new User({
      username: username.toLowerCase(),
      password: passwordHash,
      isAdmin,
      role,
      status: 'offline'
    });

    await user.save();

    // Create JWT Token
    const token = jwt.sign(
      { id: user._id, username: user.username, isAdmin: user.isAdmin, role: user.role },
      process.env.JWT_SECRET || 'alaap_super_secret_session_key_987654321_jwt',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: {
        id: user._id,
        username: user.username,
        isAdmin: user.isAdmin,
        role: user.role,
        profilePic: user.profilePic,
        status: user.status,
        blockedUsers: user.blockedUsers || []
      }
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials. User does not exist.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials. Incorrect password.' });
    }

    if (user.isAdmin && (!user.role || user.role === 'Regular')) {
      user.role = 'Root';
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, isAdmin: user.isAdmin, role: user.role },
      process.env.JWT_SECRET || 'alaap_super_secret_session_key_987654321_jwt',
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        username: user.username,
        isAdmin: user.isAdmin,
        role: user.role,
        profilePic: user.profilePic,
        status: user.status,
        blockedUsers: user.blockedUsers || []
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Get Current User Status
router.get('/me', auth, async (req, res) => {
  res.json({
    id: req.user._id,
    username: req.user.username,
    isAdmin: req.user.isAdmin,
    role: req.user.role,
    profilePic: req.user.profilePic,
    status: req.user.status,
    blockedUsers: req.user.blockedUsers || []
  });
});

export default router;
