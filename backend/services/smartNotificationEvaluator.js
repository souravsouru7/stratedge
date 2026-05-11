const Trade = require("../models/Trade");
const IndianTrade = require("../models/IndianTrade");
const notificationService = require("./notificationService");
const { appConfig } = require("../config");
const { logger } = require("../utils/logger");

const RISK_TAGS = new Set(["fomo", "revenge", "fear", "frustrated", "stressed"]);

function asDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getLocalDateKey(date = new Date()) {
  const shifted = new Date(asDate(date).getTime() + (appConfig.timezoneOffsetHours || 0) * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function getDayRange(date = new Date()) {
  const shiftMs = (appConfig.timezoneOffsetHours || 0) * 60 * 60 * 1000;
  const shifted = new Date(asDate(date).getTime() + shiftMs);
  shifted.setUTCHours(0, 0, 0, 0);
  const start = new Date(shifted.getTime() - shiftMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function getWeekStart(date = new Date()) {
  const { start } = getDayRange(date);
  const day = start.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  return new Date(start.getTime() - diff * 24 * 60 * 60 * 1000);
}

function getWeekKey(date = new Date()) {
  const weekStart = getWeekStart(date);
  return getLocalDateKey(weekStart);
}

function normalizeMistake(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function humanize(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function hasNoStopLoss(trade) {
  const stopLoss = Number(trade.stopLoss);
  return trade.stopLoss === null || trade.stopLoss === undefined || trade.stopLoss === "" || !Number.isFinite(stopLoss) || stopLoss <= 0;
}

function getTradeModel(collection) {
  return collection === "indian" ? IndianTrade : Trade;
}

function baseTradeQuery(userId, collection, marketType) {
  if (collection === "indian") return { user: userId };
  return {
    user: userId,
    marketType: marketType || "Forex",
    "parsedData.multiTradeGhost": { $ne: true },
  };
}

function getDeepLinks(trade, collection) {
  const tradeId = trade._id?.toString?.();
  if (collection === "indian") {
    return {
      view: `/indian-market/trades/view?id=${tradeId}`,
      edit: `/indian-market/trades/edit?id=${tradeId}`,
      listToday: "/indian-market/trades?filter=today",
    };
  }
  return {
    view: `/trades/view?id=${tradeId}`,
    edit: `/trades/edit?id=${tradeId}`,
    listToday: "/trades?filter=today",
  };
}

async function safeNotify(userId, payload) {
  try {
    return await notificationService.notifyUser(userId, payload);
  } catch (error) {
    logger.warn("Smart notification evaluation failed to notify", {
      userId: userId?.toString?.(),
      type: payload.type,
      error: error.message,
    });
    return null;
  }
}

async function checkNoStopLoss({ userId, trade, collection }) {
  if (!hasNoStopLoss(trade)) return;
  const links = getDeepLinks(trade, collection);
  await safeNotify(userId, {
    type: "no_stop_loss",
    title: "No stop loss set",
    body: "This trade has no stop loss.",
    sourceType: "trade",
    sourceId: trade._id,
    dedupeKey: `no-stop-loss:${trade._id}`,
    deepLink: links.edit,
    priority: "high",
    data: { screen: collection === "indian" ? "indian-trade-edit" : "trade-edit", tradeId: trade._id?.toString?.() },
  });
}

async function checkSetupDisciplineDrop({ userId, trade, collection, marketType }) {
  const score = Number(trade.setupScore);
  if (!Number.isFinite(score) || score >= 60) return;

  const Model = getTradeModel(collection);
  const { start, end } = getDayRange(trade.tradeDate || trade.createdAt);
  const dateField = collection === "indian" ? "tradeDate" : "tradeDate";
  const lowScoreToday = await Model.countDocuments({
    ...baseTradeQuery(userId, collection, marketType),
    [dateField]: { $gte: start, $lt: end },
    setupScore: { $lt: 60 },
  });

  const shouldSend = lowScoreToday >= 2 || Number(trade.profit) < 0;
  if (!shouldSend) return;

  const dateKey = getLocalDateKey(trade.tradeDate || trade.createdAt);
  const windowKey = Math.floor(new Date().getUTCHours() / 6);
  const links = getDeepLinks(trade, collection);
  await safeNotify(userId, {
    type: "setup_discipline",
    title: "Checklist discipline dropped",
    body: "Your checklist score dropped below 60%. Wait for better setups.",
    sourceType: "trade",
    sourceId: trade._id,
    dedupeKey: `setup-discipline:${userId}:${marketType}:${dateKey}:${windowKey}`,
    deepLink: links.view,
    data: { screen: collection === "indian" ? "indian-trade" : "trade", tradeId: trade._id?.toString?.(), setupScore: score },
  });
}

async function checkMoodBasedRisk({ userId, trade, collection }) {
  const mood = Number(trade.mood);
  const lowMood = Number.isFinite(mood) && mood > 0 && mood <= 2;
  const tags = Array.isArray(trade.emotionalTags) ? trade.emotionalTags : [];
  const hasRiskTag = tags.some((tag) => RISK_TAGS.has(String(tag || "").trim().toLowerCase()));
  const overconfident = String(trade.confidence || "") === "Overconfident";
  if (!lowMood && !hasRiskTag && !overconfident) return;

  const dateKey = getLocalDateKey(trade.tradeDate || trade.createdAt);
  await safeNotify(userId, {
    type: "mood_risk",
    title: "Reduce risk today",
    body: "You logged low focus today. Reduce position size.",
    sourceType: "trade",
    sourceId: trade._id,
    dedupeKey: `mood-risk:${userId}:${dateKey}`,
    deepLink: "/checklist/psychology",
    data: { screen: "psychology", tradeId: trade._id?.toString?.(), mood: Number.isFinite(mood) ? mood : "" },
  });
}

async function checkRevengeTrading({ userId, trade, collection, marketType }) {
  if (!(Number(trade.profit) < 0)) return;

  const Model = getTradeModel(collection);
  const { start, end } = getDayRange(trade.tradeDate || trade.createdAt);
  const recentTrades = await Model.find({
    ...baseTradeQuery(userId, collection, marketType),
    tradeDate: { $gte: start, $lt: end },
    profit: { $ne: null },
  })
    .sort({ tradeDate: -1, createdAt: -1 })
    .limit(3)
    .select("profit tradeDate createdAt")
    .lean();

  if (recentTrades.length !== 3 || !recentTrades.every((item) => Number(item.profit) < 0)) return;

  const newest = asDate(recentTrades[0].tradeDate || recentTrades[0].createdAt);
  const oldest = asDate(recentTrades[2].tradeDate || recentTrades[2].createdAt);
  const withinShortWindow = newest.getTime() - oldest.getTime() <= 4 * 60 * 60 * 1000;
  if (!withinShortWindow) return;

  const dateKey = getLocalDateKey(trade.tradeDate || trade.createdAt);
  const links = getDeepLinks(trade, collection);
  await safeNotify(userId, {
    type: "revenge_trading",
    title: "Pause before next trade",
    body: "3 losses in a row today. Pause before the next trade.",
    sourceType: "trade",
    sourceId: trade._id,
    dedupeKey: `revenge-warning:${userId}:${marketType}:${dateKey}`,
    deepLink: links.listToday,
    priority: "high",
    data: { screen: collection === "indian" ? "indian-trades" : "trades", filter: "today" },
  });
}

async function checkOvertrading({ userId, trade, collection, marketType }) {
  const Model = getTradeModel(collection);
  const now = asDate(trade.tradeDate || trade.createdAt);
  const since = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const dailyCounts = await Model.aggregate([
    {
      $match: {
        ...baseTradeQuery(userId, collection, marketType),
        tradeDate: { $gte: since, $lt: now },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$tradeDate" },
          month: { $month: "$tradeDate" },
          day: { $dayOfMonth: "$tradeDate" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
    { $limit: 30 },
  ]);

  if (dailyCounts.length < 3) return;

  const average = dailyCounts.reduce((sum, item) => sum + item.count, 0) / dailyCounts.length;
  const { start, end } = getDayRange(now);
  const todayCount = await Model.countDocuments({
    ...baseTradeQuery(userId, collection, marketType),
    tradeDate: { $gte: start, $lt: end },
  });
  const threshold = Math.max(Math.ceil(average * 1.5), Math.ceil(average + 2), 5);
  if (todayCount <= threshold) return;

  const dateKey = getLocalDateKey(now);
  const links = getDeepLinks(trade, collection);
  await safeNotify(userId, {
    type: "overtrading",
    title: "Overtrading alert",
    body: "You already crossed your normal daily trade limit.",
    sourceType: "trade",
    sourceId: trade._id,
    dedupeKey: `overtrading:${userId}:${marketType}:${dateKey}`,
    deepLink: links.listToday,
    data: { screen: collection === "indian" ? "indian-trades" : "trades", filter: "today", todayCount, threshold },
  });
}

async function checkRepeatedMistake({ userId, trade, collection, marketType }) {
  const mistake = normalizeMistake(trade.mistakeTag);
  if (!mistake) return;

  const Model = getTradeModel(collection);
  const weekStart = getWeekStart(trade.tradeDate || trade.createdAt);
  const regex = new RegExp(`^${String(trade.mistakeTag).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  const count = await Model.countDocuments({
    ...baseTradeQuery(userId, collection, marketType),
    tradeDate: { $gte: weekStart },
    mistakeTag: regex,
  });
  if (count < 3) return;

  const weekKey = getWeekKey(trade.tradeDate || trade.createdAt);
  await safeNotify(userId, {
    type: "repeated_mistake",
    title: "Repeated mistake detected",
    body: `${humanize(mistake)} mistake repeated ${count} times this week.`,
    sourceType: "trade",
    sourceId: trade._id,
    dedupeKey: `repeated-mistake:${userId}:${marketType}:${weekKey}:${mistake}`,
    deepLink: `/analytics?insight=mistakes&tag=${encodeURIComponent(mistake)}`,
    data: { screen: "analytics", insight: "mistakes", tag: mistake, count },
  });
}

async function evaluateSmartNotifications({ userId, trade, marketType = "Forex", collection = "forex" }) {
  if (!userId || !trade || !trade._id) return;
  const plainTrade = typeof trade.toObject === "function" ? trade.toObject() : trade;

  await Promise.allSettled([
    checkNoStopLoss({ userId, trade: plainTrade, collection, marketType }),
    checkSetupDisciplineDrop({ userId, trade: plainTrade, collection, marketType }),
    checkMoodBasedRisk({ userId, trade: plainTrade, collection, marketType }),
    checkRevengeTrading({ userId, trade: plainTrade, collection, marketType }),
    checkOvertrading({ userId, trade: plainTrade, collection, marketType }),
    checkRepeatedMistake({ userId, trade: plainTrade, collection, marketType }),
  ]);
}

async function notifyWeeklyInsight({ userId, report, marketType = "Forex" }) {
  if (!userId || !report?._id) return null;
  const feedback = report.aiFeedback || {};
  const focus =
    feedback.weeklyFocus ||
    feedback.topFocus ||
    feedback.psychologyFeedback?.weeklyFocus ||
    feedback.improvements?.[0]?.title ||
    feedback.improvements?.[0]?.how ||
    "Follow only your highest-quality setups this week.";

  return safeNotify(userId, {
    type: "weekly_ai_insight",
    title: "Weekly coach insight",
    body: `This week's focus: ${focus}`,
    sourceType: "weekly_report",
    sourceId: report._id,
    dedupeKey: `weekly-insight:${userId}:${marketType}:${report.weekStart?.toISOString?.() || report._id}`,
    deepLink: `/weekly-reports?id=${report._id}`,
    data: { screen: "weekly-report", reportId: report._id?.toString?.(), marketType },
  });
}

module.exports = {
  evaluateSmartNotifications,
  notifyWeeklyInsight,
};
