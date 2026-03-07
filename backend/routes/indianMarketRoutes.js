const express = require("express");
const router = express.Router();

const {
  createTrade,
  getTrades,
  getTrade,
  updateTrade,
  deleteTrade
} = require("../controllers/indianTradeController");

const { protect } = require("../middleware/authMiddleware");

// Indian Market only — uses IndianTrade model, no shared Forex logic
router.post("/", protect, createTrade);
router.get("/", protect, getTrades);
router.get("/:id", protect, getTrade);
router.put("/:id", protect, updateTrade);
router.delete("/:id", protect, deleteTrade);

module.exports = router;
