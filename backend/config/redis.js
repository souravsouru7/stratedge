const IORedis = require("ioredis");
const { appConfig } = require("./index");

/**
 * BullMQ / ioredis need a TCP `rediss://` URL. Upstash dashboard often shows REST URL + token;
 * those map to: rediss://default:<token>@<host>:6379
 */
function resolveRedisUrl() {
  if (appConfig.redis.url) {
    return appConfig.redis.url;
  }
  const restUrl = appConfig.redis.upstashRestUrl;
  const token = appConfig.redis.upstashRestToken;
  if (restUrl && token) {
    try {
      const { hostname } = new URL(restUrl);
      if (hostname) {
        return `rediss://default:${encodeURIComponent(token)}@${hostname}:6379`;
      }
    } catch (e) {
      console.error("Invalid UPSTASH_REDIS_REST_URL:", e.message);
    }
  }
  return "redis://localhost:6379";
}

function hostnameFromRedisUrl(url) {
  try {
    const withProtocol = url.replace(/^rediss?:\/\//i, "http://");
    return new URL(withProtocol).hostname || "";
  } catch {
    return "";
  }
}

const redisUrl = resolveRedisUrl();
const redisHost = hostnameFromRedisUrl(redisUrl);

let enotfoundHintLogged = false;

const client = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 15_000,
  retryStrategy(times) {
    if (times > 8) {
      console.error(
        "[Redis] Stopped reconnecting after 8 attempts. " +
          "If you see ENOTFOUND, your Upstash DB may be deleted or REDIS_URL / UPSTASH_* is wrong — copy the current REST URL + token from the Upstash console, " +
          "or use REDIS_URL=redis://localhost:6379 with a local Redis. " +
          "To run only the API: npm run dev (skip npm run dev:all / worker)."
      );
      return null;
    }
    return Math.min(times * 400, 4000);
  },
});

client.on("connect", () => {
  console.log("Redis Connected...");
});

client.on("error", (err) => {
  if (err.code === "ENOTFOUND" && !enotfoundHintLogged) {
    enotfoundHintLogged = true;
    console.error(
      `[Redis] DNS lookup failed for host "${redisHost}" (${err.code}). ` +
        "That hostname does not exist — update .env with a valid endpoint or remove stale UPSTASH_* values."
    );
    return;
  }
  console.error("Redis Client Error", err);
});

const connectRedis = async () => {
  try {
    await client.ping();
  } catch (err) {
    console.error("Redis connection failed:", err.message);
  }
};

const isRedisReady = () => client.status === "ready";

module.exports = {
  client,
  bullmqConnection: client,
  connectRedis,
  isRedisReady,
};
