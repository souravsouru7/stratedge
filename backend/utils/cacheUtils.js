const { client } = require('../config/redis');

/**
 * Clears all analytics cache keys for a specific user.
 * Keys follow the pattern: cache:userId:*
 */
const clearUserCache = async (userId) => {
    if (!client.isOpen) return;

    try {
        const pattern = `cache:${userId}:*`;
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
            console.log(`Cleared ${keys.length} cache keys for user ${userId}`);
        }
    } catch (err) {
        console.error('Error clearing Redis cache:', err);
    }
};

module.exports = { clearUserCache };
