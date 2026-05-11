const mongoose = require("mongoose");
const DeviceToken = require("../models/DeviceToken");
const NotificationHistory = require("../models/NotificationHistory");
const NotificationPreference = require("../models/NotificationPreference");
const { getFirebaseAdmin } = require("../config/firebaseAdmin");
const { logger } = require("../utils/logger");

const SMART_TYPE_TO_PREF = {
  revenge_trading: "revengeTrading",
  overtrading: "overtrading",
  setup_discipline: "setupDiscipline",
  repeated_mistake: "repeatedMistakes",
  mood_risk: "moodRisk",
  no_stop_loss: "noStopLoss",
  weekly_ai_insight: "weeklyInsight",
};

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

function stringifyData(data = {}) {
  return Object.entries(data || {}).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) return acc;
    acc[key] = typeof value === "string" ? value : JSON.stringify(value);
    return acc;
  }, {});
}

async function getOrCreatePreferences(userId) {
  return NotificationPreference.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId } },
    { upsert: true, returnDocument: "after" }
  ).lean();
}

function isSmartCoachType(type) {
  return Boolean(SMART_TYPE_TO_PREF[type]);
}

async function getAllowedPreferences(userId, type) {
  const prefs = await getOrCreatePreferences(userId);
  if (!prefs.inAppEnabled && !prefs.pushEnabled) return null;
  if (isSmartCoachType(type) && !prefs.smartCoach) return null;

  const flag = SMART_TYPE_TO_PREF[type];
  if (flag && prefs[flag] === false) return null;

  return prefs;
}

async function disableInvalidTokens(invalidTokens = []) {
  if (!invalidTokens.length) return;
  await DeviceToken.updateMany(
    { token: { $in: invalidTokens } },
    {
      enabled: false,
      revokedAt: new Date(),
      $inc: { failureCount: 1 },
    }
  );
}

async function sendPushToUser(userId, notification) {
  const tokens = await DeviceToken.find({
    user: userId,
    enabled: true,
    revokedAt: null,
  })
    .select("token")
    .lean();

  if (!tokens.length) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  const admin = getFirebaseAdmin();
  const response = await admin.messaging().sendEachForMulticast({
    tokens: tokens.map((item) => item.token),
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: stringifyData({
      type: notification.type,
      deepLink: notification.deepLink,
      notificationId: notification._id?.toString?.(),
      ...(notification.data || {}),
    }),
    android: {
      priority: notification.priority === "high" ? "high" : "normal",
      notification: {
        channelId: notification.channelId || "smart_coach",
        sound: "default",
        clickAction: "OPEN_APP",
      },
    },
  });

  const invalidTokens = [];
  response.responses.forEach((result, index) => {
    const code = result.error?.code;
    if (code && INVALID_TOKEN_CODES.has(code)) {
      invalidTokens.push(tokens[index].token);
    }
  });

  await disableInvalidTokens(invalidTokens);

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    invalidTokens,
  };
}

async function notifyUser(userId, payload) {
  const prefs = await getAllowedPreferences(userId, payload.type);
  if (!prefs) {
    return null;
  }

  const dedupeKey = payload.dedupeKey || `${payload.type}:${userId}:${payload.sourceId || Date.now()}`;
  let notification;

  try {
    notification = await NotificationHistory.create({
      user: userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      deepLink: payload.deepLink || payload.data?.deepLink || "",
      sourceType: payload.sourceType || "system",
      sourceId: mongoose.Types.ObjectId.isValid(payload.sourceId) ? payload.sourceId : null,
      dedupeKey,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return null;
    }
    throw error;
  }

  if (!prefs.pushEnabled) {
    await NotificationHistory.findByIdAndUpdate(notification._id, { status: "skipped" });
    return notification;
  }

  try {
    const delivery = await sendPushToUser(userId, {
      ...payload,
      ...notification.toObject(),
    });
    const status = delivery.failureCount > 0 && delivery.successCount > 0
      ? "partial"
      : delivery.failureCount > 0 && delivery.successCount === 0
      ? "failed"
      : "sent";

    await NotificationHistory.findByIdAndUpdate(notification._id, {
      status,
      sentAt: delivery.successCount > 0 ? new Date() : null,
      delivery,
    });

    return notification;
  } catch (error) {
    logger.warn("Push delivery failed", {
      userId: userId?.toString?.(),
      type: payload.type,
      error: error.message,
      code: error.code,
    });

    await NotificationHistory.findByIdAndUpdate(notification._id, {
      status: "failed",
      delivery: {
        successCount: 0,
        failureCount: 1,
        invalidTokens: [],
        error: error.message,
      },
    });

    return notification;
  }
}

async function listUserNotifications(userId, { limit = 50, unreadOnly = false } = {}) {
  const query = { user: userId };
  if (unreadOnly) query.isRead = false;
  return NotificationHistory.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(100, Math.max(1, Number(limit) || 50)))
    .lean();
}

async function markAsRead(userId, notificationId) {
  return NotificationHistory.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { isRead: true, readAt: new Date() },
    { returnDocument: "after" }
  ).lean();
}

async function markAllAsRead(userId) {
  await NotificationHistory.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return { success: true };
}

module.exports = {
  getOrCreatePreferences,
  listUserNotifications,
  markAllAsRead,
  markAsRead,
  notifyUser,
};
