const express = require("express");
const router = express.Router();
const { 
  getAllTrades, 
  getExtractionLogs 
} = require("../controllers/adminTradeController");
const { adminAuth } = require("../../middleware/adminAuth");

// All routes are protected by adminAuth
router.get("/", adminAuth, getAllTrades);
router.get("/logs", adminAuth, getExtractionLogs);

module.exports = router;
