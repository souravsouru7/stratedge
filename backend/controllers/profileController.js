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

  // Step 1: check token exists in DB
  if (!user?.fcmTokens?.length) {
    return res.status(400).json({
      success: false,
      step: "fcm_token_check",
      error: "No FCM token in database for this account. The app did not save it after login — check that you are using the latest APK and logged in on the device.",
    });
  }

  // Step 2: check Firebase Admin is configured
  let admin;
  try {
    const { getFirebaseAdmin } = require("../config/firebaseAdmin");
    admin = getFirebaseAdmin();
  } catch (err) {
    return res.status(500).json({
      success: false,
      step: "firebase_admin_init",
      error: "Firebase Admin SDK not configured on server. Check that FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY env vars are set correctly.",
      detail: err.message,
    });
  }

  // Step 3: send and return full result
  const result = await sendPushToUser(req.user._id.toString(), {
    title: "👋 Welcome to Edgecipline!",
    body: "Push notifications are working. You'll get daily P&L summaries and streak reminders here.",
    data: { type: "test" },
  });

  res.json({
    success: result.sent > 0,
    sent: result.sent,
    failed: result.failed,
    tokenCount: user.fcmTokens.length,
    step: result.sent > 0 ? "done" : "fcm_send_failed",
    error: result.sent === 0 ? "FCM rejected all tokens — they may be expired or invalid. Uninstall and reinstall the app, then log in again." : null,
  });
});
