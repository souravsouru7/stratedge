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

// Middleware to default marketType to Forex for these routes
const defaultMarketType = (req, res, next) => {
    if (!req.query.marketType) {
        req.query.marketType = "Forex";
    }
    next();
};

router.use(defaultMarketType);

// Basic analytics
router.get("/summary", protect, getSummary);
router.get("/weekly", protect, getWeeklyStats);

// Advanced analytics
router.get("/risk-reward", protect, getRiskRewardAnalysis);
router.get("/distribution", protect, getTradeDistribution);
router.get("/performance", protect, getPerformanceMetrics);
router.get("/time-analysis", protect, getTimeAnalysis);
router.get("/quality", protect, getTradeQuality);
router.get("/drawdown", protect, getDrawdownAnalysis);
router.get("/ai-insights", protect, getAIInsights);

// All-in-one endpoint
router.get("/advanced", protect, getAdvancedAnalytics);

module.exports = router;
