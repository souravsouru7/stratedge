const express = require("express");
const router = express.Router();
const { logChecklistResult, getChecklistStats } = require("../controllers/checklistController");
const { protect } = require("../middleware/authMiddleware");

router.route("/track").post(protect, logChecklistResult).get(protect, getChecklistStats);

module.exports = router;
