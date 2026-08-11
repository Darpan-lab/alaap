# Alaap - Real-Time Communication Messenger

Alaap is a full-stack real-time communication platform featuring instant messaging, media sharing, socket-driven chat, and LiveKit audio/video conferencing.

---

## 🏗️ Architecture Stack

- **Backend**: Node.js, Express, Socket.io, Mongoose (MongoDB ORM), JWT Authentication.
- **Frontend**: React (Vite), Socket.io Client, LiveKit Components React.
- **Database**: MongoDB (Community Edition or Docker).
- **Process Manager**: Systemd (`alaap.service`) or `pm2` / `nohup`.
- **Web Server & Reverse Proxy**: Nginx with SSL (Let's Encrypt / Certbot).

---

## 📋 System Prerequisites

Before deploying on a Linux server (Ubuntu 20.04 / 22.04 LTS recommended):

- Linux server with `sudo` access.
- Node.js `v18.x` or `v20.x` LTS and `npm`.
- MongoDB `v6.0+` or Docker.
- Nginx Web Server.
- Domain name pointed to your server IP (for SSL/HTTPS).

---

## 🚀 Deployment Guide

### Step 1: Clone Repository & Directory Setup

Clone the repository to your desired path on your server:

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

If using Docker:
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

2. Create `.env` configuration file:
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
   ```

3. Create uploads storage directory with proper permissions:
   ```bash
   mkdir -p uploads
   chmod -R 775 uploads
   ```

---

## ⚡ Temporary & Development Run Guide (Without Systemd Service)

If you are developing locally, testing changes, or running temporarily without installing a systemd background service, use any of the options below:

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

Test the production-compiled frontend assets:

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

### Option 3: Temporary Background Execution (No Systemd required)

#### Method A: Process Manager (`pm2` - Recommended for Quick Persistence)
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

#### Method B: Standard Linux `nohup`
```bash
# Start backend in background
cd /path/to/alaap/backend
nohup npm start > backend.log 2>&1 &

# Start frontend dev server in background
cd /path/to/alaap/frontend
nohup npm run dev > frontend.log 2>&1 &
```

#### Method C: Using `tmux` / `screen` Session
```bash
tmux new -s alaap
# Run backend and frontend in tmux panes, then press Ctrl+B then D to detach
# Re-attach anytime:
tmux attach -t alaap
```

---

## ⚙️ Production Background Service (`alaap.service`)

To keep the backend running automatically in the background on Linux servers, configure a **systemd** service unit.

### 1. The Service Unit Template (`alaap.service`)

A generic template file `alaap.service` is located in the repository root:

```ini
[Unit]
Description=Alaap Chat Application Service
After=network.target mongodb.service mongod.service docker.service
Wants=mongodb.service mongod.service

[Service]
Type=simple
# User account running the process (e.g., ubuntu, deploy, www-data)
User=your_system_user
Group=your_system_user

# Absolute path to backend directory
WorkingDirectory=/path/to/alaap/backend

# Path to Node.js binary (check with 'which node')
ExecStart=/usr/bin/node src/server.js

# Restart policy
Restart=always
RestartSec=5

# Absolute path to backend .env file
EnvironmentFile=/path/to/alaap/backend/.env

# Logging settings
StandardOutput=journal
StandardError=journal
SyslogIdentifier=alaap

[Install]
WantedBy=multi-user.target
```

### 2. Service File Directives Explained

| Directive | Description |
|---|---|
| `After=` | Ensures the service starts *after* networking and MongoDB are ready. |
| `User=` / `Group=` | Linux user account running the process (avoids running as root). |
| `WorkingDirectory=` | Absolute path to backend folder where `server.js` resides. |
| `ExecStart=` | Full path to command execution (`/usr/bin/node src/server.js`). |
| `Restart=always` | Automatically restarts backend if it crashes or terminates. |
| `RestartSec=5` | Waits 5 seconds before restart attempt. |
| `EnvironmentFile=` | Loads environment variables directly from `backend/.env`. |
| `SyslogIdentifier=` | Tags log entries in system journal (`journalctl -u alaap -f`). |

### 3. Install & Manage Service

```bash
# 1. Copy unit file to systemd directory
sudo cp /path/to/alaap/alaap.service /etc/systemd/system/alaap.service

# 2. Update placeholders (User, WorkingDirectory, EnvironmentFile) inside /etc/systemd/system/alaap.service
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

*(Log in immediately after deployment and update password in account settings).*
