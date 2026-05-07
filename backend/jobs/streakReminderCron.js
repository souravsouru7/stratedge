const cron = require("node-cron");
const User = require("../models/Users");
const Trade = require("../models/Trade");
const IndianTrade = require("../models/IndianTrade");
const { sendPushToUser } = require("../utils/pushNotification");
const { logger } = require("../utils/logger");

const INACTIVE_THRESHOLD_DAYS = 2;

let isRunning = false;

async function runStreakReminders() {
  if (isRunning) {
    logger.warn("[streakReminderCron] Previous run still in progress — skipping");
    return;
  }
  isRunning = true;
  logger.info("[streakReminderCron] Starting streak reminder run");

  try {
    const users = await User.find(
      { fcmTokens: { $exists: true, $not: { $size: 0 } } },
      { _id: 1 }
    ).lean();

    if (users.length === 0) {
      logger.info("[streakReminderCron] No users with FCM tokens — nothing to do");
      return;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - INACTIVE_THRESHOLD_DAYS);
    cutoff.setHours(0, 0, 0, 0);

    let sent = 0;
    let skipped = 0;

    for (const { _id: userId } of users) {
      try {
        // Check if user has ANY trade logged since the cutoff date
        const [recentForex, recentIndian] = await Promise.all([
          Trade.findOne(
            { user: userId, status: "completed", tradeDate: { $gte: cutoff } },
            { _id: 1 }
          ).lean(),
          IndianTrade.findOne(
            { user: userId, status: "completed", tradeDate: { $gte: cutoff } },
            { _id: 1 }
          ).lean(),
        ]);

        if (recentForex || recentIndian) {
          skipped++;
          continue;
        }

        await sendPushToUser(userId.toString(), {
          title: "📊 Keep Your Streak Alive!",
          body: `You haven't logged a trade in ${INACTIVE_THRESHOLD_DAYS}+ days. Open your journal and stay consistent.`,
          data: { type: "streak_reminder" },
        });
        sent++;
      } catch (userErr) {
        logger.error("[streakReminderCron] Failed to notify user", {
          userId,
          error: userErr.message,
        });
      }
    }

    logger.info("[streakReminderCron] Run complete", { sent, skipped });
  } catch (err) {
    logger.error("[streakReminderCron] Fatal error during run", {
      error: err.message,
      stack: err.stack,
    });
  } finally {
    isRunning = false;
  }
}

function startStreakReminderCron() {
  // 8:00 PM server time every day
  cron.schedule("0 20 * * *", runStreakReminders);
  logger.info("[streakReminderCron] Scheduled — fires at 20:00 every day");
}

module.exports = { startStreakReminderCron, runStreakReminders };
