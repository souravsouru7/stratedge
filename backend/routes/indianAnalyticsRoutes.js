const express = require("express");
const router = express.Router();

const {
  getSummary,
  getWeeklyStats,
  getRiskRewardAnalysis,
  getTradeDistribution,
  getPerformanceMetrics,
  getTimeAnalysis,
  getTradeQuality,
  getDrawdownAnalysis,
  getAIInsights,
  getAdvancedAnalytics,
  getPnLBreakdown,
  getPsychologyAnalytics
} = require("../controllers/indianAnalyticsController");

const { protect } = require("../middleware/authMiddleware");
const cacheMiddleware = require("../middleware/cacheMiddleware");

// Indian Market only — uses IndianTrade model
router.use(protect);

router.get("/summary", cacheMiddleware({ namespace: "dashboard", scope: "indian_summary", ttlSeconds: 45 }), getSummary);
router.get("/weekly", cacheMiddleware({ namespace: "analytics:indian", scope: "weekly", ttlSeconds: 90 }), getWeeklyStats);
router.get("/risk-reward", cacheMiddleware({ namespace: "analytics:indian", scope: "risk_reward", ttlSeconds: 90 }), getRiskRewardAnalysis);
router.get("/distribution", cacheMiddleware({ namespace: "analytics:indian", scope: "distribution", ttlSeconds: 90 }), getTradeDistribution);
router.get("/performance", cacheMiddleware({ namespace: "analytics:indian", scope: "performance", ttlSeconds: 90 }), getPerformanceMetrics);
router.get("/time-analysis", cacheMiddleware({ namespace: "analytics:indian", scope: "time_analysis", ttlSeconds: 90 }), getTimeAnalysis);
router.get("/quality", cacheMiddleware({ namespace: "analytics:indian", scope: "quality", ttlSeconds: 90 }), getTradeQuality);
router.get("/drawdown", cacheMiddleware({ namespace: "analytics:indian", scope: "drawdown", ttlSeconds: 60 }), getDrawdownAnalysis);
router.get("/ai-insights", cacheMiddleware({ namespace: "analytics:indian", scope: "ai_insights", ttlSeconds: 120 }), getAIInsights);
router.get("/advanced", cacheMiddleware({ namespace: "dashboard", scope: "indian_advanced", ttlSeconds: 60 }), getAdvancedAnalytics);
router.get("/pnl-breakdown", cacheMiddleware({ namespace: "analytics:indian", scope: "pnl_breakdown", ttlSeconds: 90 }), getPnLBreakdown);
router.get("/psychology", cacheMiddleware({ namespace: "analytics:indian", scope: "psychology", ttlSeconds: 90 }), getPsychologyAnalytics);

module.exports = router;
