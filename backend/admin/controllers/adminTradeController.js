const Trade = require("../../models/Trade");
const IndianTrade = require("../../models/IndianTrade");
const ExtractionLog = require("../../models/ExtractionLog");

/**
 * @desc    Get all trades across all markets (Forex + Indian)
 * @route   GET /api/admin/trades
 * @access  Private/Admin
 */
exports.getAllTrades = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all OCR extraction logs
 * @route   GET /api/admin/trades/logs
 * @access  Private/Admin
 */
exports.getExtractionLogs = async (req, res) => {
  try {
    const logs = await ExtractionLog.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(100); // Limit to last 100 for performance
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
