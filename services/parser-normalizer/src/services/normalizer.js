const geoip = require('geoip-lite');
const ip = require('ip');
const { logger } = require('../utils/logger');

class LogNormalizer {
  constructor() {
    this.fieldMappings = this.initializeFieldMappings();
  }

  initializeFieldMappings() {
    return {
      'src_ip': 'source.ip',
      'dst_ip': 'destination.ip',
      'src_port': 'source.port',
      'dst_port': 'destination.port',
      'source_ip': 'source.ip',
      'dest_ip': 'destination.ip',
      'clientip': 'source.ip',
      'host': 'source.hostname',
      'hostname': 'source.hostname'
    };
  }

  async normalize(parsedLog) {
    try {
      let normalizedLog = {
        '@timestamp': this.normalizeTimestamp(parsedLog),
        event: this.normalizeEvent(parsedLog),
        source: { ...(parsedLog.source && typeof parsedLog.source === 'object' ? parsedLog.source : {}) },
        destination: { ...(parsedLog.destination && typeof parsedLog.destination === 'object' ? parsedLog.destination : {}) },
        network: { ...(parsedLog.network && typeof parsedLog.network === 'object' ? parsedLog.network : {}) },
        user: { ...(parsedLog.user && typeof parsedLog.user === 'object' ? parsedLog.user : {}) },
        process: { ...(parsedLog.process && typeof parsedLog.process === 'object' ? parsedLog.process : {}) },
        file: { ...(parsedLog.file && typeof parsedLog.file === 'object' ? parsedLog.file : {}) },
        tenant_id: parsedLog.tenant_id || 'default'
      };

      this.mapFields(parsedLog, normalizedLog);
      
      this.enrichIPData(normalizedLog);
      
      this.categorizeEvent(normalizedLog);
      
      normalizedLog.normalized_timestamp = new Date().toISOString();
      normalizedLog.original = parsedLog;

      return normalizedLog;

    } catch (error) {
      logger.error('Normalization failed:', error);
      return parsedLog;
    }
  }

  normalizeTimestamp(log) {
    if (log['@timestamp']) return log['@timestamp'];
    if (log.timestamp) {
      try {
        return new Date(log.timestamp).toISOString();
      } catch (e) {
        logger.warn('Invalid timestamp format:', log.timestamp);
      }
    }
    return new Date().toISOString();
  }

  normalizeEvent(log) {
    return {
      type: log.event?.type || log.event_type || 'unknown',
      category: log.event?.category || this.inferCategory(log),
      action: log.event?.action || log.action,
      outcome: log.event?.outcome || log.outcome,
      severity: log.severity || 'medium'
    };
  }

  mapFields(source, target) {
    for (const [sourceField, targetField] of Object.entries(this.fieldMappings)) {
      if (source[sourceField] !== undefined) {
        this.setNestedField(target, targetField, source[sourceField]);
      }
    }

    this.mergeUserData(source, target);
    this.mergeProcessData(source, target);
    this.mergeFileData(source, target);

    if (source.protocol) {
      target.network.protocol = source.protocol.toLowerCase();
    }

    if (source.bytes) {
      target.network.bytes = parseInt(source.bytes);
    }
  }

  setNestedField(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  enrichIPData(log) {
    if (log.source?.ip && ip.isV4Format(log.source.ip)) {
      const geo = geoip.lookup(log.source.ip);
      if (geo) {
        log.source.geo = {
          country_code: geo.country,
          region: geo.region,
          city: geo.city,
          latitude: geo.ll[0],
          longitude: geo.ll[1]
        };
      }
      
      log.source.ip_type = ip.isPrivate(log.source.ip) ? 'private' : 'public';
    }

    if (log.destination?.ip && ip.isV4Format(log.destination.ip)) {
      const geo = geoip.lookup(log.destination.ip);
      if (geo) {
        log.destination.geo = {
          country_code: geo.country,
          region: geo.region,
          city: geo.city,
          latitude: geo.ll[0],
          longitude: geo.ll[1]
        };
      }
      
      log.destination.ip_type = ip.isPrivate(log.destination.ip) ? 'private' : 'public';
    }
  }

  mergeUserData(source, target) {
    if (source.user && typeof source.user === 'object') {
      target.user = { ...target.user, ...source.user };
    } else if (typeof source.user === 'string') {
      target.user.name = source.user;
    }

    if (source.username) {
      target.user.name = source.username;
    }
  }

  mergeProcessData(source, target) {
    if (source.process && typeof source.process === 'object') {
      target.process = { ...target.process, ...source.process };
    } else if (typeof source.process === 'string') {
      target.process.name = source.process;
    }

    if (source.process_name) {
      target.process.name = source.process_name;
    }
  }

  mergeFileData(source, target) {
    if (source.file && typeof source.file === 'object') {
      target.file = { ...target.file, ...source.file };
    } else if (typeof source.file === 'string') {
      target.file.path = source.file;
    }

    if (source.file_path) {
      target.file.path = source.file_path;
    }
  }

  categorizeEvent(log) {
    const eventType = log.event?.type?.toLowerCase() || '';
    
    if (eventType.includes('connection') || eventType.includes('network')) {
      log.event.category = 'network';
    } else if (eventType.includes('process') || eventType.includes('execution')) {
      log.event.category = 'process';
    } else if (eventType.includes('file') || eventType.includes('creation')) {
      log.event.category = 'file';
    } else if (eventType.includes('authentication') || eventType.includes('login')) {
      log.event.category = 'authentication';
    } else if (eventType.includes('dns')) {
      log.event.category = 'network';
      log.event.type = 'dns';
    }
  }

  inferCategory(log) {
    if (log.source?.ip || log.destination?.ip) return 'network';
    if (log.process || log.process_name) return 'process';
    if (log.file || log.file_path) return 'file';
    if (log.user || log.username) return 'authentication';
    return 'other';
  }
}

module.exports = { LogNormalizer };
