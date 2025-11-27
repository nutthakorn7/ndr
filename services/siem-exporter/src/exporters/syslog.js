/**
 * Syslog RFC 5424 Exporter
 */
const net = require('net');
const tls = require('tls');
const { logger } = require('../utils/logger');

class SyslogExporter {
  constructor(config) {
    this.config = config;
    this.enabled = config.enabled || false;
    this.client = null;
    
    if (this.enabled) {
      this.connect();
      logger.info('Syslog exporter initialized', {
        host: config.host,
        port: config.port,
        protocol: config.protocol
      });
    }
  }
  
  connect() {
    const protocol = this.config.protocol || 'tcp';
    
    if (protocol === 'tls') {
      this.client = tls.connect({
        host: this.config.host,
        port: this.config.port,
        rejectUnauthorized: this.config.verify_tls !== false
      });
    } else if (protocol === 'tcp') {
      this.client = new net.Socket();
      this.client.connect(this.config.port, this.config.host);
    }
    
    if (this.client) {
      this.client.on('error', (err) => {
        logger.error('Syslog connection error', { error: err.message });
      });
    }
  }
  
  async send(alert) {
    if (!this.enabled || !this.client) return;
    
    const message = this.formatRFC5424(alert);
    
    if (this.config.protocol === 'udp') {
      // UDP doesn't maintain connection
      const dgram = require('dgram');
      const client = dgram.createSocket('udp4');
      client.send(message, this.config.port, this.config.host, (err) => {
        if (err) logger.error('Syslog UDP send error', { error: err.message });
        client.close();
      });
    } else {
      // TCP/TLS
      try {
        this.client.write(message + '\n');
        logger.debug('Sent alert to syslog', { alert_id: alert.id });
      } catch (error) {
        logger.error('Syslog send error', { error: error.message });
        // Attempt reconnect
        this.connect();
      }
    }
  }
  
  formatRFC5424(alert) {
    const pri = this.calculatePRI(alert.severity || alert.event?.severity);
    const version = 1;
    const timestamp = new Date(alert.timestamp || alert['@timestamp']).toISOString();
    const hostname = 'ndr-platform';
    const appname = 'open-ndr';
    const procid = '-';
    const msgid = 'alert';
    
    // Structured data
    const severity = alert.severity || alert.event?.severity || 'medium';
    const category = alert.category || 'unknown';
    const structuredData = `[meta severity="${severity}" category="${category}" rule_id="${alert.rule_id || '-'}"]`;
    
    // Message (JSON)
    const msg = JSON.stringify({
      alert_id: alert.id || alert.alert_id,
      title: alert.title,
      source_ip: alert.source?.ip,
      destination_ip: alert.destination?.ip,
      mitre_attack: alert.mitre_attack
    });
    
    return `<${pri}>${version} ${timestamp} ${hostname} ${appname} ${procid} ${msgid} ${structuredData} ${msg}`;
  }
  
  calculatePRI(severity) {
    const facility = this.config.facility || 'local0';
    const facilityCode = {
      'local0': 16, 'local1': 17, 'local2': 18, 'local3': 19,
      'local4': 20, 'local5': 21, 'local6': 22, 'local7': 23
    }[facility] || 16;
    
    const severityCode = {
      'critical': 2,  // critical
      'high': 3,      // error
      'medium': 4,    // warning
      'low': 5        // notice
    }[severity] || 5;
    
    return (facilityCode * 8) + severityCode;
  }
}

module.exports = SyslogExporter;
