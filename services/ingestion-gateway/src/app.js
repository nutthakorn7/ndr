const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { createPrometheusMetrics } = require('./middleware/metrics');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const kafkaProducer = require('./services/kafka');
const redisClient = require('./services/redis');

const ingestRoutes = require('./routes/ingest');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(createPrometheusMetrics());

app.use('/health', healthRoutes);
app.use('/ingest', ingestRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await kafkaProducer.connect();
    await redisClient.connect();
    
    app.listen(PORT, () => {
      logger.info(`Ingestion Gateway started on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await kafkaProducer.disconnect();
  await redisClient.disconnect();
  process.exit(0);
});

startServer();