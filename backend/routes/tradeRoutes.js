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
const cacheMiddleware = require("../middleware/cacheMiddleware");

router.post("/", protect, createTrade);

router.get("/", protect, cacheMiddleware(1), getTrades);

router.get("/status/:id", protect, getTradeStatus);

router.get("/:id", protect, getTrade);

router.put("/:id", protect, updateTrade);

router.delete("/:id", protect, deleteTrade);


module.exports = router;
