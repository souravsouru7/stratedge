require("dotenv").config({ quiet: true });

const { Worker } = require("bullmq");
const connectDB = require("../config/db");
const { appConfig } = require("../config");
const { connectRedis, bullmqConnection } = require("../config/redis");
const { OCR_QUEUE_NAME } = require("../queues/ocrQueue");
const { processTradeUpload, failTradeProcessing } = require("../services/tradeProcessingService");
const { logger } = require("../utils/logger");
const { jobFailureTracker } = require("../utils/jobFailureTracker");

// Lazily required to avoid circular dep during startup
let Trade;
function getTrade() {
  if (!Trade) Trade = require("../models/Trade");
  return Trade;
}

let workerInstance = null;
let shutdownHandlersBound = false;
let stuckTradeCheckInterval = null;

// ── Stuck-trade monitor ───────────────────────────────────────────────────────
// Trades that were enqueued but whose BullMQ job was lost (e.g. Redis restart)
// stay in "processing" forever unless we detect and rescue them here.
const STUCK_PROCESSING_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const STUCK_CHECK_INTERVAL_MS = 5 * 60 * 1000;        // run every 5 minutes

async function checkStuckTrades() {
  try {
    const TradeModel = getTrade();
    const cutoff = new Date(Date.now() - STUCK_PROCESSING_THRESHOLD_MS);
    const stuckTrades = await TradeModel.find({
      status: "processing",
      processingStartedAt: { $lt: cutoff },
    }).select("_id processingStartedAt ocrJobId").lean().limit(50);

    if (stuckTrades.length === 0) return;

    logger.warn(`Stuck trade detector found ${stuckTrades.length} trade(s) stuck in processing`, {
      count: stuckTrades.length,
      tradeIds: stuckTrades.map((t) => t._id.toString()),
    });

    for (const trade of stuckTrades) {
      try {
        await TradeModel.findByIdAndUpdate(trade._id, {
          status: "failed",
          error: "Processing timed out — job was lost. Please re-upload the screenshot.",
          processedAt: new Date(),
        });
        logger.warn(`Stuck trade rescued | tradeId=${trade._id}`, {
          tradeId: trade._id.toString(),
          stuckSince: trade.processingStartedAt,
          jobId: trade.ocrJobId,
        });
      } catch (updateErr) {
        logger.error(`Failed to rescue stuck trade | tradeId=${trade._id}`, {
          error: updateErr.message,
        });
      }
    }
  } catch (err) {
    logger.error("Stuck-trade check failed", { error: err.message });
  }
}

function bindShutdownHandlers() {
  if (shutdownHandlersBound) return;

  const shutdown = async () => {
    if (stuckTradeCheckInterval) {
      clearInterval(stuckTradeCheckInterval);
      stuckTradeCheckInterval = null;
    }
    if (workerInstance) {
      await workerInstance.close();
      workerInstance = null;
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  shutdownHandlersBound = true;
}

function createProcessor() {
  return async (job) => {
    const { tradeId, imageUrl, imagePath, userId } = job.data;

    logger.info(`Job started | id=${job.id} | tradeId=${tradeId}`, {
      jobId: job.id,
      tradeId,
      userId,
      imageUrl: imageUrl || imagePath,
      attempt: job.attemptsMade + 1,
      timestamp: new Date().toISOString(),
    });

    try {
      await job.updateProgress({
        stage: "processing",
        attempt: job.attemptsMade + 1,
      });

      const result = await processTradeUpload({
        tradeId,
        imageUrl,
        imagePath,
        jobId: job.id,
        attempt: job.attemptsMade + 1,
      });

      await job.updateProgress({
        stage: "completed",
        attempt: job.attemptsMade + 1,
      });

      logger.info(`Job completed successfully | id=${job.id} | tradeId=${tradeId}`, {
        jobId: job.id,
        tradeId,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      jobFailureTracker.recordFailure(job.id, error, tradeId);

      // Check for repeated failures — may indicate a consistently broken image
      const failureCount = jobFailureTracker.getFailureCount(job.id);
      if (failureCount >= 2) {
        logger.warn(`Repeated OCR failure detected | id=${job.id} | tradeId=${tradeId} | count=${failureCount}`, {
          jobId: job.id,
          tradeId,
          failureCount,
          error: error.message,
        });
      }

      // Only mark the trade as permanently failed on the LAST attempt so earlier
      // retries don't overwrite a temporary error with a permanent failed status.
      const isLastAttempt = job.attemptsMade + 1 >= (job.opts?.attempts ?? 3);
      if (isLastAttempt) {
        try {
          await failTradeProcessing(tradeId, error);
        } catch (updateError) {
          logger.error(
            `Failed to persist failed status | id=${job.id} | tradeId=${tradeId}`,
            {
              jobId: job.id,
              tradeId,
              originalError: error.message,
              updateError: updateError.message,
            }
          );
        }
      }

      logger.error(`Job failed | id=${job.id} | tradeId=${tradeId}`, {
        jobId: job.id,
        tradeId,
        error: error.message,
        stack: error.stack,
        attempt: job.attemptsMade + 1,
        isLastAttempt,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  };
}

async function startOcrWorker({ initializeConnections = true, mode = "standalone" } = {}) {
  if (workerInstance) {
    return workerInstance;
  }

  if (initializeConnections) {
    await connectDB();
    await connectRedis();
  }

  workerInstance = new Worker(
    OCR_QUEUE_NAME,
    createProcessor(),
    {
      connection: bullmqConnection,
      concurrency: appConfig.ocrWorker.concurrency,
      lockDuration: appConfig.ocrWorker.lockDurationMs,
    }
  );

  workerInstance.on("completed", (job) => {
    logger.info(`Job completed event | id=${job.id} | tradeId=${job.data.tradeId}`, {
      jobId: job.id,
      tradeId: job.data.tradeId,
      timestamp: new Date().toISOString(),
    });
  });

  workerInstance.on("failed", (job, error) => {
    const isLastAttempt = (job?.attemptsMade ?? 0) >= ((job?.opts?.attempts ?? 3) - 1);
    logger.error(`Job failed event | id=${job?.id} | tradeId=${job?.data?.tradeId} | final=${isLastAttempt}`, {
      jobId: job?.id,
      tradeId: job?.data?.tradeId,
      error: error?.message,
      stack: error?.stack,
      attemptsMade: job?.attemptsMade,
      isFinalFailure: isLastAttempt,
      timestamp: new Date().toISOString(),
    });
  });

  // Stalled jobs: lock expired before the job finished (worker crash, OOM, slow network).
  // BullMQ automatically re-queues stalled jobs; we log it so ops can investigate.
  workerInstance.on("stalled", (jobId) => {
    logger.warn(`Job stalled (lock expired) — will be re-queued | id=${jobId}`, {
      jobId,
      timestamp: new Date().toISOString(),
    });
  });

  workerInstance.on("error", (error) => {
    logger.error("OCR worker internal error", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  });

  // Periodically detect trades stuck in "processing" with no active BullMQ job
  stuckTradeCheckInterval = setInterval(checkStuckTrades, STUCK_CHECK_INTERVAL_MS);
  // Run once on startup to rescue anything that got stuck during the last deploy
  setTimeout(checkStuckTrades, 15000);

  bindShutdownHandlers();

  logger.info("OCR worker started successfully", {
    timestamp: new Date().toISOString(),
    pid: process.pid,
    queueName: OCR_QUEUE_NAME,
    concurrency: appConfig.ocrWorker.concurrency,
    lockDurationMs: appConfig.ocrWorker.lockDurationMs,
    mode,
  });

  return workerInstance;
}

if (require.main === module) {
  startOcrWorker({ initializeConnections: true, mode: "standalone" }).catch((error) => {
    logger.error("Failed to start OCR worker", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}

module.exports = {
  startOcrWorker,
};
