const Payment = require("../../models/Payment");
const User = require("../../models/Users");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");

/**
 * @desc    Get all payments for admin
 * @route   GET /api/admin/payments
 * @access  Private/Admin
 */
exports.getAllPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 });
  res.json(payments);
});

/**
 * @desc    Update payment status (Confirm/Refund)
 * @route   PATCH /api/admin/payments/:id/status
 * @access  Private/Admin
 */
exports.updatePaymentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    throw new ApiError(404, "Payment not found", "NOT_FOUND");
  }

    const previousStatus = payment.status;
    payment.status = status;

    // Handle side effects on User profile if status changed to completed or refunded
    if (status === "completed" && previousStatus !== "completed") {
      const user = await User.findById(payment.user);
      if (user) {
        let newExpiry;
        const now = new Date();
        
        // Extend from current expiry if valid, else from now
        if (user.subscriptionExpiry && user.subscriptionExpiry > now) {
          newExpiry = new Date(user.subscriptionExpiry);
        } else {
          newExpiry = now;
        }

        // Add 90 days for 3 months plan
        const daysToAdd = payment.planType === "3_months" ? 90 : 0;
        newExpiry.setDate(newExpiry.getDate() + daysToAdd);

        user.subscriptionExpiry = newExpiry;
        user.subscriptionStatus = "active";
        user.totalPaid = (user.totalPaid || 0) + payment.amount;
        await user.save();
        
        payment.expiryDate = newExpiry;
      }
    } else if (status === "refunded" && previousStatus === "completed") {
        const user = await User.findById(payment.user);
        if (user) {
            user.totalPaid = Math.max(0, (user.totalPaid || 0) - payment.amount);
            // We don't necessarily revoke expiry immediately on refund unless requested
            // But we mark status as inactive if they have no other active plans (logic can be complex)
            await user.save();
        }
    }

  await payment.save();
  res.json({ message: "Payment status updated", payment });
});

/**
 * @desc    Add a manual payment record
 * @route   POST /api/admin/payments/manual
 * @access  Private/Admin
 */
exports.addManualPayment = asyncHandler(async (req, res) => {
  const { userId, amount, transactionId, planType, notes } = req.body;
  const normalizedTransactionId = (transactionId || `MAN-${Date.now()}`).trim();

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }

  const existingPayment = await Payment.findOne({ transactionId: normalizedTransactionId }).select("_id");
  if (existingPayment) {
    throw new ApiError(400, "Transaction ID already exists. Please use a unique transaction ID.", "VALIDATION_ERROR");
  }

    // Create payment record
    const payment = new Payment({
      user: userId,
      amount: amount || 150,
      transactionId: normalizedTransactionId,
      planType: planType || "3_months",
      paymentMethod: "manual",
      status: "completed",
      notes: notes || "Manual admin entry"
    });

    // Update User immediately since it's manual and "completed"
    let newExpiry;
    const now = new Date();
    if (user.subscriptionExpiry && user.subscriptionExpiry > now) {
      newExpiry = new Date(user.subscriptionExpiry);
    } else {
      newExpiry = now;
    }

    const daysToAdd = payment.planType === "3_months" ? 90 : 30; // 90 for 3 mo, 30 for custom/others
    newExpiry.setDate(newExpiry.getDate() + daysToAdd);

    user.subscriptionExpiry = newExpiry;
    user.subscriptionStatus = "active";
    user.totalPaid = (user.totalPaid || 0) + payment.amount;

    payment.expiryDate = newExpiry;

    // Save payment first so duplicate transaction IDs never extend a user's plan accidentally.
    await payment.save();
    await user.save();

  res.status(201).json({ message: "Manual payment recorded successfully", payment });
});
