# Alaap - Real-Time Communication & Watch Party Platform

<p align="center">
  <strong>A modern, full-stack real-time collaboration suite featuring synchronized movie & video playback (SyncPlay), Jellyfin media server streaming, collaborative YouTube study sync, WebRTC voice rooms, and secure instant messaging.</strong>
</p>

---

## 🌟 Key Features

### 🍿 SyncPlay: Synchronized Movie & Video Watch Party
- **Frame-Accurate Synchronization**: Watch movies and videos together in direct or group chats. Play, pause, seek, and playback rate adjustments (0.5x to 3.0x) sync instantaneously across all participants via Socket.io.
- **Timeline Drift Detection & Force Sync**: Automatic detection of peer playback lag with continuous buffered range checks and a one-click **Force Sync** button to catch up immediately.
- **Double-Click Quick Skip**: Intuitive double-click on left/right sides of the player for smooth ±10-second jumps with visual ripple feedback.
- **Custom Player Controls & Timeline**: Custom scrubber with buffered segments visualization, volume popover slider, speed selectors, and fullscreen toggle.
- **Floating Video Chat (PiP Overlay)**: Continue conversing with friends or study partners using a draggable, resizable floating chat window directly on top of fullscreen video playback.
- **One-Click Frame Sharing**: Capture the exact currently playing video frame and send it directly into the chat for discussion or review.

---

### 🎬 Jellyfin Media Server Integration
- **Direct Library Browsing**: Connect your home Jellyfin media server right from the Alaap Control Center.
- **Browse Movies & TV Shows**: Explore personal movies, series, seasons, and episodes with rich poster art, metadata, and collection folders without leaving Alaap.
- **Group Synchronized Streaming**: Launch any movie or episode directly into the SyncPlay theater to watch together with friends and family over the internet.
- **Access Control**: Root and administrators can toggle Jellyfin integration globally or enable/disable access on a per-user basis.

---

### 📚 Synchronized YouTube Watch for Study & Collaboration
- **Learn Together in Real-Time**: Paste any YouTube lecture, tutorial, seminar, or documentary link to study collaboratively with classmates, study groups, or remote teams.
- **Background Download Pipeline (`yt-dlp`)**: High-performance backend downloading with live HUD telemetry tracking download speed, ETA, total size, and multi-stage progress (initializing, downloading, audio extraction, remuxing).
- **Concurrency & Race-Condition Lockout**: When a video is being fetched or processed, other members see a friendly lock status indicator showing who initiated the download, preventing duplicate conflicting downloads.
- **Collaborative Frame Annotations**: Pause key presentation slides or diagrams, capture the frame, and annotate directly using the built-in lightbox drawing canvas.

---

### 📁 Server Folder & Private Video Library
- **Dedicated Server Storage**: Upload and manage video files directly stored in `/backend/uploads/external/`.
- **Private Video Library**: Mark uploaded videos as **Private** so they remain strictly visible and playable only within that specific direct or group chat.
- **Uploader Transparency**: Every video card displays the uploader's name, file size, and video format tag.
- **Video Deletion Request Workflow**:
  - Regular users can request deletion of server folder videos directly from the video card.
  - Deletion requests with timestamp and requester details are forwarded to the **Alaap Control Center**.
  - Root administrators can review, approve, and delete requested videos one by one.
- **High-Speed Chunked Uploader**: Upload large video files with live percentage progress, ETA, transfer speed, and cancellation support.

---

### 🎙️ WebRTC Voice Rooms (LiveKit Powered)
- **High-Fidelity Audio Rooms**: Instant, low-latency crystal-clear voice calls integrated directly into any chat or group.
- **Watch & Talk Simultaneously**: Voice channels operate alongside SyncPlay so participants can discuss movies or study material hands-free.
- **Push-to-Talk ("M" key)**: Convenient keyboard shortcut for push-to-talk in addition to toggle microphone mode.
- **Active Speaker & Microphone Selection**: Visual speaking rings around avatars, active audio indicators, and seamless on-the-fly microphone device switching.
- **Dockable & Minimized Floating Bar**: Keep call controls pinned to the bottom of the workspace or expand into a dedicated room modal.

---

### 💬 Modern Instant Messaging & Rich Media
- **Direct & Group Chats**: Real-time 1-on-1 messaging and rich multi-member group channels with creator/admin hierarchy.
- **Media Attachments**: Share photos, voice messages with custom waveform players, videos, and generic documents.
- **Interactive Photo Annotation**: Open any shared photo in the lightbox viewer and sketch or highlight with customizable brush colors, sizes, and undo history before updating.
- **Reactions & Replies**: Quick emoji reaction picker on messages, reply previews, unread badges, typing indicators, and user presence dots (online/offline).
- **Chat Details & Danger Zone**: Inspect member lists, mute/unmute notifications, rename groups, change group avatars, clear chat histories, or block/unblock users.

---

### 🛡️ Alaap Control Center & Root Administration
- **User Role Management**: Tiered permissions for Root, Administrators, and Members.
- **Sign-Up Controls**: Enable or restrict public registration across the entire platform.
- **Feature Entitlements**: Enable or disable external video uploads and Jellyfin streaming per user account.
- **Real-Time Telemetry Dashboard**: Overview of registered users, active connections, and server storage metrics.

---

### 📱 Progressive Web App (PWA) & Flat Dark Blue UI
- **Installable PWA**: Install Alaap on Android, iOS, Windows, macOS, and Linux with full standalone app feel, splash screens, and auto-updating service worker caches.
- **Flat Modern Design**: A clean, distraction-free **Dark Blue** surface palette (`#050b1a` / `#081126`) paired with high-contrast **Trust Blue** (`#2563eb`) buttons.
- **Animated Welcome Splash**: Smooth rotating and pulsing ambient gradient background on the main home screen.

---

## 🏗️ Architecture Stack

- **Backend**: Node.js, Express, Socket.io, Mongoose (MongoDB ORM), JWT Authentication, `yt-dlp`, `@livekit/server-sdk`.
- **Frontend**: React 19, Vite, Socket.io Client, LiveKit Components React, Lucide Icons, Vite PWA Plugin.
- **Voice Infrastructure**: LiveKit WebRTC Server.
- **Database**: MongoDB (Community Edition or Docker).
- **Reverse Proxy**: Nginx with SSL (Let's Encrypt / Certbot).
- **Process Manager**: Systemd (`alaap.service`) or `pm2`.

---

## 📋 System Prerequisites

Before deploying on a Linux server (Ubuntu 20.04 / 22.04 LTS recommended):

- Linux server with `sudo` access.
- Node.js `v18.x` or `v20.x` LTS and `npm`.
- Python 3 & `yt-dlp` installed for video link processing.
- MongoDB `v6.0+` or Docker.
- Nginx Web Server.
- Domain name pointed to your server IP (for SSL/HTTPS & WebRTC microphone permissions).

---

## 🚀 Deployment Guide

### Step 1: Clone Repository & Directory Setup

```bash
cd /home/<username>
git clone https://github.com/<your-username>/alaap.git
cd alaap
```

---

### Step 2: Install & Start MongoDB

#### Option A: Native MongoDB Community Edition (Recommended)

1. Import public key and add MongoDB repository (Ubuntu 22.04 example):
   ```bash
   sudo apt-get install -y gnupg curl
   curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
      sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

   echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
      sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

   sudo apt-get update
   sudo apt-get install -y mongodb-org
   ```

2. Start and enable MongoDB on boot:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now mongod
   ```

3. Verify status:
   ```bash
   sudo systemctl status mongod
   ```

#### Option B: Docker Container

```bash
sudo apt-get update && sudo apt-get install -y docker.io
sudo systemctl enable --now docker

# Run MongoDB container with automatic restart
docker run -d \
  --name alaap-mongo \
  --restart always \
  -p 127.0.0.1:27017:27017 \
  -v mongo_data:/data/db \
  mongo:latest
```

---

### Step 3: Configure Backend Environment

1. Navigate to the `backend` directory and install dependencies:
   ```bash
   cd /path/to/alaap/backend
   npm install --production
   ```

2. Ensure `yt-dlp` is installed for YouTube and external video downloads:
   ```bash
   sudo apt-get install -y python3-pip
   sudo pip3 install -U yt-dlp
   ```

3. Create `.env` configuration file:
   ```bash
   cp .env.example .env 2>/dev/null || nano .env
   ```

   Add the following environment variables (replace placeholder values):
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/alaap
   JWT_SECRET=your_super_secret_jwt_key_change_in_production

   LIVEKIT_URL=wss://livekit.example.com
   LIVEKIT_API_KEY=your_livekit_api_key
   LIVEKIT_API_SECRET=your_livekit_api_secret

   # Optional: Default Jellyfin configuration (can also be configured from Control Center UI)
   JELLYFIN_URL=https://jellyfin.example.com
   JELLYFIN_API_KEY=your_jellyfin_api_key
   ```

4. Create uploads directories with proper permissions:
   ```bash
   mkdir -p uploads/external
   chmod -R 775 uploads
   ```

---

## ⚡ Temporary & Development Run Guide (Without Systemd)

### Option 1: Interactive Development Mode (Hot-Reloading)

Run both servers in separate terminal windows:

- **Backend (Terminal 1)**:
  ```bash
  cd /path/to/alaap/backend
  npm run dev
  # Uses nodemon to automatically restart on code updates
  ```

- **Frontend (Terminal 2)**:
  ```bash
  cd /path/to/alaap/frontend
  npm run dev
  # Launches Vite dev server at http://localhost:5173 with proxy to backend
  ```

---

### Option 2: Production Build & Local Preview

1. **Build Frontend**:
   ```bash
   cd /path/to/alaap/frontend
   npm run build
   ```
2. **Start Backend**:
   ```bash
   cd /path/to/alaap/backend
   npm start
   ```
3. **Preview Built Frontend**:
   ```bash
   cd /path/to/alaap/frontend
   npm run preview
   ```

---

### Option 3: Process Manager (`pm2`)

```bash
# Start backend
cd /path/to/alaap/backend
npx pm2 start src/server.js --name "alaap-backend"

# Build and serve frontend static files on port 5173
cd /path/to/alaap/frontend
npm run build
npx pm2 serve dist 5173 --spa --name "alaap-frontend"

# Manage processes
npx pm2 status
npx pm2 logs
npx pm2 stop all
```

---

## ⚙️ Production Background Service (`alaap.service`)

To keep the backend running automatically in the background on Linux servers, configure a **systemd** service unit.

### 1. The Service Unit Template (`alaap.service`)

```ini
[Unit]
Description=Alaap Chat Application Service
After=network.target mongodb.service mongod.service docker.service
Wants=mongodb.service mongod.service

[Service]
Type=simple
User=your_system_user
Group=your_system_user

WorkingDirectory=/path/to/alaap/backend
ExecStart=/usr/bin/node src/server.js

Restart=always
RestartSec=5

EnvironmentFile=/path/to/alaap/backend/.env

StandardOutput=journal
StandardError=journal
SyslogIdentifier=alaap

[Install]
WantedBy=multi-user.target
```

### 2. Install & Manage Service

```bash
# 1. Copy unit file to systemd directory
sudo cp /path/to/alaap/alaap.service /etc/systemd/system/alaap.service

# 2. Update placeholders (User, WorkingDirectory, EnvironmentFile)
sudo nano /etc/systemd/system/alaap.service

# 3. Reload systemd daemon
sudo systemctl daemon-reload

# 4. Enable service on system boot and start it now
sudo systemctl enable --now alaap

# 5. Check status
sudo systemctl status alaap

# 6. Tail live logs
journalctl -u alaap -f
```

---

## 🌐 Nginx Reverse Proxy & SSL Setup

### 1. Build Static Assets
```bash
cd /path/to/alaap/frontend
npm install
npm run build
```

### 2. Configure Nginx Server Block

Create configuration file `/etc/nginx/sites-available/alaap`:

```nginx
server {
    listen 80;
    server_name alaap.example.com;

    # Static Frontend Assets
    root /path/to/alaap/frontend/dist;
    index index.html;

    client_max_body_size 500M;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSockets Proxy (Socket.io)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploaded Media Proxy
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000/uploads/;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

Enable site & reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/alaap /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Obtain Free SSL Certificate (Certbot)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d alaap.example.com
```

---

## 🔒 Firewall Setup (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 🛠️ Service Quick Reference

| Command | Description |
|---|---|
| `sudo systemctl start alaap` | Start systemd backend service |
| `sudo systemctl stop alaap` | Stop systemd backend service |
| `sudo systemctl restart alaap` | Restart systemd backend service |
| `sudo systemctl status alaap` | Check background service status |
| `journalctl -u alaap -f` | Tail live backend logs |
| `sudo systemctl reload nginx` | Reload Nginx configuration |

---

## 🔑 Default Administrator Credentials

On first run with an empty MongoDB database, an initial admin user is created automatically:

- **Username**: `admin`
- **Password**: `admin123456`

*(Log in immediately after deployment and update your password in account settings).*
