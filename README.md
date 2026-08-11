# Alaap - Real-Time Communication Messenger

Alaap is a full-stack real-time communication platform featuring chat, media uploads, socket-based instant messaging, and LiveKit audio/video integration.

---

## 🏗️ Architecture Stack

- **Backend**: Node.js, Express, Socket.io, Mongoose (MongoDB ORM), JWT Authentication.
- **Frontend**: React (Vite), Socket.io Client, LiveKit Components React.
- **Database**: MongoDB (Community Edition or Docker).
- **Process Manager**: Systemd (`alaap.service`).
- **Web Server & Reverse Proxy**: Nginx with SSL (Let's Encrypt / Certbot).

---

## 📋 System Prerequisites

Before starting deployment on your Linux server (Ubuntu 20.04 / 22.04 LTS recommended):

- Linux Server with root or `sudo` access.
- Node.js `v18.x` or `v20.x` LTS and `npm`.
- MongoDB `v6.0+` or Docker.
- Nginx Web Server.
- Domain name pointed to your server IP (for SSL/HTTPS).

---

## 🚀 Step-by-Step Production Deployment Guide

### Step 1: Clone the Repository

Clone the project repository to your desired path on the server (e.g., `/home/darpanserver/alaap`):

```bash
cd /home/darpanserver
git clone https://github.com/your-username/alaap.git
cd alaap
```

---

### Step 2: Install & Start MongoDB

#### Option A: Install Native MongoDB Community Edition (Recommended)

1. Import the public key and add the MongoDB repository (Ubuntu 22.04 example):
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

3. Verify MongoDB is running:
   ```bash
   sudo systemctl status mongod
   ```

#### Option B: Run MongoDB via Docker Container

If you prefer using Docker:
```bash
sudo apt-get update && sudo apt-get install -y docker.io
sudo systemctl enable --now docker

# Run MongoDB container with restart policy
docker run -d \
  --name alaap-mongo \
  --restart always \
  -p 127.0.0.1:27017:27017 \
  -v mongo_data:/data/db \
  mongo:latest
```

---

### Step 3: Configure & Test the Backend

1. Navigate to the `backend` directory and install dependencies:
   ```bash
   cd /home/darpanserver/alaap/backend
   npm install --production
   ```

2. Create the environment configuration file `.env`:
   ```bash
   nano .env
   ```
   Add the following environment variables (adjust values as needed):
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/alaap
   JWT_SECRET=your_super_secret_jwt_key_change_in_production

   LIVEKIT_URL=wss://livekit.yourdomain.com
   LIVEKIT_API_KEY=your_livekit_api_key
   LIVEKIT_API_SECRET=your_livekit_api_secret
   ```

3. Ensure the uploads directory exists and has proper read/write permissions:
   ```bash
   mkdir -p uploads
   chmod -R 775 uploads
   ```

4. Test running the backend manually once:
   ```bash
   node src/server.js
   ```
   *Expected Output:*
   ```text
   Successfully connected to MongoDB.
   DATABASE IS EMPTY. SEEDED INITIAL ADMIN USER:
   Username: admin
   Password: admin123456
   --------------------------------------------------
   Server running on port 5000
   ```
   Press `Ctrl + C` to stop after confirming successful connection and database seeding.

---

### Step 4: Configure Systemd Background Service (`alaap.service`)

To keep the backend running automatically in the background, restart it on crashes, and manage it on server reboots, configure a Linux **systemd** service.

#### 1. Understand the Service File (`alaap.service`)

The repository includes a template `alaap.service` in the root directory:

```ini
[Unit]
Description=Alaap Chat Application Service
After=network.target mongodb.service mongod.service docker.service
Wants=mongodb.service mongod.service

[Service]
Type=simple
# User and group that runs the process
User=darpanserver
Group=darpanserver

# Absolute path to the backend directory
WorkingDirectory=/home/darpanserver/alaap/backend

# Path to Node.js executable (verify path using 'which node')
ExecStart=/usr/bin/node src/server.js

# Restart policy: automatically restart on failure
Restart=always
RestartSec=5

# Load environment variables from backend .env
EnvironmentFile=/home/darpanserver/alaap/backend/.env

# Logging configuration
StandardOutput=journal
StandardError=journal
SyslogIdentifier=alaap

[Install]
WantedBy=multi-user.target
```

#### 2. Service File Directives Explained

| Directive | Description |
|---|---|
| `After=` | Ensures the service starts *after* network services and MongoDB are up. |
| `User=` / `Group=` | Specifies the system user account that runs the Node.js process (avoid running as root). |
| `WorkingDirectory=` | Sets the working directory where `server.js` and relative paths reside. |
| `ExecStart=` | Full path to the executable command (`/usr/bin/node src/server.js`). |
| `Restart=always` | Automatically restarts the process if it exits unexpectedly or crashes. |
| `RestartSec=5` | Waits 5 seconds before attempting a restart. |
| `EnvironmentFile=` | Loads environment variables directly into the process environment. |
| `SyslogIdentifier=` | Tags logs in the system journal so you can easily view them via `journalctl`. |

#### 3. Install & Start the Systemd Service

1. Copy the unit file to `/etc/systemd/system/`:
   ```bash
   sudo cp /home/darpanserver/alaap/alaap.service /etc/systemd/system/alaap.service
   ```

2. Reload systemd daemon to recognize the new unit file:
   ```bash
   sudo systemctl daemon-reload
   ```

3. Enable the service to launch on system boot:
   ```bash
   sudo systemctl enable alaap
   ```

4. Start the service:
   ```bash
   sudo systemctl start alaap
   ```

5. Verify service status:
   ```bash
   sudo systemctl status alaap
   ```

#### 4. Managing and Inspecting Logs

- **View Live Streaming Logs**:
  ```bash
  journalctl -u alaap -f
  ```
- **View Recent 100 Log Lines**:
  ```bash
  journalctl -u alaap -n 100 --no-pager
  ```
- **Restart Service**:
  ```bash
  sudo systemctl restart alaap
  ```
- **Stop Service**:
  ```bash
  sudo systemctl stop alaap
  ```

---

### Step 5: Build & Deploy Frontend with Nginx

#### 1. Build Static Frontend Assets

```bash
cd /home/darpanserver/alaap/frontend
npm install
npm run build
```
This produces optimized production assets inside `/home/darpanserver/alaap/frontend/dist`.

#### 2. Configure Nginx Web Server

1. Install Nginx:
   ```bash
   sudo apt-get update
   sudo apt-get install -y nginx
   ```

2. Create a new Nginx configuration file:
   ```bash
   sudo nano /etc/nginx/sites-available/alaap
   ```

3. Paste the following configuration (replace `alaap.yourdomain.com` with your actual domain):
   ```nginx
   server {
       listen 80;
       server_name alaap.yourdomain.com;

       # Frontend Static Files
       root /home/darpanserver/alaap/frontend/dist;
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

       # Socket.io WebSockets Proxy
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

       # Static Media Uploads Proxy
       location /uploads/ {
           proxy_pass http://127.0.0.1:5000/uploads/;
           proxy_set_header Host $host;
           expires 30d;
           add_header Cache-Control "public, no-transform";
       }
   }
   ```

4. Enable the site and test configuration:
   ```bash
   sudo ln -s /etc/nginx/sites-available/alaap /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

#### 3. Secure with HTTPS (Let's Encrypt Certbot)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d alaap.yourdomain.com
```
Certbot will automatically obtain and install a free SSL certificate and configure HTTP to HTTPS redirection.

---

### Step 6: Configure Firewall (UFW)

Ensure basic firewall ports are allowed:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 🛠️ Service Quick Reference Cheat Sheet

| Command | Action |
|---|---|
| `sudo systemctl start alaap` | Start the backend service |
| `sudo systemctl stop alaap` | Stop the backend service |
| `sudo systemctl restart alaap` | Restart the backend service |
| `sudo systemctl status alaap` | Check status of the service |
| `sudo systemctl enable alaap` | Enable service on Linux boot |
| `journalctl -u alaap -f` | Tail backend logs in real-time |
| `sudo systemctl restart nginx` | Reload / Restart Nginx web server |
| `sudo systemctl status mongod` | Check status of MongoDB |

---

## 🔐 Default Credentials

When running for the first time against a fresh MongoDB instance, the server automatically creates an initial administrator account:

- **Username**: `admin`
- **Password**: `admin123456`

*(It is strongly recommended to log in immediately and change the admin password).*
