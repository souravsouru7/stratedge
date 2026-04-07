const { deleteCacheByPattern } = require("./cache");
const { logger } = require("./logger");

/**
 * Clears all per-user cache namespaces without relying on brittle URL-based keys.
 */
const clearUserCache = async (userId) => {
  const normalizedUserId = userId?.toString?.() || String(userId || "");
  if (!normalizedUserId) return;

  const patterns = [
    `dashboard:${normalizedUserId}:*`,
    `analytics:*:${normalizedUserId}:*`,
    `trades:${normalizedUserId}:*`,
    `weekly_reports:${normalizedUserId}:*`,
  ];

  try {
    const results = await Promise.all(patterns.map((pattern) => deleteCacheByPattern(pattern)));
    const deleted = results.reduce((sum, count) => sum + count, 0);

    if (deleted > 0) {
      logger.info("Cleared user cache", {
        userId: normalizedUserId,
        deleted,
      });
    }
  } catch (error) {
    logger.warn("Failed to clear user cache", {
      userId: normalizedUserId,
      error: error.message,
    });
  }
};

module.exports = { clearUserCache };
