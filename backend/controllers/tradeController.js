const Trade = require("../models/Trade");

exports.createTrade = async (req, res) => {
  try {
    const { pair, type, marketType } = req.body;

    // Validate required fields
    if (!pair) {
      return res.status(400).json({ message: "Pair is required" });
    }
    if (!type) {
      return res.status(400).json({ message: "Action/Type is required" });
    }

    // Validate type value
    const validTypes = ["BUY", "SELL"];
    if (!validTypes.includes(type.toUpperCase())) {
      return res.status(400).json({ message: "Type must be BUY or SELL" });
    }

    // Validate marketType if provided
    const validMarkets = ["Forex", "Indian_Market"];
    if (marketType && !validMarkets.includes(marketType)) {
      return res.status(400).json({ message: "marketType must be Forex or Indian_Market" });
    }

    const trade = await Trade.create({
      ...req.body,
      type: type.toUpperCase(), // Ensure uppercase
      marketType: marketType || "Forex", // Default to Forex if not provided
      user: req.user._id
    });

    res.status(201).json(trade);

  } catch (error) {
    console.error("Create trade error:", error);
    res.status(500).json({ message: error.message || "Failed to create trade" });
  }
};
exports.getTrades = async (req, res) => {

  try {

    const { marketType } = req.query;

    // marketType is now REQUIRED to ensure proper data isolation
    if (!marketType) {
      return res.status(400).json({ message: "marketType query parameter is required (Forex or Indian_Market)" });
    }

    const validMarkets = ["Forex", "Indian_Market"];
    if (!validMarkets.includes(marketType)) {
      return res.status(400).json({ message: "marketType must be Forex or Indian_Market" });
    }

    const query = { user: req.user._id, marketType };
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
    const { type, marketType } = req.body;

    // Validate type if provided
    const validTypes = ["BUY", "SELL"];
    if (type && !validTypes.includes(type.toUpperCase())) {
      return res.status(400).json({ message: "Type must be BUY or SELL" });
    }

    // Validate marketType if provided
    const validMarkets = ["Forex", "Indian_Market"];
    if (marketType && !validMarkets.includes(marketType)) {
      return res.status(400).json({ message: "marketType must be Forex or Indian_Market" });
    }

    const trade = await Trade.findOneAndUpdate(
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
    const trade = await Trade.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!trade) {
      return res.status(404).json({ message: "Trade not found or unauthorized" });
    }

    res.json({ message: "Trade deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};