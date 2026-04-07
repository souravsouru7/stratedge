const ApiError = require("../utils/ApiError");
const setupRepository = require("../repositories/setup.repository");

async function getSetups(userId, marketType = "Forex") {
  return setupRepository.findSetupsByUserAndMarket(userId, marketType);
}

async function saveSetups(userId, marketType = "Forex", strategies) {
  if (!Array.isArray(strategies)) {
    throw new ApiError(400, "strategies must be an array", "VALIDATION_ERROR");
  }

  const docs = strategies
    .filter((strategy) => strategy && typeof strategy.name === "string" && strategy.name.trim().length > 0)
    .map((strategy) => ({
      user: userId,
      marketType,
      name: strategy.name.trim(),
      rules: Array.isArray(strategy.rules)
        ? strategy.rules
            .filter((rule) => rule && typeof rule.label === "string" && rule.label.trim().length > 0)
            .map((rule) => ({ label: rule.label.trim() }))
        : [],
    }));

  return setupRepository.replaceSetupsByUserAndMarket(userId, marketType, docs);
}

module.exports = {
  getSetups,
  saveSetups,
};
