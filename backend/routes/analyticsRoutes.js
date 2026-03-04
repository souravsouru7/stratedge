const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

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

// Basic analytics
router.get("/summary", protect, getSummary);
router.get("/weekly", protect, getWeeklyStats);

// Advanced analytics
router.get("/risk-reward", protect, getRiskRewardAnalysis);
router.get("/distribution", protect, getTradeDistribution);
router.get("/performance", protect, getPerformanceMetrics);
router.get("/time", protect, getTimeAnalysis);
router.get("/quality", protect, getTradeQuality);
router.get("/drawdown", protect, getDrawdownAnalysis);
router.get("/insights", protect, getAIInsights);

// All-in-one endpoint
router.get("/advanced", protect, getAdvancedAnalytics);

module.exports = router;
