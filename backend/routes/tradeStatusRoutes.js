const express = require("express");
const router = express.Router();

const { getTradeStatus } = require("../controllers/tradeController");
const { protect } = require("../middleware/authMiddleware");

router.get("/status/:id", protect, getTradeStatus);

module.exports = router;
