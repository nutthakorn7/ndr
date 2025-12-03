/**
 * Open NDR API Client
 * Centralized API communication for all backend services
 */
import { retryFetch } from './retry';
import { 
  type DashboardAnalytics, 
  type Alert, 
  type ThreatEvent, 
  type Sensor,
  type TrafficStatSchema,
  type ProtocolStatSchema,
  type AiChatResponseSchema,
  type SavedSearch,
  type Asset,
  type DetectionRule,
  type SuricataRule,
  type PcapFile,
  type Playbook,
  type PlaybookExecution,
  type User,
  type LoginResponse,
  type AlertStats,
  type ThreatStats,
  type DNSStats,
  type SSLStats,
  type FileStats,
  type SocMetrics,
  type AssetStats,
  type DetectionStats,
  type Certificate
} from '../schemas';
import { z } from 'zod';

// Infer types from schemas if not exported explicitly
type TrafficStat = z.infer<typeof TrafficStatSchema>;
type ProtocolStat = z.infer<typeof ProtocolStatSchema>;
type AiChatResponse = z.infer<typeof AiChatResponseSchema>;

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

  async request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
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
  async getDashboardStats(): Promise<DashboardAnalytics> {
    return this.request<DashboardAnalytics>('/analytics/dashboard');
  }

  async getTrafficStats(timeRange: string = '24h'): Promise<TrafficStat[]> {
    return this.request<TrafficStat[]>(`/stats/traffic?range=${timeRange}`);
  }

  async getProtocolStats(): Promise<ProtocolStat[]> {
    return this.request<ProtocolStat[]>('/stats/protocols');
  }

  // Alerts
  async getAlerts(params: Record<string, string | number | boolean> = {}): Promise<{ alerts: Alert[] }> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request<{ alerts: Alert[] }>(`/alerts?${query}`);
  }

  async getAlertById(alertId: string): Promise<Alert> {
    return this.request<Alert>(`/alerts/${alertId}`);
  }

  async getCorrelatedAlerts(alertId: string): Promise<Alert[]> {
    return this.request<Alert[]>(`/alerts/${alertId}/chain`);
  }

  async updateAlertStatus(alertId: string, status: string): Promise<Alert> {
    return this.request<Alert>(`/alerts/${alertId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async addAlertNote(alertId: string, note: string): Promise<void> {
    return this.request<void>(`/alerts/${alertId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
  }

  // Events
  async searchEvents(query: Record<string, unknown>): Promise<{ events: ThreatEvent[], total: number }> {
    return this.request<{ events: ThreatEvent[], total: number }>('/events', {
      method: 'POST',
      body: JSON.stringify(query)
    });
  }

  async getSavedSearches(): Promise<SavedSearch[]> {
    return this.request<SavedSearch[]>('/searches');
  }

  async saveSearch(search: Partial<SavedSearch>): Promise<SavedSearch> {
    return this.request<SavedSearch>('/searches', {
      method: 'POST',
      body: JSON.stringify(search)
    });
  }

  async deleteSavedSearch(id: string): Promise<void> {
    return this.request<void>(`/searches/${id}`, {
      method: 'DELETE'
    });
  }

  // Assets
  async getAssets(params: Record<string, string> = {}): Promise<{ assets: Asset[], total: number }> {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${ASSET_SERVICE_URL}/assets?${query}`);
    return response.json();
  }

  async getAssetStats(): Promise<AssetStats> {
    const response = await fetch(`${ASSET_SERVICE_URL}/assets/stats`);
    return response.json();
  }

  async getAssetById(assetId: string): Promise<Asset> {
    const response = await fetch(`${ASSET_SERVICE_URL}/assets/${assetId}`);
    return response.json();
  }

  // Detection Rules
  async getDetectionRules(): Promise<DetectionRule[]> {
    return this.request<DetectionRule[]>('/rules');
  }

  async getDetectionStats(): Promise<DetectionStats> {
    return this.request<DetectionStats>('/detections/stats');
  }

  // Suricata Rules
  async getSuricataRules(): Promise<SuricataRule[]> {
    return this.request<SuricataRule[]>('/rules/suricata');
  }

  async updateSuricataRules(rules: SuricataRule[]): Promise<void> {
    return this.request<void>('/rules/suricata', {
      method: 'POST',
      body: JSON.stringify({ rules })
    });
  }

  // PCAP
  async getPcapFiles(): Promise<PcapFile[]> {
    return this.request<PcapFile[]>('/pcap?start=now&end=now'); // Dummy query to trigger list
  }

  async downloadPcap(filename: string): Promise<string> {
    // Return the direct URL for the browser to handle download
    return `${this.baseURL}/pcap/download/${filename}`;
  }

  // SOAR
  async getPlaybooks(): Promise<Playbook[]> {
    const response = await fetch(`${SOAR_SERVICE_URL}/playbooks`);
    return response.json();
  }

  async executePlaybook(playbookId: string, context: Record<string, unknown>): Promise<PlaybookExecution> {
    const response = await fetch(`${SOAR_SERVICE_URL}/playbooks/${playbookId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context)
    });
    return response.json();
  }

  async getExecutions(params: Record<string, string> = {}): Promise<PlaybookExecution[]> {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${SOAR_SERVICE_URL}/executions?${query}`);
    return response.json();
  }

  // Authentication
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  }

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await fetch(`${AUTH_SERVICE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  // Sensors
  async getSensors(params: Record<string, string> = {}): Promise<Sensor[]> {
    const query = new URLSearchParams(params).toString();
    return this.request<Sensor[]>(`/sensors?${query}`);
  }

  async getSensorById(sensorId: string): Promise<Sensor> {
    return this.request<Sensor>(`/sensors/${sensorId}`);
  }

  async getSensorPcap(sensorId: string, params: Record<string, string> = {}): Promise<PcapFile[]> {
    const query = new URLSearchParams(params).toString();
    return this.request<PcapFile[]>(`/sensors/${sensorId}/pcap?${query}`);
  }

  async getSensorCertificates(sensorId: string, params: Record<string, string> = {}): Promise<Certificate[]> {
    const query = new URLSearchParams(params).toString();
    return this.request<Certificate[]>(`/sensors/${sensorId}/certificates?${query}`);
  }

  // Alert Statistics
  async getAlertStats(): Promise<AlertStats> {
    return this.request<AlertStats>('/alerts/stats/summary');
  }

  // Threat Intelligence (currently mock, can be extended)
  async getThreatStats(): Promise<ThreatStats> {
    return this.request<ThreatStats>('/threat/stats').catch(() => ({
      total_iocs: 0,
      active_campaigns: 0,
      threat_actors: 0
    }));
  }

  // DNS Intelligence
  async getDNSStats(params: Record<string, string> = {}): Promise<DNSStats> {
    const query = new URLSearchParams(params).toString();
    return this.request<DNSStats>(`/dns/stats?${query}`).catch(() => ({
      total_queries: 0,
      suspicious_domains: 0,
      top_domains: []
    }));
  }

  // SSL/TLS Analysis
  async getSSLStats(params: Record<string, string> = {}): Promise<SSLStats> {
    const query = new URLSearchParams(params).toString();
    return this.request<SSLStats>(`/ssl/stats?${query}`).catch(() => ({
      total_certificates: 0,
      expiring_soon: 0,
      weak_ciphers: 0
    }));
  }

  // File Analysis
  async getFileStats(params: Record<string, string> = {}): Promise<FileStats> {
    const query = new URLSearchParams(params).toString();
    return this.request<FileStats>(`/files/stats?${query}`).catch(() => ({
      total_files: 0,
      malicious: 0,
      suspicious: 0
    }));
  }

  // SOC Dashboard
  async getSocMetrics(params: Record<string, string> = {}): Promise<SocMetrics | null> {
    const query = new URLSearchParams(params).toString();
    return this.request<SocMetrics>(`/soc/metrics?${query}`).catch(() => null);
  }

  // AI Analysis
  async triageAlert(alertId: string, alertData: Record<string, unknown>): Promise<AiChatResponse> {
    return this.request<AiChatResponse>('/ai/triage', {
      method: 'POST',
      body: JSON.stringify({ alertId, alertData })
    });
  }

  async chatWithAI(message: string, context: Record<string, unknown>): Promise<AiChatResponse> {
    return this.request<AiChatResponse>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context })
    });
  }

  async generateReport(incidentId: string, data: Record<string, unknown>): Promise<any> {
    return this.request('/ai/report', {
      method: 'POST',
      body: JSON.stringify({ incidentId, data })
    });
  }

  // Generic request with fallback
  async requestWithFallback<T = unknown>(endpoint: string, options: RequestOptions = {}, fallbackData: T | null = null): Promise<T | null> {
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
