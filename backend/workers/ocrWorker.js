require("dotenv").config();

const { Worker } = require("bullmq");
const connectDB = require("../config/db");
const { appConfig } = require("../config");
const { connectRedis, bullmqConnection } = require("../config/redis");
const { OCR_QUEUE_NAME } = require("../queues/ocrQueue");
const { processTradeUpload, failTradeProcessing } = require("../services/tradeProcessingService");
const { logger } = require("../utils/logger");
const { jobFailureTracker } = require("../utils/jobFailureTracker");

connectDB();
connectRedis();

const worker = new Worker(
  OCR_QUEUE_NAME,
  async (job) => {
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
      // Track job failures
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
  },
  {
    connection: bullmqConnection,
    concurrency: appConfig.ocrWorker.concurrency,
    lockDuration: appConfig.ocrWorker.lockDurationMs,
  }
);

worker.on("completed", (job) => {
  logger.info(`Job completed event fired | id=${job.id} | tradeId=${job.data.tradeId}`, {
    jobId: job.id,
    tradeId: job.data.tradeId,
    timestamp: new Date().toISOString(),
  });
});

worker.on("failed", (job, error) => {
  logger.error(`Job failed event fired | id=${job?.id} | tradeId=${job?.data?.tradeId}`,
    {
      jobId: job?.id,
      tradeId: job?.data?.tradeId,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    }
  );
});

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});

logger.info("OCR worker started successfully", {
  timestamp: new Date().toISOString(),
  pid: process.pid,
  queueName: OCR_QUEUE_NAME,
  concurrency: appConfig.ocrWorker.concurrency,
  lockDurationMs: appConfig.ocrWorker.lockDurationMs,
});

console.log("OCR worker running. Start with: node workers/ocrWorker.js");
