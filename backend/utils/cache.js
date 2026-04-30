const { client, isRedisReady } = require("../config/redis");
const { logger } = require("./logger");
const inFlightResolvers = new Map();

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
    logger.warn("Redis cache read failed", {
      key,
      error: error.message,
    });
    return null;
  }
}

async function setCache(key, data, ttlSeconds) {
  if (!isRedisReady()) return false;

  try {
    await client.set(key, JSON.stringify(data), "EX", ttlSeconds);
    return true;
  } catch (error) {
    logger.warn("Redis cache write failed", {
      key,
      ttlSeconds,
      error: error.message,
    });
    return false;
  }
}

async function deleteCache(key) {
  if (!isRedisReady()) return 0;

  try {
    return client.del(key);
  } catch (error) {
    logger.warn("Redis cache delete failed", {
      key,
      error: error.message,
    });
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
    logger.warn("Redis cache pattern delete failed", {
      pattern,
      error: error.message,
    });
    return deleted;
  }
}

async function rememberCache(key, ttlSeconds, resolver) {
  const cached = await getCache(key);
  if (cached !== null) {
    return { data: cached, cacheHit: true };
  }

  const existingResolver = inFlightResolvers.get(key);
  if (existingResolver) {
    logger.warn("Cache miss storm deduplicated", { key });
    const data = await existingResolver;
    return { data, cacheHit: false, deduped: true };
  }

  const resolverPromise = (async () => {
    const data = await resolver();
    await setCache(key, data, ttlSeconds);
    return data;
  })();

  inFlightResolvers.set(key, resolverPromise);
  try {
    const data = await resolverPromise;
    return { data, cacheHit: false };
  } finally {
    inFlightResolvers.delete(key);
  }
}

module.exports = {
  buildCacheKey,
  deleteCache,
  deleteCacheByPattern,
  getCache,
  rememberCache,
  setCache,
};
