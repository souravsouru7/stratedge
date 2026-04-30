# Production Deployment Guide

## ✅ What to Keep vs Remove for Production

### TL;DR: **KEEP EVERYTHING** in your repository, but production servers only install production dependencies.

---

## 📁 Files in Your Repository

### ✅ **KEEP ALL of These** (They're Safe)

#### Production Code (Always Included):
```
✅ server.js
✅ config/
✅ controllers/
✅ services/
✅ models/
✅ routes/
✅ middleware/
✅ repositories/
✅ utils/
✅ workers/
✅ queues/
✅ scripts/
✅ package.json
✅ ecosystem.config.js
```

#### Test Files (Safe to Keep - Only Used in Development):
```
✅ test/                    # Test files
✅ test/edge-cases/         # Edge case tests
✅ test/jest.setup.js       # Test setup
✅ jest.config.js           # Jest configuration
✅ scripts/test-edge-cases.js  # Manual test script
✅ TESTING_GUIDE.md         # Testing documentation
```

#### Why Keep Tests in Repository?
- **Not deployed** to production (devDependencies excluded)
- **Needed** for CI/CD pipeline testing
- **Needed** for developer onboarding
- **Needed** for pre-deployment verification
- **Industry standard** (all major companies keep tests)

---

## 🚀 Production Deployment

### Step 1: Install Production Dependencies Only

```bash
# On production server
cd backend
npm install --production

# OR set environment variable
NODE_ENV=production npm install
```

**What gets installed:**
```
Production Dependencies ONLY:
✅ express
✅ mongoose
✅ redis
✅ bullmq
✅ cloudinary
✅ razorpay
✅ All other dependencies from "dependencies" in package.json

NOT Installed:
❌ jest
❌ supertest
❌ mongodb-memory-server
❌ nodemon
❌ concurrently
(All "devDependencies" are skipped)
```

### Step 2: Start with PM2 (Already Configured)

```bash
# Start production server
pm2 start ecosystem.config.js

# Your apps:
# - stratedge-api (NODE_ENV=production)
# - stratedge-ocr-worker (NODE_ENV=production)
```

### Step 3: Verify Deployment

```bash
# Check status
pm2 status

# Check logs
pm2 logs stratedge-api --lines 100

# Monitor
pm2 monit
```

---

## 🔒 What's NOT Deployed to Production

### 1. **devDependencies** (Excluded by npm)
```json
// These are NOT installed in production:
"devDependencies": {
  "jest": "^29.7.0",              ❌ NOT installed
  "supertest": "^6.3.4",          ❌ NOT installed
  "mongodb-memory-server": "^9.1.6"  ❌ NOT installed
}
```

### 2. **Test Files** (Not Imported by Production Code)
```
These files exist but are NEVER loaded:
❌ test/edge-cases/payment-idempotency.test.js
❌ test/edge-cases/analytics-edge-cases.test.js
❌ test/jest.setup.js
❌ jest.config.js
```

### 3. **Node Modules in .gitignore**
```
node_modules/  ← This is in .gitignore, so it's never committed
```

---

## 📊 Production vs Development Comparison

| Aspect | Development | Production |
|--------|-------------|------------|
| **Dependencies** | All (dev + prod) | Production only |
| **Test Files** | ✅ Used for testing | ⚠️ Exist but not loaded |
| **Jest** | ✅ Installed | ❌ Not installed |
| **Memory Usage** | Higher (all deps) | Lower (prod only) |
| **Disk Space** | ~500MB (with devDeps) | ~200MB (prod only) |
| **NODE_ENV** | development | production |
| **Test Coverage** | Can run tests | Don't need to run |

---

## 🎯 Recommended Workflow

### Before Deploying to Production:

```bash
# 1. Run tests locally
npm run test:manual

# 2. Run full test suite
npm run test:edge-cases

# 3. Commit code
git add .
git commit -m "feat: add edge case fixes"
git push

# 4. Deploy to production
ssh your-server
cd /path/to/backend
git pull
npm install --production  # Only installs prod dependencies
pm2 restart ecosystem.config.js
```

### After Deploying:

```bash
# Verify deployment
curl https://your-api.com/health

# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs stratedge-api --err --lines 50
```

---

## 🛡️ Production Safety Checklist

Before going live, verify:

### Code Quality:
- [x] All edge case tests pass (`npm run test:manual`)
- [x] No console.log in production code (use logger)
- [x] Environment variables properly set
- [x] .env file NOT committed (in .gitignore)

### Deployment:
- [ ] Run `npm install --production` (not just `npm install`)
- [ ] PM2 configured with `NODE_ENV=production`
- [ ] MongoDB connection string points to production DB
- [ ] Redis connection string points to production Redis
- [ ] Cloudinary credentials are production keys
- [ ] Razorpay keys are production keys (not test mode)

### Monitoring:
- [ ] PM2 monitoring enabled
- [ ] Error logging configured (winston)
- [ ] Health check endpoint working
- [ ] Database indexes created
- [ ] Rate limiting enabled

### Security:
- [ ] JWT_SECRET is strong and unique
- [ ] CORS configured for production domain
- [ ] HTTPS enabled
- [ ] Helmet middleware active
- [ ] Rate limiting active

---

## 📦 If You REALLY Want to Remove Tests from Production

### Option A: Deploy from Build Artifact (Docker/CI/CD)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --production

# Copy production code only
COPY server.js ./
COPY config/ ./config/
COPY controllers/ ./controllers/
COPY services/ ./services/
COPY models/ ./models/
COPY routes/ ./routes/
COPY middleware/ ./middleware/
COPY repositories/ ./repositories/
COPY utils/ ./utils/
COPY workers/ ./workers/
COPY queues/ ./queues/

# DO NOT copy test/ or jest.config.js
# EXCLUDE: test/, jest.config.js, TESTING_GUIDE.md

EXPOSE 5000
CMD ["node", "server.js"]
```

### Option B: Use .npmignore (If Publishing to npm)

```
# .npmignore
test/
jest.config.js
scripts/test-edge-cases.js
TESTING_GUIDE.md
coverage/
```

### Option C: Git Submodules (Overkill - Not Recommended)

Don't do this. It's unnecessarily complex.

---

## 💡 Industry Best Practices

### What Major Companies Do:

**GitHub:**
- ✅ Keeps tests in repository
- ✅ Runs tests in CI/CD before deployment
- ❌ Doesn't install devDependencies in production

**Stripe:**
- ✅ Keeps comprehensive test suite
- ✅ Tests run on every PR
- ❌ Test files not loaded in production

**Netflix:**
- ✅ Tests are part of codebase
- ✅ Automated testing pipeline
- ❌ Production servers only have prod dependencies

### Why?
1. **Tests protect production** - Catch bugs before deployment
2. **Code review** - Reviewers can see what's tested
3. **Documentation** - Tests show how code should work
4. **Onboarding** - New devs can run tests to verify setup
5. **Rollback safety** - Can test old versions before rollback

---

## 🔍 What Actually Happens in Production

### Server Startup:
```javascript
// server.js starts
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
// ... production code ...

// These are NEVER required:
// require('./test/edge-cases/...')     ❌ Not imported
// require('jest')                       ❌ Not installed
// require('supertest')                  ❌ Not installed
```

### Memory Usage:
```
Production Server Memory:
✅ Express app: ~50MB
✅ Mongoose: ~30MB
✅ Redis client: ~10MB
✅ BullMQ worker: ~40MB
✅ Your code: ~20MB
Total: ~150MB

NOT in Memory:
❌ Jest: 0MB (not loaded)
❌ Test files: 0MB (not loaded)
❌ Supertest: 0MB (not loaded)
```

### Disk Space:
```
Production Server Disk:
✅ node_modules (prod): ~200MB
✅ Your code: ~5MB
✅ Logs: ~50MB
Total: ~255MB

NOT on Disk:
❌ Jest & test deps: 0MB (not installed)
```

---

## ✅ Final Recommendation

### **DO THIS:**

```bash
# Keep everything in your Git repository
git add .
git commit -m "feat: add edge case tests and fixes"
git push

# On production server:
cd backend
npm install --production  # Only installs prod dependencies
pm2 restart ecosystem.config.js

# Verify tests pass locally (before deploying)
npm run test:manual
```

### **DON'T DO THIS:**

```bash
# ❌ Don't delete test files
rm -rf test/

# ❌ Don't remove jest.config.js
rm jest.config.js

# ❌ Don't remove from package.json devDependencies
# (They're safe and needed for development)
```

---

## 📋 Quick Reference

### Files to Commit to Git:
```
✅ Everything except:
   - node_modules/
   - .env
   - logs/
   - coverage/
```

### Files Deployed to Production Server:
```
✅ All code files
✅ package.json
✅ ecosystem.config.js

❌ NOT installed: devDependencies
❌ NOT loaded: test files
```

### Commands to Run:

**Development:**
```bash
npm install                  # Install everything
npm run test:manual          # Run tests
npm run dev                  # Start dev server
```

**Production:**
```bash
npm install --production     # Install only prod deps
pm2 start ecosystem.config.js  # Start production
```

---

## 🎯 Summary

| Question | Answer |
|----------|--------|
| Should I keep test files? | ✅ YES - In repository |
| Should I remove tests before production? | ❌ NO - They're safe |
| Will tests slow down production? | ❌ NO - Not loaded |
| Will tests take disk space? | ❌ NO - devDeps not installed |
| Do I need to change anything? | ❌ NO - Just use `npm install --production` |

**Bottom Line:** Keep everything. Production servers only install production dependencies. Test files stay in the repository but don't affect production performance.

---

*Created: 2026-04-30*  
*For: Stratedge Trading Platform*
