/**
 * Mock Network Topology Data Generator
 * Generates a realistic network graph with subnets, devices, and traffic
 */

export interface TopologyNode {
  id: string;
  ip: string;
  name: string;
  type: 'router' | 'firewall' | 'server' | 'endpoint' | 'internet';
  group: 'internet' | 'dmz' | 'lan' | 'servers';
  status: 'safe' | 'suspicious' | 'compromised';
  val: number; // Size of node
  details?: {
    os: string;
    mac: string;
    openPorts: number[];
    lastSeen: string;
  };
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface TopologyLink {
  source: string;
  target: string;
  type: 'wired' | 'wireless' | 'vpn';
  bandwidth: number; // Mbps
  active: boolean;
  protocol: string;
}

export interface TopologyData {
  nodes: TopologyNode[];
  links: TopologyLink[];
}

const generateIP = (subnet: string) => {
  return `${subnet}.${Math.floor(Math.random() * 254) + 1}`;
};

const generateMAC = () => {
  return "XX:XX:XX:XX:XX:XX".replace(/X/g, () => {
    return "0123456789ABCDEF".charAt(Math.floor(Math.random() * 16));
  });
};

export const generateTopologyData = (): TopologyData => {
  const nodes: TopologyNode[] = [];
  const links: TopologyLink[] = [];

  // 1. Internet Node
  nodes.push({
    id: 'internet',
    ip: '8.8.8.8',
    name: 'Internet',
    type: 'internet',
    group: 'internet',
    status: 'safe',
    val: 20,
    details: { os: 'N/A', mac: 'N/A', openPorts: [], lastSeen: 'Now' }
  });

  // 2. Core Firewall/Gateway
  nodes.push({
    id: 'firewall-core',
    ip: '10.0.0.1',
    name: 'Core Firewall',
    type: 'firewall',
    group: 'dmz',
    status: 'safe',
    val: 15,
    details: { os: 'Palo Alto PAN-OS', mac: generateMAC(), openPorts: [443, 22], lastSeen: 'Now' }
  });

  links.push({ source: 'internet', target: 'firewall-core', type: 'wired', bandwidth: 1000, active: true, protocol: 'HTTPS' });

  // 3. DMZ Subnet (Public Servers)
  const dmzServers = [
    { id: 'web-server-01', name: 'Web Server', ip: '10.0.1.10' },
    { id: 'mail-server-01', name: 'Mail Gateway', ip: '10.0.1.20' },
    { id: 'vpn-gateway', name: 'VPN Concentrator', ip: '10.0.1.30' }
  ];

  dmzServers.forEach(server => {
    nodes.push({
      id: server.id,
      ip: server.ip,
      name: server.name,
      type: 'server',
      group: 'dmz',
      status: Math.random() > 0.9 ? 'suspicious' : 'safe',
      val: 10,
      details: { os: 'Ubuntu Linux 22.04', mac: generateMAC(), openPorts: [80, 443], lastSeen: 'Now' }
    });
    links.push({ source: 'firewall-core', target: server.id, type: 'wired', bandwidth: 1000, active: true, protocol: 'TCP' });
  });

  // 4. Internal Router
  nodes.push({
    id: 'router-internal',
    ip: '10.0.2.1',
    name: 'Internal Router',
    type: 'router',
    group: 'lan',
    status: 'safe',
    val: 12,
    details: { os: 'Cisco IOS', mac: generateMAC(), openPorts: [22], lastSeen: 'Now' }
  });

  links.push({ source: 'firewall-core', target: 'router-internal', type: 'wired', bandwidth: 1000, active: true, protocol: 'OSPF' });

  // 5. Server Farm (Database, App Servers)
  const internalServers = [
    { id: 'db-prod-01', name: 'Prod DB', ip: '10.0.3.10' },
    { id: 'app-prod-01', name: 'App Server 1', ip: '10.0.3.11' },
    { id: 'app-prod-02', name: 'App Server 2', ip: '10.0.3.12' },
    { id: 'ad-dc-01', name: 'Domain Controller', ip: '10.0.3.50' }
  ];

  internalServers.forEach(server => {
    nodes.push({
      id: server.id,
      ip: server.ip,
      name: server.name,
      type: 'server',
      group: 'servers',
      status: 'safe',
      val: 10,
      details: { os: 'Windows Server 2019', mac: generateMAC(), openPorts: [445, 3389], lastSeen: 'Now' }
    });
    links.push({ source: 'router-internal', target: server.id, type: 'wired', bandwidth: 1000, active: true, protocol: 'TCP' });
  });

  // Connect App Servers to DB
  links.push({ source: 'app-prod-01', target: 'db-prod-01', type: 'wired', bandwidth: 1000, active: true, protocol: 'SQL' });
  links.push({ source: 'app-prod-02', target: 'db-prod-01', type: 'wired', bandwidth: 1000, active: true, protocol: 'SQL' });

  // 6. User LAN (Endpoints)
  const endpoints = 15;
  for (let i = 1; i <= endpoints; i++) {
    const isCompromised = Math.random() > 0.95;
    const isSuspicious = !isCompromised && Math.random() > 0.9;
    
    const id = `pc-${i.toString().padStart(3, '0')}`;
    nodes.push({
      id,
      ip: generateIP('10.0.10'),
      name: `Workstation ${i}`,
      type: 'endpoint',
      group: 'lan',
      status: isCompromised ? 'compromised' : (isSuspicious ? 'suspicious' : 'safe'),
      val: 5,
      details: { os: 'Windows 11 Pro', mac: generateMAC(), openPorts: [135, 445], lastSeen: 'Now' }
    });
    
    links.push({ 
      source: 'router-internal', 
      target: id, 
      type: 'wired', 
      bandwidth: 100, 
      active: Math.random() > 0.3, 
      protocol: 'HTTPS' 
    });

    // Simulate some lateral movement or p2p traffic if compromised
    if (isCompromised) {
      const target = `pc-${Math.floor(Math.random() * endpoints + 1).toString().padStart(3, '0')}`;
      if (target !== id) {
        links.push({ source: id, target, type: 'wireless', bandwidth: 10, active: true, protocol: 'SMB' });
      }
    }
  }

  return { nodes, links };
};
