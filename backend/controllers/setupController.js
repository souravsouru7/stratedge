const asyncHandler = require("../utils/asyncHandler");
const setupService = require("../services/setup.service");

const getSetups = asyncHandler(async (req, res) => {
  const strategies = await setupService.getSetups(req.user.id, req.query.marketType || "Forex");
  res.json(strategies);
});

const saveSetups = asyncHandler(async (req, res) => {
  const created = await setupService.saveSetups(
    req.user.id,
    req.query.marketType || "Forex",
    req.body.strategies
  );
  res.json(created);
});

module.exports = {
  getSetups,
  saveSetups,
};
