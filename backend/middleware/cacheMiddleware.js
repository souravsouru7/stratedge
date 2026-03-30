const { client, isRedisReady } = require("../config/redis");

const cacheMiddleware = (minutes = 10) => async (req, res, next) => {
    if (!isRedisReady()) {
        return next();
    }

    const key = `cache:${req.user._id}:${req.originalUrl || req.url}`;

    try {
        const cachedData = await client.get(key);
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        const originalJson = res.json;

        res.json = function (data) {
            res.json = originalJson;

            client
                .setex(key, minutes * 60, JSON.stringify(data))
                .catch((err) => console.error("Redis cache set error:", err));

            return originalJson.call(this, data);
        };

        next();
    } catch (err) {
        console.error("Redis cache middleware error:", err);
        next();
    }
};

module.exports = cacheMiddleware;
