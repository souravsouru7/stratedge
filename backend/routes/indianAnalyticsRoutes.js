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
  getAdvancedAnalytics
} = require("../controllers/analyticsController");

const { protect } = require("../middleware/authMiddleware");

// Helper to force marketType to Indian_Market
const forceIndianMarket = (req, res, next) => {
  req.query.marketType = "Indian_Market";
  next();
};

// All routes automatically filter by Indian_Market
router.use(protect);
router.use(forceIndianMarket);

// Basic Analytics
router.get("/summary", getSummary);
router.get("/weekly", getWeeklyStats);

// Advanced Analytics
router.get("/risk-reward", getRiskRewardAnalysis);
router.get("/distribution", getTradeDistribution);
router.get("/performance", getPerformanceMetrics);
router.get("/time-analysis", getTimeAnalysis);
router.get("/quality", getTradeQuality);
router.get("/drawdown", getDrawdownAnalysis);
router.get("/ai-insights", getAIInsights);
router.get("/advanced", getAdvancedAnalytics);

module.exports = router;
