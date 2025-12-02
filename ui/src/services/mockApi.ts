import { generateTopologyData } from '../utils/mockTopology';
import { mockIncidents, Incident } from '../utils/mockIncidents';

// Mock Service for features not yet implemented in backend
class MockApiService {
  // Dashboard Summary
  async getDashboardAnalytics() {
    await new Promise(resolve => setTimeout(resolve, 400));
    return {
      summary: {
        total_events: 12450,
        critical_alerts: 5,
        open_alerts: 12,
        assets_count: 48
      }
    };
  }

  // Topology
  async getTopologyData() {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return generateTopologyData();
  }

  // Incidents
  async getIncidents(): Promise<Incident[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockIncidents;
  }

  async createIncident(incident: Partial<Incident>): Promise<Incident> {
    await new Promise(resolve => setTimeout(resolve, 600));
    const newIncident: Incident = {
      id: `INC-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
      title: incident.title || 'New Incident',
      severity: incident.severity || 'Medium',
      status: 'New',
      assignee: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: incident.description || '',
      affected_assets: incident.affected_assets || [],
      related_alerts: 0,
      tags: [],
      timeline: [
        {
          id: `t-${Date.now()}`,
          type: 'status_change',
          user: 'System',
          timestamp: new Date().toISOString(),
          content: 'Incident created'
        }
      ]
    } as Incident;
    
    return newIncident;
  }

  async updateIncidentStatus(id: string, status: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`Updated incident ${id} to ${status}`);
  }

  // Analytics
  async getTrafficStats(timeRange: string) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const data = [];
    const now = new Date();
    const points = timeRange === '1h' ? 12 : 24;
    
    for (let i = points; i >= 0; i--) {
      data.push({
        time: new Date(now.getTime() - i * (timeRange === '1h' ? 300000 : 3600000)).getHours() + ':00',
        inbound: Math.floor(Math.random() * 500) + 200,
        outbound: Math.floor(Math.random() * 300) + 100,
      });
    }
    return data;
  }

  async getProtocolStats() {
    await new Promise(resolve => setTimeout(resolve, 400));
    return [
      { name: 'HTTPS', value: 45 },
      { name: 'DNS', value: 15 },
      { name: 'HTTP', value: 12 },
      { name: 'SSH', value: 8 },
      { name: 'SMB', value: 5 },
      { name: 'Other', value: 15 },
    ];
  }

  async getTopTalkers() {
    await new Promise(resolve => setTimeout(resolve, 600));
    return [
      { ip: '192.168.1.105', bytes: '4.2 GB', flows: 12450, risk: 'High' },
      { ip: '192.168.1.200', bytes: '2.1 GB', flows: 8540, risk: 'Medium' },
      { ip: '192.168.1.15', bytes: '1.8 GB', flows: 6200, risk: 'Low' },
      { ip: '10.0.0.5', bytes: '950 MB', flows: 4100, risk: 'Low' },
      { ip: '172.16.0.25', bytes: '500 MB', flows: 1200, risk: 'Critical' },
    ];
  }

  // AI Chat
  async chatWithAI(message: string, context: any) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('alert') || lowerMsg.includes('critical')) {
      return {
        response: "I found 5 critical alerts in the last hour. The most concerning is a potential C2 communication from 192.168.1.112. Would you like me to create an incident for this?"
      };
    }
    
    if (lowerMsg.includes('traffic') || lowerMsg.includes('bandwidth')) {
      return {
        response: "Network traffic is currently stable at 1.2 Gbps. However, I noticed a 15% spike in outbound traffic from the DMZ subnet 20 minutes ago."
      };
    }

    if (lowerMsg.includes('ip') || lowerMsg.includes('192.168')) {
      return {
        response: "That IP address (192.168.1.105) has been flagged for suspicious PowerShell activity. It has communicated with 3 external malicious IPs in the last 24 hours."
      };
    }

    return {
      response: "I'm monitoring the network. Everything looks nominal right now. You can ask me about specific alerts, IPs, or traffic trends."
    };
  }
}

export const mockApi = new MockApiService();
