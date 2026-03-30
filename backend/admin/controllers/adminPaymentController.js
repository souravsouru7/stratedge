const Payment = require("../../models/Payment");
const User = require("../../models/Users");

/**
 * @desc    Get all payments for admin
 * @route   GET /api/admin/payments
 * @access  Private/Admin
 */
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update payment status (Confirm/Refund)
 * @route   PATCH /api/admin/payments/:id/status
 * @access  Private/Admin
 */
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Add a manual payment record
 * @route   POST /api/admin/payments/manual
 * @access  Private/Admin
 */
exports.addManualPayment = async (req, res) => {
  try {
    const { userId, amount, transactionId, planType, notes } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create payment record
    const payment = new Payment({
      user: userId,
      amount: amount || 150,
      transactionId: transactionId || `MAN-${Date.now()}`,
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

    await Promise.all([user.save(), payment.save()]);

    res.status(1).json({ message: "Manual payment recorded successfully", payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
