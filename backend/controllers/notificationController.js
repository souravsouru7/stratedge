const Notification = require("../models/Notification");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Get all notifications (Admin)
 */
exports.getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find()
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(notifications);
});

/**
 * @desc    Mark notification as read
 */
exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { isRead: true },
    { new: true }
  );
  res.json(notification);
});

/**
 * @desc    Mark all as read
 */
exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ isRead: false }, { isRead: true });
  res.json({ success: true });
});
