import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'alaap_super_secret_session_key_987654321_jwt');
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found. Authentication failed.' });
    }
    if (user.isAdmin && (!user.role || user.role === 'Regular')) {
      user.role = 'Root';
    }
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication token.' });
  }
};

export const adminAuth = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
};
