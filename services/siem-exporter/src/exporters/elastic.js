/**
 * Elastic ECS (Elastic Common Schema) Exporter
 */
const axios = require('axios');
const { logger } = require('../utils/logger');

class ElasticExporter {
  constructor(config) {
    this.config = config;
    this.enabled = config.enabled || false;
    this.buffer = [];
    this.batchSize = config.batch_size || 100;
    this.flushInterval = config.flush_interval || 5000;
    
    if (this.enabled) {
      this.startFlushTimer();
      logger.info('Elastic ECS exporter initialized', {
        url: config.url,
        index: config.index
      });
    }
  }
  
  async send(alert) {
    if (!this.enabled) return;
    
    const ecsEvent = this.transformToECS(alert);
    this.buffer.push(ecsEvent);
    
    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }
  
  transformToECS(alert) {
    return {
      '@timestamp': alert.timestamp || alert['@timestamp'],
      ecs: { version: '8.0.0' },
      event: {
        kind: 'alert',
        category: [this.mapCategory(alert.category)],
        type: ['info'],
        severity: this.mapSeverity(alert.severity || alert.event?.severity),
        action: alert.event?.action,
        outcome: alert.event?.outcome
      },
      threat: {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: alert.mitre_attack,
          name: alert.category
        }
      },
      rule: {
        id: alert.rule_id,
        name: alert.title,
        description: alert.description
      },
      source: {
        ip: alert.source?.ip,
        port: alert.source?.port,
        geo: alert.source?.geo
      },
      destination: {
        ip: alert.destination?.ip,
        port: alert.destination?.port,
        geo: alert.destination?.geo
      },
      network: {
        protocol: alert.network?.protocol,
        bytes: alert.network?.bytes,
        transport: alert.network?.transport
      },
      user: {
        name: alert.user?.name,
        domain: alert.user?.domain
      },
      tags: alert.tags || [],
      labels: {
        correlation_id: alert.correlation?.meta_id,
        aggregation_count: alert.correlation?.aggregation_count,
        severity_score: alert.correlation?.severity_score
      },
      // Custom fields
      ndr: {
        alert_id: alert.id || alert.alert_id,
        threat_intel: alert.threat_intel,
        attack_chain: alert.correlation?.attack_chain
      }
    };
  }
  
  mapCategory(category) {
    const mapping = {
      'malware': 'malware',
      'intrusion': 'intrusion_detection',
      'reconnaissance': 'network',
      'lateral_movement': 'network',
      'credential_theft': 'authentication',
      'data_exfiltration': 'network'
    };
    return mapping[category] || 'network';
  }
  
  mapSeverity(severity) {
    const mapping = {
      'critical': 10,
      'high': 7,
      'medium': 4,
      'low': 1
    };
    return mapping[severity] || 4;
  }
  
  async flush() {
    if (this.buffer.length === 0) return;
    
    const events = this.buffer.splice(0, this.buffer.length);
    
    // Build bulk request
    const bulkBody = events.flatMap(doc => [
      { index: { _index: this.config.index } },
      doc
    ]);
    
    try {
      const response = await axios.post(
        `${this.config.url}/_bulk`,
        bulkBody.map(line => JSON.stringify(line)).join('\n') + '\n',
        {
          headers: {
            'Content-Type': 'application/x-ndjson',
            'Authorization': `ApiKey ${this.config.api_key}`
          },
          timeout: 10000
        }
      );
      
      if (response.data.errors) {
        logger.warn('Bulk indexing had errors', {
          errors: response.data.items.filter(i => i.index.error)
        });
      }
      
      logger.info(`Sent ${events.length} events to Elasticsearch`);
    } catch (error) {
      logger.error('Failed to send to Elasticsearch', {
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

module.exports = ElasticExporter;
