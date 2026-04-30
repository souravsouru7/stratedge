const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const User = require("../models/Users");
const Notification = require("../models/Notification");
const { appConfig } = require("../config");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { logger } = require("../utils/logger");

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

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, "Missing required payment fields", "VALIDATION_ERROR");
  }

  const expectedSignature = crypto
    .createHmac("sha256", appConfig.razorpay.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const signaturesMatch = (() => {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(razorpay_signature, "hex")
      );
    } catch {
      return false;
    }
  })();

  if (!signaturesMatch) {
    throw new ApiError(400, "Invalid payment signature", "PAYMENT_SIGNATURE_INVALID");
  }

  const userId = req.user._id;
  const amount = 150;

  // ── Idempotency: fast-path if fully processed already ───────────────────
  const existingPayment = await Payment.findOne({ razorpayPaymentId: razorpay_payment_id }).lean();
  if (existingPayment?.subscriptionExtended) {
    logger.warn("Duplicate payment verification rejected (already processed)", {
      razorpayPaymentId: razorpay_payment_id,
      userId: userId.toString(),
      existingPaymentId: existingPayment._id.toString(),
    });
    return res.json({
      success: true,
      message: "Payment already verified and subscription is active",
    });
  }

  // ── Compute new subscription expiry from current user state ─────────────
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found", "NOT_FOUND");

  const now = new Date();
  let expiryDate = new Date(now);
  if (
    user.subscriptionStatus === "active" &&
    user.subscriptionExpiry &&
    new Date(user.subscriptionExpiry) > now
  ) {
    expiryDate = new Date(user.subscriptionExpiry);
  }
  expiryDate.setDate(expiryDate.getDate() + 90);

  // ── Create payment record (unique transactionId prevents duplicates) ─────
  let isNewPayment = false;
  let paymentId;

  try {
    const payment = await Payment.create({
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
      subscriptionExtended: false,
    });
    isNewPayment = true;
    paymentId = payment._id;
  } catch (err) {
    if (err.code === 11000) {
      // A concurrent request already created the record — check if it finished.
      logger.warn("Concurrent payment verification race condition detected", {
        razorpayPaymentId: razorpay_payment_id,
        userId: userId.toString(),
      });

      const concurrent = await Payment.findOne({ razorpayPaymentId: razorpay_payment_id }).lean();
      if (concurrent?.subscriptionExtended) {
        return res.json({ success: true, message: "Payment already verified and subscription is active" });
      }
      // Concurrent request is mid-flight — fall through to extend subscription
      // without incrementing totalPaid (already handled by the winning request).
      paymentId = concurrent?._id;
    } else {
      throw err;
    }
  }

  // ── Extend subscription using $max so it is safe to call more than once ──
  // $max ensures we never reduce an existing expiry and concurrent calls converge.
  await User.findByIdAndUpdate(userId, {
    subscriptionStatus: "active",
    subscriptionPlan: "monthly",
    $max: { subscriptionExpiry: expiryDate },
    ...(isNewPayment ? { $inc: { totalPaid: amount } } : {}),
  });

  // ── Mark payment as fully processed (idempotency seal) ───────────────────
  if (paymentId) {
    await Payment.findByIdAndUpdate(paymentId, { $set: { subscriptionExtended: true } });
  }

  // ── Create notification (only for genuinely new payments) ─────────────────
  if (isNewPayment) {
    await Notification.create({
      title: "New Payment Received",
      message: `User ${user.name} paid Rs ${amount} for a 3-month plan.`,
      type: "payment",
      userId,
      metadata: { paymentId: razorpay_payment_id, amount },
    }).catch((notifErr) => {
      logger.warn("Failed to create payment notification", {
        error: notifErr.message,
        userId: userId.toString(),
        razorpayPaymentId: razorpay_payment_id,
      });
    });
  }

  logger.info("Payment verified and subscription extended", {
    userId: userId.toString(),
    razorpayPaymentId: razorpay_payment_id,
    expiryDate: expiryDate.toISOString(),
    isNewPayment,
  });

  res.json({
    success: true,
    message: "Payment verified and subscription extended successfully",
  });
});
