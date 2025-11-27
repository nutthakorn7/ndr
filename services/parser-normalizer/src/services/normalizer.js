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

      if (normalizedLog.tls?.fingerprint || normalizedLog.ssh?.fingerprint) {
        logger.info('Normalized encrypted traffic fingerprint:', { 
          tls: normalizedLog.tls?.fingerprint, 
          ssh: normalizedLog.ssh?.fingerprint 
        });
      }

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

    logger.info('Processing Zeek log:', { type: source.zeek_log_type, zeek_data: zeek });

    if (source.zeek_log_type === 'dns') {
      this.mapZeekDnsFields(target, zeek);
    } else if (source.zeek_log_type === 'kerberos') {
      this.mapZeekKerberosFields(target, zeek);
    } else if (source.zeek_log_type === 'ntlm') {
      this.mapZeekNTLMFields(target, zeek);
    } else if (source.zeek_log_type === 'smb_files') {
      this.mapZeekSMBFilesFields(target, zeek);
    } else if (['modbus', 'dnp3', 's7comm'].includes(source.zeek_log_type)) {
      this.mapZeekOTProtocol(target, zeek, source.zeek_log_type);
    } else if (source.zeek_log_type === 'ssl') {
      this.mapZeekSslFields(target, zeek);
    } else if (source.zeek_log_type === 'ssh') {
      this.mapZeekSshFields(target, zeek);
    }
  }

  mapZeekSslFields(target, zeek) {
    target.tls = target.tls || {}target.tls.fingerprint = target.tls.fingerprint || {};
    
    if (zeek.ja3) target.tls.fingerprint.ja3 = zeek.ja3;
    if (zeek.ja3s) target.tls.fingerprint.ja3s = zeek.ja3s;
    if (zeek.version) target.tls.version = zeek.version;
    if (zeek.cipher) target.tls.cipher = zeek.cipher;
    if (zeek.server_name) target.tls.server_name = zeek.server_name;
    
    // SSL Certificate Validation
    if (zeek.cert_chain || zeek.issuer || zeek.subject) {
      target.tls.certificate_issues = this.validateSSLCertificate(zeek);
      
      // Store certificate details
      target.tls.certificate = {
        issuer: zeek.issuer,
        subject: zeek.subject,
        not_valid_before: zeek.not_valid_before,
        not_valid_after: zeek.not_valid_after,
        signature_algorithm: zeek.sig_alg
      };
    }
  }
  
  validateSSLCertificate(zeek) {
    const issues = [];
    
    // Check for self-signed certificate
    if (zeek.issuer && zeek.subject && zeek.issuer === zeek.subject) {
      issues.push('self_signed');
    }
    
    // Check for expired certificate
    if (zeek.not_valid_after) {
      const notAfter = new Date(zeek.not_valid_after);
      if (notAfter < new Date()) {
        issues.push('expired');
      }
      
      // Check for not-yet-valid certificate
      if (zeek.not_valid_before) {
        const notBefore = new Date(zeek.not_valid_before);
        if (notBefore > new Date()) {
          issues.push('not_yet_valid');
        }
      }
      
      // Check for short validity period (<90 days)
      if (zeek.not_valid_before) {
        const validityDays = (notAfter - new Date(zeek.not_valid_before)) / (1000 * 60 * 60 * 24);
        if (validityDays < 90) {
          issues.push('short_validity');
        }
      }
    }
    
    // Check for weak signature algorithm
    if (zeek.sig_alg) {
      const weakAlgorithms = ['md5', 'sha1', 'md2'];
      if (weakAlgorithms.some(alg => zeek.sig_alg.toLowerCase().includes(alg))) {
        issues.push('weak_signature');
      }
    }
    
    // Check for certificate common name mismatch with SNI
    if (zeek.server_name && zeek.subject) {
      // Extract CN from subject
      const cnMatch = zeek.subject.match(/CN=([^,]+)/);
      if (cnMatch && cnMatch[1] !== zeek.server_name) {
        // Allow wildcard certificates
        const cn = cnMatch[1].replace(/^\*\./, '');
        const sni = zeek.server_name.replace(/^[^.]+\./, '');
        if (cn !== sni && cn !== zeek.server_name) {
          issues.push('cn_mismatch');
        }
      }
    }
    
    return issues.length > 0 ? issues : undefined;
  }

  mapZeekSshFields(target, zeek) {
    target.ssh = target.ssh || {};
    target.ssh.fingerprint = target.ssh.fingerprint || {};
    
    if (zeek.hassh) target.ssh.fingerprint.hassh = zeek.hassh;
    if (zeek.hasshServer) target.ssh.fingerprint.hassh_server = zeek.hasshServer;
    if (zeek.client) target.ssh.client = zeek.client;
    if (zeek.server) target.ssh.server = zeek.server;
    if (zeek.auth_success) target.event.outcome = zeek.auth_success ? 'success' : 'failure';
  }

  mapZeekKerberosFields(target, zeek) {
    target.zeek.kerberos = target.zeek.kerberos || {};
    
    if (zeek.request_type) target.zeek.request_type = zeek.request_type;
    if (zeek.client) target.zeek.kerberos.client = zeek.client;
    if (zeek.service) target.zeek.kerberos.service = zeek.service;
    if (zeek.success !== undefined) target.zeek.success = zeek.success;
    if (zeek.error_msg) target.zeek.kerberos.error_msg = zeek.error_msg;
    
    // Ticket information for Golden/Silver ticket detection
    if (zeek.ticket) {
      target.zeek.ticket = target.zeek.ticket || {};
      if (zeek.ticket.lifetime) target.zeek.ticket.lifetime = zeek.ticket.lifetime;
      if (zeek.ticket.enc_type) target.zeek.ticket.enc_type = zeek.ticket.enc_type;
    }
    
    target.network.protocol = 'kerberos';
  }

  mapZeekNTLMFields(target, zeek) {
    target.zeek.ntlm = target.zeek.ntlm || {};
    
    if (zeek.username) target.zeek.ntlm.username = zeek.username;
    if (zeek.hostname) target.zeek.ntlm.hostname = zeek.hostname;
    if (zeek.domain) target.zeek.ntlm.domain = zeek.domain;
    if (zeek.server_nb_computer_name) target.zeek.server_nb_computer_name = zeek.server_nb_computer_name;
    if (zeek.client_nb_computer_name) target.zeek.client_nb_computer_name = zeek.client_nb_computer_name;
    if (zeek.success !== undefined) target.zeek.success = zeek.success;
    
    // Set user info
    if (zeek.username) {
      target.user.name = zeek.username;
      if (zeek.domain) {
        target.user.domain = zeek.domain;
      }
    }
    
    target.network.protocol = 'ntlm';
    target.event.outcome = zeek.success ? 'success' : 'failure';
  }

  mapZeekSMBFilesFields(target, zeek) {
    target.zeek.smb_files = target.zeek.smb_files || {};
    
    if (zeek.path) target.zeek.path = zeek.path;
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
    } else if (source.suricata_event_type === 'tls' && eve.tls) {
      this.mapSuricataTlsFields(target, eve.tls);
    } else if (source.suricata_event_type === 'ssh' && eve.ssh) {
      this.mapSuricataSshFields(target, eve.ssh);
    }
  }

  mapSuricataTlsFields(target, tls) {
    target.tls = target.tls || {};
    target.tls.fingerprint = target.tls.fingerprint || {};
    
    if (tls.ja3) target.tls.fingerprint.ja3 = tls.ja3;
    if (tls.ja3s) target.tls.fingerprint.ja3s = tls.ja3s;
    if (tls.version) target.tls.version = tls.version;
    if (tls.sni) target.tls.server_name = tls.sni;
  }

  mapSuricataSshFields(target, ssh) {
    target.ssh = target.ssh || {};
    target.ssh.fingerprint = target.ssh.fingerprint || {};
    
    // Suricata EVE might have 'hassh' in metadata or specific fields depending on config
    if (ssh.hassh) target.ssh.fingerprint.hassh = ssh.hassh;
    if (ssh.hassh_server) target.ssh.fingerprint.hassh_server = ssh.hassh_server;
    if (ssh.client_proto_version) target.ssh.client = ssh.client_proto_version;
    if (ssh.server_proto_version) target.ssh.server = ssh.server_proto_version;
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
