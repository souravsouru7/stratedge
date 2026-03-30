const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const User = require("../models/Users");
const Notification = require("../models/Notification");


// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * @desc Create a Razorpay Order
 * @route POST /api/payments/order
 * @access Private
 */
exports.createOrder = async (req, res) => {
  try {
    const options = {
      amount: 150 * 100, // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      return res.status(500).send("Some error occurred");
    }

    res.json(order);
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Verify Razorpay Payment Signature
 * @route POST /api/payments/verify
 * @access Private
 */
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planType = "3_months"
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Payment is valid, update user subscription and create payment record
      const userId = req.user._id;
      const user = await User.findById(userId);
      const amount = 150; // In INR for 3 months
      
      let expiryDate = new Date();
      // If user already has an active subscription, extend from the current expiry
      if (user.subscriptionStatus === "active" && user.subscriptionExpiry && new Date(user.subscriptionExpiry) > expiryDate) {
        expiryDate = new Date(user.subscriptionExpiry);
      }
      
      expiryDate.setDate(expiryDate.getDate() + 90); // Add 3 months (90 days)

      // 1. Create Payment record
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
        notes: "Automated subscription via Razorpay"
      });

      // 2. Update User subscription
      await User.findByIdAndUpdate(userId, {
        subscriptionStatus: "active",
        subscriptionPlan: "monthly", // Using 'monthly' as a placeholder for a paid plan
        subscriptionExpiry: expiryDate,
        $inc: { totalPaid: amount }
      });

      // 3. Create Admin Notification
      await Notification.create({
        title: "New Payment Received",
        message: `User ${user.name} paid ₹${amount} for a 3-month plan.`,
        type: "payment",
        userId: userId,
        metadata: { paymentId: razorpay_payment_id, amount }
      });

      res.json({
        success: true,
        message: "Payment verified and subscription extended successfully"
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid payment signature"
      });
    }
  } catch (error) {
    console.error("Verify Payment Error:", error);
    res.status(500).json({ message: error.message });
  }
};
