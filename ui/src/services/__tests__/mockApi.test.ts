import { describe, it, expect } from 'vitest';
import { mockApi } from '../mockApi';

describe('MockApiService', () => {
  it('generates topology data correctly', async () => {
    const data = await mockApi.getTopologyData();
    expect(data).toHaveProperty('nodes');
    expect(data).toHaveProperty('links');
    expect(data.nodes.length).toBeGreaterThan(0);
    expect(data.links.length).toBeGreaterThan(0);
  });

  it('provides chat responses based on keywords', async () => {
    // Test Alert keyword
    const alertResponse = await mockApi.chatWithAI('Show me critical alerts', {});
    expect(alertResponse.response).toContain('critical alerts');

    // Test Traffic keyword
    const trafficResponse = await mockApi.chatWithAI('How is the traffic?', {});
    expect(trafficResponse.response).toContain('Network traffic');

    // Test IP keyword
    const ipResponse = await mockApi.chatWithAI('Check IP 192.168.1.105', {});
    expect(ipResponse.response).toContain('192.168.1.105');
    
    // Test Default response
    const defaultResponse = await mockApi.chatWithAI('Hello there', {});
    expect(defaultResponse.response).toContain('monitoring the network');
  });

  it('returns analytics data structure', async () => {
    const traffic = await mockApi.getTrafficStats('24h');
    expect(Array.isArray(traffic)).toBe(true);
    expect(traffic[0]).toHaveProperty('time');
    expect(traffic[0]).toHaveProperty('inbound');
    expect(traffic[0]).toHaveProperty('outbound');
  });
});
