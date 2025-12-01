/**
 * Open NDR API Client
 * Centralized API communication for all backend services
 */
import { retryFetch } from './retry.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';
const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8087';
const ASSET_SERVICE_URL = import.meta.env.VITE_ASSET_URL || 'http://localhost:8088';
const SOAR_SERVICE_URL = import.meta.env.VITE_SOAR_URL || 'http://localhost:8089';

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.retryConfig = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 5000,
      backoffFactor: 2
    };
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

    // Use retry logic for all requests
    try {
      return await retryFetch(async () => {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          ...options,
          headers
        });

        if (!response.ok) {
          const error = new Error(`API Error: ${response.status}`);
          error.status = response.status;
          throw error;
        }

        return await response.json();
      }, this.retryConfig);
    } catch (error) {
      console.error('API Request failed after retries:', endpoint, error);
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

  async getSavedSearches() {
    return this.request('/searches');
  }

  async saveSearch(search) {
    return this.request('/searches', {
      method: 'POST',
      body: JSON.stringify(search)
    });
  }

  async deleteSavedSearch(id) {
    return this.request(`/searches/${id}`, {
      method: 'DELETE'
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

  // Suricata Rules
  async getSuricataRules() {
    return this.request('/rules/suricata');
  }

  async updateSuricataRules(rules) {
    return this.request('/rules/suricata', {
      method: 'POST',
      body: JSON.stringify({ rules })
    });
  }

  // PCAP
  async getPcapFiles() {
    return this.request('/pcap?start=now&end=now'); // Dummy query to trigger list
  }

  async downloadPcap(filename) {
    // Return the direct URL for the browser to handle download
    return `${this.baseUrl}/pcap/download/${filename}`;
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

  // Sensors
  async getSensors(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/sensors?${query}`);
  }

  async getSensorById(sensorId) {
    return this.request(`/sensors/${sensorId}`);
  }

  async getSensorPcap(sensorId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/sensors/${sensorId}/pcap?${query}`);
  }

  async getSensorCertificates(sensorId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/sensors/${sensorId}/certificates?${query}`);
  }

  // Alert Statistics
  async getAlertStats() {
    return this.request('/alerts/stats/summary');
  }

  // Threat Intelligence (currently mock, can be extended)
  async getThreatStats() {
    return this.request('/threat/stats').catch(() => ({
      total_iocs: 0,
      active_campaigns: 0,
      threat_actors: 0
    }));
  }

  // DNS Intelligence
  async getDNSStats(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/dns/stats?${query}`).catch(() => ({
      total_queries: 0,
      suspicious_domains: 0,
      top_domains: []
    }));
  }

  // SSL/TLS Analysis
  async getSSLStats(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/ssl/stats?${query}`).catch(() => ({
      total_certificates: 0,
      expiring_soon: 0,
      weak_ciphers: 0
    }));
  }

  // File Analysis
  async getFileStats(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/files/stats?${query}`).catch(() => ({
      total_files: 0,
      malicious: 0,
      suspicious: 0
    }));
  }

  // SOC Dashboard
  async getSocMetrics(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/soc/metrics?${query}`).catch(() => null);
  }

  // AI Analysis
  async triageAlert(alertId, alertData) {
    return this.request('/ai/triage', {
      method: 'POST',
      body: JSON.stringify({ alertId, alertData })
    });
  }

  async chatWithAI(message, context) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context })
    });
  }

  async generateReport(incidentId, data) {
    return this.request('/ai/report', {
      method: 'POST',
      body: JSON.stringify({ incidentId, data })
    });
  }

  // Generic request with fallback
  async requestWithFallback(endpoint, options = {}, fallbackData = null) {
    try {
      return await this.request(endpoint, options);
    } catch (error) {
      console.warn(`API request failed for ${endpoint}, using fallback data`, error);
      return fallbackData;
    }
  }
}

export const api = new APIClient();
export default api;
