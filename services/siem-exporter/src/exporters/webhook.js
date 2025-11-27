/**
 * Webhook Exporter
 */
const axios = require('axios');
const { logger } = require('../utils/logger');

class WebhookExporter {
  constructor(config) {
    this.webhooks = (config.webhooks || []).filter(w => w.enabled);
    logger.info(`Webhook exporter initialized with ${this.webhooks.length} webhooks`);
  }
  
  async send(alert) {
    if (this.webhooks.length === 0) return;
    
    const promises = this.webhooks.map(webhook => 
      this.sendToWebhook(webhook, alert)
    );
    
    await Promise.allSettled(promises);
  }
  
  async sendToWebhook(webhook, alert) {
    // Apply filters
    if (webhook.filter) {
      if (webhook.filter.severity) {
        const severity = alert.severity || alert.event?.severity;
        if (!webhook.filter.severity.includes(severity)) {
          return; // Skip this webhook
        }
      }
    }
    
    const payload = {
      timestamp: new Date().toISOString(),
      platform: 'open-ndr',
      webhook_name: webhook.name,
      alert: {
        id: alert.id || alert.alert_id,
        title: alert.title,
        severity: alert.severity || alert.event?.severity,
        category: alert.category,
        mitre_attack: alert.mitre_attack,
        source: alert.source,
        destination: alert.destination,
        correlation: alert.correlation,
        threat_intel: alert.threat_intel
      }
    };
    
    try {
      await axios.post(
        webhook.url,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            ...webhook.headers
          },
          timeout: 10000
        }
      );
      
      logger.info('Sent alert to webhook', {
        webhook: webhook.name,
        alert_id: alert.id
      });
    } catch (error) {
      logger.error('Failed to send to webhook', {
        webhook: webhook.name,
        error: error.message
      });
    }
  }
}

module.exports = WebhookExporter;
