const express = require('express');
const kafkaProducer = require('../services/kafka');
const redisClient = require('../services/redis');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ingestion-gateway',
      version: process.env.npm_package_version || '1.0.0',
      dependencies: {
        kafka: 'unknown',
        redis: 'unknown'
      }
    };

    try {
      await kafkaProducer.send({
        topic: 'health-check',
        messages: [{ value: 'ping' }]
      });
      health.dependencies.kafka = 'healthy';
    } catch (error) {
      health.dependencies.kafka = 'unhealthy';
      health.status = 'degraded';
    }

    try {
      await redisClient.ping();
      health.dependencies.redis = 'healthy';
    } catch (error) {
      health.dependencies.redis = 'unhealthy';
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

router.get('/ready', (req, res) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;