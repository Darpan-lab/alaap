import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const externalDir = path.join(__dirname, '../../uploads/external');
if (!fs.existsSync(externalDir)) {
  fs.mkdirSync(externalDir, { recursive: true });
}

// Multer storage for external videos upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(externalDir)) {
      fs.mkdirSync(externalDir, { recursive: true });
    }
    cb(null, externalDir);
  },
  filename: (req, file, cb) => {
    // Preserve original filename, replacing unsafe characters
    const originalName = file.originalname || 'video.mp4';
    const safeName = originalName.replace(/[^a-zA-Z0-9_.\-\s()]/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 * 1024 } // Up to 50 GB
});

const router = express.Router();

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4v', '.flv', '.ts', '.3gp', '.wmv']);

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function extractTitle(filename) {
  if (!filename) return 'Video';
  const ext = path.extname(filename);
  return path.basename(filename, ext);
}

const checkPermission = async (req) => {
  if (!req.user) return false;
  if (req.user.role === 'Root') return true;
  const dbUser = await User.findById(req.user._id || req.user.id);
  if (!dbUser) return false;
  return dbUser.role === 'Root' || Boolean(dbUser.externalVideosEnabled);
};

// Check user permission status
router.get('/status', auth, async (req, res) => {
  try {
    const allowed = await checkPermission(req);
    res.json({
      canUseExternalVideos: allowed,
      configured: true,
      globalEnabled: true
    });
  } catch (err) {
    console.error('External Videos status check error:', err);
    res.status(500).json({ error: 'Failed to check external videos status.' });
  }
});

// Get list of external videos
router.get('/list', auth, async (req, res) => {
  try {
    const allowed = await checkPermission(req);
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have permission to access external server videos.' });
    }

    if (!fs.existsSync(externalDir)) {
      fs.mkdirSync(externalDir, { recursive: true });
    }

    const files = await fs.promises.readdir(externalDir);
    const videoFiles = [];

    for (const filename of files) {
      const ext = path.extname(filename).toLowerCase();
      if (VIDEO_EXTENSIONS.has(ext)) {
        const filePath = path.join(externalDir, filename);
        try {
          const stats = await fs.promises.stat(filePath);
          if (stats.isFile()) {
            videoFiles.push({
              filename,
              title: extractTitle(filename),
              size: stats.size,
              formattedSize: formatBytes(stats.size),
              updatedAt: stats.mtime,
              url: `/api/external-videos/stream/${encodeURIComponent(filename)}`
            });
          }
        } catch (e) {
          console.warn(`Failed to stat file ${filename}:`, e);
        }
      }
    }

    videoFiles.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({
      success: true,
      videos: videoFiles
    });
  } catch (err) {
    console.error('Error fetching external videos list:', err);
    res.status(500).json({ error: 'Failed to list external videos.' });
  }
});

// Upload video file directly to /backend/uploads/external/
router.post('/upload', auth, async (req, res) => {
  // Prevent socket timeout during large file uploads (2GB+)
  req.setTimeout(0);
  if (req.socket) {
    req.socket.setTimeout(0);
    req.socket.setKeepAlive(true);
  }

  try {
    const allowed = await checkPermission(req);
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have permission to upload external videos.' });
    }

    upload.single('video')(req, res, async (err) => {
      if (err) {
        console.error('External video upload error:', err);
        return res.status(400).json({ error: err.message || 'Video upload failed.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No video file provided.' });
      }

      const filename = req.file.filename;
      const stats = await fs.promises.stat(req.file.path);

      const videoData = {
        filename,
        title: extractTitle(filename),
        size: stats.size,
        formattedSize: formatBytes(stats.size),
        updatedAt: stats.mtime,
        url: `/api/external-videos/stream/${encodeURIComponent(filename)}`
      };

      if (req.io) {
        req.io.emit('external_videos_list_updated');
      }

      res.json({
        success: true,
        message: 'Video uploaded successfully.',
        video: videoData
      });
    });
  } catch (err) {
    console.error('Error handling external video upload:', err);
    res.status(500).json({ error: 'Failed to upload video.' });
  }
});

// Serve external video file with HTTP 206 Range support & CORS headers for HTML5 video buffering
router.get('/stream/:filename', async (req, res) => {
  try {
    const rawFilename = req.params.filename;
    const filename = path.basename(decodeURIComponent(rawFilename));
    const filePath = path.join(externalDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found.' });
    }

    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap = {
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.m4v': 'video/mp4',
      '.flv': 'video/x-flv',
      '.ts': 'video/mp2t',
      '.3gp': 'video/3gpp'
    };
    const contentType = contentTypeMap[ext] || 'video/mp4';

    // CORS & Range exposure headers required for HTML5 <video crossOrigin="anonymous">
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type');
    res.setHeader('Accept-Ranges', 'bytes');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, Content-Type',
        'Cache-Control': 'public, max-age=3600'
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, Content-Type',
        'Cache-Control': 'public, max-age=3600'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('Error serving external video stream:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to serve video.' });
    }
  }
});

export default router;
