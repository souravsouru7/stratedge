const express = require("express");
const router = express.Router();

const {
    createTrade,
    getTrades,
    getTrade,
    getTradeStatus,
    updateTrade,
    deleteTrade
} = require("../controllers/tradeController");

const { protect } = require("../middleware/authMiddleware");
const { statusRateLimiter } = require("../middleware/rateLimiter");
const { validateNumbers } = require("../middleware/validateNumbers");

router.post("/", protect, validateNumbers, createTrade);

router.get("/", protect, getTrades);

router.get("/status/:id", protect, statusRateLimiter, getTradeStatus);

router.get("/:id", protect, getTrade);

router.put("/:id", protect, validateNumbers, updateTrade);

router.delete("/:id", protect, deleteTrade);


module.exports = router;
