const { getFirebaseAdmin } = require("../config/firebaseAdmin");
const User = require("../models/Users");
const { logger } = require("./logger");

/**
 * Send a push notification to all FCM tokens for a user.
 * Automatically removes stale/invalid tokens from the user document.
 *
 * @param {string} userId - MongoDB user ID
 * @param {{ title: string, body: string, data?: Record<string, string> }} payload
 * @returns {Promise<{ sent: number, failed: number }>}
 */
async function sendPushToUser(userId, { title, body, data = {} }) {
  const user = await User.findById(userId).select("fcmTokens").lean();
  if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let admin;
  try {
    admin = getFirebaseAdmin();
  } catch (err) {
    logger.warn("[pushNotification] Firebase Admin not configured — skipping push", { error: err.message });
    return { sent: 0, failed: 0 };
  }

  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  const message = {
    notification: { title, body },
    data: stringData,
    tokens: user.fcmTokens,
    android: {
      priority: "high",
      notification: { sound: "default", channelId: "stratedge_alerts" },
    },
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  const staleTokens = [];
  response.responses.forEach((resp, idx) => {
    if (!resp.success) {
      const code = resp.error?.code || "";
      if (
        code === "messaging/invalid-registration-token" ||
        code === "messaging/registration-token-not-registered"
      ) {
        staleTokens.push(user.fcmTokens[idx]);
      }
    }
  });

  if (staleTokens.length > 0) {
    await User.findByIdAndUpdate(userId, {
      $pull: { fcmTokens: { $in: staleTokens } },
    });
    logger.info("[pushNotification] Removed stale FCM tokens", {
      userId,
      removed: staleTokens.length,
    });
  }

  return { sent: response.successCount, failed: response.failureCount };
}

module.exports = { sendPushToUser };
