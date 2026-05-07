const cron = require("node-cron");
const { appConfig } = require("../config");
const userRepository = require("../repositories/user.repository");
const weeklyReportRepository = require("../repositories/weeklyReport.repository");
const { generateRolling7dReportForUser } = require("../services/weeklyReport.service");
const { logger } = require("../utils/logger");

let isRunning = false;

async function runWeeklyReportsJob() {
  if (isRunning) return;
  isRunning = true;
  let users;
  try {
    users = await userRepository.findUsersForWeeklyReports();
  } catch (e) {
    logger.error("[weeklyReportsCron] failed to fetch users", { error: e.message, stack: e.stack });
    isRunning = false;
    return;
  }

  try {
    const marketTypes = ["Forex", "Indian_Market"];
    const cooldownMs = 7 * 24 * 60 * 60 * 1000;

    for (const u of users) {
      for (const marketType of marketTypes) {
        try {
          const since = new Date(Date.now() - cooldownMs);
          const recentlyGenerated = await weeklyReportRepository.findRecentlyGeneratedWeeklyReport(
            u._id,
            marketType,
            since
          );

          if (!recentlyGenerated) {
            await generateRolling7dReportForUser({ userId: u._id, marketType });
          }
        } catch (e) {
          logger.error("[weeklyReportsCron] report generation failed for user", {
            userId: u._id?.toString?.(),
            marketType,
            error: e?.message,
          });
        }
      }
    }

    logger.info(`[weeklyReportsCron] completed for ${users.length} users`);
  } finally {
    isRunning = false;
  }
}

function startWeeklyReportsCron() {
  const enabled = appConfig.weeklyReports.enabled;
  if (!enabled) {
    logger.info("[weeklyReportsCron] disabled by ENABLE_WEEKLY_REPORTS_CRON");
    return;
  }

  // Daily run (server time). It only generates if last generation was >7 days ago.
  // You can override schedule with WEEKLY_REPORTS_CRON, e.g. "0 9 * * *"
  const schedule = appConfig.weeklyReports.schedule;

  if (!cron.validate(schedule)) {
    logger.warn("[weeklyReportsCron] invalid cron schedule, skipping", { schedule });
    return;
  }

  cron.schedule(schedule, () => {
    logger.info("[weeklyReportsCron] triggered");
    runWeeklyReportsJob().catch((e) =>
      logger.error("[weeklyReportsCron] job error", { error: e?.message, stack: e?.stack })
    );
  });

  logger.info("[weeklyReportsCron] scheduled", { schedule });
}

module.exports = { startWeeklyReportsCron, runWeeklyReportsJob };

