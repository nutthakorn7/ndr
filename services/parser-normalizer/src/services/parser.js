const grok = require('grok-js');
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
      if (this.isZeekLog(rawLog)) {
        return this.parseZeek(rawLog);
      }

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

  isZeekLog(rawLog) {
    if (!rawLog || typeof rawLog !== 'object') {
      return false;
    }

    return Boolean(
      rawLog.zeek_log_type ||
      rawLog._path ||
      rawLog['id.orig_h'] ||
      (rawLog.source_service === 'zeek')
    );
  }

  parseZeek(rawLog) {
    const zeekLogType = rawLog.zeek_log_type || rawLog._path || 'zeek';
    const timestamp = this.extractZeekTimestamp(rawLog);

    return {
      ...rawLog,
      '@timestamp': timestamp,
      timestamp,
      log_type: 'zeek',
      zeek_log_type: zeekLogType,
      zeek: { ...rawLog },
      parsed_timestamp: new Date().toISOString()
    };
  }

  extractZeekTimestamp(rawLog) {
    if (rawLog['@timestamp']) {
      return rawLog['@timestamp'];
    }

    if (rawLog.ts) {
      try {
        const tsNum = typeof rawLog.ts === 'number' ? rawLog.ts : parseFloat(rawLog.ts);
        if (!Number.isNaN(tsNum)) {
          return new Date(tsNum * 1000).toISOString();
        }
      } catch (err) {
        logger.warn('Failed to parse Zeek timestamp', { err, ts: rawLog.ts });
      }
    }

    return new Date().toISOString();
  }
}

module.exports = { LogParser };
