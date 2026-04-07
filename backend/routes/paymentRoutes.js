const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const isRazorpayConfigured = () => {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  return Boolean(keyId && keySecret);
};

// In demo mode we keep payment endpoints "hidden" (disabled) until Razorpay is configured.
if (isRazorpayConfigured()) {
  const { createOrder, verifyPayment } = require("../controllers/paymentController");
  router.post("/order", protect, createOrder);
  router.post("/verify", protect, verifyPayment);
} else {
  const demoDisabledResponse = {
    success: false,
    message: "Payments are disabled in demo mode. Razorpay is not configured yet.",
    code: "PAYMENT_DISABLED_DEMO",
  };

  router.post("/order", protect, (req, res) => res.status(503).json(demoDisabledResponse));
  router.post("/verify", protect, (req, res) => res.status(503).json(demoDisabledResponse));
}

module.exports = router;
