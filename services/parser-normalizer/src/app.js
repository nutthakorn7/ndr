const { Kafka } = require('kafkajs');
const { Client } = require('@opensearch-project/opensearch');
const { logger } = require('./utils/logger');
const { LogParser } = require('./services/parser');
const { LogNormalizer } = require('./services/normalizer');

const kafka = new Kafka({
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

const ZEEK_TOPIC = process.env.ZEEK_TOPIC || 'zeek-logs';
const SURICATA_TOPIC = process.env.SURICATA_TOPIC || 'suricata-logs';

async function processMessage(message, topic) {
  try {
    const rawLog = JSON.parse(message.value.toString());

    const parsedLog = await parser.parse(rawLog);
    const normalizedLog = await normalizer.normalize(parsedLog);

    try {
      const indexName = `logs-${new Date().toISOString().split('T')[0]}`;
      await opensearch.index({
        index: indexName,
        body: normalizedLog
      });
    } catch (error) {
      logger.error('Failed to index log to OpenSearch:', error);
      // Non-blocking error, continue to Kafka
    }

    await producer.send({
      topic: 'normalized-logs',
      messages: [{
        key: normalizedLog.tenant_id || 'default',
        value: JSON.stringify(normalizedLog),
        headers: {
          'content-type': 'application/json',
          'processing-stage': 'normalized',
          'source-topic': topic
        }
      }]
    });

    logger.debug('Log processed successfully', {
      tenant_id: normalizedLog.tenant_id,
      event_type: normalizedLog.event?.type,
      source_topic: topic
    });

  } catch (error) {
    logger.error('Failed to process message:', error);

    await producer.send({
      topic: 'dead-letter-queue',
      messages: [{
        key: 'parsing-error',
        value: message.value,
        headers: {
          error: error.message,
          'original-topic': topic
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
    await consumer.subscribe({ topic: ZEEK_TOPIC });
    await consumer.subscribe({ topic: SURICATA_TOPIC });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await processMessage(message, topic);
      }
    });

    logger.info('Parser-normalizer service started successfully', {
      subscribed_topics: ['raw-logs', ZEEK_TOPIC, SURICATA_TOPIC]
    });

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
