const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const connectDB = require("../config/db");
const { generateRolling7dReportForUser } = require("../controllers/weeklyReportController");

async function main() {
  try {
    await connectDB();

    const userId = new mongoose.Types.ObjectId("69aa698d8f4ce375b33da8c3");
    const marketTypes = ["Forex", "Indian_Market"];

    for (const marketType of marketTypes) {
      console.log(`Generating rolling 7D weekly report for user ${userId.toString()} / market=${marketType}…`);
      const report = await generateRolling7dReportForUser({ userId, marketType });
      console.log("Created/updated WeeklyReport:", {
        id: report._id.toString(),
        marketType: report.marketType,
        trades: report.snapshot?.counts?.totalTrades,
        net: report.snapshot?.pnl?.net,
        hasAiFeedback: !!report.aiFeedback,
      });
    }

    await mongoose.disconnect();
    console.log("✅ Done.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to generate weekly report for user:", err.message || err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();

