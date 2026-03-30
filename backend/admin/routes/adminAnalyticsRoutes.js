const express = require("express");
const router = express.Router();
const { getDashboardStats, getGrowthStats } = require("../controllers/adminAnalyticsController");
const { adminAuth } = require("../../middleware/adminAuth");

// All routes are protected by adminAuth
router.get("/stats", adminAuth, getDashboardStats);
router.get("/growth", adminAuth, getGrowthStats);

module.exports = router;
