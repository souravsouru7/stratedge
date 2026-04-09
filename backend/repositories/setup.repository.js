const SetupStrategy = require("../models/SetupStrategy");

async function findSetupsByUserAndMarket(userId, marketType) {
  return SetupStrategy.find({ user: userId, marketType }).sort({ createdAt: 1 });
}

async function findRawSetupsByUserAndMarket(userId, marketType) {
  return SetupStrategy.find({ user: userId, marketType }).sort({ createdAt: 1 });
}

async function replaceSetupsByUserAndMarket(userId, marketType, docs) {
  await SetupStrategy.deleteMany({ user: userId, marketType });
  return docs.length ? SetupStrategy.insertMany(docs) : [];
}

module.exports = {
  findSetupsByUserAndMarket,
  findRawSetupsByUserAndMarket,
  replaceSetupsByUserAndMarket,
};
