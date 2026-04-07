const cron = require("node-cron");
const { appConfig } = require("../config");
const userRepository = require("../repositories/user.repository");
const weeklyReportRepository = require("../repositories/weeklyReport.repository");
const { generateRolling7dReportForUser } = require("../services/weeklyReport.service");

let isRunning = false;

async function runWeeklyReportsJob() {
  if (isRunning) return;
  isRunning = true;
  try {
    const users = await userRepository.findUsersForWeeklyReports();
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
          console.error("[weeklyReportsCron] user failed", u._id?.toString?.(), marketType, e?.message || e);
        }
      }
    }

    console.log(`[weeklyReportsCron] completed for ${users.length} users`);
  } finally {
    isRunning = false;
  }
}

function startWeeklyReportsCron() {
  const enabled = appConfig.weeklyReports.enabled;
  if (!enabled) {
    console.log("[weeklyReportsCron] disabled by ENABLE_WEEKLY_REPORTS_CRON");
    return;
  }

  // Daily run (server time). It only generates if last generation was >7 days ago.
  // You can override schedule with WEEKLY_REPORTS_CRON, e.g. "0 9 * * *"
  const schedule = appConfig.weeklyReports.schedule;

  if (!cron.validate(schedule)) {
    console.warn("[weeklyReportsCron] invalid cron schedule, skipping:", schedule);
    return;
  }

  cron.schedule(schedule, () => {
    console.log("[weeklyReportsCron] triggered");
    runWeeklyReportsJob().catch((e) => console.error("[weeklyReportsCron] job error", e?.message || e));
  });

  console.log("[weeklyReportsCron] scheduled:", schedule);
}

module.exports = { startWeeklyReportsCron, runWeeklyReportsJob };

