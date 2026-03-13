const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");

const connectDB = require("./config/db");
const { globalRateLimiter, authRateLimiter } = require("./middleware/rateLimit");
const { sanitizeInput } = require("./middleware/sanitizeInput");
const { errorHandler } = require("./middleware/errorHandler");

const { connectRedis } = require("./config/redis");

dotenv.config();
connectDB();
connectRedis();

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

app.use(express.json());

// Apply global input sanitization (body, query, params)
app.use(sanitizeInput);

// Apply global rate limiter to all routes
app.use(globalRateLimiter);

// Apply stricter rate limiter to authentication-related routes
app.use("/api/auth", authRateLimiter, require("./routes/authRoutes"));
app.use("/api/trades", require("./routes/tradeRoutes"));
app.use("/api/setups", require("./routes/setupRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/reports", require("./routes/weeklyReportRoutes"));

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
  console.log(`Server running on port ${PORT}`);
});