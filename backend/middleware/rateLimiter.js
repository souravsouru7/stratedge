const jwt = require("jsonwebtoken");
const { appConfig } = require("../config");
const { client: redisClient } = require("../config/redis");
const { logger } = require("../utils/logger");

const RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

function normalizeIp(ip) {
  return String(ip || "unknown")
    .replace(/^::ffff:/, "")
    .trim() || "unknown";
}

function getTokenUserId(req) {
  if (req.user?._id) {
    return req.user._id.toString();
  }

  if (req._rateLimitUserId) {
    return req._rateLimitUserId;
  }

  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, appConfig.jwt.secret);
    req._rateLimitUserId = decoded?.id ? String(decoded.id) : null;
    return req._rateLimitUserId;
  } catch {
    return null;
  }
}

function resolveRateLimitKey(req, scope) {
  const userId = getTokenUserId(req);
  if (userId) {
    return {
      key: `rate-limit:${scope}:user:${userId}`,
      keyType: "user",
    };
  }

  return {
    key: `rate-limit:${scope}:ip:${normalizeIp(req.ip)}`,
    keyType: "ip",
  };
}

function sendRateLimitResponse(req, res, { scope, limit, ttlMs, message, keyType }) {
  const retryAfterSeconds = Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : 1000) / 1000));

  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.setHeader("RateLimit-Limit", String(limit));
  res.setHeader("RateLimit-Remaining", "0");
  res.setHeader("RateLimit-Reset", String(retryAfterSeconds));

  logger.warn("Rate limit exceeded", {
    scope,
    keyType,
    ip: normalizeIp(req.ip),
    path: req.originalUrl,
    method: req.method,
    retryAfterSeconds,
  });

  return res.status(429).json({
    status: "error",
    message,
  });
}

function createRedisRateLimiter({
  scope,
  windowMs,
  maxRequests,
  message = "Too many requests. Please try again later.",
}) {
  return async (req, res, next) => {
    try {
      const { key: rateLimitKey, keyType } = resolveRateLimitKey(req, scope);
      const [currentCountRaw, ttlMsRaw] = await redisClient.eval(
        RATE_LIMIT_SCRIPT,
        1,
        rateLimitKey,
        String(windowMs)
      );

      const currentCount = Number(currentCountRaw);
      const ttlMs = Number(ttlMsRaw);
      const remaining = Math.max(0, maxRequests - currentCount);
      const resetSeconds = Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1000));

      res.setHeader("RateLimit-Limit", String(maxRequests));
      res.setHeader("RateLimit-Remaining", String(remaining));
      res.setHeader("RateLimit-Reset", String(resetSeconds));

      if (currentCount > maxRequests) {
        return sendRateLimitResponse(req, res, {
          scope,
          limit: maxRequests,
          ttlMs,
          message,
          keyType,
        });
      }

      return next();
    } catch (error) {
      logger.error("Redis rate limiter unavailable", {
        scope,
        path: req.originalUrl,
        method: req.method,
        error: error.message,
      });

      res.setHeader("Retry-After", "5");
      return res.status(503).json({
        status: "error",
        message: "Rate limiter temporarily unavailable. Please try again later.",
      });
    }
  };
}

const globalRateLimiter = createRedisRateLimiter({
  scope: "global",
  windowMs: appConfig.rateLimit.globalWindowMs,
  maxRequests: appConfig.rateLimit.globalMaxRequests,
  message: "Too many requests. Please try again later.",
});

const authRateLimiter = createRedisRateLimiter({
  scope: "auth",
  windowMs: appConfig.rateLimit.authWindowMs,
  maxRequests: appConfig.rateLimit.authMaxRequests,
  message: "Too many authentication attempts. Please try again later.",
});

const uploadRateLimiter = createRedisRateLimiter({
  scope: "upload",
  windowMs: appConfig.rateLimit.uploadWindowMs,
  maxRequests: appConfig.rateLimit.uploadMaxRequests,
  message: "Too many upload requests. Please try again later.",
});

const statusRateLimiter = createRedisRateLimiter({
  scope: "status",
  windowMs: appConfig.rateLimit.statusWindowMs,
  maxRequests: appConfig.rateLimit.statusMaxRequests,
  message: "Too many status requests. Please try again later.",
});

module.exports = {
  createRedisRateLimiter,
  globalRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  statusRateLimiter,
};
