/**
 * Centralized Mock Data
 * Fallback data for when backend APIs are unavailable
 */

export const mockThreatFeeds = [
  { id: 1, name: 'AlienVault OTX', type: 'Community', status: 'active', iocs: 1250430, lastUpdate: '5m ago' },
  { id: 2, name: 'Abuse.ch URLhaus', type: 'Malware', status: 'active', iocs: 45200, lastUpdate: '12m ago' },
  { id: 3, name: 'Emerging Threats', type: 'IDS Rules', status: 'active', iocs: 8500, lastUpdate: '1h ago' },
  { id: 4, name: 'Custom Blacklist', type: 'Internal', status: 'active', iocs: 150, lastUpdate: '2d ago' },
  { id: 5, name: 'CISA Automated Indicator Sharing', type: 'Gov', status: 'error', iocs: 0, lastUpdate: 'Failed' },
];

export const mockThreatMatches = [
  { id: 1, ioc: '185.159.82.15', type: 'IP', source: 'AlienVault OTX', threat: 'Cobalt Strike C2', confidence: 95, asset: '192.168.1.105', time: '10m ago' },
  { id: 2, ioc: 'update-win32-sys.com', type: 'Domain', source: 'URLhaus', threat: 'Malware Download', confidence: 88, asset: '192.168.1.15', time: '45m ago' },
  { id: 3, ioc: '44d88612fea8a8f36de82e1278abb02f', type: 'Hash', source: 'VirusTotal', threat: 'Emotet Payload', confidence: 100, asset: '192.168.1.200', time: '2h ago' },
  { id: 4, ioc: '103.240.24.10', type: 'IP', source: 'Emerging Threats', threat: 'Scanner', confidence: 60, asset: 'Gateway', time: '3h ago' },
];

export const mockThreatStats = {
  totalIocs: 1304280,
  activeThreats: 12,
  blockedConnections: 1450,
  feedHealth: 80
};

export const mockDNSStats = {
  totalQueries: 452890,
  blockedQueries: 1245,
  dgaDomains: 12,
  tunnelingAlerts: 3
};

export const mockFileStats = {
  totalFiles: 15420,
  malicious: 23,
  suspicious: 145,
  pending: 5
};

// SOC Dashboard Mocks
export const mockSocAlertTrend = [
  { time: '00:00', critical: 2, high: 5, medium: 12 },
  { time: '04:00', critical: 1, high: 3, medium: 8 },
  { time: '08:00', critical: 5, high: 12, medium: 25 },
  { time: '12:00', critical: 8, high: 15, medium: 35 },
  { time: '16:00', critical: 6, high: 10, medium: 28 },
  { time: '20:00', critical: 3, high: 7, medium: 15 },
  { time: '23:59', critical: 4, high: 6, medium: 18 },
];

export const mockSocWorkload = [
  { name: 'Analyst A', active: 5, resolved: 12 },
  { name: 'Analyst B', active: 8, resolved: 8 },
  { name: 'Analyst C', active: 3, resolved: 15 },
  { name: 'Analyst D', active: 6, resolved: 10 },
];

export const mockSocSources = [
  { name: 'Firewall', value: 45 },
  { name: 'IDS/IPS', value: 25 },
  { name: 'Endpoint', value: 20 },
  { name: 'Email', value: 10 },
];

// DNS Intelligence Mocks
export const mockDNSQueries = [
  { id: 1, domain: 'x8374.bad-site.com', type: 'A', client: '192.168.1.105', status: 'blocked', category: 'Malware', time: '2s ago' },
  { id: 2, domain: 'google.com', type: 'A', client: '192.168.1.112', status: 'allowed', category: 'Search', time: '5s ago' },
  { id: 3, domain: 'a.root-servers.net', type: 'AAAA', client: '192.168.1.200', status: 'allowed', category: 'Infrastructure', time: '8s ago' },
  { id: 4, domain: 'uwq82.dga-gen.org', type: 'TXT', client: '192.168.1.15', status: 'flagged', category: 'DGA', time: '12s ago' },
  { id: 5, domain: 'api.slack.com', type: 'CNAME', client: '192.168.1.50', status: 'allowed', category: 'Business', time: '15s ago' },
];

export const mockDNSTunneling = [
  { id: 1, domain: 'tunnel.exfil.io', method: 'TXT Records', volume: '45 MB', client: '192.168.1.105', confidence: 98, time: '10m ago' },
  { id: 2, domain: 'c2.covert.net', method: 'Null/Private', volume: '12 KB', client: '192.168.1.15', confidence: 85, time: '1h ago' },
  { id: 3, domain: 'long-subdomain.bad.com', method: 'Long Labels', volume: '2 MB', client: '192.168.1.200', confidence: 70, time: '3h ago' },
];

export const mockDNSQueryTypes = [
  { name: 'A', count: 45000 },
  { name: 'AAAA', count: 12000 },
  { name: 'CNAME', count: 25000 },
  { name: 'TXT', count: 5000 },
  { name: 'MX', count: 2000 },
  { name: 'PTR', count: 8000 },
  { name: 'SRV', count: 1500 },
];

export const mockDNSVolume = [
  { time: '00:00', qps: 120 }, { time: '04:00', qps: 80 },
  { time: '08:00', qps: 450 }, { time: '12:00', qps: 600 },
  { time: '16:00', qps: 550 }, { time: '20:00', qps: 300 },
  { time: '24:00', qps: 150 },
];
