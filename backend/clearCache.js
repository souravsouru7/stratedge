require("dotenv").config();
const { client, isRedisReady } = require("./config/redis");

(async () => {
  try {
    if (!isRedisReady()) {
      console.log("Redis not ready");
      process.exit(1);
    }

    console.log("Clearing Redis cache...");
    await client.flushAll();
    console.log("✅ Cache cleared successfully!");
    
    await client.quit();
    console.log("Redis connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Error clearing cache:", error);
    process.exit(1);
  }
})();
