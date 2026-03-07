const IndianTrade = require("../models/IndianTrade");

exports.createTrade = async (req, res) => {
  try {
    const { pair, type, underlying, strikePrice, optionType } = req.body;

    if (!type) {
      return res.status(400).json({ message: "Type (BUY/SELL) is required" });
    }
    const validTypes = ["BUY", "SELL"];
    if (!validTypes.includes(type.toUpperCase())) {
      return res.status(400).json({ message: "Type must be BUY or SELL" });
    }

    const validOptionTypes = ["CE", "PE"];
    const ot = (optionType || "CE").toUpperCase();
    if (!validOptionTypes.includes(ot)) {
      return res.status(400).json({ message: "Option type must be CE or PE" });
    }

    // Build pair from underlying + strike + optionType if not provided
    let symbol = pair;
    if (!symbol && underlying && strikePrice != null) {
      symbol = `${String(underlying).trim()} ${strikePrice} ${ot}`;
    }
    if (!symbol) {
      return res.status(400).json({ message: "Symbol is required (provide pair or underlying + strike + optionType)" });
    }

    const trade = await IndianTrade.create({
      ...req.body,
      pair: symbol,
      type: type.toUpperCase(),
      optionType: ot,
      user: req.user._id
    });

    res.status(201).json(trade);
  } catch (error) {
    console.error("Indian create trade error:", error);
    res.status(500).json({ message: error.message || "Failed to create trade" });
  }
};

exports.getTrades = async (req, res) => {
  try {
    const query = { user: req.user._id };
    const trades = await IndianTrade.find(query).sort({ createdAt: -1 });
    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTrade = async (req, res) => {
  try {
    const trade = await IndianTrade.findOne({
      _id: req.params.id,
      user: req.user._id
    });

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

    const trade = await IndianTrade.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { ...req.body, ...(type && { type: type.toUpperCase() }) },
      { new: true }
    );

    if (!trade) {
      return res.status(404).json({ message: "Trade not found or unauthorized" });
    }

    res.json(trade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTrade = async (req, res) => {
  try {
    const trade = await IndianTrade.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!trade) {
      return res.status(404).json({ message: "Trade not found or unauthorized" });
    }

    res.json({ message: "Trade deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
