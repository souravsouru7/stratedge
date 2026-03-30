const { logger } = require('./logger');

// In-memory failure tracking (for production, consider Redis)
const jobFailureTracker = {
  failures: new Map(), // jobId -> { count, lastError, timestamps }
  maxFailures: 5,
  
  recordFailure(jobId, error, tradeId) {
    const now = Date.now();
    const existing = this.failures.get(jobId);
    
    if (existing) {
      existing.count += 1;
      existing.lastError = error;
      existing.timestamps.push(now);
      
      logger.warn(`Job repeated failure | jobId=${jobId} | tradeId=${tradeId} | count=${existing.count}`, {
        error: error.message,
        stack: error.stack,
        tradeId,
        jobId,
        timestamp: new Date().toISOString(),
      });
      
      if (existing.count >= this.maxFailures) {
        logger.error(`Job exceeded max failures | jobId=${jobId} | tradeId=${tradeId}`, {
          totalFailures: existing.count,
          error: error.message,
        });
      }
    } else {
      this.failures.set(jobId, {
        count: 1,
        lastError: error,
        timestamps: [now],
        tradeId,
      });
      
      logger.error(`Job failed | jobId=${jobId} | tradeId=${tradeId}`, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Clean old entries (keep only last 24 hours)
    this.cleanup();
  },
  
  getFailureCount(jobId) {
    return this.failures.get(jobId)?.count || 0;
  },
  
  isRepeatedFailure(jobId) {
    return (this.failures.get(jobId)?.count || 0) > 1;
  },
  
  cleanup() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    for (const [jobId, data] of this.failures.entries()) {
      data.timestamps = data.timestamps.filter(ts => ts > oneDayAgo);
      if (data.timestamps.length === 0) {
        this.failures.delete(jobId);
      }
    }
  },
  
  getStats() {
    const totalTracked = this.failures.size;
    const repeatedFailures = Array.from(this.failures.values())
      .filter(data => data.count > 1).length;
    
    return {
      totalTracked,
      repeatedFailures,
      criticalJobs: Array.from(this.failures.entries())
        .filter(([_, data]) => data.count >= this.maxFailures)
        .map(([jobId, data]) => ({ jobId, count: data.count, tradeId: data.tradeId })),
    };
  },
};

module.exports = { jobFailureTracker };
