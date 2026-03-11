const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");
const {
  listWeeklyReports,
  getWeeklyReport,
  generateNowOnce,
} = require("../controllers/weeklyReportController");

// Extra safety: limit generate-now calls per IP/user
const generateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many generate attempts. Please slow down." },
});

router.get("/weekly", protect, listWeeklyReports);
router.get("/weekly/:id", protect, getWeeklyReport);
router.post("/weekly/generate-now", generateLimiter, protect, generateNowOnce);

module.exports = router;

