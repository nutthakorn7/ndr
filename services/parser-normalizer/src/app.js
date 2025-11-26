const { Kafka } = require('kafkajs');
const { Client } = require('@opensearch-project/opensearch');
const { logger } = require('./utils/logger');
const { LogParser } = require('./services/parser');
const { LogNormalizer } = require('./services/normalizer');

const kafka = Kafka({
  clientId: 'parser-normalizer',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const opensearch = new Client({
  node: process.env.OPENSEARCH_URL || 'http://localhost:9200'
});

const consumer = kafka.consumer({ groupId: 'parser-normalizer-group' });
const producer = kafka.producer();

const parser = new LogParser();
const normalizer = new LogNormalizer();

async function processMessage(message) {
  try {
    const rawLog = JSON.parse(message.value.toString());
    
    const parsedLog = await parser.parse(rawLog);
    const normalizedLog = await normalizer.normalize(parsedLog);
    
    await producer.send({
      topic: 'normalized-logs',
      messages: [{
        key: normalizedLog.tenant_id || 'default',
        value: JSON.stringify(normalizedLog),
        headers: {
          'content-type': 'application/json',
          'processing-stage': 'normalized'
        }
      }]
    });

    logger.debug('Log processed successfully', {
      tenant_id: normalizedLog.tenant_id,
      event_type: normalizedLog.event?.type
    });

  } catch (error) {
    logger.error('Failed to process message:', error);
    
    await producer.send({
      topic: 'dead-letter-queue',
      messages: [{
        key: 'parsing-error',
        value: message.value,
        headers: {
          'error': error.message,
          'original-topic': 'raw-logs'
        }
      }]
    });
  }
}

async function start() {
  try {
    await consumer.connect();
    await producer.connect();
    
    await consumer.subscribe({ topic: 'raw-logs' });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await processMessage(message);
      }
    });

    logger.info('Parser-normalizer service started successfully');

  } catch (error) {
    logger.error('Failed to start service:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
});

start();