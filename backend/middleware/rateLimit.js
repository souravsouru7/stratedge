const rateLimit = require("express-rate-limit");

// Global rate limiter applied to all API routes
// Defaults are conservative but reasonable for most apps.
// Adjust WINDOW_MS and MAX_REQUESTS via env if needed.
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000); // 15 minutes
const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 300); // 300 requests per window per IP

const globalRateLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false   // Disable X-RateLimit-* headers
});

// Stricter rate limiter specifically for auth endpoints (e.g., login)
const authWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000); // 15 minutes
const authMaxRequests = Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 30); // 30 requests per window per IP

const authRateLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later."
  }
});

module.exports = {
  globalRateLimiter,
  authRateLimiter
};

