const Trade = require("../models/Trade");
const { clearUserCache } = require("../utils/cacheUtils");

exports.createTrade = async (req, res) => {
  try {
    const { pair, type } = req.body;

    if (!pair) {
      return res.status(400).json({ message: "Pair is required" });
    }
    if (!type) {
      return res.status(400).json({ message: "Action/Type is required" });
    }

    const validTypes = ["BUY", "SELL"];
    if (!validTypes.includes(type.toUpperCase())) {
      return res.status(400).json({ message: "Type must be BUY or SELL" });
    }

    const trade = await Trade.create({
      ...req.body,
      type: type.toUpperCase(),
      user: req.user._id
    });

    await clearUserCache(req.user._id);

    res.status(201).json(trade);
  } catch (error) {
    console.error("Create trade error:", error);
    res.status(500).json({ message: error.message || "Failed to create trade" });
  }
};

exports.getTrades = async (req, res) => {
  try {
    const query = { user: req.user._id };
    const trades = await Trade.find(query).sort({ createdAt: -1 });
    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getTrade = async (req, res) => {
  try {
    const trade = await Trade.findOne({ _id: req.params.id, user: req.user._id });

    if (!trade) {
      return res.status(404).json({ message: "Trade not found or unauthorized" });
    }

    res.json(trade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.updateTrade = async (req, res) => {
  try {
    const { type } = req.body;

    const validTypes = ["BUY", "SELL"];
    if (type && !validTypes.includes(type.toUpperCase())) {
      return res.status(400).json({ message: "Type must be BUY or SELL" });
    }

    const trade = await Trade.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { ...req.body, ...(type && { type: type.toUpperCase() }) },
      { new: true }
    );

    if (!trade) {
      return res.status(404).json({ message: "Trade not found or unauthorized" });
    }

    await clearUserCache(req.user._id);

    res.json(trade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.deleteTrade = async (req, res) => {
  try {
    const trade = await Trade.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!trade) {
      return res.status(404).json({ message: "Trade not found or unauthorized" });
    }

    await clearUserCache(req.user._id);

    res.json({ message: "Trade deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};