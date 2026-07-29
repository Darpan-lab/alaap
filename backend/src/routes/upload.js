import express from 'express';
import multer from 'multer';
import path from 'path';
import https from 'https';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Configure storage for multer without modifying the quality of files (direct save)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique name but preserve original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for high-quality photos/videos
  }
});

// Single file upload endpoint
router.post('/', auth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // Return file details so it can be sent in a message
    // Note: The frontend will access this via http://localhost:5000/uploads/filename
    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      message: 'File uploaded successfully without quality loss.',
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size
    });
  } catch (error) {
    console.error('File Upload Error:', error);
    res.status(500).json({ error: 'Internal server error during file upload.' });
  }
});

// GET YouTube Thumbnail Proxy to bypass CORS policies
router.get('/proxy-thumb', (req, res) => {
  const { videoId } = req.query;
  if (!videoId) {
    return res.status(400).json({ error: 'videoId query parameter is required.' });
  }

  const url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  https.get(url, (response) => {
    if (response.statusCode !== 200) {
      return res.status(response.statusCode).json({ error: 'Failed to fetch thumbnail from YouTube.' });
    }

    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    response.pipe(res);
  }).on('error', (err) => {
    console.error('YT Proxy Error:', err);
    res.status(500).json({ error: 'Error proxying YouTube thumbnail.' });
  });
});

export default router;
