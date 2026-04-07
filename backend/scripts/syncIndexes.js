const mongoose = require("mongoose");
const { appConfig } = require("../config");
const Trade = require("../models/Trade");
const IndianTrade = require("../models/IndianTrade");
const WeeklyReport = require("../models/WeeklyReport");
const SetupStrategy = require("../models/SetupStrategy");
const User = require("../models/Users");

async function syncModelIndexes(model) {
  const result = await model.syncIndexes();
  const indexes = await model.collection.indexes();

  console.log(`\n[${model.modelName}] syncIndexes complete`);
  console.log("Dropped indexes:", result);
  console.log("Active indexes:");
  indexes.forEach((index) => {
    console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
  });
}

async function explainCoreQueries() {
  const tradeExplain = await Trade.find({ user: new mongoose.Types.ObjectId(), marketType: "Forex" })
    .sort({ createdAt: -1 })
    .limit(20)
    .explain("executionStats");

  const weeklyReportExplain = await WeeklyReport.find({
    user: new mongoose.Types.ObjectId(),
    marketType: "Forex",
    periodType: "rolling7d",
  })
    .sort({ createdAt: -1 })
    .limit(1)
    .explain("executionStats");

  console.log("\n[Explain] Trade feed winning plan:");
  console.log(JSON.stringify(tradeExplain.queryPlanner.winningPlan, null, 2));

  console.log("\n[Explain] Weekly report lookup winning plan:");
  console.log(JSON.stringify(weeklyReportExplain.queryPlanner.winningPlan, null, 2));
}

async function main() {
  await mongoose.connect(appConfig.mongoUri);

  try {
    await syncModelIndexes(Trade);
    await syncModelIndexes(IndianTrade);
    await syncModelIndexes(WeeklyReport);
    await syncModelIndexes(SetupStrategy);
    await syncModelIndexes(User);
    await explainCoreQueries();
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("Index sync failed:", error.message);
  process.exit(1);
});
