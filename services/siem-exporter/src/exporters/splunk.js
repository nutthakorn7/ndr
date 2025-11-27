/**
 * Splunk HEC (HTTP Event Collector) Exporter
 */
const axios = require('axios');
const { logger } = require('../utils/logger');

class SplunkExporter {
  constructor(config) {
    this.config = config;
    this.enabled = config.enabled || false;
    this.buffer = [];
    this.batchSize = config.batch_size || 100;
    this.flushInterval = config.flush_interval || 5000;
    
    if (this.enabled) {
      this.startFlushTimer();
      logger.info('Splunk HEC exporter initialized', {
        url: config.hec_url,
        index: config.index
      });
    }
  }
  
  async send(alert) {
    if (!this.enabled) return;
    
    const event = this.formatHEC(alert);
    this.buffer.push(event);
    
    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }
  
  formatHEC(alert) {
    return {
      time: new Date(alert.timestamp || alert['@timestamp']).getTime() / 1000,
      host: 'open-ndr',
      source: this.config.source || 'ndr',
      sourcetype: this.config.sourcetype || 'ndr:alert',
      index: this.config.index || 'security',
      event: {
        alert_id: alert.id || alert.alert_id,
        severity: alert.severity || alert.event?.severity,
        title: alert.title,
        category: alert.category,
        mitre_attack: alert.mitre_attack,
        source_ip: alert.source?.ip,
        destination_ip: alert.destination?.ip,
        rule_id: alert.rule_id,
        correlation: alert.correlation,
        threat_intel: alert.threat_intel,
        timestamp: alert.timestamp || alert['@timestamp']
      }
    };
  }
  
  async flush() {
    if (this.buffer.length === 0) return;
    
    const events = this.buffer.splice(0, this.buffer.length);
    
    try {
      await axios.post(
        `${this.config.hec_url}/services/collector/event`,
        events.map(e => JSON.stringify(e)).join('\n'),
        {
          headers: {
            'Authorization': `Splunk ${this.config.hec_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      logger.info(`Sent ${events.length} events to Splunk`);
    } catch (error) {
      logger.error('Failed to send to Splunk', {
        error: error.message,
        count: events.length
      });
      // Re-add to buffer for retry
      this.buffer.unshift(...events);
    }
  }
  
  startFlushTimer() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }
}

module.exports = SplunkExporter;
