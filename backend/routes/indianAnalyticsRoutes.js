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
  getPnLBreakdown
} = require("../controllers/indianAnalyticsController");

const { protect } = require("../middleware/authMiddleware");

// Indian Market only — uses IndianTrade model
router.use(protect);

router.get("/summary", getSummary);
router.get("/weekly", getWeeklyStats);
router.get("/risk-reward", getRiskRewardAnalysis);
router.get("/distribution", getTradeDistribution);
router.get("/performance", getPerformanceMetrics);
router.get("/time-analysis", getTimeAnalysis);
router.get("/quality", getTradeQuality);
router.get("/drawdown", getDrawdownAnalysis);
router.get("/ai-insights", getAIInsights);
router.get("/advanced", getAdvancedAnalytics);
router.get("/pnl-breakdown", getPnLBreakdown);

module.exports = router;
