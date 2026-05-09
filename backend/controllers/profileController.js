const User = require("../models/Users");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { sendPushToUser } = require("../utils/pushNotification");

/**
 * POST /api/profile/fcm-token
 * Register or refresh the FCM token for the authenticated user's device.
 * Body: { token: string }
 */
exports.registerFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== "string" || token.trim() === "") {
    throw new ApiError(400, "FCM token is required", "INVALID_FCM_TOKEN");
  }

  const fcmToken = token.trim();

  // Upsert: add token only if not already present (avoid duplicates)
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { fcmTokens: fcmToken },
  });

  res.json({ success: true });
});

/**
 * DELETE /api/profile/fcm-token
 * Remove an FCM token when the user logs out or revokes push permission.
 * Body: { token: string }
 */
exports.removeFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== "string") {
    throw new ApiError(400, "FCM token is required", "INVALID_FCM_TOKEN");
  }

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { fcmTokens: token.trim() },
  });

  res.json({ success: true });
});

/**
 * POST /api/profile/test-notification
 * Sends a test push notification to the logged-in user's device.
 * Use this to verify the FCM pipeline is working end-to-end.
 */
exports.sendTestNotification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("fcmTokens").lean();

  if (!user?.fcmTokens?.length) {
    throw new ApiError(400, "No FCM token registered for this account. Open the app on your device and log in first.", "NO_FCM_TOKEN");
  }

  const result = await sendPushToUser(req.user._id.toString(), {
    title: "👋 Welcome to Edgecipline!",
    body: "Push notifications are working. You'll get daily P&L summaries and streak reminders here.",
    data: { type: "test" },
  });

  res.json({ success: true, sent: result.sent, failed: result.failed });
});
