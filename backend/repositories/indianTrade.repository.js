const IndianTrade = require("../models/IndianTrade");

const WEEKLY_INDIAN_TRADE_PROJECTION = [
  "pair",
  "profit",
  "brokerage",
  "sttTaxes",
  "strategy",
  "session",
  "setupScore",
  "entryBasis",
  "mistakeTag",
  "createdAt",
].join(" ");

async function findIndianTradesForWeeklyWindow(userId, startDate, endDate) {
  return IndianTrade.find({
    user: userId,
    createdAt: { $gte: startDate, $lt: endDate },
  })
    .sort({ createdAt: 1 })
    .select(WEEKLY_INDIAN_TRADE_PROJECTION)
    .lean();
}

module.exports = {
  findIndianTradesForWeeklyWindow,
};
