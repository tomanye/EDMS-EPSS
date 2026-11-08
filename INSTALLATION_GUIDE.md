# EPSS EDRMS - Developer & Sysadmin Installation Guide
### Local Environment Setup, Prerequisites, and System Initialization
**System:** Ethiopian Pharmaceutical Supply Service (EPSS) EDRMS  
**Audience:** Software Engineers, DevOps Engineers, and System Integrators  

---

## 1. System Requirements & Prerequisites

Before installing the EPSS EDRMS application, ensure your environment meets the following baseline requirements:

| Component | Minimum Requirement | Recommended |
|---|---|---|
| **Operating System** | Ubuntu 22.04 LTS, macOS 14+, Windows 11 (WSL2) | Ubuntu 24.04 LTS / RHEL 9 |
| **Node.js** | v20.12.0 LTS | v22.14.0 LTS |
| **npm** | v10.5.0 | v10.9.0 |
| **RAM** | 4 GB | 8 GB+ |
| **Storage** | 2 GB free disk space | 20 GB+ for local archives |
| **Network** | Outbound access on ports 80/443 | Low-latency LAN connection to regional hubs |

---

## 2. Step-by-Step Installation Procedure

### Step 2.1: Clone the Repository
```bash
git clone https://github.com/epss-gov-et/epss-edrms.git /opt/epss-edrms
cd /opt/epss-edrms
```

### Step 2.2: Configure Environment Variables
Copy the template `.env.example` to `.env`:
```bash
cp .env.example .env
```

Open `.env` and configure your settings:
```env
# Server Port (Default: 3000)
PORT=3000

# Base URL of the deployment (used in QR code verification seals)
APP_URL=http://localhost:3000

# Google Gemini API Key for smart document categorization & auto-extraction
# (Optional: the system automatically operates using internal rule-based heuristic extraction if omitted)
GEMINI_API_KEY=your_gemini_api_key_here

# Runtime environment
NODE_ENV=development
```

### Step 2.3: Install Dependencies
Install all required runtime and development packages:
```bash
npm install
```

### Step 2.4: Ensure Data Storage Directories
Ensure the persistent data and backup directories exist with write permissions:
```bash
mkdir -p data/backups data/uploads
chmod -R 755 data
```

---

## 3. Launching the Application

### Development Mode (with Live Reload & TypeScript Execution)
```bash
npm run dev
```
The server will initialize on port 3000:
```
EPSS EDRMS server running on port 3000 in development mode.
```
Access the application at `http://localhost:3000`.

### Type Checking & Linting
Validate all TypeScript interfaces and compile types:
```bash
npm run lint
```
Expected output:
```
$ tsc --noEmit
# Exits with status code 0
```

### Production Build & Launch
To verify the production compilation:
```bash
npm run build
npm start
```

---

## 4. Verifying the Installation

Test the application health and database connection using curl:

```bash
# 1. Check system health
curl -s http://localhost:3000/api/v1/health | jq .

# Expected Response:
# {
#   "status": "UP",
#   "system": "EPSS Enterprise EDRMS",
#   "database": {
#     "status": "Connected",
#     "branchesCount": 20,
#     "documentsCount": 6
#   }
# }

# 2. Verify all 20 branch hubs
curl -s http://localhost:3000/api/v1/organizations/branches | jq '.[0]'
```

---

## 5. Troubleshooting Common Issues

### Issue 1: Port 3000 Already in Use
**Symptom:** `Error: listen EADDRINUSE: address already in use :::3000`  
**Solution:** Either stop the conflicting process or change the port:
```bash
PORT=3005 npm run dev
```

### Issue 2: Permission Denied on `/data` Directory
**Symptom:** `EACCES: permission denied, open 'data/edrms_store.json'`  
**Solution:** Ensure your local user owns the project folder:
```bash
sudo chown -R $USER:$USER data/
```

### Issue 3: Gemini API Quota or Offline Network
**Symptom:** Document scan warnings in console logs.  
**Behavior:** System falls back seamlessly to rule-based keyword extraction without interrupting document registration.
