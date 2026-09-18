// Redis configuration
const { createClient } = require('redis');
require('dotenv').config();

// Function to create a mock Redis client
const createMockRedisClient = () => {
    const storage = {};
    return {
        isReady: true,
        connect: async () => Promise.resolve(),
        set: async (key, value, options) => {
            storage[key] = value;
            return "OK";
        },
        get: async (key) => storage[key] || null,
        del: async (key) => {
            delete storage[key];
            return 1;
        },
        on: (event, callback) => { /* No-op */ }
    };
};

// Check if Redis is disabled in environment
const isRedisDisabled = process.env.REDIS_ENABLED === 'false';

// Create Redis client or mock client
const buildRedisClient = () => {
    if (isRedisDisabled) {
        return createMockRedisClient();
    }

    const reconnectStrategy = (retries) => {
        if (retries > 3) {
            console.log('Redis connection failed after 3 retries');
            return false;
        }
        return Math.min(retries * 100, 3000);
    };

    // Prefer REDIS_URL if supplied to avoid host/port mismatch
    if (process.env.REDIS_URL) {
        return createClient({
            url: process.env.REDIS_URL,
            socket: { reconnectStrategy }
        });
    }

    // Sanitize REDIS_HOST in case a port is mistakenly included
    const rawHost = process.env.REDIS_HOST || 'localhost';
    const sanitizedHost = rawHost.includes(':') ? rawHost.split(':')[0] : rawHost;
    const port = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;

    return createClient({
        socket: {
            host: sanitizedHost,
            port,
            reconnectStrategy
        },
        ...(process.env.REDIS_USERNAME ? { username: process.env.REDIS_USERNAME } : {}),
        ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {})
    });
};

const redisClient = buildRedisClient();

// Connect to Redis
const connectRedis = async () => {
    try {
        if (isRedisDisabled) {
            console.log('Using in-memory mock Redis for development');
            return redisClient;
        }

        await redisClient.connect();
        console.log('Redis connected');
        return redisClient;
    } catch (error) {
        console.error(`Redis connection error: ${error.message}`);
        // Don't throw the error - this allows the application to continue even if Redis fails
        console.log('Continuing without Redis - functionality requiring caching may be limited');
        return null;
    }
};

// Handle Redis errors (only for real Redis client)
if (!isRedisDisabled) {
    redisClient.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
            console.error('Redis connection refused - make sure Redis server is running');
        } else if (err.toString().includes('NOAUTH')) {
            console.error('Redis authentication failed - check REDIS_PASSWORD in .env file');
        } else {
            console.error(`Redis Error: ${err}`);
        }
    });
}

module.exports = { redisClient, connectRedis }; 