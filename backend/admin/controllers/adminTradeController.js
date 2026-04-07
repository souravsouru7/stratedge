const Trade = require("../../models/Trade");
const IndianTrade = require("../../models/IndianTrade");
const ExtractionLog = require("../../models/ExtractionLog");
const asyncHandler = require("../../utils/asyncHandler");

/**
 * @desc    Get all trades across all markets (Forex + Indian)
 * @route   GET /api/admin/trades
 * @access  Private/Admin
 */
exports.getAllTrades = asyncHandler(async (req, res) => {
  const [forexTrades, indianTrades] = await Promise.all([
    Trade.find().populate("user", "name email").lean(),
    IndianTrade.find().populate("user", "name email").lean()
  ]);

    // Add marketType tag and unify format minimally
    const allTrades = [
      ...forexTrades.map(t => ({ ...t, marketType: "Forex" })),
      ...indianTrades.map(t => ({ ...t, marketType: "Indian_Market" }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(allTrades);
});

/**
 * @desc    Get all OCR extraction logs
 * @route   GET /api/admin/trades/logs
 * @access  Private/Admin
 */
exports.getExtractionLogs = asyncHandler(async (req, res) => {
  const logs = await ExtractionLog.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(logs);
});
