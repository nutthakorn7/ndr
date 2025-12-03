import axios, { AxiosInstance } from 'axios';
import { 
  DashboardAnalyticsSchema, 
  AlertSchema, 
  SearchEventsResponseSchema,
  SensorSchema,
  TrafficStatSchema,
  ProtocolStatSchema,
  TopTalkerSchema,
  AiChatResponseSchema,
  type DashboardAnalytics,
  type Alert,
  type ThreatEvent,
  type Sensor,
  type TrafficStat,
  type ProtocolStat,
  type TopTalker
} from '../schemas';
import { z } from 'zod';

export type { DashboardAnalytics, Alert, ThreatEvent, Sensor, TrafficStat, ProtocolStat, TopTalker };
type AiChatResponse = z.infer<typeof AiChatResponseSchema>;

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
      const response = await this.client.get('/analytics/dashboard');
      return DashboardAnalyticsSchema.parse(response.data);
    } catch (error) {
      console.warn('Failed to fetch analytics or validation failed', error);
      throw error;
    }
  }

  // Alerts & Events
  async getAlerts(): Promise<Alert[]> {
    try {
      const response = await this.client.get('/alerts');
      // Validate array of alerts
      return z.array(AlertSchema).parse(response.data.alerts);
    } catch (error) {
      console.warn('Failed to fetch alerts or validation failed', error);
      throw error;
    }
  }

  async searchEvents(params: Record<string, unknown>): Promise<{ events: ThreatEvent[], total: number }> {
    try {
      const response = await this.client.post('/events', params);
      return SearchEventsResponseSchema.parse(response.data);
    } catch (error) {
      console.warn('Failed to search events or validation failed', error);
      throw error;
    }
  }

  // Sensors
  async getSensors(): Promise<Sensor[]> {
    try {
      const response = await this.client.get('/sensors');
      return z.array(SensorSchema).parse(response.data);
    } catch (error) {
      console.warn('Failed to fetch sensors or validation failed', error);
      throw error;
    }
  }

  // AI Chat
  async chatWithAI(message: string, context?: Record<string, unknown>): Promise<AiChatResponse> {
    try {
      const response = await this.client.post('/ai/chat', { message, context });
      return AiChatResponseSchema.parse(response.data);
    } catch (error) {
      console.warn('AI chat failed', error);
      throw error;
    }
  }

  // Analytics
  async getTrafficStats(timeRange: string): Promise<TrafficStat[]> {
    try {
      const response = await this.client.get(`/stats/traffic?range=${timeRange}`);
      return z.array(TrafficStatSchema).parse(response.data);
    } catch (error) {
      console.warn('Failed to fetch traffic stats', error);
      throw error;
    }
  }

  async getProtocolStats(): Promise<ProtocolStat[]> {
    try {
      const response = await this.client.get('/stats/protocols');
      return z.array(ProtocolStatSchema).parse(response.data);
    } catch (error) {
      console.warn('Failed to fetch protocol stats', error);
      throw error;
    }
  }

  async getTopTalkers(): Promise<TopTalker[]> {
    try {
      const response = await this.client.get('/stats/top-talkers');
      return z.array(TopTalkerSchema).parse(response.data);
    } catch (error) {
      console.warn('Failed to fetch top talkers', error);
      throw error;
    }
  }
}

export const api = new ApiClient();
