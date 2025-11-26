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
        dns: { ...(parsedLog.dns && typeof parsedLog.dns === 'object' ? parsedLog.dns : {}) },
        sensor: { ...(parsedLog.sensor && typeof parsedLog.sensor === 'object' ? parsedLog.sensor : {}) },
        suricata: { ...(parsedLog.suricata && typeof parsedLog.suricata === 'object' ? parsedLog.suricata : {}) },
        tenant_id: parsedLog.tenant_id || 'default'
      };

      this.mapFields(parsedLog, normalizedLog);
      this.applyZeekMappings(parsedLog, normalizedLog);
      this.applySuricataMappings(parsedLog, normalizedLog);

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
    const event = {
      type: log.event?.type || log.event_type || 'unknown',
      category: log.event?.category || this.inferCategory(log),
      action: log.event?.action || log.action,
      outcome: log.event?.outcome || log.outcome,
      severity: log.severity || 'medium',
      provider: log.event?.provider
    };

    if (log.zeek_log_type) {
      const zeekMeta = this.getZeekEventMetadata(log.zeek_log_type);
      if (zeekMeta.type) {
        event.type = zeekMeta.type;
      }
      if (zeekMeta.category) {
        event.category = zeekMeta.category;
      }
      event.dataset = `zeek.${log.zeek_log_type}`;
      event.provider = 'zeek';
    }

    if (log.suricata_event_type) {
      const suricataMeta = this.getSuricataEventMetadata(log.suricata_event_type);
      event.type = suricataMeta.type || event.type;
      event.category = suricataMeta.category || event.category;
      event.action = suricataMeta.action || event.action;
      event.kind = suricataMeta.kind || event.kind;
      event.provider = 'suricata';
      event.dataset = `suricata.${log.suricata_event_type}`;
    }

    return event;
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
      target.network.bytes = parseInt(source.bytes, 10);
    }

    if (source.sensor_id) {
      target.sensor.id = source.sensor_id;
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

  applyZeekMappings(source, target) {
    if (!source.zeek) {
      return;
    }

    const zeek = source.zeek;

    target.zeek = {
      log_type: source.zeek_log_type,
      uid: zeek.uid,
      original_path: zeek._path
    };

    if (!target.source.ip && zeek['id.orig_h']) {
      target.source.ip = zeek['id.orig_h'];
    }
    if (!target.source.port && zeek['id.orig_p']) {
      target.source.port = parseInt(zeek['id.orig_p'], 10);
    }
    if (!target.destination.ip && zeek['id.resp_h']) {
      target.destination.ip = zeek['id.resp_h'];
    }
    if (!target.destination.port && zeek['id.resp_p']) {
      target.destination.port = parseInt(zeek['id.resp_p'], 10);
    }

    if (zeek.proto) {
      target.network.transport = zeek.proto.toLowerCase();
    }

    if (zeek.service) {
      target.network.application = zeek.service.toLowerCase();
    }

    if (zeek.duration) {
      target.network.duration = parseFloat(zeek.duration);
    }

    if (zeek.community_id) {
      target.network.community_id = zeek.community_id;
    }

    if (zeek.bytes && !target.network.bytes) {
      target.network.bytes = parseInt(zeek.bytes, 10);
    }

    if (source.sensor_id) {
      target.sensor.id = source.sensor_id;
    }

    if (source.host?.hostname) {
      target.sensor.hostname = source.host.hostname;
    }

    if (source.zeek_log_type === 'dns') {
      this.mapZeekDnsFields(target, zeek);
    }
  }

  mapZeekDnsFields(target, zeek) {
    target.network.protocol = 'dns';
    target.dns.question = target.dns.question || {};
    if (zeek.query) {
      target.dns.question.name = zeek.query;
    }
    if (zeek.qtype_name) {
      target.dns.question.type = zeek.qtype_name;
    }
    if (zeek.rcode_name) {
      target.dns.response_code = zeek.rcode_name;
    }
    if (zeek.answers) {
      target.dns.answers = Array.isArray(zeek.answers) ? zeek.answers : [zeek.answers];
    }
  }

  applySuricataMappings(source, target) {
    if (!source.suricata) {
      return;
    }

    const eve = source.suricata;
    target.suricata = { ...target.suricata, ...eve };

    if (!target.source.ip && eve.src_ip) {
      target.source.ip = eve.src_ip;
    }
    if (!target.source.port && eve.src_port) {
      target.source.port = parseInt(eve.src_port, 10);
    }
    if (!target.destination.ip && eve.dest_ip) {
      target.destination.ip = eve.dest_ip;
    }
    if (!target.destination.port && eve.dest_port) {
      target.destination.port = parseInt(eve.dest_port, 10);
    }

    if (eve.proto) {
      target.network.transport = eve.proto.toLowerCase();
    }
    if (eve.app_proto) {
      target.network.application = eve.app_proto.toLowerCase();
    }
    if (eve.flow_id) {
      target.network.flow_id = eve.flow_id;
    }
    if (eve.community_id) {
      target.network.community_id = eve.community_id;
    }

    if (eve.flow) {
      if (eve.flow.bytes_toclient && eve.flow.bytes_toserver) {
        target.network.bytes = (parseInt(eve.flow.bytes_toclient, 10) || 0) + (parseInt(eve.flow.bytes_toserver, 10) || 0);
      }
      if (eve.flow.pkts_toclient && eve.flow.pkts_toserver) {
        target.network.packets = (parseInt(eve.flow.pkts_toclient, 10) || 0) + (parseInt(eve.flow.pkts_toserver, 10) || 0);
      }
      if (eve.flow.state) {
        target.network.state = eve.flow.state.toLowerCase();
      }
    }

    if (source.suricata_event_type === 'alert' && eve.alert) {
      target.rule = target.rule || {};
      target.rule.name = eve.alert.signature;
      target.rule.id = String(eve.alert.signature_id || eve.alert.sid || '');
      target.rule.category = eve.alert.category;
      target.event.kind = 'signal';
      target.event.provider = 'suricata';
      target.event.action = 'alert';
      target.event.severity = eve.alert.severity || target.event.severity;
    }

    if (source.suricata_event_type === 'dns' && eve.dns) {
      this.mapSuricataDnsFields(target, eve.dns);
    }
  }

  mapSuricataDnsFields(target, dns) {
    target.network.protocol = 'dns';
    target.dns.question = target.dns.question || {};
    if (dns.rrname) {
      target.dns.question.name = dns.rrname;
    }
    if (dns.rrtype) {
      target.dns.question.type = dns.rrtype;
    }
    if (dns.rcode) {
      target.dns.response_code = dns.rcode;
    }
    if (dns.answers) {
      target.dns.answers = Array.isArray(dns.answers) ? dns.answers.map(a => a.rrdata || a) : [dns.answers];
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

  getZeekEventMetadata(logType = '') {
    const type = logType.toLowerCase();
    const mapping = {
      conn: { type: 'connection', category: 'network' },
      dns: { type: 'dns', category: 'network' },
      http: { type: 'http', category: 'network' },
      ssl: { type: 'network', category: 'network' },
      ssh: { type: 'network', category: 'network' },
      ftp: { type: 'network', category: 'network' },
      smtp: { type: 'network', category: 'network' },
      smb: { type: 'network', category: 'network' },
      rdp: { type: 'network', category: 'network' },
      files: { type: 'file', category: 'file' }
    };

    return mapping[type] || { type: 'network', category: 'network' };
  }

  getSuricataEventMetadata(eventType = '') {
    const type = eventType.toLowerCase();
    const mapping = {
      alert: { type: 'signal', category: 'network', action: 'alert', kind: 'signal' },
      dns: { type: 'dns', category: 'network' },
      http: { type: 'http', category: 'network' },
      tls: { type: 'network', category: 'network' },
      flow: { type: 'connection', category: 'network' }
    };

    return mapping[type] || { type: 'network', category: 'network' };
  }
}

module.exports = { LogNormalizer };
