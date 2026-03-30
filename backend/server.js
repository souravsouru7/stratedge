const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./config/db");
const { globalRateLimiter, authRateLimiter, uploadRateLimiter, statusRateLimiter } = require("./middleware/rateLimit");
const { sanitizeInput } = require("./middleware/sanitizeInput");
const { errorHandler } = require("./middleware/errorHandler");
const { logger, stream } = require("./utils/logger");
const { timeoutMiddleware } = require("./middleware/timeout");

const { connectRedis } = require("./config/redis");
const { startWeeklyReportsCron } = require("./jobs/weeklyReportsCron");
const { startDataCleanupCron } = require("./jobs/dataCleanupCron");

dotenv.config();
connectDB();
connectRedis();

// Start scheduled cron jobs
startWeeklyReportsCron();
startDataCleanupCron();

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

    // Hardcode production domains to ensure they are always allowed
    const productionOrigins = [
      'https://stratedge.live',
      'https://www.stratedge.live'
    ];

    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin) || productionOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

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
    if (res.statusCode >= 400) {
      logger.warn(`API request failed | method=${req.method} | route=${req.originalUrl} | status=${res.statusCode} | duration=${duration}ms`, {
        method: req.method,
        route: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('user-agent'),
      });
    } else {
      logger.info(`API request | method=${req.method} | route=${req.originalUrl} | status=${res.statusCode} | duration=${duration}ms`, {
        method: req.method,
        route: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
      });
    }
  });
  next();
});

app.use(express.json());

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
app.use("/api/upload", uploadRateLimiter, require("./routes/uploadRoutes"));
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

app.get("/", (req, res) => {
  res.send("Trading Journal API Running - Forex & Indian Markets");
});

// Fallback 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

// Central error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, { port: PORT, env: process.env.NODE_ENV || 'development' });
  console.log(`Server running on port ${PORT}`);
});

