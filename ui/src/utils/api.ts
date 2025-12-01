/**
 * Open NDR API Client
 * Centralized API communication for all backend services
 */
import { retryFetch } from './retry';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';
const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8087';
const ASSET_SERVICE_URL = import.meta.env.VITE_ASSET_URL || 'http://localhost:8088';
const SOAR_SERVICE_URL = import.meta.env.VITE_SOAR_URL || 'http://localhost:8089';

interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

class APIClient {
  baseURL: string;
  retryConfig: RetryConfig;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.retryConfig = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 5000,
      backoffFactor: 2
    };
  }

  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
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
          const error = new Error(`API Error: ${response.status}`) as any;
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
  async getDashboardStats(): Promise<any> {
    return this.request('/analytics/dashboard');
  }

  async getTrafficStats(timeRange: string = '24h'): Promise<any> {
    return this.request(`/stats/traffic?range=${timeRange}`);
  }

  async getProtocolStats(): Promise<any> {
    return this.request('/stats/protocols');
  }

  // Alerts
  async getAlerts(params: Record<string, any> = {}): Promise<any> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/alerts?${query}`);
  }

  async getAlertById(alertId: string): Promise<any> {
    return this.request(`/alerts/${alertId}`);
  }

  async getCorrelatedAlerts(alertId: string): Promise<any> {
    return this.request(`/alerts/${alertId}/chain`);
  }

  async updateAlertStatus(alertId: string, status: string): Promise<any> {
    return this.request(`/alerts/${alertId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async addAlertNote(alertId: string, note: string): Promise<any> {
    return this.request(`/alerts/${alertId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
  }

  // Events
  async searchEvents(query: any): Promise<any> {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(query)
    });
  }

  async getSavedSearches(): Promise<any> {
    return this.request('/searches');
  }

  async saveSearch(search: any): Promise<any> {
    return this.request('/searches', {
      method: 'POST',
      body: JSON.stringify(search)
    });
  }

  async deleteSavedSearch(id: string): Promise<any> {
    return this.request(`/searches/${id}`, {
      method: 'DELETE'
    });
  }

  // Assets
  async getAssets(params: Record<string, any> = {}): Promise<any> {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${ASSET_SERVICE_URL}/assets?${query}`);
    return response.json();
  }

  async getAssetStats(): Promise<any> {
    const response = await fetch(`${ASSET_SERVICE_URL}/assets/stats`);
    return response.json();
  }

  async getAssetById(assetId: string): Promise<any> {
    const response = await fetch(`${ASSET_SERVICE_URL}/assets/${assetId}`);
    return response.json();
  }

  // Detection Rules
  async getDetectionRules(): Promise<any> {
    return this.request('/rules');
  }

  async getDetectionStats(): Promise<any> {
    return this.request('/detections/stats');
  }

  // Suricata Rules
  async getSuricataRules(): Promise<any> {
    return this.request('/rules/suricata');
  }

  async updateSuricataRules(rules: any): Promise<any> {
    return this.request('/rules/suricata', {
      method: 'POST',
      body: JSON.stringify({ rules })
    });
  }

  // PCAP
  async getPcapFiles(): Promise<any> {
    return this.request('/pcap?start=now&end=now'); // Dummy query to trigger list
  }

  async downloadPcap(filename: string): Promise<string> {
    // Return the direct URL for the browser to handle download
    return `${this.baseURL}/pcap/download/${filename}`;
  }

  // SOAR
  async getPlaybooks(): Promise<any> {
    const response = await fetch(`${SOAR_SERVICE_URL}/playbooks`);
    return response.json();
  }

  async executePlaybook(playbookId: string, context: any): Promise<any> {
    const response = await fetch(`${SOAR_SERVICE_URL}/playbooks/${playbookId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context)
    });
    return response.json();
  }

  async getExecutions(params: Record<string, any> = {}): Promise<any> {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${SOAR_SERVICE_URL}/executions?${query}`);
    return response.json();
  }

  // Authentication
  async login(email: string, password: string): Promise<any> {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  }

  async getCurrentUser(): Promise<any> {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await fetch(`${AUTH_SERVICE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  // Sensors
  async getSensors(params: Record<string, any> = {}): Promise<any> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/sensors?${query}`);
  }

  async getSensorById(sensorId: string): Promise<any> {
    return this.request(`/sensors/${sensorId}`);
  }

  async getSensorPcap(sensorId: string, params: Record<string, any> = {}): Promise<any> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/sensors/${sensorId}/pcap?${query}`);
  }

  async getSensorCertificates(sensorId: string, params: Record<string, any> = {}): Promise<any> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/sensors/${sensorId}/certificates?${query}`);
  }

  // Alert Statistics
  async getAlertStats(): Promise<any> {
    return this.request('/alerts/stats/summary');
  }

  // Threat Intelligence (currently mock, can be extended)
  async getThreatStats(): Promise<any> {
    return this.request('/threat/stats').catch(() => ({
      total_iocs: 0,
      active_campaigns: 0,
      threat_actors: 0
    }));
  }

  // DNS Intelligence
  async getDNSStats(params: Record<string, any> = {}): Promise<any> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/dns/stats?${query}`).catch(() => ({
      total_queries: 0,
      suspicious_domains: 0,
      top_domains: []
    }));
  }

  // SSL/TLS Analysis
  async getSSLStats(params: Record<string, any> = {}): Promise<any> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/ssl/stats?${query}`).catch(() => ({
      total_certificates: 0,
      expiring_soon: 0,
      weak_ciphers: 0
    }));
  }

  // File Analysis
  async getFileStats(params: Record<string, any> = {}): Promise<any> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/files/stats?${query}`).catch(() => ({
      total_files: 0,
      malicious: 0,
      suspicious: 0
    }));
  }

  // SOC Dashboard
  async getSocMetrics(params: Record<string, any> = {}): Promise<any> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/soc/metrics?${query}`).catch(() => null);
  }

  // AI Analysis
  async triageAlert(alertId: string, alertData: any): Promise<any> {
    return this.request('/ai/triage', {
      method: 'POST',
      body: JSON.stringify({ alertId, alertData })
    });
  }

  async chatWithAI(message: string, context: any): Promise<any> {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context })
    });
  }

  async generateReport(incidentId: string, data: any): Promise<any> {
    return this.request('/ai/report', {
      method: 'POST',
      body: JSON.stringify({ incidentId, data })
    });
  }

  // Generic request with fallback
  async requestWithFallback<T = any>(endpoint: string, options: RequestOptions = {}, fallbackData: T | null = null): Promise<T | null> {
    try {
      return await this.request<T>(endpoint, options);
    } catch (error) {
      console.warn(`API request failed for ${endpoint}, using fallback data`, error);
      return fallbackData;
    }
  }
}

export const api = new APIClient();
export default api;
