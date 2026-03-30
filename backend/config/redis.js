const IORedis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const client = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

client.on("connect", () => {
  console.log("Redis Connected...");
});

client.on("error", (err) => {
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
