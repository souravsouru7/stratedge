const User = require("../../models/Users");
const Trade = require("../../models/Trade");
const IndianTrade = require("../../models/IndianTrade");

/**
 * @desc    Get all users with their statistics
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
exports.getAllUsers = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete a user and all their data
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot delete an admin user" });
    }

    // Delete associated data
    await Promise.all([
      Trade.deleteMany({ user: user._id }),
      IndianTrade.deleteMany({ user: user._id }),
      User.findByIdAndDelete(user._id)
    ]);

    res.json({ message: "User and all associated data deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Toggle user active/inactive status
 * @route   PATCH /api/admin/users/:id/status
 * @access  Private/Admin
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Extend user subscription plan
 * @route   PATCH /api/admin/users/:id/extend
 * @access  Private/Admin
 */
exports.extendUserPlan = async (req, res) => {
  try {
    const { days } = req.body;
    const extensionDays = parseInt(days) || 30;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all users whose plans have expired
 * @route   GET /api/admin/users/expired
 * @access  Private/Admin
 */
exports.getExpiredUsers = async (req, res) => {
  try {
    const now = new Date();
    // Users with no role or role user, where expiry is in the past
    const expiredUsers = await User.find({
      role: { $ne: "admin" },
      subscriptionExpiry: { $lt: now }
    }).sort({ subscriptionExpiry: -1 }).lean();

    res.json(expiredUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Send renewal reminder email to a user
 * @route   POST /api/admin/users/:id/remind
 * @access  Private/Admin
 */
const { sendRenewalReminder } = require("../../services/mailService");

exports.sendRenewalReminderAction = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.subscriptionExpiry) {
      return res.status(400).json({ message: "User has no subscription history" });
    }

    await sendRenewalReminder(user.email, user.name, user.subscriptionExpiry);
    
    res.json({ message: `Renewal reminder sent to ${user.email}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

