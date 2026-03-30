# PM2 Deployment Guide

## Overview
Your backend now uses PM2 to manage **two processes**:
1. **stratedge-api** - Main API server (server.js)
2. **stratedge-ocr-worker** - OCR queue worker (workers/ocrWorker.js)

## First-Time Setup on EC2

### 1. Install PM2 globally (if not already installed)
```bash
npm install -g pm2
```

### 2. Start both processes
```bash
cd ~/stratedge/backend
pm2 start ecosystem.config.js
```

### 3. Save PM2 process list
```bash
pm2 save
```

### 4. Setup PM2 to restart on system reboot
```bash
pm2 startup
# Copy and run the command that PM2 outputs
```

## Daily Operations

### Check status of all processes
```bash
pm2 status
```

### View logs
```bash
# All logs
pm2 logs

# API server logs only
pm2 logs stratedge-api

# OCR worker logs only
pm2 logs stratedge-ocr-worker

# Follow logs in real-time
pm2 logs --lines 100
```

### Restart processes
```bash
# Restart both processes
pm2 restart ecosystem.config.js

# Restart specific process
pm2 restart stratedge-api
pm2 restart stratedge-ocr-worker
```

### Stop processes
```bash
# Stop both processes
pm2 stop ecosystem.config.js

# Stop specific process
pm2 stop stratedge-api
```

### Monitor resource usage
```bash
pm2 monit
```

### Detailed process info
```bash
pm2 describe stratedge-api
pm2 describe stratedge-ocr-worker
```

## CI/CD Deployment

The GitHub Actions workflow will automatically:
1. Pull latest code from main branch
2. Install dependencies
3. Reload both PM2 processes with new environment variables

**Trigger**: Push to `main` branch with changes in `backend/**`

## Log File Locations

All logs are stored in `/logs/` directory:
- `pm2-error.log` - API error logs
- `pm2-out.log` - API output logs
- `pm2-combined.log` - API combined logs
- `pm2-worker-error.log` - Worker error logs
- `pm2-worker-out.log` - Worker output logs
- `pm2-worker-combined.log` - Worker combined logs

## Troubleshooting

### Check if processes are running
```bash
pm2 list
```

### Restart if crashed
```bash
pm2 restart all
```

### View detailed error information
```bash
pm2 describe stratedge-api
pm2 describe stratedge-ocr-worker
```

### Flush logs (clear them)
```bash
pm2 flush
```

### Reload after environment variable changes
```bash
pm2 reload ecosystem.config.js --update-env
```

## Process Names in PM2

Use these names for PM2 commands:
- `stratedge-api` - Main server
- `stratedge-ocr-worker` - OCR worker

## Memory Management

Both processes are configured with:
- `max_memory_restart: 1G` - Auto-restart if memory exceeds 1GB
- `autorestart: true` - Auto-restart on crash

## Local Testing

You can test the ecosystem config locally:
```bash
# Start both processes
npm run pm2:start

# Restart both processes
npm run pm2:restart

# Stop both processes
npm run pm2:stop

# Delete from PM2 list
npm run pm2:delete
```
