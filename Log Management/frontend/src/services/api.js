import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('API Request:', config.url, 'Token:', token ? 'Present' : 'Missing');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Authorization header added');
    } else {
      console.log('No token found in localStorage');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('401 Unauthorized - removing token');
      localStorage.removeItem('token');
      // Don't redirect here - let AuthContext handle it
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh'),
};

export const sourcesAPI = {
  getSources: () => api.get('/sources/').then(response => response.data),
  getSource: (id) => api.get(`/sources/${id}/`).then(response => response.data),
  createSource: (data) => api.post('/sources/', data).then(response => response.data),
  updateSource: (id, data) => api.put(`/sources/${id}/`, data).then(response => response.data),
  deleteSource: (id) => api.delete(`/sources/${id}/`).then(response => response.data),
  collectLogs: (id) => api.post(`/sources/${id}/collect/`).then(response => response.data),
  getCollectionHistory: (id) => api.get(`/sources/${id}/history/`).then(response => response.data),
};

export const logsAPI = {
  getLogs: (params) => api.get('/logs', { params }),
  getLogStats: () => api.get('/logs/stats'),
  getStats: () => api.get('/logs/stats'),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getTrends: (params) => api.get('/analytics/trends', { params }),
  getGeographicData: () => api.get('/analytics/geographic'),
  getGeographic: () => api.get('/analytics/geographic'),
  getCompliance: (params) => api.get('/analytics/compliance', { params }),
  getComplianceReport: (params) => api.get('/analytics/compliance', { params }),
  getSecurityAlerts: (params) => api.get('/analytics/alerts', { params }),
};

export default api; 