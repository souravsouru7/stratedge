const express = require("express");
const router = express.Router();

const { getSetups, saveSetups } = require("../controllers/setupController");
const { protect } = require("../middleware/authMiddleware");

// Get all setups for current user
router.get("/", protect, getSetups);

// Replace all setups for current user
router.put("/", protect, saveSetups);

module.exports = router;

