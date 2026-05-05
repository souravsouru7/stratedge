# Stratedge — Production Hardening: Fix All Edge Cases

You are working on the **Stratedge** trading journal platform. The stack is:
- **Backend**: Node.js + Express in `backend/`, entry point `server.js`
- **Frontend**: Next.js (static export) in `frontend/`
- **Infra**: MongoDB (Mongoose), Redis (ioredis), BullMQ job queue, Cloudinary image uploads, Firebase Auth + JWT

The error pattern is: throw `ApiError(statusCode, message, errorCode)` — `asyncHandler` catches and passes to central `errorHandler`. Never use `res.status(500)` directly in controllers.

Work through every fix below in order. Do not skip any. Each section has the exact file, the exact problem, and the exact change required.

---

## FIX 1 — indianAnalyticsController.js: Wrap ALL exports in asyncHandler + throw ApiError

**File:** `backend/controllers/indianAnalyticsController.js`

Every exported function currently uses:
```js
} catch (error) {
  res.status(500).json({ message: error.message });
}
```

**Fix:** Add `asyncHandler` import at the top, wrap every export, and remove all try/catch blocks (asyncHandler handles them).

```js
// Add at top of file
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
```

Change every function signature from:
```js
exports.getSummary = async (req, res) => {
  try {
    ...
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```
To:
```js
exports.getSummary = asyncHandler(async (req, res) => {
  ...
});
```

Do this for ALL exports: `getSummary`, `getWeeklyStats`, `getPnLBreakdown`, `getRiskRewardAnalysis`, `getTradeDistribution`, `getPerformanceMetrics`, `getTimeAnalysis`, `getTradeQuality`, `getDrawdownAnalysis`, `getAIInsights`, `getAdvancedAnalytics`, `getPsychologyAnalytics`, and any others in the file. Remove every try/catch block.

---

## FIX 2 — analyticsController.js: Same asyncHandler fix

**File:** `backend/controllers/analyticsController.js`

Same problem. Add asyncHandler + ApiError imports at top. Wrap ALL exported async functions in `asyncHandler(async (req, res) => { ... })`. Remove all `} catch (error) { res.status(500).json({ message: error.message }); }` blocks.

---

## FIX 3 — IndianTrade model: Add critical missing indexes

**File:** `backend/models/IndianTrade.js`

Current indexes (only 3):
```js
indianTradeSchema.index({ user: 1, createdAt: -1 });
indianTradeSchema.index({ user: 1, tradeDate: -1 });
indianTradeSchema.index({ user: 1, strategy: 1, createdAt: -1 });
```

The `userQuery()` function in `indianAnalyticsController.js` always filters by `{ user, instrumentType }`. All analytics queries are missing an index for that. Add these:

```js
indianTradeSchema.index({ user: 1, instrumentType: 1, createdAt: -1 });
indianTradeSchema.index({ user: 1, instrumentType: 1, tradeDate: -1 });
indianTradeSchema.index({ user: 1, instrumentType: 1, strategy: 1, createdAt: -1 });
```

---

## FIX 4 — Analytics controllers: Add .lean() to all read-only queries

**Files:** `backend/controllers/analyticsController.js` and `backend/controllers/indianAnalyticsController.js`

Every `.find(...)` in these files that is used for read-only analytics (not updates) must have `.lean()` appended before `.sort()` or `.limit()`. This prevents Mongoose from instantiating full model objects for thousands of records.

Change every pattern like:
```js
const trades = await Trade.find(query).sort({ createdAt: -1 });
const trades = await IndianTrade.find(userQuery(req)).sort({ createdAt: 1 });
```
To:
```js
const trades = await Trade.find(query).lean().sort({ createdAt: -1 });
const trades = await IndianTrade.find(userQuery(req)).lean().sort({ createdAt: 1 });
```

Apply this to every `.find()` call in both analytics controller files.

---

## FIX 5 — Status polling: Add rate limiting

**File:** `backend/routes/tradeRoutes.js`

The `GET /status/:id` endpoint has no rate limiter. Import `statusRateLimiter` (already exported from `backend/middleware/rateLimiter.js`) and add it to the status route:

```js
const { protect } = require("../middleware/authMiddleware");
const { statusRateLimiter } = require("../middleware/rateLimiter");

// Change this line:
router.get("/status/:id", protect, getTradeStatus);
// To:
router.get("/status/:id", protect, statusRateLimiter, getTradeStatus);
```

---

## FIX 6 — upload.service.js: Fix orphaned Cloudinary file on trade creation failure

**File:** `backend/services/upload.service.js`

In `submitTradeUpload()`, after the Cloudinary upload, a trade doc is created. If trade creation fails, the Cloudinary image is left orphaned. Wrap the trade creation in a try/catch that deletes the Cloudinary image on failure.

Find the section where `new Trade(...)` or `Trade.create(...)` is called after image upload. Wrap it:

```js
let trade;
try {
  trade = await Trade.create({ ...tradeData, imageUrl: uploadedImage.imageUrl });
} catch (createError) {
  // Cleanup orphaned Cloudinary image before re-throwing
  if (uploadedImage?.publicId) {
    await cloudinary.uploader.destroy(uploadedImage.publicId, { resource_type: "image" }).catch(() => {});
  }
  throw createError;
}
```

Apply the same pattern for `IndianTrade.create(...)` if present in the same service.

---

## FIX 7 — upload.service.js: Fix swallowed errors in cleanupFailedUpload

**File:** `backend/services/upload.service.js`

Find `cleanupFailedUpload()`. Any `.catch(() => {})` on a database operation must be changed to log the error:

```js
// Change:
.catch(() => {})
// To:
.catch((err) => logger.error("cleanupFailedUpload DB error", { error: err.message, tradeId }))
```

Make sure `logger` is imported at the top of the file:
```js
const { logger } = require("../utils/logger");
```

---

## FIX 8 — Frontend saveAllTrades: Handle mutation failure per-trade

**File:** `frontend/features/trade/hooks/useUploadTrade.js`

Find the `saveAllTrades` function (around line 654):
```js
saveAllTrades: async () => {
  for (let i = 0; i < trades.length; i++) {
    if (!savedTrades[i] && canSaveTrade(trades[i])) {
      await saveTradeMutation.mutateAsync({ idx: i });
    }
  }
},
```

Wrap the inner call in try/catch so one failure doesn't abort the rest:
```js
saveAllTrades: async () => {
  for (let i = 0; i < trades.length; i++) {
    if (!savedTrades[i] && canSaveTrade(trades[i])) {
      try {
        await saveTradeMutation.mutateAsync({ idx: i });
      } catch (err) {
        addToast(`Trade ${i + 1} failed to save: ${err?.message || "Unknown error"}`, "error");
      }
    }
  }
},
```

---

## FIX 9 — Frontend: Add a React Error Boundary

**File:** Create `frontend/components/ErrorBoundary.jsx`

Create this component:
```jsx
"use client";
import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <h2>Something went wrong.</h2>
            <p>{this.state.error?.message}</p>
            <button onClick={() => this.setState({ hasError: false, error: null })}>
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
```

Then wrap the analytics page and dashboard page with it. In `frontend/app/analytics/page.js` (or `.jsx`/`.tsx`):
```jsx
import ErrorBoundary from "@/components/ErrorBoundary";

// Wrap the main content:
<ErrorBoundary fallback={<div>Analytics failed to load. Please refresh.</div>}>
  {/* existing analytics content */}
</ErrorBoundary>
```

Do the same in `frontend/app/dashboard/page.js`.

---

## FIX 10 — indianAnalyticsController.js: Fix userQuery to validate instrumentType

**File:** `backend/controllers/indianAnalyticsController.js`

The current `userQuery()`:
```js
const userQuery = (req) => {
  const instrumentType = (req.query.instrumentType || "OPTION").toUpperCase();
  return { user: req.user._id, instrumentType };
};
```

Validate the enum so arbitrary values don't query the database:
```js
const VALID_INSTRUMENT_TYPES = new Set(["OPTION", "FUTURE", "EQUITY", "ETF"]);

const userQuery = (req) => {
  const raw = (req.query.instrumentType || "OPTION").toUpperCase();
  const instrumentType = VALID_INSTRUMENT_TYPES.has(raw) ? raw : "OPTION";
  return { user: req.user._id, instrumentType };
};
```

---

## FIX 11 — analyticsController.js: Validate range and marketType query params

**File:** `backend/controllers/analyticsController.js`

Find where `req.query.range` and `req.query.marketType` are read. Add validation at the top of each handler or in a shared helper:

```js
const VALID_RANGES = new Set(["7d", "30d", "90d", "180d", "365d", "all"]);
const VALID_MARKET_TYPES = new Set(["FOREX", "CRYPTO", "COMMODITY", "INDEX"]);

function safeRange(val) {
  const r = (val || "all").toLowerCase();
  return VALID_RANGES.has(r) ? r : "all";
}

function safeMarketType(val) {
  const m = (val || "").toUpperCase();
  return VALID_MARKET_TYPES.has(m) ? m : null;
}
```

Replace raw `req.query.range` and `req.query.marketType` references with `safeRange(req.query.range)` and `safeMarketType(req.query.marketType)`.

---

## FIX 12 — Redis: Guard cacheMiddleware when Redis is not ready

**File:** `backend/middleware/cacheMiddleware.js`

Add a check at the top of the middleware handler so that if Redis is not connected, the cache is bypassed (no crash):

```js
const { isRedisReady } = require("../config/redis");

const cacheMiddleware = (options = {}) => async (req, res, next) => {
  // Bypass cache entirely if Redis is not available
  if (!isRedisReady()) {
    return next();
  }
  // ... rest of existing code unchanged
};
```

This is already partially protected by the try/catch, but the explicit `isRedisReady()` guard prevents unnecessary async operations.

---

## FIX 13 — Redis: Emit a startup warning (not silent failure) if Redis is down

**File:** `backend/config/redis.js`

Track a module-level flag so the rest of the app knows Redis never connected:

```js
let _redisAvailable = false;

client.on("ready", () => {
  _redisAvailable = true;
});

client.on("end", () => {
  _redisAvailable = false;
});

const isRedisReady = () => _redisAvailable && client.status === "ready";
```

Replace the existing `isRedisReady` export with this version.

---

## FIX 14 — ocrWorker.js: Log dead-letter jobs (exhausted retries)

**File:** `backend/workers/ocrWorker.js`

Import the Worker events and add a `failed` event handler that fires after all retries are exhausted:

```js
// After worker is created (inside startOcrWorker), add:
worker.on("failed", (job, err) => {
  if (job && job.attemptsMade >= job.opts.attempts) {
    logger.error("OCR job permanently failed — all retries exhausted", {
      tradeId: job?.data?.tradeId,
      jobId: job?.id,
      attempts: job.attemptsMade,
      error: err?.message,
    });
    // Optionally: update trade status to "failed" here if not already done
  }
});
```

---

## FIX 15 — tradeProcessingService.js: Fix safeParseTrade to surface errors

**File:** `backend/services/tradeProcessingService.js`

Find `safeParseTrade()` (or equivalent function that catches all errors and returns `{}`). Change it to distinguish between "empty result" and "parse error":

```js
function safeParseTrade(rawData) {
  try {
    const result = parseTrade(rawData); // or whatever the inner parser is
    return { data: result, error: null };
  } catch (err) {
    logger.warn("Trade parse error", { error: err.message });
    return { data: null, error: err.message };
  }
}
```

Update all callers to check `.error` before proceeding:
```js
const { data: parsed, error: parseError } = safeParseTrade(rawData);
if (parseError || !parsed) {
  // fail the job or set low-confidence flag
}
```

---

## FIX 16 — server.js: Add graceful shutdown drain

**File:** `backend/server.js`

Add graceful shutdown so in-flight HTTP requests complete before the process exits (important for PM2 restarts during deploys):

```js
const server = app.listen(appConfig.port, () => {
  logger.info(`Server running on port ${appConfig.port}`);
});

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    logger.info("HTTP server closed");
    try {
      const mongoose = require("mongoose");
      await mongoose.connection.close();
      const { client } = require("./config/redis");
      await client.quit();
    } catch (e) {
      logger.error("Shutdown cleanup error", { error: e.message });
    }
    process.exit(0);
  });

  // Force exit after 15s if graceful close hangs
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 15_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

Replace the existing `app.listen(...)` call with this pattern (keep the port from `appConfig.port`).

---

## FIX 17 — tradeRoutes.js + indianMarketRoutes.js: Add basic input sanitization on write routes

**File:** `backend/routes/tradeRoutes.js` and `backend/routes/indianMarketRoutes.js`

The `sanitizeInput` middleware already exists in `backend/middleware/sanitizeInput.js` and is applied globally in `server.js`, so you don't need to add it per-route. But verify that `createTrade` and `updateTrade` controllers validate that numeric fields (`entryPrice`, `exitPrice`, `profit`, `stopLoss`, `takeProfit`, `lotSize`, `quantity`) are finite numbers before saving.

In `backend/controllers/tradeController.js` and `backend/controllers/indianTradeController.js`, in the `createTrade` and `updateTrade` functions, add this guard before any `.save()` or `.create()` call:

```js
const numericFields = ["entryPrice", "exitPrice", "profit", "stopLoss", "takeProfit", "lotSize"];
for (const field of numericFields) {
  if (body[field] !== undefined && !Number.isFinite(Number(body[field]))) {
    throw new ApiError(400, `Invalid value for ${field}: must be a finite number`, "INVALID_INPUT");
  }
}
```

Import `ApiError` at the top if not already imported.

---

## FIX 18 — frontend useUploadTrade.js: Fix missing useEffect cleanup dependencies

**File:** `frontend/features/trade/hooks/useUploadTrade.js`

Find the two `useEffect` blocks that watch `jobStatusQuery.data` and `jobStatusQuery.error` (around lines 480-531). They reference `activeToastId`, `removeToast`, `addToast`, `setJobId`, `setError`, `setFile` but don't include them in dependency arrays.

Add proper dependency arrays:

```js
useEffect(() => {
  if (jobStatusQuery.data?.status === "completed" && jobStatusQuery.data?.data) {
    applyProcessedTradeData(jobStatusQuery.data.data);
    setJobId("");
    if (activeToastId) { removeToast(activeToastId); setActiveToastId(null); }
    addToast("Trade details extracted successfully!", "success");
  } else if (jobStatusQuery.data?.status === "failed") {
    // ... existing logic
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [jobStatusQuery.data?.status]); // key only on status change, not full data object
```

```js
useEffect(() => {
  if (jobStatusQuery.error) {
    // ... existing logic
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [jobStatusQuery.error]);
```

Keying on `jobStatusQuery.data?.status` instead of `jobStatusQuery.data` prevents the effect from firing on every poll result object reference change.

---

## Verification Checklist

After making all changes, verify:

- [ ] `cd backend && node -e "require('./controllers/indianAnalyticsController')"` — no syntax errors
- [ ] `cd backend && node -e "require('./controllers/analyticsController')"` — no syntax errors  
- [ ] `cd backend && node -e "require('./config/redis')"` — no syntax errors
- [ ] `cd backend && npm run dev` — server starts, no uncaught errors in console
- [ ] `cd frontend && npm run build` — no TypeScript/build errors
- [ ] In the running backend, hit any analytics endpoint and confirm it returns `{ status: "error", message: "..." }` shape (not `{ message: "..." }`) on a 500
- [ ] Confirm `GET /api/trade/status/:id` is rate-limited (check `rateLimiter.js` has `statusRateLimiter` exported)

---

## Do NOT change

- `backend/middleware/authMiddleware.js` — already correct (asyncHandler + ApiError)
- `backend/queues/ocrQueue.js` — `enqueueOcrJob()` already has TOCTOU protection via `getJob(tradeId)` check
- `backend/middleware/upload.middleware.js` — magic byte validation is already correct
- `backend/middleware/cacheMiddleware.js` — already has try/catch fallback to `next()`; only add the `isRedisReady()` guard (Fix 12)
- `backend/models/Trade.js` — already has 10 indexes including `user+status+createdAt`
- `backend/server.js` CORS config — production origin check is already correct
