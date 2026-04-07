const ChecklistTracking = require("../models/ChecklistTracking");
const User = require("../models/Users");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// @desc    Log a checklist execution result
// @route   POST /api/checklists/track
// @access  Private
const logChecklistResult = asyncHandler(async (req, res) => {
  const { market, strategyName, totalRules, followedRules, score, isAPlus } = req.body;

  if (!strategyName || totalRules === undefined || followedRules === undefined || score === undefined || isAPlus === undefined) {
    throw new ApiError(400, "All fields are required", "VALIDATION_ERROR");
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
});

// @desc    Get user's checklist tracking stats
// @route   GET /api/checklists/track
// @access  Private
const getChecklistStats = asyncHandler(async (req, res) => {
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
});

module.exports = {
  logChecklistResult,
  getChecklistStats,
};
