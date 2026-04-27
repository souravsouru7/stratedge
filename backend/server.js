const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

// Load .env before any module that reads process.env at require-time (e.g. config/cloudinary via jobs/dataCleanupCron).
require("dotenv").config();

// Sentry must be initialized before any other require so it can instrument all modules.
const Sentry = require("@sentry/node");
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    // Capture 100% of transactions in production; lower this (e.g. 0.2) once traffic grows.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    // Don't send events in test/development unless DSN is explicitly set.
    enabled: !!process.env.SENTRY_DSN,
  });
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./config/db");
const { appConfig } = require("./config");
const {
  globalRateLimiter,
  authRateLimiter,
  statusRateLimiter,
} = require("./middleware/rateLimiter");
const { sanitizeInput } = require("./middleware/sanitizeInput");
const { errorHandler } = require("./middleware/errorHandler");
const { logger, stream } = require("./utils/logger");
const { timeoutMiddleware } = require("./middleware/timeout");

const { connectRedis } = require("./config/redis");
const { startWeeklyReportsCron } = require("./jobs/weeklyReportsCron");
const { startDataCleanupCron } = require("./jobs/dataCleanupCron");
const { startOcrWorker } = require("./workers/ocrWorker");

connectDB();
connectRedis();

// In local/dev environments, start the OCR worker in-process so uploads do not
// remain stuck in "processing" when only the API server is running.
if (appConfig.env !== "production" && process.env.ENABLE_EMBEDDED_OCR_WORKER !== "false") {
  startOcrWorker({ initializeConnections: false, mode: "embedded" }).catch((error) => {
    logger.error("Failed to start embedded OCR worker", {
      error: error.message,
      stack: error.stack,
    });
  });
}

// Start scheduled cron jobs
startWeeklyReportsCron();
startDataCleanupCron();

const app = express();

const normalizeOrigin = (value) => {
  if (!value) return "";
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return String(value).trim().replace(/\/+$/, "").toLowerCase();
  }
};

const isAllowedProductionOrigin = (origin) => {
  if (!origin) return true;
  const normalizedOrigin = normalizeOrigin(origin);

  const staticAllowedOrigins = new Set([
    "https://stratedge.live",
    "https://www.stratedge.live",
  ]);

  if (staticAllowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  // Allow known Stratedge subdomains used for production web/app clients.
  return /^https:\/\/([a-z0-9-]+\.)?stratedge\.live$/i.test(normalizedOrigin);
};

const corsOptions = {
  origin: function (origin, callback) {
    // In development, allow all origins (localhost, LAN IPs, etc.)
    if (appConfig.env !== "production") {
      return callback(null, true);
    }

    const allowedOrigins = appConfig.cors.allowedOrigins.map((item) => normalizeOrigin(item));
    const normalizedOrigin = normalizeOrigin(origin);

    if (appConfig.cors.debug) {
      console.log(`CORS Check | Origin: ${origin} | Normalized: ${normalizedOrigin} | AllowedList: ${allowedOrigins.join(", ")}`);
    }

    // Allow requests with no origin (mobile apps, curl, Capacitor)
    if (
      !origin ||
      isAllowedProductionOrigin(origin) ||
      allowedOrigins.includes(normalizedOrigin) ||
      normalizedOrigin.startsWith("http://localhost") ||
      normalizedOrigin.startsWith("https://localhost") ||
      String(origin).startsWith("capacitor://localhost")
    ) {
      callback(null, true);
    } else {
      console.warn(`CORS Rejected | Origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Handle OPTIONS preflight requests explicitly before any other middleware
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// HTTP security headers
app.use(helmet());

// Global timeout middleware (apply early)
app.use(timeoutMiddleware);

// Request logging middleware
app.use(morgan('combined', { stream, skip: (req) => req.path === '/' }));

// Log important API events
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMeta = {
      method: req.method,
      route: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
    };

    if (res.statusCode >= 500) {
      logger.warn(`API request failed | method=${req.method} | route=${req.originalUrl} | status=${res.statusCode} | duration=${duration}ms`, {
        ...logMeta,
      });
    } else if (res.statusCode >= 400) {
      logger.debug(`API client error | method=${req.method} | route=${req.originalUrl} | status=${res.statusCode} | duration=${duration}ms`, {
        ...logMeta,
      });
    } else {
      logger.info(`API request | method=${req.method} | route=${req.originalUrl} | status=${res.statusCode} | duration=${duration}ms`, {
        ...logMeta,
      });
    }
  });
  next();
});

app.use(express.json());

// Prevent browsers from caching API responses
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// Apply global input sanitization (body, query, params)
app.use(sanitizeInput);

// Apply global rate limiter to all routes
app.use(globalRateLimiter);

// Apply stricter rate limiter to authentication-related routes
app.use("/api/auth", authRateLimiter, require("./routes/authRoutes"));
app.use("/api/trades", require("./routes/tradeRoutes"));
app.use("/api/trade", statusRateLimiter, require("./routes/tradeStatusRoutes"));
app.use("/api/setups", require("./routes/setupRoutes"));
app.use("/api/checklists", require("./routes/checklistRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/reports", require("./routes/weeklyReportRoutes"));

// Admin routes (completely separate workspace)
app.use("/api/admin/auth", require("./admin/routes/adminAuthRoutes"));
app.use("/api/admin/analytics", require("./admin/routes/adminAnalyticsRoutes"));
app.use("/api/admin/users", require("./admin/routes/adminUserRoutes"));
app.use("/api/admin/payments", require("./admin/routes/adminPaymentRoutes"));
app.use("/api/admin/trades", require("./admin/routes/adminTradeRoutes"));
app.use("/api/admin/notifications", require("./admin/routes/adminNotificationRoutes"));
app.use("/api/admin/feedback", require("./admin/routes/adminFeedbackRoutes"));

// User feedback submission
app.use("/api/feedback", require("./routes/feedbackRoutes"));

// Payment routes
app.use("/api/payments", require("./routes/paymentRoutes"));

// Indian Market-specific routes (completely separate workspace)
app.use("/api/indian/trades", require("./routes/indianMarketRoutes"));
app.use("/api/indian/analytics", require("./routes/indianAnalyticsRoutes"));

app.get("/", (_req, res) => {
  res.send("Trading Journal API Running - Forex & Indian Markets");
});

// Fallback 404 for unknown routes
app.use((_req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

// Sentry error handler must come before your own error handler
if (process.env.SENTRY_DSN) {
  app.use(Sentry.expressErrorHandler());
}

// Central error handler (must be last)
app.use(errorHandler);

const PORT = appConfig.port;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, { port: PORT, env: appConfig.env });
  console.log(`Server running on port ${PORT}`);
});
