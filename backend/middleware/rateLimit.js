const rateLimit = require("express-rate-limit");
const { logger } = require("../utils/logger");

// Custom response handler for all rate limiters
const createRateLimitHandler = (message) => {
  return (req, res) => {
    const limitType = req.originalUrl.includes('/auth') ? 'auth' 
      : req.originalUrl.includes('/upload') ? 'upload' 
      : req.originalUrl.includes('/status') ? 'status' 
      : 'general';
    
    logger.warn(`Rate limit exceeded | type=${limitType} | ip=${req.ip} | path=${req.originalUrl}`, {
      ip: req.ip,
      path: req.originalUrl,
      method: req.method,
      limitType,
      userAgent: req.get('user-agent'),
    });
    
    res.status(429).json({ message });
  };
};

// Global rate limiter applied to all API routes
// Defaults are conservative but reasonable for most apps.
// Adjust WINDOW_MS and MAX_REQUESTS via env if needed.
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000); // 15 minutes
const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 300); // 300 requests per window per IP

const globalRateLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  message: { message: "Too many requests, please try again later" },
  handler: createRateLimitHandler("Too many requests, please try again later")
});

// Stricter rate limiter specifically for auth endpoints (e.g., login, register)
// Prevents brute force attacks on authentication
const authWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 60 * 1000); // 1 minute
const authMaxRequests = Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 5); // 5 requests per minute per IP

const authRateLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
  handler: createRateLimitHandler("Too many authentication attempts, please try again later"),
  skipSuccessfulRequests: false // Count all requests including failed ones
});

// Rate limiter for upload endpoints
// Prevents abuse of OCR/AI processing resources
const uploadWindowMs = Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || 60 * 1000); // 1 minute
const uploadMaxRequests = Number(process.env.UPLOAD_RATE_LIMIT_MAX_REQUESTS || 10); // 10 requests per minute per IP

const uploadRateLimiter = rateLimit({
  windowMs: uploadWindowMs,
  max: uploadMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
  handler: (req, res) => {
    logger.warn(`Upload rate limit exceeded | ip=${req.ip} | path=${req.originalUrl}`, {
      ip: req.ip,
      path: req.originalUrl,
      method: req.method,
    });
    res.status(429).json({ message: "Too many upload attempts, please try again later" });
  },
  skipSuccessfulRequests: false
});

// Relaxed rate limiter for status/check endpoints
// These are lightweight read operations
const statusWindowMs = Number(process.env.STATUS_RATE_LIMIT_WINDOW_MS || 60 * 1000); // 1 minute
const statusMaxRequests = Number(process.env.STATUS_RATE_LIMIT_MAX_REQUESTS || 30); // 30 requests per minute per IP

const statusRateLimiter = rateLimit({
  windowMs: statusWindowMs,
  max: statusMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
  handler: createRateLimitHandler("Too many status check requests, please try again later"),
  skipSuccessfulRequests: false
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  statusRateLimiter
};
