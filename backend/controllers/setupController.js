const SetupStrategy = require("../models/SetupStrategy");

// GET /api/setups?marketType=Forex|Indian_Market
// Return all setup strategies for the logged-in user for a given market
const getSetups = async (req, res) => {
  try {
    const marketType = req.query.marketType || "Forex";
    const strategies = await SetupStrategy.find({
      user: req.user.id,
      marketType,
    }).sort({ createdAt: 1 });
    res.json(strategies);
  } catch (err) {
    console.error("Error getting setups:", err);
    res.status(500).json({ message: "Failed to load setups" });
  }
};

// PUT /api/setups?marketType=Forex|Indian_Market
// Replace all strategies for this user + market with the provided list
const saveSetups = async (req, res) => {
  try {
    const marketType = req.query.marketType || "Forex";
    const { strategies } = req.body;

    if (!Array.isArray(strategies)) {
      return res.status(400).json({ message: "strategies must be an array" });
    }

    // Normalize incoming payload
    const docs = strategies
      .filter(s => s && typeof s.name === "string" && s.name.trim().length > 0)
      .map(s => ({
        user: req.user.id,
        marketType,
        name: s.name.trim(),
        rules: Array.isArray(s.rules)
          ? s.rules
              .filter(r => r && typeof r.label === "string" && r.label.trim().length > 0)
              .map(r => ({ label: r.label.trim() }))
          : [],
      }));

    // Replace user's strategies for this market atomically
    await SetupStrategy.deleteMany({ user: req.user.id, marketType });
    const created = docs.length ? await SetupStrategy.insertMany(docs) : [];

    res.json(created);
  } catch (err) {
    console.error("Error saving setups:", err);
    res.status(500).json({ message: "Failed to save setups" });
  }
};

module.exports = {
  getSetups,
  saveSetups,
};

