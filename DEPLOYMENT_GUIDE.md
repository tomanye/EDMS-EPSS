# EPSS EDRMS - On-Premises & Production Deployment Guide
### Enterprise Installation, Containerization, and Operations Manual
**Target Platform:** Ethiopian Pharmaceutical Supply Service (EPSS) On-Premises Data Center / Private Cloud  

---

## 1. System Requirements

### Recommended Hardware (Production Head Office)
- **CPU:** 8 Cores (x86_64 / amd64)
- **RAM:** 16 GB DDR4/DDR5
- **Storage:** 500 GB NVMe SSD (RAID-10 Recommended for `/data` persistence)
- **Network:** 1 Gbps redundant uplink, static public or government WAN IP

### Operating System & Prerequisites
- Ubuntu Server 22.04 LTS or 24.04 LTS (or RHEL 9 / Rocky Linux 9)
- Docker Engine 24.0+ and Docker Compose 2.20+
- OpenSSL (for SSL certificate generation/management)

---

## 2. Option A: Containerized Deployment (Recommended)

### Step 1: Clone and Configure Environment
```bash
git clone https://github.com/epss-gov-et/epss-edrms.git /opt/epss-edrms
cd /opt/epss-edrms

# Copy and configure environment variables
cp .env.example .env
nano .env
```
Ensure `.env` contains:
```env
NODE_ENV=production
PORT=3000
APP_URL=https://edrms.epss.gov.et
GEMINI_API_KEY=your_production_gemini_api_key
```

### Step 2: Configure SSL Certificates
Place your institutional TLS certificates in `/etc/nginx/ssl/` or create directory:
```bash
mkdir -p /opt/epss-edrms/ssl
# Copy your certificate and private key:
# epss_edrms.crt and epss_edrms.key
```

### Step 3: Launch with Docker Compose
```bash
docker compose up -d --build
```

### Step 4: Verify Service Health
```bash
docker compose ps
docker compose logs -f epss-app
curl -k https://localhost/api/v1/auth/session
```

---

## 3. Option B: Standalone Systemd Service Deployment

If deploying without containers on a bare-metal or virtual machine running Node.js:

### Step 1: Install Node.js 22 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Build Application
```bash
cd /opt/epss-edrms
npm install
npm run build
```

### Step 3: Configure Systemd Service
Create `/etc/systemd/system/epss-edrms.service`:
```ini
[Unit]
Description=EPSS EDRMS Application Server
After=network.target

[Service]
Type=simple
User=epss
WorkingDirectory=/opt/epss-edrms
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=APP_URL=https://edrms.epss.gov.et
EnvironmentFile=/opt/epss-edrms/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now epss-edrms
sudo systemctl status epss-edrms
```

---

## 4. Automated Backup Schedule (Cron)

Set up a root cron job to run the automated backup script every night at 02:00 AM:
```bash
chmod +x /opt/epss-edrms/scripts/backup.sh
crontab -e
```
Add the following line:
```cron
0 2 * * * /opt/epss-edrms/scripts/backup.sh >> /var/log/epss_backup.log 2>&1
```
