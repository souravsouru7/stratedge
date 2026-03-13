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
const cacheMiddleware = require("../middleware/cacheMiddleware");

router.post("/", protect, createTrade);

router.get("/", protect, cacheMiddleware(10), getTrades);

router.get("/:id", protect, getTrade);

router.put("/:id", protect, updateTrade);

router.delete("/:id", protect, deleteTrade);


module.exports = router;