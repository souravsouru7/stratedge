const { Queue } = require("bullmq");
const { bullmqConnection } = require("../config/redis");
const { logger } = require("../utils/logger");

const ocrQueue = new Queue("ocrQueue", {
  connection: bullmqConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 1000, // Keep more failed jobs for debugging
    attempts: 2, // Retry failed jobs once
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2s delay, then exponential backoff
    },
  },
});

// Listen to queue events for monitoring
ocrQueue.on('error', (error) => {
  logger.error('OCR Queue error', {
    error: error.message,
    stack: error.stack,
  });
});

ocrQueue.on('waiting', (jobId) => {
  logger.debug(`Job waiting in queue | jobId=${jobId}`);
});

ocrQueue.on('active', (job) => {
  logger.info(`Job active | jobId=${job.id} | tradeId=${job.data.tradeId}`, {
    jobId: job.id,
    tradeId: job.data.tradeId,
  });
});

ocrQueue.on('completed', (job) => {
  logger.info(`Job completed | jobId=${job.id} | tradeId=${job.data.tradeId}`, {
    jobId: job.id,
    tradeId: job.data.tradeId,
  });
});

ocrQueue.on('failed', (job, error) => {
  logger.error(`Job failed | jobId=${job?.id} | tradeId=${job?.data?.tradeId}`, {
    jobId: job?.id,
    tradeId: job?.data?.tradeId,
    error: error?.message,
    stack: error?.stack,
  });
});

ocrQueue.on('stalled', (jobId) => {
  logger.warn(`Job stalled | jobId=${jobId}`);
});

module.exports = { ocrQueue };
