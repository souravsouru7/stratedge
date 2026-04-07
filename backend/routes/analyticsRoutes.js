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
    getAdvancedAnalytics,
    getPsychologyAnalytics
} = require("../controllers/analyticsController");

const cacheMiddleware = require("../middleware/cacheMiddleware");

// Basic analytics
router.get("/summary", protect, cacheMiddleware({ namespace: "dashboard", scope: "forex_summary", ttlSeconds: 45 }), getSummary);
router.get("/weekly", protect, cacheMiddleware({ namespace: "analytics:forex", scope: "weekly", ttlSeconds: 90 }), getWeeklyStats);

// Advanced analytics
router.get("/risk-reward", protect, cacheMiddleware({ namespace: "analytics:forex", scope: "risk_reward", ttlSeconds: 90 }), getRiskRewardAnalysis);
router.get("/distribution", protect, cacheMiddleware({ namespace: "analytics:forex", scope: "distribution", ttlSeconds: 90 }), getTradeDistribution);
router.get("/performance", protect, cacheMiddleware({ namespace: "analytics:forex", scope: "performance", ttlSeconds: 90 }), getPerformanceMetrics);
router.get("/time-analysis", protect, cacheMiddleware({ namespace: "analytics:forex", scope: "time_analysis", ttlSeconds: 90 }), getTimeAnalysis);
router.get("/quality", protect, cacheMiddleware({ namespace: "analytics:forex", scope: "quality", ttlSeconds: 90 }), getTradeQuality);
router.get("/drawdown", protect, getDrawdownAnalysis); // No cache for real-time
router.get("/ai-insights", protect, cacheMiddleware({ namespace: "analytics:forex", scope: "ai_insights", ttlSeconds: 120 }), getAIInsights);

// All-in-one endpoint
router.get("/advanced", protect, cacheMiddleware({ namespace: "dashboard", scope: "forex_advanced", ttlSeconds: 60 }), getAdvancedAnalytics);

// Psychology analytics
router.get("/psychology", protect, cacheMiddleware({ namespace: "analytics:forex", scope: "psychology", ttlSeconds: 90 }), getPsychologyAnalytics);

module.exports = router;
