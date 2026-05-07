const User = require("../models/Users");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

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
