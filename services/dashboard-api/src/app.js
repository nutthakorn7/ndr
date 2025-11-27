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

const { Client } = require('@opensearch-project/opensearch');
const opensearch = new Client({
  node: process.env.OPENSEARCH_URL || 'http://localhost:9200'
});

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
app.get('/events', async (req, res) => {
  const { limit = 100, offset = 0, severity, event_type, from, to, q } = req.query;
  
  try {
    const must = [];
    
    if (severity) must.push({ term: { "event.severity": severity } });
    if (event_type) must.push({ term: { "event.type": event_type } });
    if (from || to) {
      const range = { "@timestamp": {} };
      if (from) range["@timestamp"].gte = from;
      if (to) range["@timestamp"].lte = to;
      must.push({ range });
    }
    if (q) {
      must.push({ query_string: { query: q } });
    }

    const { body } = await opensearch.search({
      index: 'logs-*',
      body: {
        from: parseInt(offset),
        size: parseInt(limit),
        sort: [{ "@timestamp": "desc" }],
        query: {
          bool: { must }
        }
      }
    });

    res.json({
      events: body.hits.hits.map(h => ({ ...h._source, _id: h._id })),
      total: body.hits.total.value,
      limit: parseInt(limit),
      offset: parseInt(offset),
      took: body.took
    });
  } catch (error) {
    console.error('OpenSearch search failed:', error);
    // Fallback to mock data if OpenSearch fails (for demo resilience)
    res.json({
      events: mockEvents,
      total: mockEvents.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      took: 0,
      error: 'Using mock data due to backend error'
    });
  }
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
app.get('/analytics/dashboard', async (req, res) => {
  const { timeframe = '24h' } = req.query;
  
  try {
    // Calculate time range
    const now = new Date();
    const from = new Date(now - 24 * 60 * 60 * 1000).toISOString(); // Default 24h

    const { body } = await opensearch.search({
      index: 'logs-*',
      body: {
        size: 0,
        query: {
          range: { "@timestamp": { gte: from } }
        },
        aggs: {
          events_over_time: {
            date_histogram: {
              field: "@timestamp",
              calendar_interval: "hour"
            }
          },
          top_sources: {
            terms: { field: "source.ip.keyword", size: 5 }
          },
          severity_counts: {
            terms: { field: "event.severity.keyword" }
          }
        }
      }
    });

    res.json({
      summary: {
        total_events: body.hits.total.value,
        open_alerts: 23, // Still mock for now
        critical_alerts: body.aggregations.severity_counts.buckets.find(b => b.key === 'critical')?.doc_count || 0,
        assets_count: 156 // Still mock
      },
      trends: {
        events_over_time: body.aggregations.events_over_time.buckets.map(b => ({
          timestamp: b.key_as_string,
          count: b.doc_count
        }))
      },
      top_sources: body.aggregations.top_sources.buckets.map(b => ({
        ip: b.key,
        count: b.doc_count
      }))
    });
  } catch (error) {
    console.error('Analytics failed:', error);
    res.json({
      summary: { total_events: 0, open_alerts: 0, critical_alerts: 0, assets_count: 0 },
      trends: { events_over_time: [] },
      top_sources: []
    });
  }
});

app.get('/stats/traffic', async (req, res) => {
  try {
    const { body } = await opensearch.search({
      index: 'logs-*',
      body: {
        size: 0,
        aggs: {
          traffic_over_time: {
            date_histogram: { field: "@timestamp", calendar_interval: "hour" },
            aggs: {
              total_bytes: { sum: { field: "network.bytes" } }
            }
          }
        }
      }
    });
    res.json(body.aggregations.traffic_over_time.buckets.map(b => ({
      timestamp: b.key_as_string,
      bytes: b.total_bytes.value
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/stats/protocols', async (req, res) => {
  try {
    const { body } = await opensearch.search({
      index: 'logs-*',
      body: {
        size: 0,
        aggs: {
          protocols: { terms: { field: "network.application.keyword", size: 10 } }
        }
      }
    });
    res.json(body.aggregations.protocols.buckets.map(b => ({
      protocol: b.key,
      count: b.doc_count
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
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

// Alert Correlation & Lifecycle Management
const { Pool } = require('pg');
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/security_analytics'
});

// Get correlated alerts with filtering
app.get('/alerts/correlated', async (req, res) => {
  const { status, severity_min, limit = 50, offset = 0 } = req.query;
  
  try {
    let query = 'SELECT * FROM alert_meta WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (severity_min) {
      query += ` AND severity_score >= $${paramIndex++}`;
      params.push(parseInt(severity_min));
    }
    
    query += ` ORDER BY severity_score DESC, last_seen DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await db.query(query, params);
    
    res.json({
      alerts: result.rows,
      total: result.rowCount,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Failed to fetch correlated alerts:', error);
    res.status(500).json({ error: 'Failed to fetch correlated alerts' });
  }
});

// Update alert status
app.patch('/alerts/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, assigned_to } = req.body;
  
  try {
    const query = `
      UPDATE alert_meta
      SET status = COALESCE($1, status),
          assigned_to = COALESCE($2, assigned_to),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await db.query(query, [status, assigned_to, id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update alert status:', error);
    res.status(500).json({ error: 'Failed to update alert status' });
  }
});

// Get attack chain for an alert
app.get('/alerts/:id/chain', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await db.query(
      'SELECT attack_chain FROM alert_meta WHERE id = $1',
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json({
      alert_id: id,
      attack_chain: result.rows[0].attack_chain || []
    });
  } catch (error) {
    console.error('Failed to fetch attack chain:', error);
    res.status(500).json({ error: 'Failed to fetch attack chain' });
  }
});

// Add note to alert
app.post('/alerts/:id/notes', async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  
  if (!note) {
    return res.status(400).json({ error: 'Note content required' });
  }
  
  try {
    const query = `
      UPDATE alert_meta
      SET notes = array_append(notes, $1),
          updated_at = NOW()
      WHERE id = $2
      RETURNING notes
    `;
    
    const result = await db.query(query, [note, id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json({
      alert_id: id,
      notes: result.rows[0].notes
    });
  } catch (error) {
    console.error('Failed to add note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Get alert statistics
app.get('/alerts/stats/summary', async (req, res) => {
  try {
    const statusQuery = 'SELECT status, COUNT(*) as count FROM alert_meta GROUP BY status';
    const severityQuery = `
      SELECT 
        CASE 
          WHEN severity_score >= 75 THEN 'critical'
          WHEN severity_score >= 50 THEN 'high'
          WHEN severity_score >= 25 THEN 'medium'
          ELSE 'low'
        END as severity,
        COUNT(*) as count
      FROM alert_meta
      GROUP BY severity
    `;
    
    const [statusResult, severityResult] = await Promise.all([
      db.query(statusQuery),
      db.query(severityQuery)
    ]);
    
    res.json({
      by_status: statusResult.rows,
      by_severity: severityResult.rows
    });
  } catch (error) {
    console.error('Failed to fetch alert stats:', error);
    res.status(500).json({ error: 'Failed to fetch alert stats' });
  }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Dashboard API running on port ${PORT}`);
});

module.exports = app;
