/**
 * Open NDR API Client
 * Centralized API communication for all backend services
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';
const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8087';
const ASSET_SERVICE_URL = import.meta.env.VITE_ASSET_URL || 'http://localhost:8088';
const SOAR_SERVICE_URL = import.meta.env.VITE_SOAR_URL || 'http://localhost:8089';

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', endpoint, error);
      throw error;
    }
  }

  // Dashboard & Analytics
  async getDashboardStats() {
    return this.request('/analytics/dashboard');
  }

  async getTrafficStats(timeRange = '24h') {
    return this.request(`/stats/traffic?range=${timeRange}`);
  }

  async getProtocolStats() {
    return this.request('/stats/protocols');
  }

  // Alerts
  async getAlerts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/alerts?${query}`);
  }

  async getAlertById(alertId) {
    return this.request(`/alerts/${alertId}`);
  }

  async getCorrelatedAlerts(alertId) {
    return this.request(`/alerts/${alertId}/chain`);
  }

  async updateAlertStatus(alertId, status) {
    return this.request(`/alerts/${alertId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async addAlertNote(alertId, note) {
    return this.request(`/alerts/${alertId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
  }

  // Events
  async searchEvents(query) {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(query)
    });
  }

  // Assets
  async getAssets(params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${ASSET_SERVICE_URL}/assets?${query}`);
    return response.json();
  }

  async getAssetStats() {
    const response = await fetch(`${ASSET_SERVICE_URL}/assets/stats`);
    return response.json();
  }

  async getAssetById(assetId) {
    const response = await fetch(`${ASSET_SERVICE_URL}/assets/${assetId}`);
    return response.json();
  }

  // Detection Rules
  async getDetectionRules() {
    return this.request('/rules');
  }

  async getDetectionStats() {
    return this.request('/detections/stats');
  }

  // SOAR
  async getPlaybooks() {
    const response = await fetch(`${SOAR_SERVICE_URL}/playbooks`);
    return response.json();
  }

  async executePlaybook(playbookId, context) {
    const response = await fetch(`${SOAR_SERVICE_URL}/playbooks/${playbookId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context)
    });
    return response.json();
  }

  async getExecutions(params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${SOAR_SERVICE_URL}/executions?${query}`);
    return response.json();
  }

  // Authentication
  async login(email, password) {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  }

  async getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await fetch(`${AUTH_SERVICE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
}

export const api = new APIClient();
export default api;
