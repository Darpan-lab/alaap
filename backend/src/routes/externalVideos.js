import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';
import VideoDeletionRequest from '../models/VideoDeletionRequest.js';
import ExternalVideo from '../models/ExternalVideo.js';
import Chat from '../models/Chat.js';

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
  if (!req.user) return { canUse: false, canUpload: false };
  if (req.user.role === 'Root') return { canUse: true, canUpload: true };
  const dbUser = await User.findById(req.user._id || req.user.id);
  if (!dbUser) return { canUse: false, canUpload: false };
  const isRoot = dbUser.role === 'Root';
  const canUse = isRoot || Boolean(dbUser.externalVideosEnabled);
  const canUpload = isRoot || (Boolean(dbUser.externalVideosEnabled) && Boolean(dbUser.externalVideosUploadEnabled));
  return { canUse, canUpload };
};

// Check user permission status
router.get('/status', auth, async (req, res) => {
  try {
    const perm = await checkPermission(req);
    res.json({
      canUseExternalVideos: perm.canUse,
      canUploadExternalVideos: perm.canUpload,
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
    const perm = await checkPermission(req);
    if (!perm.canUse) {
      return res.status(403).json({ error: 'You do not have permission to access external server videos.' });
    }

    if (!fs.existsSync(externalDir)) {
      fs.mkdirSync(externalDir, { recursive: true });
    }

    const activeChatId = req.query.chatId || null;
    const currentUserId = (req.user._id || req.user.id)?.toString();
    const isRoot = req.user.role === 'Root';

    const externalMetas = await ExternalVideo.find();
    const metaMap = new Map(externalMetas.map(m => [m.filename, m]));

    const pendingRequests = await VideoDeletionRequest.find({ status: 'pending' });
    const pendingSet = new Set(pendingRequests.map(r => r.filename));

    const files = await fs.promises.readdir(externalDir);
    const videoFiles = [];

    for (const filename of files) {
      const ext = path.extname(filename).toLowerCase();
      if (VIDEO_EXTENSIONS.has(ext)) {
        const filePath = path.join(externalDir, filename);
        try {
          const stats = await fs.promises.stat(filePath);
          if (stats.isFile()) {
            const meta = metaMap.get(filename);
            const isPrivate = meta ? Boolean(meta.isPrivate) : false;
            const videoChatId = meta?.chatId ? meta.chatId.toString() : null;
            const uploadedBy = meta?.uploadedBy ? meta.uploadedBy.toString() : null;
            const uploadedByName = meta?.uploadedByName || 'Server Admin';

            // Filter out private videos not belonging to this chat (unless uploader or Root)
            if (isPrivate) {
              const isUploader = currentUserId && uploadedBy && currentUserId === uploadedBy;
              const isSameChat = activeChatId && videoChatId && activeChatId.toString() === videoChatId;
              if (!isRoot && !isUploader && !isSameChat) {
                continue; // Skip private video
              }
            }

            videoFiles.push({
              filename,
              title: extractTitle(filename),
              size: stats.size,
              formattedSize: formatBytes(stats.size),
              updatedAt: stats.mtime,
              deletionRequested: pendingSet.has(filename),
              uploadedByName,
              uploadedBy,
              isPrivate,
              chatId: videoChatId,
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

// Submit a video deletion request (Any user with server folder access)
router.post('/request-delete', auth, async (req, res) => {
  try {
    const perm = await checkPermission(req);
    if (!perm.canUse) {
      return res.status(403).json({ error: 'You do not have permission to access external videos.' });
    }

    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required.' });
    }

    const filePath = path.join(externalDir, path.basename(filename));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found on server.' });
    }

    let request = await VideoDeletionRequest.findOne({ filename, status: 'pending' });
    if (request) {
      return res.status(400).json({ error: 'Deletion request already pending for this video file.' });
    }

    request = new VideoDeletionRequest({
      filename,
      requestedBy: req.user._id || req.user.id,
      status: 'pending'
    });

    await request.save();

    if (req.io) {
      req.io.emit('video_deletion_request_updated');
      req.io.emit('external_videos_status_updated');
    }

    res.json({
      success: true,
      message: 'Video deletion request submitted to Root administrator.',
      request
    });
  } catch (err) {
    console.error('Request video deletion error:', err);
    res.status(500).json({ error: 'Failed to submit video deletion request.' });
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
    const perm = await checkPermission(req);
    if (!perm.canUpload) {
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

      const isPrivate = req.body.isPrivate === 'true' || req.body.isPrivate === true;
      const chatId = req.body.chatId && req.body.chatId !== 'null' && req.body.chatId !== 'undefined' ? req.body.chatId : null;

      // Upsert ExternalVideo metadata record
      let meta = await ExternalVideo.findOne({ filename });
      if (!meta) {
        meta = new ExternalVideo({
          filename,
          uploadedBy: req.user._id || req.user.id,
          uploadedByName: req.user.username || 'User',
          isPrivate,
          chatId: isPrivate ? chatId : null
        });
      } else {
        meta.uploadedBy = req.user._id || req.user.id;
        meta.uploadedByName = req.user.username || 'User';
        meta.isPrivate = isPrivate;
        meta.chatId = isPrivate ? chatId : null;
      }
      await meta.save();

      const videoData = {
        filename,
        title: extractTitle(filename),
        size: stats.size,
        formattedSize: formatBytes(stats.size),
        updatedAt: stats.mtime,
        uploadedByName: meta.uploadedByName,
        uploadedBy: meta.uploadedBy,
        isPrivate: meta.isPrivate,
        chatId: meta.chatId,
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
