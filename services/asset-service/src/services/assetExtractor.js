const { logger } = require('../utils/logger');

class AssetExtractor {
  extractFromLog(log) {
    const assets = [];

    // Extract source asset
    if (log.source?.ip) {
      const sourceAsset = {
        ip_address: log.source.ip,
        mac_address: log.source.mac || null,
        hostname: null,
        os_type: null,
        device_type: this.inferDeviceType(log.source.port, log),
        criticality: this.inferCriticality(log.source.ip),
        tags: this.extractTags(log, 'source'),
        metadata: {
          ports_seen: log.source.port ? [log.source.port] : [],
          protocols_seen: log.network?.application ? [log.network.application] : [],
          last_event_type: log.event?.type
        }
      };
      assets.push(sourceAsset);
    }

    // Extract destination asset
    if (log.destination?.ip) {
      const destAsset = {
        ip_address: log.destination.ip,
        mac_address: log.destination.mac || null,
        hostname: null,
        os_type: null,
        device_type: this.inferDeviceType(log.destination.port, log),
        criticality: this.inferCriticality(log.destination.ip),
        tags: this.extractTags(log, 'destination'),
        metadata: {
          ports_seen: log.destination.port ? [log.destination.port] : [],
          protocols_seen: log.network?.application ? [log.network.application] : [],
          last_event_type: log.event?.type
        }
      };
      assets.push(destAsset);
    }

    // Extract hostname from DNS logs
    if (log.dns?.query) {
      const dnsAsset = assets.find(a => a.ip_address === log.destination?.ip);
      if (dnsAsset) {
        dnsAsset.hostname = log.dns.query;
      }
    }

    // Extract hostname from TLS SNI
    if (log.tls?.server_name) {
      const tlsAsset = assets.find(a => a.ip_address === log.destination?.ip);
      if (tlsAsset) {
        tlsAsset.hostname = log.tls.server_name;
      }
    }

    // Extract OS from user agent or other fingerprints
    if (log.http?.user_agent) {
      const ua = log.http.user_agent.toLowerCase();
      const sourceAsset = assets.find(a => a.ip_address === log.source?.ip);
      if (sourceAsset) {
        if (ua.includes('windows')) sourceAsset.os_type = 'Windows';
        else if (ua.includes('mac')) sourceAsset.os_type = 'macOS';
        else if (ua.includes('linux')) sourceAsset.os_type = 'Linux';
        else if (ua.includes('android')) sourceAsset.os_type = 'Android';
        else if (ua.includes('ios') || ua.includes('iphone')) sourceAsset.os_type = 'iOS';
      }
    }

    return assets;
  }

  inferDeviceType(port, log) {
    if (!port) return null;
    
    // Server ports
    const serverPorts = [80, 443, 22, 21, 25, 110, 143, 3306, 5432, 27017, 6379, 9200];
    if (serverPorts.includes(port)) {
      return 'server';
    }

    // Client ports (ephemeral)
    if (port > 49152) {
      return 'endpoint';
    }

    return null;
  }

  inferCriticality(ip) {
    // Simple heuristics - can be enhanced with ML or config
    if (ip.startsWith('10.0.0.') || ip.startsWith('172.16.')) {
      return 'high'; // Internal infrastructure
    }
    if (ip.startsWith('192.168.')) {
      return 'medium'; // Internal workstations
    }
    return 'unknown';
  }

  extractTags(log, direction) {
    const tags = [];
    
    if (log.event?.category) {
      tags.push(`traffic:${log.event.category}`);
    }

    if (log.network?.application) {
      tags.push(`protocol:${log.network.application}`);
    }

    if (log.event?.provider === 'zeek') {
      tags.push('source:zeek');
    } else if (log.event?.provider === 'suricata') {
      tags.push('source:suricata');
    }

    return tags;
  }
}

module.exports = { AssetExtractor };
