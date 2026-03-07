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

router.post("/", protect, createTrade);

router.get("/", protect, getTrades);

router.get("/:id", protect, getTrade);

router.put("/:id", protect, updateTrade);

router.delete("/:id", protect, deleteTrade);


module.exports = router;