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

const cacheMiddleware = require("../middleware/cacheMiddleware");

// Basic analytics
router.get("/summary", protect, cacheMiddleware(30), getSummary);
router.get("/weekly", protect, cacheMiddleware(30), getWeeklyStats);

// Advanced analytics
router.get("/risk-reward", protect, cacheMiddleware(30), getRiskRewardAnalysis);
router.get("/distribution", protect, cacheMiddleware(30), getTradeDistribution);
router.get("/performance", protect, cacheMiddleware(30), getPerformanceMetrics);
router.get("/time-analysis", protect, cacheMiddleware(30), getTimeAnalysis);
router.get("/quality", protect, cacheMiddleware(30), getTradeQuality);
router.get("/drawdown", protect, cacheMiddleware(30), getDrawdownAnalysis);
router.get("/ai-insights", protect, cacheMiddleware(30), getAIInsights);

// All-in-one endpoint
router.get("/advanced", protect, cacheMiddleware(30), getAdvancedAnalytics);

module.exports = router;
