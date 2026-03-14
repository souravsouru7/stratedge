const ChecklistTracking = require("../models/ChecklistTracking");
const User = require("../models/Users");

// @desc    Log a checklist execution result
// @route   POST /api/checklists/track
// @access  Private
const logChecklistResult = async (req, res) => {
  try {
    const { market, strategyName, totalRules, followedRules, score, isAPlus } = req.body;

    if (!strategyName || totalRules === undefined || followedRules === undefined || score === undefined || isAPlus === undefined) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const trackingRecord = await ChecklistTracking.create({
      user: req.user._id,
      market: market || "Forex",
      strategyName,
      totalRules,
      followedRules,
      score,
      isAPlus,
    });

    res.status(201).json(trackingRecord);
  } catch (error) {
    console.error("Error logging checklist result:", error);
    res.status(500).json({ message: "Server error logging checklist result" });
  }
};

// @desc    Get user's checklist tracking stats
// @route   GET /api/checklists/track
// @access  Private
const getChecklistStats = async (req, res) => {
  try {
    const { market } = req.query;
    const filter = { user: req.user._id };
    if (market) {
      filter.market = market;
    }

    const tracks = await ChecklistTracking.find(filter).sort({ createdAt: -1 });
    
    // Calculate basic stats
    const totalChecklists = tracks.length;
    const aPlusCount = tracks.filter(t => t.isAPlus).length;
    
    res.status(200).json({
      totalChecklists,
      aPlusCount,
      tracks,
    });
  } catch (error) {
    console.error("Error fetching checklist stats:", error);
    res.status(500).json({ message: "Server error fetching checklist stats" });
  }
};

module.exports = {
  logChecklistResult,
  getChecklistStats,
};
