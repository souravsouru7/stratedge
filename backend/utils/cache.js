const { client, isRedisReady } = require("../config/redis");
const { logger } = require("./logger");

function serializeKeyPart(value) {
  return String(value)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9:_-]/g, "-");
}

function buildCacheKey(...parts) {
  return parts
    .filter((part) => part !== undefined && part !== null && part !== "")
    .map(serializeKeyPart)
    .join(":");
}

async function getCache(key) {
  if (!isRedisReady()) return null;

  try {
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.warn("Redis cache read failed", { key, error: error.message });
    return null;
  }
}

async function setCache(key, data, ttlSeconds) {
  if (!isRedisReady()) return false;

  try {
    await client.set(key, JSON.stringify(data), "EX", ttlSeconds);
    return true;
  } catch (error) {
    logger.warn("Redis cache write failed", { key, ttlSeconds, error: error.message });
    return false;
  }
}

async function deleteCache(key) {
  if (!isRedisReady()) return 0;

  try {
    return client.del(key);
  } catch (error) {
    logger.warn("Redis cache delete failed", { key, error: error.message });
    return 0;
  }
}

async function deleteCacheByPattern(pattern) {
  if (!isRedisReady()) return 0;

  let deleted = 0;
  let cursor = "0";

  try {
    do {
      const [nextCursor, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        deleted += await client.del(...keys);
      }
    } while (cursor !== "0");

    return deleted;
  } catch (error) {
    logger.warn("Redis cache pattern delete failed", { pattern, error: error.message });
    return deleted;
  }
}

// ── Cache stampede protection ─────────────────────────────────────────────────
// Without locking, N concurrent requests that all miss the cache will all hit the
// DB in parallel (the "thundering herd" / stampede problem). We prevent this by:
//   1. Acquiring a short Redis NX lock before computing the value.
//   2. Waiting up to LOCK_WAIT_MS for the lock holder to populate the cache.
//   3. Falling through to a direct DB call only when the lock wait expires.
//
// This reduces N parallel DB calls to ~1 under normal conditions.  The lock TTL
// is intentionally short (5 s) so a crashed lock-holder never blocks callers
// permanently — they will fall through and call the resolver themselves.
const LOCK_TTL_MS = 5000;
const LOCK_WAIT_MS = 1500;
const LOCK_POLL_MS = 60;

async function rememberCache(key, ttlSeconds, resolver) {
  // Fast path: cache hit
  const cached = await getCache(key);
  if (cached !== null) {
    return { data: cached, cacheHit: true };
  }

  if (!isRedisReady()) {
    // Redis is down — skip locking, call resolver directly (fail-open)
    const data = await resolver();
    return { data, cacheHit: false };
  }

  const lockKey = `lock:${key}`;

  // Try to become the lock owner (SET NX PX is atomic)
  const lockAcquired = await client
    .set(lockKey, "1", "NX", "PX", LOCK_TTL_MS)
    .catch(() => null);

  if (lockAcquired) {
    // We hold the lock — compute and populate
    try {
      const data = await resolver();
      await setCache(key, data, ttlSeconds);
      return { data, cacheHit: false };
    } finally {
      // Release the lock even if resolver throws
      await client.del(lockKey).catch(() => {});
    }
  }

  // Another request holds the lock — wait for it to populate the cache
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, LOCK_POLL_MS));
    const retried = await getCache(key);
    if (retried !== null) {
      return { data: retried, cacheHit: true };
    }
  }

  // Lock holder didn't finish in time (crash, timeout, slow query).
  // Fall through to a direct resolver call so the caller is never blocked.
  logger.warn("Cache lock wait expired, falling through to direct resolver", { key });
  const data = await resolver();
  await setCache(key, data, ttlSeconds).catch(() => {});
  return { data, cacheHit: false };
}

module.exports = {
  buildCacheKey,
  deleteCache,
  deleteCacheByPattern,
  getCache,
  rememberCache,
  setCache,
};
