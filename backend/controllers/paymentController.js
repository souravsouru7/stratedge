const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const User = require("../models/Users");
const Notification = require("../models/Notification");
const { appConfig } = require("../config");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const getRazorpayClient = () => {
  const keyId = String(appConfig.razorpay.keyId || "").trim();
  const keySecret = String(appConfig.razorpay.keySecret || "").trim();

  if (!keyId || !keySecret) {
    throw new ApiError(503, "Razorpay is not configured. Manual admin payments can still be used.", "RAZORPAY_CONFIG_MISSING");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

exports.createOrder = asyncHandler(async (req, res) => {
  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.create({
    amount: 150 * 100,
    currency: "INR",
    receipt: `receipt_order_${Date.now()}`,
  });

  if (!order) {
    throw new ApiError(500, "Failed to create payment order", "PAYMENT_ORDER_FAILED");
  }

  res.json(order);
});

exports.verifyPayment = asyncHandler(async (req, res) => {
  getRazorpayClient();

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    planType = "3_months",
  } = req.body;

  const expectedSignature = crypto
    .createHmac("sha256", appConfig.razorpay.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new ApiError(400, "Invalid payment signature", "PAYMENT_SIGNATURE_INVALID");
  }

  const userId = req.user._id;
  const user = await User.findById(userId);
  const amount = 150;

  let expiryDate = new Date();
  if (user.subscriptionStatus === "active" && user.subscriptionExpiry && new Date(user.subscriptionExpiry) > expiryDate) {
    expiryDate = new Date(user.subscriptionExpiry);
  }
  expiryDate.setDate(expiryDate.getDate() + 90);

  await Payment.create({
    user: userId,
    amount,
    currency: "INR",
    status: "completed",
    paymentMethod: "razorpay",
    transactionId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
    planType,
    expiryDate,
    notes: "Automated subscription via Razorpay",
  });

  await User.findByIdAndUpdate(userId, {
    subscriptionStatus: "active",
    subscriptionPlan: "monthly",
    subscriptionExpiry: expiryDate,
    $inc: { totalPaid: amount },
  });

  await Notification.create({
    title: "New Payment Received",
    message: `User ${user.name} paid Rs ${amount} for a 3-month plan.`,
    type: "payment",
    userId,
    metadata: { paymentId: razorpay_payment_id, amount },
  });

  res.json({
    success: true,
    message: "Payment verified and subscription extended successfully",
  });
});
