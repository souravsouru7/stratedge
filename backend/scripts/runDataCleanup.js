const mongoose = require("mongoose");

const Trade = require("../models/Trade");
const { appConfig } = require("../config");
const { RETENTION_POLICY, CleanupStats, cleanOldTradeData, cleanOldImages } = require("../jobs/dataCleanupCron");

/**
 * Analyze current database storage usage
 */
async function analyzeStorage() {
  console.log("\n=== DATABASE STORAGE ANALYSIS ===\n");
  
  try {
    // Connect to MongoDB
    await mongoose.connect(appConfig.mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Get total trade count
    const totalTrades = await Trade.countDocuments();
    console.log(`📊 Total trades: ${totalTrades}\n`);

    // Analyze field sizes
    const trades = await Trade.aggregate([
      {
        $match: {
          $or: [
            { rawOCRText: { $ne: "", $exists: true } },
            { aiRawResponse: { $ne: "", $exists: true } },
            { extractedText: { $ne: "", $exists: true } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalRawOCRBytes: { $sum: { $strLenBytes: "$rawOCRText" } },
          totalAIResponseBytes: { $sum: { $strLenBytes: "$aiRawResponse" } },
          totalExtractedTextBytes: { $sum: { $strLenBytes: "$extractedText" } },
          avgRawOCRBytes: { $avg: { $strLenBytes: "$rawOCRText" } },
          avgAIResponseBytes: { $avg: { $strLenBytes: "$aiRawResponse" } },
        },
      },
    ]);

    if (trades.length > 0) {
      const stats = trades[0];
      
      console.log("📈 Current Storage Usage:");
      console.log(`   Trades with OCR/AI data: ${stats.count}`);
      console.log(`   rawOCRText: ${(stats.totalRawOCRBytes / 1024 / 1024).toFixed(2)} MB (avg: ${(stats.avgRawOCRBytes / 1024).toFixed(2)} KB per trade)`);
      console.log(`   aiRawResponse: ${(stats.totalAIResponseBytes / 1024 / 1024).toFixed(2)} MB (avg: ${(stats.avgAIResponseBytes / 1024).toFixed(2)} KB per trade)`);
      console.log(`   extractedText: ${(stats.totalExtractedTextBytes / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   TOTAL: ${((stats.totalRawOCRBytes + stats.totalAIResponseBytes + stats.totalExtractedTextBytes) / 1024 / 1024).toFixed(2)} MB\n`);
    } else {
      console.log("No trades with OCR/AI data found\n");
    }

    // Analyze age distribution
    const now = Date.now();
    const days7Ago = new Date(now - (7 * 24 * 60 * 60 * 1000));
    const days30Ago = new Date(now - (30 * 24 * 60 * 60 * 1000));

    const olderThan7Days = await Trade.countDocuments({ createdAt: { $lt: days7Ago } });
    const olderThan30Days = await Trade.countDocuments({ createdAt: { $lt: days30Ago } });

    console.log("📅 Age Distribution:");
    console.log(`   Trades older than 7 days: ${olderThan7Days}`);
    console.log(`   Trades older than 30 days: ${olderThan30Days}`);
    console.log(`   Percentage > 7 days: ${((olderThan7Days / totalTrades) * 100).toFixed(1)}%`);
    console.log(`   Percentage > 30 days: ${((olderThan30Days / totalTrades) * 100).toFixed(1)}%\n`);

    // Estimate cleanup savings
    console.log("💾 Estimated Cleanup Savings:");
    console.log(`   After 7-day retention: ~${((stats.count ? (stats.totalRawOCRBytes + stats.totalAIResponseBytes) * (olderThan7Days / stats.count) : 0) / 1024 / 1024).toFixed(2)} MB recoverable`);
    console.log(`   After 30-day retention: ~${((stats.count ? (stats.totalRawOCRBytes + stats.totalAIResponseBytes) * (olderThan30Days / stats.count) : 0) / 1024 / 1024).toFixed(2)} MB recoverable\n`);

    // Show current retention policy
    console.log("⚙️  Current Retention Policy:");
    console.log(`   rawOCRText: ${RETENTION_POLICY.rawOCRTextDays} days`);
    console.log(`   aiRawResponse: ${RETENTION_POLICY.aiRawResponseDays} days`);
    console.log(`   Images: ${RETENTION_POLICY.imageCleanupDays > 0 ? `${RETENTION_POLICY.imageCleanupDays} days` : 'Disabled'}`);
    console.log(`   Batch size: ${RETENTION_POLICY.batchSize}\n`);

  } catch (error) {
    console.error("❌ Analysis failed:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("✅ Database connection closed\n");
  }
}

/**
 * Run actual cleanup job
 */
async function runCleanup(dryRun = false) {
  console.log("\n=== DATA CLEANUP JOB ===\n");
  
  try {
    await mongoose.connect(appConfig.mongoUri);
    console.log("✅ Connected to MongoDB\n");

    if (dryRun) {
      console.log("🔍 DRY RUN MODE - No changes will be made\n");
      await analyzeStorage();
      return;
    }

    console.log("🧹 Starting cleanup...\n");
    
    const stats = new CleanupStats();
    await cleanOldTradeData(stats);
    
    if (RETENTION_POLICY.imageCleanupDays > 0) {
      console.log("\n⚠️  Image cleanup enabled - this is IRREVERSIBLE!\n");
      await cleanOldImages(stats);
    }

    console.log("\n✅ Cleanup completed!\n");
    console.log("📊 Summary:");
    console.log(`   Duration: ${stats.duration}ms`);
    console.log(`   Batches processed: ${stats.batchesProcessed}`);
    console.log(`   Records scanned: ${stats.totalRecordsScanned}`);
    console.log(`   rawOCRText cleaned: ${stats.rawOCRTextCleaned}`);
    console.log(`   aiRawResponse cleaned: ${stats.aiRawResponseCleaned}`);
    console.log(`   Images deleted: ${stats.imagesDeleted}`);
    console.log(`   Errors: ${stats.errors.length}\n`);

    if (stats.errors.length > 0) {
      console.log("⚠️  First 10 errors:");
      stats.errors.slice(0, 10).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
      });
      console.log("");
    }

  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("✅ Database connection closed\n");
  }
}

// CLI interface
const command = process.argv[2];

if (command === "analyze") {
  analyzeStorage().catch(console.error);
} else if (command === "cleanup") {
  runCleanup(false).catch(console.error);
} else if (command === "dry-run") {
  runCleanup(true).catch(console.error);
} else {
  console.log("\nUsage: node scripts/runDataCleanup.js <command>\n");
  console.log("Commands:");
  console.log("  analyze   - Analyze current storage usage");
  console.log("  cleanup   - Run actual cleanup (IRREVERSIBLE!)");
  console.log("  dry-run   - Test run with analysis only\n");
}
