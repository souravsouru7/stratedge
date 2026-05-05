require("dotenv").config();

const { Worker } = require("bullmq");
const connectDB = require("../config/db");
const { appConfig } = require("../config");
const { connectRedis, bullmqConnection } = require("../config/redis");
const { OCR_QUEUE_NAME } = require("../queues/ocrQueue");
const { processTradeUpload, failTradeProcessing } = require("../services/tradeProcessingService");
const { logger } = require("../utils/logger");
const { jobFailureTracker } = require("../utils/jobFailureTracker");

let workerInstance = null;
let shutdownHandlersBound = false;

function bindShutdownHandlers() {
  if (shutdownHandlersBound) return;

  const shutdown = async () => {
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

      logger.error(`Job failed | id=${job.id} | tradeId=${tradeId}`,
        {
          jobId: job.id,
          tradeId,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        }
      );
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
    logger.info(`Job completed event fired | id=${job.id} | tradeId=${job.data.tradeId}`, {
      jobId: job.id,
      tradeId: job.data.tradeId,
      timestamp: new Date().toISOString(),
    });
  });

  workerInstance.on("failed", (job, err) => {
    if (job && job.attemptsMade >= job.opts.attempts) {
      logger.error("OCR job permanently failed — all retries exhausted", {
        tradeId: job?.data?.tradeId,
        jobId: job?.id,
        attempts: job.attemptsMade,
        error: err?.message,
      });
    } else {
      logger.error(`Job failed event fired | id=${job?.id} | tradeId=${job?.data?.tradeId}`, {
        jobId: job?.id,
        tradeId: job?.data?.tradeId,
        error: err?.message,
        stack: err?.stack,
        timestamp: new Date().toISOString(),
      });
    }
  });

  workerInstance.on("stalled", (jobId) => {
    logger.error("OCR job stalled", {
      jobId,
      timestamp: new Date().toISOString(),
    });
  });

  workerInstance.on("error", (error) => {
    logger.error("OCR worker runtime error", {
      error: error.message,
      stack: error.stack,
    });
  });

  bindShutdownHandlers();

  logger.info("OCR worker started successfully", {
    timestamp: new Date().toISOString(),
    pid: process.pid,
    queueName: OCR_QUEUE_NAME,
    concurrency: appConfig.ocrWorker.concurrency,
    lockDurationMs: appConfig.ocrWorker.lockDurationMs,
    mode,
  });

  console.log(`OCR worker running (${mode}).`);

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
