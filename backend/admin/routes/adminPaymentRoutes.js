const express = require("express");
const router = express.Router();
const { 
  getAllPayments, 
  updatePaymentStatus, 
  addManualPayment 
} = require("../controllers/adminPaymentController");
const { adminAuth } = require("../../middleware/adminAuth");

// All routes are protected by adminAuth
router.get("/", adminAuth, getAllPayments);
router.patch("/:id/status", adminAuth, updatePaymentStatus);
router.post("/manual", adminAuth, addManualPayment);

module.exports = router;
