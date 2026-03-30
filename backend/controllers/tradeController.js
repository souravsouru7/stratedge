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
      user: req.user._id,
      status: req.body.status || "completed",
      error: req.body.error ?? null,
      processedAt: req.body.processedAt || new Date(),
    });

    await clearUserCache(req.user._id);

    res.status(201).json(trade);
  } catch (error) {
    console.error("Create trade error:", error);
    res.status(500).json({ message: error.message || "Failed to create trade" });
  }
};

exports.getTrades = async (req, res) => {
  console.time("getTradesQuery");
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const query = { user: req.user._id };
    const startedAt = Date.now();

    const trades = await Trade.find(query)
      .select("pair profit createdAt status strategy processedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const duration = Date.now() - startedAt;
    if (duration > 500) {
      console.warn(`[Performance] Slow DB query detected in getTrades: ${duration}ms`);
    }

    res.json(
      trades.map((trade) => ({
        ...trade,
        symbol: trade.pair ?? null,
        pnl: trade.profit ?? 0,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    console.timeEnd("getTradesQuery");
  }
};
exports.getTrade = async (req, res) => {
  console.time("getTradeQuery");
  try {
    const startedAt = Date.now();
    const trade = await Trade.findOne({ _id: req.params.id, user: req.user._id }).lean();
    const duration = Date.now() - startedAt;

    if (duration > 500) {
      console.warn(`[Performance] Slow DB query detected in getTrade: ${duration}ms`);
    }

    if (!trade) {
      return res.status(404).json({ message: "Trade not found or unauthorized" });
    }

    res.json(trade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    console.timeEnd("getTradeQuery");
  }
};
exports.getTradeStatus = async (req, res) => {
  try {
    const startedAt = Date.now();
    const trade = await Trade.findOne({ _id: req.params.id, user: req.user._id }).lean();
    const duration = Date.now() - startedAt;

    if (duration > 500) {
      console.warn(`[Performance] Slow DB query detected in getTradeStatus: ${duration}ms`);
    }

    if (!trade) {
      return res.status(404).json({ message: "Trade not found or unauthorized" });
    }

    res.json({
      status: trade.status,
      data: trade.status === "completed" ? trade : null,
      error: trade.error || null,
    });
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
      { new: true, lean: true }
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
