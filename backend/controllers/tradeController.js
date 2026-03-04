const Trade = require("../models/Trade");

exports.createTrade = async (req, res) => {
  try {
    const { pair, type } = req.body;

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

    const trade = await Trade.create({
      ...req.body,
      type: type.toUpperCase(), // Ensure uppercase
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
    const query = { user: req.user._id };
    if (marketType) query.marketType = marketType;

    const trades = await Trade.find(query).sort({ createdAt: -1 });
    res.json(trades);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};
exports.getTrade = async (req, res) => {

  try {

    const trade = await Trade.findById(req.params.id);

    res.json(trade);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};
exports.updateTrade = async (req, res) => {

  try {

    const trade = await Trade.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(trade);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};
exports.deleteTrade = async (req, res) => {

  try {

    await Trade.findByIdAndDelete(req.params.id);

    res.json({ message: "Trade deleted" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};