const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
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
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }
  const amount = 150;

  const existingPayment = await Payment.findOne({
    $or: [{ transactionId: razorpay_payment_id }, { razorpayPaymentId: razorpay_payment_id }],
  })
    .select("_id expiryDate")
    .lean();
  if (existingPayment) {
    return res.json({
      success: true,
      message: "Payment already verified",
      idempotent: true,
    });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const userInTxn = await User.findById(userId).session(session);
    if (!userInTxn) {
      throw new ApiError(404, "User not found", "NOT_FOUND");
    }

    let expiryDate = new Date();
    if (
      userInTxn.subscriptionStatus === "active" &&
      userInTxn.subscriptionExpiry &&
      new Date(userInTxn.subscriptionExpiry) > expiryDate
    ) {
      expiryDate = new Date(userInTxn.subscriptionExpiry);
    }
    expiryDate.setDate(expiryDate.getDate() + 90);

    await Payment.create(
      [
        {
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
        },
      ],
      { session }
    );

    await User.findByIdAndUpdate(
      userId,
      {
        subscriptionStatus: "active",
        subscriptionPlan: "monthly",
        subscriptionExpiry: expiryDate,
        $inc: { totalPaid: amount },
      },
      { session }
    );

    await Notification.create(
      [
        {
          title: "New Payment Received",
          message: `User ${userInTxn.name} paid Rs ${amount} for a 3-month plan.`,
          type: "payment",
          userId,
          metadata: { paymentId: razorpay_payment_id, amount },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.json({
      success: true,
      message: "Payment verified and subscription extended successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    if (error?.code === 11000) {
      return res.json({
        success: true,
        message: "Payment already verified",
        idempotent: true,
      });
    }
    throw error;
  } finally {
    await session.endSession();
  }
});
