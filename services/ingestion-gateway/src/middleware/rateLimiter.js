const redisClient = require('../services/redis');
const { logger } = require('../utils/logger');

const rateLimiter = async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    const key = `rate_limit:${clientIp}`;
    const limit = process.env.RATE_LIMIT || 1000;
    const window = process.env.RATE_WINDOW || 60;

    const current = await redisClient.incr(key);
    
    if (current === 1) {
      await redisClient.expire(key, window);
    }

    if (current > limit) {
      logger.warn('Rate limit exceeded:', { 
        clientIp, 
        current, 
        limit 
      });
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${limit} per ${window} seconds`,
        retryAfter: window
      });
    }

    res.set({
      'X-RateLimit-Limit': limit,
      'X-RateLimit-Remaining': Math.max(0, limit - current),
      'X-RateLimit-Reset': new Date(Date.now() + window * 1000)
    });

    next();
  } catch (error) {
    logger.error('Rate limiter error:', error);
    next();
  }
};

module.exports = { rateLimiter };