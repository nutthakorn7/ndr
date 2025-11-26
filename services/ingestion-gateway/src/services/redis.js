const { createClient } = require('redis');
const { logger } = require('../utils/logger');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retry_unfulfilled_commands: true,
  retry_delay: 100
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('error', (err) => {
  logger.error('Redis client error:', err);
});

redisClient.on('end', () => {
  logger.info('Redis client disconnected');
});

module.exports = redisClient;