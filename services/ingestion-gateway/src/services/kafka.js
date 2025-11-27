const { Kafka } = require('kafkajs');
const { logger } = require('../utils/logger');

const kafka = new Kafka({
  clientId: 'ingestion-gateway',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer({
  maxInFlightRequests: 1,
  idempotent: true,
  transactionTimeout: 30000
});

producer.on('producer.connect', () => {
  logger.info('Kafka producer connected');
});

producer.on('producer.disconnect', () => {
  logger.info('Kafka producer disconnected');
});

producer.on('producer.network.request_timeout', (payload) => {
  logger.warn('Kafka request timeout:', payload);
});

module.exports = producer;