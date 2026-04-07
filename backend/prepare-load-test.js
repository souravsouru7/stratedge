require("dotenv").config();
const { client, isRedisReady } = require("./config/redis");

(async () => {
  try {
    if (!isRedisReady()) {
      console.log("⚠️  Redis not ready - cache will be bypassed");
    } else {
      console.log("🔄 Clearing Redis cache...");
      await client.flushAll();
      console.log("✅ Cache cleared successfully!");
      await client.quit();
    }
    
    console.log("\n📊 k6 Load Test Ready!\n");
    console.log("Next steps:");
    console.log("1. Get your JWT token from browser or login API");
    console.log("2. Run: $env:TOKEN='your_token_here'");
    console.log("3. Run test: k6 run load-tests/quick-test.js\n");
    console.log("Example commands:");
    console.log("  # Quick test (50 users, 30s)");
    console.log("  k6 run --vus 50 --duration 30s load-tests/analytics-load-test.js\n");
    console.log("  # Full staged test");
    console.log("  k6 run load-tests/analytics-load-test.js\n");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
