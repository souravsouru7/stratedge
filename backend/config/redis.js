const IORedis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const client = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 15_000,
  retryStrategy(times) {
    if (times > 8) {
      console.error("[Redis] Stopped reconnecting after 8 attempts. Make sure Redis is running locally.");
      return null;
    }
    return Math.min(times * 400, 4000);
  },
});

client.on("connect", () => {
  console.log("Redis Connected...");
});

client.on("error", (err) => {
  console.error("Redis Client Error", err.message);
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
