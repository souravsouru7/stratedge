const cron = require("node-cron");
const User = require("../models/Users");
const Trade = require("../models/Trade");
const IndianTrade = require("../models/IndianTrade");
const { sendPushToUser } = require("../utils/pushNotification");
const { logger } = require("../utils/logger");

let isRunning = false;

async function runDailyPnlNotifications() {
  if (isRunning) {
    logger.warn("[dailyPnlCron] Previous run still in progress — skipping");
    return;
  }
  isRunning = true;
  logger.info("[dailyPnlCron] Starting daily P&L notification run");

  try {
    // Users who have at least one FCM token registered
    const users = await User.find(
      { fcmTokens: { $exists: true, $not: { $size: 0 } } },
      { _id: 1 }
    ).lean();

    if (users.length === 0) {
      logger.info("[dailyPnlCron] No users with FCM tokens — nothing to do");
      return;
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    let sent = 0;
    let skipped = 0;

    for (const { _id: userId } of users) {
      try {
        const [forexTrades, indianTrades] = await Promise.all([
          Trade.find({
            user: userId,
            status: "completed",
            tradeDate: { $gte: startOfDay, $lte: endOfDay },
          })
            .select("profit")
            .lean(),
          IndianTrade.find({
            user: userId,
            status: "completed",
            tradeDate: { $gte: startOfDay, $lte: endOfDay },
          })
            .select("profit")
            .lean(),
        ]);

        const allTrades = [...forexTrades, ...indianTrades];

        if (allTrades.length === 0) {
          skipped++;
          continue;
        }

        const totalPnl = allTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
        const tradeCount = allTrades.length;
        const sign = totalPnl >= 0 ? "+" : "";
        const emoji = totalPnl >= 0 ? "📈" : "📉";

        const title = `${emoji} Today's P&L Summary`;
        const body =
          `${tradeCount} trade${tradeCount !== 1 ? "s" : ""} logged · Net: ${sign}${totalPnl.toFixed(2)}`;

        await sendPushToUser(userId.toString(), {
          title,
          body,
          data: {
            type: "daily_pnl",
            pnl: String(totalPnl.toFixed(2)),
            trades: String(tradeCount),
          },
        });
        sent++;
      } catch (userErr) {
        logger.error("[dailyPnlCron] Failed to notify user", {
          userId,
          error: userErr.message,
        });
      }
    }

    logger.info("[dailyPnlCron] Run complete", { sent, skipped });
  } catch (err) {
    logger.error("[dailyPnlCron] Fatal error during run", {
      error: err.message,
      stack: err.stack,
    });
  } finally {
    isRunning = false;
  }
}

function startDailyPnlCron() {
  // 9:00 PM server time every day
  cron.schedule("0 21 * * *", runDailyPnlNotifications);
  logger.info("[dailyPnlCron] Scheduled — fires at 21:00 every day");
}

module.exports = { startDailyPnlCron, runDailyPnlNotifications };
