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

router.get("/summary", cacheMiddleware(30), getSummary);
router.get("/weekly", cacheMiddleware(30), getWeeklyStats);
router.get("/risk-reward", cacheMiddleware(30), getRiskRewardAnalysis);
router.get("/distribution", cacheMiddleware(30), getTradeDistribution);
router.get("/performance", cacheMiddleware(30), getPerformanceMetrics);
router.get("/time-analysis", cacheMiddleware(30), getTimeAnalysis);
router.get("/quality", cacheMiddleware(30), getTradeQuality);
router.get("/drawdown", cacheMiddleware(30), getDrawdownAnalysis);
router.get("/ai-insights", cacheMiddleware(30), getAIInsights);
router.get("/advanced", cacheMiddleware(30), getAdvancedAnalytics);
router.get("/pnl-breakdown", cacheMiddleware(30), getPnLBreakdown);
router.get("/psychology", cacheMiddleware(30), getPsychologyAnalytics);

module.exports = router;
