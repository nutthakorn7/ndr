const express = require('express');
const cors = require('cors');
const { Kafka } = require('kafkajs');
const { Database } = require('./db/client');
const { AssetExtractor } = require('./services/assetExtractor');
const { logger } = require('./utils/logger');

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database();
const extractor = new AssetExtractor();

const kafka = new Kafka({
  clientId: 'asset-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const consumer = kafka.consumer({ groupId: 'asset-service-group' });

// API Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'asset-service'
  });
});

app.get('/assets', async (req, res) => {
  try {
    const assets = await db.getAssets(req.query);
    res.json({ assets, total: assets.length });
  } catch (error) {
    logger.error('Failed to fetch assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

app.get('/assets/:id', async (req, res) => {
  try {
    const asset = await db.getAssetById(req.params.id);
    if (asset) {
      res.json(asset);
    } else {
      res.status(404).json({ error: 'Asset not found' });
    }
  } catch (error) {
    logger.error('Failed to fetch asset:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

app.get('/assets/stats/summary', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to fetch stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Kafka consumer
async function processMessage(message) {
  try {
    const log = JSON.parse(message.value.toString());
    const assets = extractor.extractFromLog(log);

    for (const asset of assets) {
      await db.upsertAsset(asset);
      logger.debug('Upserted asset:', { ip: asset.ip_address });
    }
  } catch (error) {
    logger.error('Failed to process message:', error);
  }
}

async function start() {
  try {
    // Initialize database
    await db.initialize();

    // Connect Kafka consumer
    await consumer.connect();
    await consumer.subscribe({ topic: 'normalized-logs' });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await processMessage(message);
      }
    });

    logger.info('Asset service started successfully', {
      subscribed_topics: ['normalized-logs']
    });

    // Start API server
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      logger.info(`Asset service API listening on port ${PORT}`);
    });

  } catch (error) {
    logger.error('Failed to start service:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await consumer.disconnect();
  await db.close();
  process.exit(0);
});

start();

module.exports = app;
