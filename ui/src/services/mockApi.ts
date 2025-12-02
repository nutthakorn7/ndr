import { generateTopologyData } from '../utils/mockTopology';
import { mockIncidents, Incident } from '../utils/mockIncidents';

// Mock Service for features not yet implemented in backend
class MockApiService {
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
}

export const mockApi = new MockApiService();
