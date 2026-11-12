import express from 'express';
import { Readable } from 'stream';
import { auth } from '../middleware/auth.js';
import { getSetting } from './admin.js';

const router = express.Router();

export const getJellyfinConfig = async () => {
  const jellyfinUrl = await getSetting('jellyfinUrl', '');
  const jellyfinUsername = await getSetting('jellyfinUsername', '');
  const jellyfinPassword = await getSetting('jellyfinPassword', '');
  const jellyfinApiKey = await getSetting('jellyfinApiKey', '');
  const cleanUrl = jellyfinUrl ? jellyfinUrl.replace(/\/+$/, '') : '';
  return {
    jellyfinUrl: cleanUrl,
    jellyfinUsername: jellyfinUsername ? jellyfinUsername.trim() : '',
    jellyfinPassword: jellyfinPassword ? jellyfinPassword.trim() : '',
    jellyfinApiKey: jellyfinApiKey ? jellyfinApiKey.trim() : '',
    isConfigured: !!(cleanUrl && (jellyfinUsername || jellyfinApiKey))
  };
};

let cachedToken = null;
let cachedUserId = null;

export const clearJellyfinCache = () => {
  cachedToken = null;
  cachedUserId = null;
};

export const makeAuthHeaders = (token, extraHeaders = {}) => {
  const headers = {
    'Accept': 'application/json',
    ...extraHeaders
  };
  if (token) {
    headers['Authorization'] = `MediaBrowser Token="${token}"`;
    headers['X-Emby-Token'] = token;
  }
  return headers;
};

export const getJellyfinAuth = async (config) => {
  if (cachedToken && cachedUserId) {
    return { token: cachedToken, userId: cachedUserId };
  }

  if (!config.jellyfinUrl) {
    throw new Error('Jellyfin server URL is not configured. Please set it in Alaap Control Center.');
  }

  // 1. Try API Key authentication if provided or if password looks like an API key token
  const candidateApiKey = config.jellyfinApiKey || (config.jellyfinPassword && /^[a-fA-F0-9]{32,}$/.test(config.jellyfinPassword) ? config.jellyfinPassword : null);

  if (candidateApiKey) {
    try {
      const usersRes = await fetch(`${config.jellyfinUrl}/Users`, {
        headers: makeAuthHeaders(candidateApiKey)
      });
      if (usersRes.ok) {
        const usersList = await usersRes.json();
        if (Array.isArray(usersList) && usersList.length > 0) {
          let targetUser = null;
          if (config.jellyfinUsername) {
            targetUser = usersList.find(u => u.Name && u.Name.toLowerCase() === config.jellyfinUsername.toLowerCase());
          }
          if (!targetUser) {
            targetUser = usersList.find(u => u.Policy?.IsAdministrator) || usersList[0];
          }
          cachedToken = candidateApiKey;
          cachedUserId = targetUser.Id || targetUser.id;
          return { token: cachedToken, userId: cachedUserId };
        }
      }
    } catch (apiErr) {
      console.warn('[Jellyfin] API key test failed:', apiErr.message);
    }
  }

  // 2. Try Username & Password authentication via AuthenticateByName
  if (!config.jellyfinUsername) {
    throw new Error('Please configure either a Jellyfin Account Username & Password, or an API Key in Alaap Control Center.');
  }

  const authUrl = `${config.jellyfinUrl}/Users/AuthenticateByName`;
  const authHeader = 'MediaBrowser Client="Alaap", Device="Server", DeviceId="Alaap-Server-SyncPlay", Version="1.0.0"';

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': authHeader,
      'X-Emby-Authorization': authHeader
    },
    body: JSON.stringify({
      Username: config.jellyfinUsername,
      Pw: config.jellyfinPassword || ''
    })
  });

  if (!response.ok) {
    clearJellyfinCache();
    const errText = await response.text().catch(() => '');
    console.error(`Jellyfin authentication error (${response.status}):`, errText);

    // If AuthenticateByName returned 400 or 401, check if config.jellyfinPassword was an API key
    if (config.jellyfinPassword && config.jellyfinPassword !== candidateApiKey) {
      try {
        const fallbackRes = await fetch(`${config.jellyfinUrl}/Users`, {
          headers: makeAuthHeaders(config.jellyfinPassword)
        });
        if (fallbackRes.ok) {
          const uList = await fallbackRes.json();
          if (Array.isArray(uList) && uList.length > 0) {
            const targetUser = uList.find(u => u.Name && u.Name.toLowerCase() === config.jellyfinUsername.toLowerCase()) || uList[0];
            cachedToken = config.jellyfinPassword;
            cachedUserId = targetUser.Id || targetUser.id;
            return { token: cachedToken, userId: cachedUserId };
          }
        }
      } catch (e) {}
    }

    let detail = '';
    if (response.status === 401) {
      detail = 'Invalid username or password.';
    } else if (response.status === 400) {
      detail = `Jellyfin server rejected the request (HTTP 400): ${errText || 'Error processing request'}. Please check your credentials, or enter a Jellyfin API Key instead.`;
    } else {
      detail = errText || response.statusText;
    }
    throw new Error(`Jellyfin authentication failed for "${config.jellyfinUsername}": ${detail}`);
  }

  const data = await response.json();
  cachedToken = data.AccessToken;
  cachedUserId = data.User?.Id || data.User?.id;
  return { token: cachedToken, userId: cachedUserId };
};

export const checkJellyfinAccess = async (req, res) => {
  const config = await getJellyfinConfig();
  if (!config.isConfigured) {
    res.status(400).json({ error: 'Jellyfin server is not configured in Alaap Control Center.' });
    return false;
  }
  const globalVal = await getSetting('jellyfinEnabled', 'true');
  const globalEnabled = String(globalVal) === 'true' || globalVal === true;
  if (!globalEnabled) {
    res.status(403).json({ error: 'Jellyfin integration is currently disabled by system administrator.', disabled: true, reason: 'global' });
    return false;
  }
  const isRoot = req.user?.role === 'Root' || (req.user?.isAdmin && !req.user?.role);
  const userEnabled = isRoot ? true : Boolean(req.user?.jellyfinEnabled);
  if (!userEnabled) {
    res.status(403).json({ error: 'Jellyfin feature is not enabled for your account. Please contact administrator.', disabled: true, reason: 'user' });
    return false;
  }
  return true;
};

// GET /api/jellyfin/status - Check if Jellyfin is configured
router.get('/status', auth, async (req, res) => {
  try {
    const config = await getJellyfinConfig();
    const globalVal = await getSetting('jellyfinEnabled', 'true');
    const globalEnabled = String(globalVal) === 'true' || globalVal === true;
    const isRoot = req.user?.role === 'Root' || (req.user?.isAdmin && !req.user?.role);
    const userEnabled = isRoot ? true : Boolean(req.user?.jellyfinEnabled);
    const canUseJellyfin = config.isConfigured && globalEnabled && userEnabled;

    res.json({
      configured: config.isConfigured,
      serverUrl: config.jellyfinUrl ? config.jellyfinUrl : '',
      globalEnabled,
      userEnabled,
      canUseJellyfin
    });
  } catch (error) {
    console.error('Jellyfin Status Error:', error);
    res.status(500).json({ error: 'Failed to check Jellyfin configuration status.' });
  }
});

// POST /api/jellyfin/test - Test Jellyfin connection & account credentials
router.post('/test', auth, async (req, res) => {
  try {
    const { jellyfinUrl, jellyfinUsername, jellyfinPassword, jellyfinApiKey } = req.body;
    let config;
    if (jellyfinUrl && (jellyfinUsername !== undefined || jellyfinApiKey !== undefined)) {
      config = {
        jellyfinUrl: jellyfinUrl.replace(/\/+$/, ''),
        jellyfinUsername: jellyfinUsername ? jellyfinUsername.trim() : '',
        jellyfinPassword: (jellyfinPassword && jellyfinPassword !== '********') ? jellyfinPassword.trim() : (await getSetting('jellyfinPassword', '')),
        jellyfinApiKey: (jellyfinApiKey && jellyfinApiKey !== '********') ? jellyfinApiKey.trim() : (await getSetting('jellyfinApiKey', ''))
      };
    } else {
      config = await getJellyfinConfig();
    }

    if (!config.jellyfinUrl || (!config.jellyfinUsername && !config.jellyfinApiKey)) {
      return res.status(400).json({ error: 'Please provide Jellyfin Server Address and either Account Username or API Key.' });
    }

    clearJellyfinCache();
    const { token, userId } = await getJellyfinAuth(config);
    
    // Fetch views / granted libraries for this user
    const url = `${config.jellyfinUrl}/Users/${userId}/Views`;
    const response = await fetch(url, {
      headers: makeAuthHeaders(token)
    });
    
    if (!response.ok) {
      throw new Error(`Connected but failed to fetch libraries: ${response.statusText}`);
    }

    const data = await response.json();
    const libraries = (data.Items || []).map(item => item.Name);

    res.json({
      success: true,
      message: `Successfully connected & authenticated as "${config.jellyfinUsername || 'API User'}"! Granted ${libraries.length} media ${libraries.length === 1 ? 'library' : 'libraries'}.`,
      libraries
    });
  } catch (error) {
    console.error('Jellyfin Connection Test Error:', error);
    res.status(400).json({ error: error.message || 'Failed to connect to Jellyfin server.' });
  }
});

// GET /api/jellyfin/libraries - Get User Libraries
router.get('/libraries', auth, async (req, res) => {
  try {
    if (!(await checkJellyfinAccess(req, res))) return;
    const config = await getJellyfinConfig();
    if (!config.jellyfinUrl) {
      return res.status(400).json({ error: 'Jellyfin server URL is not configured.' });
    }
    const { token, userId } = await getJellyfinAuth(config);
    
    const url = `${config.jellyfinUrl}/Users/${userId}/Views`;
    let response = await fetch(url, {
      headers: makeAuthHeaders(token)
    });
    
    if (response.status === 401) {
      clearJellyfinCache();
      const freshAuth = await getJellyfinAuth(config);
      response = await fetch(url, {
        headers: makeAuthHeaders(freshAuth.token)
      });
    }

    if (!response.ok) throw new Error('Failed to fetch user libraries from Jellyfin');
    const data = await response.json();
    
    const libraries = (data.Items || []).map(item => ({
      id: item.Id,
      name: item.Name,
      type: item.CollectionType
    }));
    
    res.json({ libraries });
  } catch (error) {
    console.error('Jellyfin Libraries Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Jellyfin libraries.' });
  }
});

// GET /api/jellyfin/items - Browse & Search Movies and Series from Jellyfin
router.get('/items', auth, async (req, res) => {
  try {
    if (!(await checkJellyfinAccess(req, res))) return;
    const config = await getJellyfinConfig();
    if (!config.jellyfinUrl) {
      return res.status(400).json({
        error: 'Jellyfin server URL is not configured yet. Root users can configure it in Alaap Control Center.',
        configured: false
      });
    }

    const { search = '', parentId = '', seasonId = '', type = '', libraryId = '' } = req.query;
    let url = '';

    const { token, userId } = await getJellyfinAuth(config);
    const authHeader = makeAuthHeaders(token);

    if (type === 'Seasons' && parentId) {
      // Fetch Seasons for a Series
      url = `${config.jellyfinUrl}/Shows/${parentId}/Seasons?UserId=${userId}&Fields=PrimaryImageAspectRatio,Overview`;
    } else if (type === 'Episodes' && parentId) {
      // Fetch Episodes for a Series/Season
      url = `${config.jellyfinUrl}/Shows/${parentId}/Episodes?UserId=${userId}&Fields=PrimaryImageAspectRatio,Overview,MediaSources,RunTimeTicks`;
      if (seasonId) {
        url += `&SeasonId=${seasonId}`;
      }
    } else {
      let includeTypes = 'Movie,Series,Video,MusicVideo';
      if (type === 'Movie') includeTypes = 'Movie';
      if (type === 'Series') includeTypes = 'Series';
      if (type === 'Episode') includeTypes = 'Episode';

      url = `${config.jellyfinUrl}/Users/${userId}/Items?Recursive=true&Fields=PrimaryImageAspectRatio,Overview,MediaSources,RunTimeTicks&Limit=200`;

      if (type !== 'All' && type !== 'Library') {
        url += `&IncludeItemTypes=${includeTypes}`;
      }

      const activeParent = parentId || libraryId;
      if (activeParent) {
        url += `&ParentId=${activeParent}`;
      }

      if (search && search.trim()) {
        url += `&SearchTerm=${encodeURIComponent(search.trim())}`;
      } else {
        url += `&SortBy=DateCreated,SortName&SortOrder=Descending`;
      }
    }

    const response = await fetch(url, { headers: authHeader });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jellyfin API response error:', response.status, errorText);
      return res.status(response.status).json({ error: `Jellyfin server error: ${response.statusText}` });
    }

    const data = await response.json();
    const rawItems = data.Items || [];

    const formattedItems = rawItems.map(item => {
      const isSeries = item.Type === 'Series';
      const isSeason = item.Type === 'Season';
      const isMovie = item.Type === 'Movie';
      const isEpisode = item.Type === 'Episode';
      const isFolder = item.IsFolder === true || item.Type === 'Folder' || item.Type === 'CollectionFolder' || item.Type === 'UserView' || item.Type === 'BoxSet';
      const isMedia = !isSeries && !isSeason && !isFolder;

      let title = item.Name || 'Untitled';
      if (isEpisode && item.SeriesName) {
        const season = item.ParentIndexNumber !== undefined ? `S${String(item.ParentIndexNumber).padStart(2, '0')}` : '';
        const ep = item.IndexNumber !== undefined ? `E${String(item.IndexNumber).padStart(2, '0')}` : '';
        title = `${item.SeriesName} ${season}${ep} - ${item.Name}`;
      }

      const hasPrimaryImage = !!(
        (item.ImageTags && item.ImageTags.Primary) ||
        item.PrimaryImageTag ||
        item.SeriesPrimaryImageTag ||
        (item.ImageTags && (item.ImageTags.Thumb || item.ImageTags.Banner || item.ImageTags.Backdrop)) ||
        item.SeriesId ||
        item.ParentBackdropItemId ||
        item.ParentPrimaryImageItemId
      );

      let imageItemId = item.Id;
      let imageType = 'Primary';

      if (item.ImageTags?.Primary || item.PrimaryImageTag) {
        imageItemId = item.Id;
        imageType = 'Primary';
      } else if (item.SeriesPrimaryImageTag || ((item.Type === 'Episode' || item.Type === 'Season') && item.SeriesId)) {
        imageItemId = item.SeriesId || item.Id;
        imageType = 'Primary';
      } else if (item.ImageTags?.Thumb) {
        imageType = 'Thumb';
      } else if (item.ImageTags?.Backdrop) {
        imageType = 'Backdrop';
      }

      return {
        id: item.Id,
        name: title,
        rawName: item.Name,
        type: item.Type,
        isFolder,
        overview: item.Overview || '',
        year: item.ProductionYear || null,
        seriesName: item.SeriesName || '',
        seriesId: item.SeriesId || (isSeries ? item.Id : null),
        seasonNumber: isSeason ? (item.IndexNumber !== undefined ? item.IndexNumber : null) : (item.ParentIndexNumber || null),
        episodeNumber: isEpisode ? (item.IndexNumber || null) : null,
        durationMs: item.RunTimeTicks ? Math.round(item.RunTimeTicks / 10000) : null,
        durationSec: item.RunTimeTicks ? item.RunTimeTicks / 10000000 : null,
        hasImage: hasPrimaryImage,
        imageUrl: hasPrimaryImage ? `/api/jellyfin/image/${imageItemId}?type=${imageType}` : null,
        streamUrl: isMedia ? `/api/jellyfin/stream/${item.Id}` : null
      };
    });

    res.json({
      configured: true,
      items: formattedItems
    });

  } catch (error) {
    console.error('Jellyfin Items Fetch Error:', error);
    res.status(500).json({ error: `Failed to fetch media from Jellyfin: ${error.message}` });
  }
});

// GET /api/jellyfin/image/:itemId - Proxy Primary/Thumb/Backdrop Poster Image
router.get('/image/:itemId', async (req, res) => {
  try {
    const config = await getJellyfinConfig();
    if (!config.jellyfinUrl) {
      return res.status(400).send('Jellyfin not configured');
    }

    const { type = 'Primary' } = req.query;
    const { token } = await getJellyfinAuth(config);
    const imgUrl = `${config.jellyfinUrl}/Items/${req.params.itemId}/Images/${type}?fillWidth=400&fillHeight=600&quality=90`;
    const response = await fetch(imgUrl, {
      headers: makeAuthHeaders(token)
    });

    if (!response.ok) {
      return res.status(response.status).send('Image not found');
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const nodeStream = Readable.fromWeb(response.body);
    nodeStream.pipe(res);
  } catch (error) {
    console.error('Jellyfin Image Proxy Error:', error);
    res.status(500).send('Error proxying image');
  }
});

// GET /api/jellyfin/stream/:itemId - Proxy Video Stream with HTTP Range Support
router.get('/stream/:itemId', async (req, res) => {
  try {
    const config = await getJellyfinConfig();
    if (!config.jellyfinUrl) {
      return res.status(400).json({ error: 'Jellyfin is not configured.' });
    }

    const { token } = await getJellyfinAuth(config);
    
    // Use direct play (static stream) instead of transcoding
    const videoUrl = `${config.jellyfinUrl}/Videos/${req.params.itemId}/stream?static=true`;

    const headers = makeAuthHeaders(token);
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const response = await fetch(videoUrl, { headers });

    res.status(response.status);

    ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach(h => {
      const val = response.headers.get(h);
      if (val) res.setHeader(h, val);
    });

    const nodeStream = Readable.fromWeb(response.body);
    nodeStream.pipe(res);
  } catch (error) {
    console.error('Jellyfin Stream Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream video from Jellyfin.' });
    }
  }
});

// GET /api/jellyfin/info/:itemId - Get metadata (including duration) for a Jellyfin media item
router.get('/info/:itemId', auth, async (req, res) => {
  try {
    const config = await getJellyfinConfig();
    if (!config.jellyfinUrl) {
      return res.status(400).json({ error: 'Jellyfin is not configured.' });
    }

    const { token, userId } = await getJellyfinAuth(config);
    const itemUrl = `${config.jellyfinUrl}/Users/${userId}/Items/${req.params.itemId}`;
    const response = await fetch(itemUrl, {
      headers: makeAuthHeaders(token)
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch Jellyfin item info' });
    }

    const item = await response.json();
    const durationSec = item.RunTimeTicks ? item.RunTimeTicks / 10000000 : 0;

    res.json({
      id: item.Id,
      name: item.Name,
      type: item.Type,
      duration: durationSec,
      durationMs: item.RunTimeTicks ? Math.round(item.RunTimeTicks / 10000) : null
    });
  } catch (error) {
    console.error('Jellyfin Item Info Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Jellyfin item info.' });
  }
});

export default router;
