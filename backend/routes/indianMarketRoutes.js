const express = require("express");
const router = express.Router();

const {
  createTrade,
  getTrades,
  getTrade,
  updateTrade,
  deleteTrade
} = require("../controllers/tradeController");

const { protect } = require("../middleware/authMiddleware");

// Indian Market-specific routes
// These automatically set marketType to "Indian_Market"

// Create Indian Market trade (auto-sets marketType)
router.post("/", protect, async (req, res) => {
  try {
    // Force marketType to Indian_Market
    req.body.marketType = "Indian_Market";
    await createTrade(req, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all Indian Market trades (auto-filters by marketType)
router.get("/", protect, async (req, res) => {
  try {
    // Set marketType query parameter
    req.query.marketType = "Indian_Market";
    await getTrades(req, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single trade (no market filter needed - works for both markets)
router.get("/:id", protect, getTrade);

// Update trade (preserves existing marketType)
router.put("/:id", protect, updateTrade);

// Delete trade (works for both markets)
router.delete("/:id", protect, deleteTrade);

module.exports = router;
