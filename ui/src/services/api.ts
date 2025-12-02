import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Define types matching backend responses
export interface DashboardAnalytics {
  summary: {
    total_events: number;
    open_alerts: number;
    critical_alerts: number;
    assets_count: number;
  };
  trends: {
    events_over_time: any[];
  };
  top_sources: any[];
}

export interface Alert {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: string;
  timestamp: string;
  description: string;
}

export interface ThreatEvent {
  id: number;
  timestamp: string;
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  source: string;
  destination: string;
  protocol?: string;
  description: string;
  details?: any;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  // Dashboard Analytics
  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    try {
      const response = await this.client.get<DashboardAnalytics>('/analytics/dashboard');
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch analytics, using fallback');
      throw error;
    }
  }

  // Alerts & Events
  async getAlerts(): Promise<Alert[]> {
    try {
      const response = await this.client.get<{ alerts: Alert[] }>('/alerts');
      return response.data.alerts;
    } catch (error) {
      console.warn('Failed to fetch alerts');
      throw error;
    }
  }

  async searchEvents(params: any): Promise<{ events: ThreatEvent[], total: number }> {
    try {
      const response = await this.client.post('/events', params);
      return response.data;
    } catch (error) {
      console.warn('Failed to search events');
      throw error;
    }
  }

  // Sensors
  async getSensors(): Promise<any> {
    const response = await this.client.get('/sensors');
    return response.data;
  }

  // AI Chat
  async chatWithAI(message: string, context?: any): Promise<any> {
    const response = await this.client.post('/ai/chat', { message, context });
    return response.data;
  }

  // Analytics
  async getTrafficStats(timeRange: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/stats/traffic?range=${timeRange}`);
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch traffic stats');
      throw error;
    }
  }

  async getProtocolStats(): Promise<any[]> {
    try {
      const response = await this.client.get('/stats/protocols');
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch protocol stats');
      throw error;
    }
  }

  async getTopTalkers(): Promise<any[]> {
    try {
      const response = await this.client.get('/stats/top-talkers');
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch top talkers');
      throw error;
    }
  }
}

export const api = new ApiClient();
