const User = require("../../models/Users");
const Trade = require("../../models/Trade");
const IndianTrade = require("../../models/IndianTrade");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");

/**
 * @desc    Get all users with their statistics
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: { $ne: "admin" } }).select("+password").lean();

    // Enrich users with trade counts
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const forexCount = await Trade.countDocuments({ user: user._id });
        const indianCount = await IndianTrade.countDocuments({ user: user._id });
        
        // Remove password before sending to frontend
        const { password, ...userWithoutPassword } = user;
        
        return {
          ...userWithoutPassword,
          tradeCount: forexCount + indianCount,
          forexTradeCount: forexCount,
          indianTradeCount: indianCount
        };
      })
    );

  res.json(enrichedUsers);
});

/**
 * @desc    Delete a user and all their data
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }

  if (user.role === "admin") {
    throw new ApiError(403, "Cannot delete an admin user", "FORBIDDEN");
  }

    // Delete associated data
    await Promise.all([
      Trade.deleteMany({ user: user._id }),
      IndianTrade.deleteMany({ user: user._id }),
      User.findByIdAndDelete(user._id)
    ]);

  res.json({ message: "User and all associated data deleted successfully" });
});

/**
 * @desc    Toggle user active/inactive status
 * @route   PATCH /api/admin/users/:id/status
 * @access  Private/Admin
 */
exports.toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }

    // Toggle logic: active <-> inactive
    // If it's expired, we might want to keep it expired or move to inactive
    user.subscriptionStatus = user.subscriptionStatus === "active" ? "inactive" : "active";
    
    await user.save();
  res.json({ 
    message: `User status updated to ${user.subscriptionStatus}`,
    user: {
      _id: user._id,
      subscriptionStatus: user.subscriptionStatus
    }
  });
});

/**
 * @desc    Extend user subscription plan
 * @route   PATCH /api/admin/users/:id/extend
 * @access  Private/Admin
 */
exports.extendUserPlan = asyncHandler(async (req, res) => {
  const { days } = req.body;
  const extensionDays = parseInt(days, 10) || 30;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }

    let newExpiry;
    const now = new Date();

    // If already active and has expiry, extend from current expiry
    // Otherwise extend from today
    if (user.subscriptionExpiry && user.subscriptionExpiry > now) {
      newExpiry = new Date(user.subscriptionExpiry);
    } else {
      newExpiry = now;
    }

    newExpiry.setDate(newExpiry.getDate() + extensionDays);
    
    user.subscriptionExpiry = newExpiry;
    user.subscriptionStatus = "active"; // Reactivate if it was expired/inactive
    
    await user.save();
  res.json({ 
    message: `Plan extended by ${extensionDays} days`,
    expiry: user.subscriptionExpiry,
    status: user.subscriptionStatus
  });
});

/**
 * @desc    Get all users whose plans have expired
 * @route   GET /api/admin/users/expired
 * @access  Private/Admin
 */
exports.getExpiredUsers = asyncHandler(async (req, res) => {
  const now = new Date();
  const expiredUsers = await User.find({
    role: { $ne: "admin" },
    subscriptionExpiry: { $lt: now }
  }).sort({ subscriptionExpiry: -1 }).lean();

  res.json(expiredUsers);
});

/**
 * @desc    Send renewal reminder email to a user
 * @route   POST /api/admin/users/:id/remind
 * @access  Private/Admin
 */
const { sendRenewalReminder } = require("../../services/mailService");

exports.sendRenewalReminderAction = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }

  if (!user.subscriptionExpiry) {
    throw new ApiError(400, "User has no subscription history", "VALIDATION_ERROR");
  }

  await sendRenewalReminder(user.email, user.name, user.subscriptionExpiry);
  res.json({ message: `Renewal reminder sent to ${user.email}` });
};

exports.sendRenewalReminderAction = asyncHandler(exports.sendRenewalReminderAction);

