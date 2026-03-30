const Trade = require("../models/Trade");
const { logger } = require("../utils/logger");
const cloudinary = require("../config/cloudinary");

/**
 * Data Retention Policy Configuration
 * Defaults can be overridden via environment variables
 */
const RETENTION_POLICY = {
  // Delete rawOCRText after N days
  rawOCRTextDays: parseInt(process.env.CLEANUP_RAW_OCR_DAYS || "7", 10),
  
  // Delete aiRawResponse after N days
  aiRawResponseDays: parseInt(process.env.CLEANUP_AI_RESPONSE_DAYS || "7", 10),
  
  // Optional: Delete old images after N days (0 = disabled)
  imageCleanupDays: parseInt(process.env.CLEANUP_IMAGES_DAYS || "0", 10),
  
  // Batch size for processing (prevent memory issues)
  batchSize: parseInt(process.env.CLEANUP_BATCH_SIZE || "100", 10),
};

/**
 * Safe Cleanup Operation Results Tracker
 */
class CleanupStats {
  constructor() {
    this.startTime = Date.now();
    this.rawOCRTextCleaned = 0;
    this.aiRawResponseCleaned = 0;
    this.imagesDeleted = 0;
    this.errors = [];
    this.batchesProcessed = 0;
    this.totalRecordsScanned = 0;
  }

  get duration() {
    return Date.now() - this.startTime;
  }

  get summary() {
    return {
      duration: `${this.duration}ms`,
      batchesProcessed: this.batchesProcessed,
      totalRecordsScanned: this.totalRecordsScanned,
      rawOCRTextCleaned: this.rawOCRTextCleaned,
      aiRawResponseCleaned: this.aiRawResponseCleaned,
      imagesDeleted: this.imagesDeleted,
      errorsCount: this.errors.length,
      errors: this.errors.slice(0, 10), // First 10 errors only
    };
  }
}

/**
 * Check if a field should be cleaned based on age
 */
function isOlderThanDays(date, days) {
  if (!date) return false;
  const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
  return new Date(date) < cutoffDate;
}

/**
 * Extract Cloudinary public IDs from URL
 * Example: https://res.cloudinary.com/demo/image/upload/v1234567890/trades/abc123.png
 * Returns: trades/abc123.png
 */
function extractPublicIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  
  try {
    const match = url.match(/\/v\d+\/(.+)\.[a-z]+$/i);
    return match ? match[1] : null;
  } catch (error) {
    logger.error("Failed to extract public ID from URL", { url, error: error.message });
    return null;
  }
}

/**
 * Clean rawOCRText and aiRawResponse fields from old trade records
 */
async function cleanOldTradeData(stats) {
  const { rawOCRTextDays, aiRawResponseDays, batchSize } = RETENTION_POLICY;
  
  logger.info("Starting trade data cleanup", {
    rawOCRTextDays,
    aiRawResponseDays,
    batchSize,
  });

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      // Get batch of old trades
      const trades = await Trade.find({})
        .select("_id user rawOCRText aiRawResponse extractedText createdAt")
        .sort({ createdAt: 1 }) // Oldest first
        .skip(skip)
        .limit(batchSize)
        .lean();

      if (trades.length === 0) {
        hasMore = false;
        break;
      }

      stats.batchesProcessed += 1;
      stats.totalRecordsScanned += trades.length;

      // Process each trade in batch
      const updateOperations = [];
      
      for (const trade of trades) {
        try {
          const updates = {};
          
          // Check if rawOCRText should be cleaned
          if (rawOCRTextDays > 0 && trade.rawOCRText && isOlderThanDays(trade.createdAt, rawOCRTextDays)) {
            updates.rawOCRText = "";
          }
          
          // Check if aiRawResponse should be cleaned
          if (aiRawResponseDays > 0 && trade.aiRawResponse && isOlderThanDays(trade.createdAt, aiRawResponseDays)) {
            updates.aiRawResponse = "";
          }
          
          // If any fields need cleaning, add to batch update
          if (Object.keys(updates).length > 0) {
            updateOperations.push({
              updateOne: {
                filter: { _id: trade._id },
                update: { $set: updates },
              },
            });
            
            // Track what was cleaned
            if (updates.rawOCRText !== undefined) stats.rawOCRTextCleaned += 1;
            if (updates.aiRawResponse !== undefined) stats.aiRawResponseCleaned += 1;
          }
        } catch (error) {
          const errorMsg = `Failed to process trade ${trade._id}: ${error.message}`;
          logger.error(errorMsg, { tradeId: trade._id, error: error.message });
          stats.errors.push(errorMsg);
        }
      }

      // Execute batch updates if any
      if (updateOperations.length > 0) {
        await Trade.bulkWrite(updateOperations);
        logger.info(`Cleaned batch of ${updateOperations.length} trades`, {
          batchNumber: stats.batchesProcessed,
          operationsCount: updateOperations.length,
        });
      }

      skip += batchSize;
      
      // Small delay to prevent DB overload
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      const errorMsg = `Batch processing failed at skip=${skip}: ${error.message}`;
      logger.error(errorMsg, { skip, error: error.message, stack: error.stack });
      stats.errors.push(errorMsg);
      hasMore = false; // Stop on error to prevent data corruption
    }
  }

  logger.info("Trade data cleanup completed", {
    batchesProcessed: stats.batchesProcessed,
    totalRecordsScanned: stats.totalRecordsScanned,
    rawOCRTextCleaned: stats.rawOCRTextCleaned,
    aiRawResponseCleaned: stats.aiRawResponseCleaned,
  });
}

/**
 * Optionally delete old images from Cloudinary
 * WARNING: This is irreversible! Only enable if you're sure.
 */
async function cleanOldImages(stats) {
  const { imageCleanupDays, batchSize } = RETENTION_POLICY;
  
  if (imageCleanupDays <= 0) {
    logger.info("Image cleanup is disabled (CLEANUP_IMAGES_DAYS=0)");
    return;
  }

  logger.warn("Starting image cleanup from Cloudinary", {
    imageCleanupDays,
    warning: "This action is IRREVERSIBLE!",
  });

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      // Get batch of old trades with images
      const trades = await Trade.find({
        imageUrl: { $ne: "", $exists: true },
      })
        .select("_id imageUrl createdAt")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(batchSize)
        .lean();

      if (trades.length === 0) {
        hasMore = false;
        break;
      }

      stats.batchesProcessed += 1;
      stats.totalRecordsScanned += trades.length;

      // Delete images older than threshold
      for (const trade of trades) {
        try {
          if (isOlderThanDays(trade.createdAt, imageCleanupDays)) {
            const publicId = extractPublicIdFromUrl(trade.imageUrl);
            
            if (publicId) {
              // Destroy image from Cloudinary
              await cloudinary.uploader.destroy(publicId);
              stats.imagesDeleted += 1;
              
              logger.info("Deleted old image from Cloudinary", {
                tradeId: trade._id,
                publicId,
                age: Math.floor((Date.now() - new Date(trade.createdAt)) / (24 * 60 * 60 * 1000)),
              });
              
              // Optional: Clear imageUrl from DB (commented out by default)
              // await Trade.findByIdAndUpdate(trade._id, { imageUrl: "" });
            }
          }
        } catch (error) {
          const errorMsg = `Failed to delete image for trade ${trade._id}: ${error.message}`;
          logger.error(errorMsg, { tradeId: trade._id, error: error.message });
          stats.errors.push(errorMsg);
        }
      }

      skip += batchSize;
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      const errorMsg = `Image batch processing failed at skip=${skip}: ${error.message}`;
      logger.error(errorMsg, { skip, error: error.message, stack: error.stack });
      stats.errors.push(errorMsg);
      hasMore = false;
    }
  }

  logger.info("Image cleanup completed", {
    imagesDeleted: stats.imagesDeleted,
    batchesProcessed: stats.batchesProcessed,
  });
}

/**
 * Main cleanup job - runs all cleanup tasks
 */
async function runDataCleanupJob() {
  const stats = new CleanupStats();
  
  logger.info("=== DATA CLEANUP JOB STARTED ===", {
    policy: RETENTION_POLICY,
    startTime: new Date().toISOString(),
  });

  try {
    // Step 1: Clean old OCR and AI data
    await cleanOldTradeData(stats);
    
    // Step 2: Optionally clean old images
    if (RETENTION_POLICY.imageCleanupDays > 0) {
      await cleanOldImages(stats);
    }
    
    logger.info("=== DATA CLEANUP JOB COMPLETED SUCCESSFULLY ===", stats.summary);
    
    return {
      success: true,
      ...stats.summary,
    };
    
  } catch (error) {
    const errorMsg = `Cleanup job failed: ${error.message}`;
    logger.error(errorMsg, { error: error.message, stack: error.stack });
    stats.errors.push(errorMsg);
    
    return {
      success: false,
      error: error.message,
      ...stats.summary,
    };
  }
}

/**
 * Schedule the cleanup job to run daily
 */
function startDataCleanupCron() {
  const enabled = (process.env.ENABLE_DATA_CLEANUP_CRON || "true").toLowerCase() === "true";
  
  if (!enabled) {
    logger.info("Data cleanup cron job is disabled by ENABLE_DATA_CLEANUP_CRON");
    return;
  }

  // Default: Run daily at 3 AM (server time)
  // Low-traffic time to minimize impact
  const schedule = process.env.DATA_CLEANUP_CRON_SCHEDULE || "0 3 * * *";

  if (!require("node-cron").validate(schedule)) {
    logger.warn("Invalid cleanup cron schedule, skipping", { schedule });
    return;
  }

  require("node-cron").schedule(schedule, () => {
    logger.info("Triggering scheduled data cleanup job");
    runDataCleanupJob().catch((e) => 
      logger.error("Scheduled cleanup job failed", { error: e.message, stack: e.stack })
    );
  });

  logger.info("Data cleanup cron job scheduled", {
    schedule,
    nextRun: "Daily at configured time",
  });
}

module.exports = {
  runDataCleanupJob,
  startDataCleanupCron,
  cleanOldTradeData,
  cleanOldImages,
  RETENTION_POLICY,
  CleanupStats,
};

