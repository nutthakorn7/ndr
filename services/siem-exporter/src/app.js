/**
 * SIEM Exporter Main Application
 * Consumes correlated alerts and exports to multiple SIEMs
 */
const { Kafka } = require('kafkajs');
const { logger } = require('./utils/logger');
const SplunkExporter = require('./exporters/splunk');
const ElasticExporter = require('./exporters/elastic');
const SyslogExporter = require('./exporters/syslog');
const WebhookExporter = require('./exporters/webhook');

class SIEMExporter {
  constructor() {
    // Initialize Kafka consumer
    const kafka = new Kafka({
      clientId: 'siem-exporter',
      brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(',')
    });
    
    this.consumer = kafka.consumer({ groupId: 'siem-exporter-group' });
    
    // Initialize exporters
    this.exporters = [];
    
    // Splunk
    if (process.env.SPLUNK_ENABLED === 'true') {
      this.exporters.push(new SplunkExporter({
        enabled: true,
        hec_url: process.env.SPLUNK_HEC_URL,
        hec_token: process.env.SPLUNK_HEC_TOKEN,
        index: process.env.SPLUNK_INDEX || 'security',
        source: process.env.SPLUNK_SOURCE || 'ndr',
        sourcetype: process.env.SPLUNK_SOURCETYPE || 'ndr:alert',
        batch_size: parseInt(process.env.SPLUNK_BATCH_SIZE || '100'),
        flush_interval: parseInt(process.env.SPLUNK_FLUSH_INTERVAL || '5000')
      }));
    }
    
    // Elastic
    if (process.env.ELASTIC_ENABLED === 'true') {
      this.exporters.push(new ElasticExporter({
        enabled: true,
        url: process.env.ELASTIC_URL,
        api_key: process.env.ELASTIC_API_KEY,
        index: process.env.ELASTIC_INDEX || 'ndr-alerts',
        batch_size: parseInt(process.env.ELASTIC_BATCH_SIZE || '100'),
        flush_interval: parseInt(process.env.ELASTIC_FLUSH_INTERVAL || '5000')
      }));
    }
    
    // Syslog
    if (process.env.SYSLOG_ENABLED === 'true') {
      this.exporters.push(new SyslogExporter({
        enabled: true,
        host: process.env.SYSLOG_HOST,
        port: parseInt(process.env.SYSLOG_PORT || '514'),
        protocol: process.env.SYSLOG_PROTOCOL || 'tcp',
        facility: process.env.SYSLOG_FACILITY || 'local0'
      }));
    }
    
    // Webhooks
    const webhooks = [];
    let i = 1;
    while (process.env[`WEBHOOK_${i}_URL`]) {
      if (process.env[`WEBHOOK_${i}_ENABLED`] === 'true') {
        const webhook = {
          name: process.env[`WEBHOOK_${i}_NAME`] || `webhook-${i}`,
          url: process.env[`WEBHOOK_${i}_URL`],
          enabled: true
        };
        
        // Parse filter
        if (process.env[`WEBHOOK_${i}_FILTER_SEVERITY`]) {
          webhook.filter = {
            severity: process.env[`WEBHOOK_${i}_FILTER_SEVERITY`].split(',')
          };
        }
        
        // Parse headers
        const headers = {};
        let j = 1;
        while (process.env[`WEBHOOK_${i}_HEADER_${j}_NAME`]) {
          const name = process.env[`WEBHOOK_${i}_HEADER_${j}_NAME`];
          const value = process.env[`WEBHOOK_${i}_HEADER_${j}_VALUE`];
          headers[name] = value;
          j++;
        }
        if (Object.keys(headers).length > 0) {
          webhook.headers = headers;
        }
        
        webhooks.push(webhook);
      }
      i++;
    }
    
    if (webhooks.length > 0) {
      this.exporters.push(new WebhookExporter({ webhooks }));
    }
    
    logger.info(`SIEM Exporter initialized with ${this.exporters.length} exporters`);
  }
  
  async start() {
    await this.consumer.connect();
    await this.consumer.subscribe({ 
      topics: ['correlated-alerts', 'security-alerts'], 
      fromBeginning: false 
    });
    
    logger.info('SIEM Exporter started, consuming alerts...');
    
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const alert = JSON.parse(message.value.toString());
          
          logger.debug('Processing alert for export', {
            alert_id: alert.id || alert.alert_id,
            severity: alert.severity || alert.event?.severity
          });
          
          // Send to all enabled exporters
          const promises = this.exporters.map(exporter => 
            exporter.send(alert).catch(err => {
              logger.error('Exporter failed', {
                exporter: exporter.constructor.name,
                error: err.message
              });
            })
          );
          
          await Promise.allSettled(promises);
          
        } catch (error) {
          logger.error('Failed to process alert', { error: error.message });
        }
      }
    });
  }
}

// Start the exporter
const exporter = new SIEMExporter();
exporter.start().catch(error => {
  logger.error('Failed to start SIEM exporter', { error: error.message });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await exporter.consumer.disconnect();
  process.exit(0);
});
