const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const SENSOR_CONTROLLER_URL = (process.env.SENSOR_CONTROLLER_URL || '').replace(/\/$/, '');

const fallbackSensors = [
  {
    id: 'sensor-branch-1',
    name: 'Branch Office Sensor',
    location: 'Bangkok Branch',
    status: 'online',
    tenant_id: 'customer-a',
    last_heartbeat: '2025-08-15T10:20:00Z',
    last_metrics: { cpu: 42, bytes_per_sec: 125000 }
  },
  {
    id: 'sensor-dc-1',
    name: 'Data Center Sensor',
    location: 'Primary DC',
    status: 'degraded',
    tenant_id: 'customer-a',
    last_heartbeat: '2025-08-15T10:10:00Z',
    last_metrics: { cpu: 88, bytes_per_sec: 220000 }
  }
];

async function controllerRequest(path, query = {}) {
  if (!SENSOR_CONTROLLER_URL) {
    throw new Error('sensor-controller URL not configured');
  }
  const qs = new URLSearchParams(query);
  const url = `${SENSOR_CONTROLLER_URL}${path}${qs.toString() ? `?${qs.toString()}` : ''}`;
  const resp = await fetch(url, { timeout: 8000 });
  if (!resp.ok) {
    throw new Error(`controller responded with ${resp.status}`);
  }
  return resp.json();
}

// Mock data for demo
const mockEvents = [
  {
    "@timestamp": "2025-08-15T10:00:00Z",
    "event": {"type": "connection", "category": "network", "severity": "high"},
    "source": {"ip": "192.168.1.10", "hostname": "workstation01"},
    "destination": {"ip": "8.8.4.4", "port": 4444},
    "tenant_id": "company-1"
  },
  {
    "@timestamp": "2025-08-15T10:05:00Z",
    "event": {"type": "process", "category": "process", "severity": "medium"},
    "process": {"name": "powershell.exe", "pid": 1234},
    "user": {"name": "admin"},
    "tenant_id": "company-1"
  },
  {
    "@timestamp": "2025-08-15T10:10:00Z",
    "event": {"type": "file", "category": "file", "severity": "critical"},
    "file": {"path": "/tmp/important_documents.encrypted", "extension": ".encrypted"},
    "tenant_id": "company-1"
  }
];

const mockAlerts = [
  {
    "id": "alert-001",
    "timestamp": "2025-08-15T10:00:00Z",
    "severity": "critical",
    "status": "open",
    "title": "Ransomware Activity Detected",
    "description": "File encryption activity detected on multiple hosts",
    "rule_id": "ransomware_detection",
    "tenant_id": "company-1"
  },
  {
    "id": "alert-002", 
    "timestamp": "2025-08-15T10:05:00Z",
    "severity": "high",
    "status": "investigating",
    "title": "Suspicious Network Connection",
    "description": "Connection to known malicious IP address",
    "rule_id": "suspicious_connection",
    "tenant_id": "company-1"
  },
  {
    "id": "alert-003",
    "timestamp": "2025-08-15T10:10:00Z", 
    "severity": "medium",
    "status": "open",
    "title": "PowerShell Execution",
    "description": "PowerShell executed with bypass policy",
    "rule_id": "powershell_execution",
    "tenant_id": "company-1"
  }
];

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'dashboard-api'
  });
});

// Events endpoint
app.get('/events', (req, res) => {
  const { limit = 100, offset = 0, severity, event_type, from, to } = req.query;
  
  let filteredEvents = [...mockEvents];
  
  // Apply filters
  if (severity) {
    filteredEvents = filteredEvents.filter(e => e.event.severity === severity);
  }
  
  if (event_type) {
    filteredEvents = filteredEvents.filter(e => e.event.type === event_type);
  }
  
  // Pagination
  const startIndex = parseInt(offset);
  const endIndex = startIndex + parseInt(limit);
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);
  
  res.json({
    events: paginatedEvents,
    total: filteredEvents.length,
    limit: parseInt(limit),
    offset: parseInt(offset),
    took: 15
  });
});

// Alerts endpoint
app.get('/alerts', (req, res) => {
  const { limit = 50, offset = 0, status, severity, from, to } = req.query;
  
  let filteredAlerts = [...mockAlerts];
  
  // Apply filters
  if (status) {
    filteredAlerts = filteredAlerts.filter(a => a.status === status);
  }
  
  if (severity) {
    filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
  }
  
  // Pagination
  const startIndex = parseInt(offset);
  const endIndex = startIndex + parseInt(limit);
  const paginatedAlerts = filteredAlerts.slice(startIndex, endIndex);
  
  res.json({
    alerts: paginatedAlerts,
    total: filteredAlerts.length,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

// Get specific alert
app.get('/alerts/:alertId', (req, res) => {
  const alert = mockAlerts.find(a => a.id === req.params.alertId);
  if (alert) {
    res.json(alert);
  } else {
    res.status(404).json({ error: 'Alert not found' });
  }
});

// Assets endpoint
app.get('/assets', (req, res) => {
  const mockAssets = [
    {
      "id": "asset-001",
      "hostname": "workstation01", 
      "ip_address": "192.168.1.10",
      "asset_type": "endpoint",
      "os_type": "Windows 10",
      "criticality": "medium",
      "tags": ["finance", "user-workstation"],
      "last_seen": "2025-08-15T10:00:00Z"
    },
    {
      "id": "asset-002",
      "hostname": "server01",
      "ip_address": "192.168.1.100", 
      "asset_type": "server",
      "os_type": "Windows Server 2019",
      "criticality": "high",
      "tags": ["domain-controller", "critical"],
      "last_seen": "2025-08-15T10:00:00Z"
    }
  ];
  
  res.json({ assets: mockAssets });
});

// Dashboard analytics
app.get('/analytics/dashboard', (req, res) => {
  const { timeframe = '24h' } = req.query;
  
  res.json({
    summary: {
      total_events: 1247,
      open_alerts: 23,
      critical_alerts: 3,
      assets_count: 156
    },
    trends: {
      events_over_time: [
        { timestamp: "2025-08-15T09:00:00Z", count: 45 },
        { timestamp: "2025-08-15T10:00:00Z", count: 67 },
        { timestamp: "2025-08-15T11:00:00Z", count: 52 },
        { timestamp: "2025-08-15T12:00:00Z", count: 38 }
      ]
    },
    top_sources: [
      { ip: "192.168.1.10", count: 234 },
      { ip: "192.168.1.15", count: 156 },
      { ip: "192.168.1.20", count: 89 }
    ]
  });
});

app.get('/sensors', async (req, res) => {
  try {
    const data = await controllerRequest('/sensors', req.query);
    res.json({ ...data, source: 'controller' });
  } catch (error) {
    console.error('sensor controller unavailable:', error.message);
    res.json({ sensors: fallbackSensors, source: 'mock' });
  }
});

app.get('/sensors/:sensorId/pcap', async (req, res) => {
  const { sensorId } = req.params;
  try {
    const data = await controllerRequest(`/sensors/${sensorId}/pcap`, req.query);
    res.json({ ...data, source: 'controller' });
  } catch (error) {
    res.status(502).json({
      error: 'Unable to fetch pcap data from controller',
      details: error.message
    });
  }
});

app.get('/sensors/:sensorId/certificates', async (req, res) => {
  const { sensorId } = req.params;
  try {
    const data = await controllerRequest(`/sensors/${sensorId}/certificates`, req.query);
    res.json({ ...data, source: 'controller' });
  } catch (error) {
    res.status(502).json({
      error: 'Unable to fetch certificate data from controller',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Dashboard API running on port ${PORT}`);
});

module.exports = app;
