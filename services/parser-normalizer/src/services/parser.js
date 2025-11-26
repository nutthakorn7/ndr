const grok = require('grok-js');
const moment = require('moment');
const { logger } = require('../utils/logger');

class LogParser {
  constructor() {
    this.patterns = new Map();
    this.initializePatterns();
  }

  initializePatterns() {
    this.patterns.set('syslog', grok.loadDefaultSync('%{SYSLOGTIMESTAMP:timestamp} %{IPORHOST:host} %{PROG:program}(?:\\[%{POSINT:pid}\\])?: %{GREEDYDATA:message}'));
    this.patterns.set('apache', grok.loadDefaultSync('%{COMBINEDAPACHELOG}'));
    this.patterns.set('nginx', grok.loadDefaultSync('%{NGINXACCESS}'));
    this.patterns.set('windows-event', grok.loadDefaultSync('%{TIMESTAMP_ISO8601:timestamp} %{WORD:level} %{NUMBER:event_id} %{GREEDYDATA:message}'));
    this.patterns.set('netflow', grok.loadDefaultSync('%{IP:src_ip} %{IP:dst_ip} %{INT:src_port} %{INT:dst_port} %{WORD:protocol} %{INT:bytes}'));
  }

  async parse(rawLog) {
    try {
      let parsedLog = { ...rawLog };

      if (rawLog.raw_log) {
        const detectedType = this.detectLogType(rawLog.raw_log);
        const pattern = this.patterns.get(detectedType);
        
        if (pattern) {
          const parsed = pattern.parseSync(rawLog.raw_log);
          if (parsed) {
            parsedLog = { ...parsedLog, ...parsed };
            parsedLog.log_type = detectedType;
          }
        }
      }

      parsedLog.parsed_timestamp = new Date().toISOString();
      
      return parsedLog;

    } catch (error) {
      logger.error('Parsing failed:', error);
      return rawLog;
    }
  }

  detectLogType(logLine) {
    if (logLine.includes('apache') || logLine.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3} - -/)) {
      return 'apache';
    }
    
    if (logLine.includes('nginx')) {
      return 'nginx';
    }
    
    if (logLine.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return 'windows-event';
    }
    
    if (logLine.match(/^\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}/)) {
      return 'syslog';
    }
    
    if (logLine.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\s+\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\s+\d+\s+\d+/)) {
      return 'netflow';
    }
    
    return 'unknown';
  }
}

module.exports = { LogParser };