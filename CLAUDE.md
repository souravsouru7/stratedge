# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Stratedge** (branded as "Edgecipline") is a trading journal platform supporting Forex and Indian market trades. Users upload trade screenshots; the backend OCR-extracts and AI-parses the data into structured trade records. The frontend is a Next.js PWA/Android app.

---

## Commands

### Backend (`backend/`)

```bash
# Development
npm run dev            # node server.js
npm run dev:watch      # nodemon server.js (hot reload)
npm run dev:all        # API server + OCR worker concurrently

# OCR worker (separate process in production)
npm run worker         # node workers/ocrWorker.js

# Production (PM2)
npm run pm2:start
npm run pm2:restart
npm run pm2:stop

# Data cleanup scripts
npm run cleanup:analyze
npm run cleanup:dry-run
npm run cleanup:run
```

### Frontend (`frontend/`)

```bash
npm run dev            # Next.js dev server (localhost:3000)
npm run build          # Static export to /out
npm run lint           # ESLint

# Android (Capacitor)
npm run android        # build + sync + open in Android Studio
npm run android:sync   # build + sync only
npm run android:build  # build release APK
```

---

## Architecture

### Backend

**Entry point:** `server.js` — loads dotenv and Sentry first (order matters), then wires up Express middleware and routes. In non-production, the OCR worker runs embedded in-process unless `ENABLE_EMBEDDED_OCR_WORKER=false`.

**Config:** All env vars are centralized in `config/index.js` via typed reader functions (`requireEnv`, `readNumber`, `readBoolean`, `readList`). Never read `process.env` directly outside this file — always import from `config`.

**Request lifecycle:**
```
Request → helmet → timeoutMiddleware → morgan → sanitizeInput
        → globalRateLimiter → route-specific rateLimiter
        → protect (JWT auth) → controller → asyncHandler
        → errorHandler
```

**Error handling pattern:** Throw `ApiError(statusCode, message, errorCode)` anywhere; `asyncHandler` catches it and passes to the central `errorHandler` middleware. Never call `res.status(500)` directly in controllers.

**Trade upload pipeline (async):**
1. Controller receives image upload → saves to Cloudinary → creates `Trade` doc with `status: "processing"` → enqueues BullMQ job (`ocrQueue`)
2. OCR worker (`workers/ocrWorker.js`) picks up the job → calls `tradeProcessingService.processTradeUpload()`
3. `tradeProcessingService` orchestrates: OCR (`ocrService` or `visionOcrService`) → AI extraction (`aiExtractionService`) → parsing (`parsingService`) → quality validation (`extractionQualityService`) → updates Trade doc
4. Client polls `GET /api/trade/status/:tradeId` to check job state

**Caching:** Redis via `ioredis`. `cacheMiddleware` wraps response in cache keyed by `namespace:userId:scope:path:queryHash`. Invalidate user cache explicitly with `clearUserCache(userId)` after writes.

**Scheduled jobs** (`jobs/`): `weeklyReportsCron` and `dataCleanupCron` run via `node-cron`, started at server boot.

**Admin workspace** (`admin/`): Completely separate routes/controllers under `/api/admin/*`. Admin auth uses its own middleware (`middleware/adminAuth.js`).

**Indian market** (`indianTrade`, `indianAnalyticsRoutes`): Parallel to Forex — separate model (`IndianTrade`), controller, repository, and routes under `/api/indian/*`.

**Repository pattern:** Controllers call repositories (`repositories/`), which contain all Mongoose queries. Services contain business logic. Keep DB queries out of controllers and services.

**Logging:** Winston logger at `utils/logger.js`. Use `logger.info/warn/error` with structured metadata objects — never `console.log` in application code (security-sensitive paths use `console.warn` intentionally for visibility).

### Frontend

**Framework:** Next.js 16 with `output: "export"` (fully static — no SSR/API routes). Deployed as static files + Capacitor Android app.

**State management:** TanStack React Query for server state. No Redux. Query client is configured with `staleTime: 60s`, `retry: 1`, `refetchOnWindowFocus: false`.

**Feature structure** (`features/`): Each domain (auth, trade, analytics, dashboard) has:
- `api/` — axios API call functions
- `hooks/` — React Query hooks wrapping the API
- `index.js` — barrel exports

**Context:** `MarketContext` (Forex vs Indian market toggle) wraps all pages via `app/providers.tsx`.

**Auth:** Firebase Authentication (client) + JWT (backend). Firebase issues ID token → exchanged for backend JWT stored client-side.

**Routing:** Next.js App Router. Each page route has a `layout.tsx` for metadata. Pages are in `app/<route>/`.

---

## Key Env Vars

Backend requires (will throw at startup if missing): `MONGO_URI`, `JWT_SECRET`, `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET`.

Optional but needed for full functionality: `REDIS_URL`, `GEMINI_API_KEY`, `FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY`, `GOOGLE_VISION_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY`, `RAZORPAY_KEY_ID/KEY_SECRET`, `SMTP_*`, `SENTRY_DSN`.

Firebase private key env var uses `\\n` literal — `config/index.js` normalizes it to actual newlines via `normalizePrivateKey()`.

---

## Production Deployment

PM2 manages two processes: `stratedge-api` (Express server) and `stratedge-ocr-worker` (BullMQ worker). They share Redis for the job queue. The OCR worker must be running for trade uploads to process — in dev it runs embedded.

Frontend static export (`out/`) is served separately (e.g., Nginx, Vercel, or bundled into Android via Capacitor).
