const { createClient } = require('redis');

const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => console.error('Redis Client Error', err));

const connectRedis = async () => {
    try {
        await client.connect();
        console.log('Redis Connected...');
    } catch (err) {
        console.error('Redis connection failed:', err.message);
    }
};

module.exports = { client, connectRedis };
