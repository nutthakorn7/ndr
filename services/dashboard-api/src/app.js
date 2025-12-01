const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { authenticate, authorize, checkPermission } = require('./middleware/auth');

const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json());

// Security Middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

// Set security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Apply rate limiting to all requests
app.use(limiter);

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
// Events endpoint (POST for complex queries)
app.post('/events', authenticate, async (req, res) => {
  const { limit = 100, offset = 0, severity, event_type, from, to, q, structuredQuery } = req.body;
  
  try {
    const must = [];
    const should = [];
    const filter = [];
    
    // Handle legacy/simple params
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

    // Handle Structured Query from Builder
    if (structuredQuery && Array.isArray(structuredQuery)) {
      structuredQuery.forEach(clause => {
        const { field, operator, value, logic } = clause;
        if (!field || !value) return;

        let esQuery;
        switch (operator) {
          case 'is':
            esQuery = { term: { [field]: value } };
            break;
          case 'is_not':
            esQuery = { bool: { must_not: { term: { [field]: value } } } };
            break;
          case 'contains':
            esQuery = { wildcard: { [field]: `*${value}*` } };
            break;
          case 'exists':
            esQuery = { exists: { field: field } };
            break;
          default:
            esQuery = { match: { [field]: value } };
        }

        if (logic === 'OR') {
          should.push(esQuery);
        } else {
          must.push(esQuery);
        }
      });
    }

    const boolQuery = { must, filter };
    if (should.length > 0) {
      boolQuery.should = should;
      boolQuery.minimum_should_match = 1;
    }

    const { body } = await opensearch.search({
      index: 'logs-*',
      body: {
        from: parseInt(offset),
        size: parseInt(limit),
        sort: [{ "@timestamp": "desc" }],
        query: {
          bool: boolQuery
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
    logger.error('OpenSearch search failed:', error);
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'Service Unavailable', details: 'Event search failed' });
    }
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
app.get('/alerts', authenticate, async (req, res) => {
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
    logger.error('Analytics failed:', error);
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'Service Unavailable', details: 'Analytics failed' });
    }
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
    
    if (!body.aggregations || !body.aggregations.traffic_over_time) {
      return res.json([]);
    }

    res.json(body.aggregations.traffic_over_time.buckets.map(b => ({
      timestamp: b.key_as_string,
      bytes: b.total_bytes.value
    })));
  } catch (e) { 
    logger.error('Traffic stats failed:', e);
    res.json([]); // Return empty on error to avoid UI crash
  }
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

    if (!body.aggregations || !body.aggregations.protocols) {
      return res.json([]);
    }

    res.json(body.aggregations.protocols.buckets.map(b => ({
      protocol: b.key,
      count: b.doc_count
    })));
  } catch (e) { 
    logger.error('Protocol stats failed:', e);
    res.json([]); 
  }
});

app.get('/sensors', async (req, res) => {
  try {
    const data = await controllerRequest('/sensors', req.query);
    res.json({ ...data, source: 'controller' });
  } catch (error) {
    logger.error('sensor controller unavailable:', error.message);
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'Service Unavailable', details: 'Sensor controller unreachable' });
    }
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

// Suricata Rules Proxy
app.get('/rules/suricata', async (req, res) => {
  try {
    const data = await controllerRequest('/rules');
    res.json(data);
  } catch (error) {
    logger.error('Failed to fetch rules:', error);
    res.status(502).json({ error: 'Failed to fetch rules' });
  }
});

app.post('/rules/suricata', async (req, res) => {
  try {
    const response = await fetch(`${SENSOR_CONTROLLER_URL}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    logger.error('Failed to update rules:', error);
    res.status(502).json({ error: 'Failed to update rules' });
  }
});

// PCAP Proxy
const PCAP_SERVICE_URL = process.env.PCAP_SERVICE_URL || 'http://host.docker.internal:8089';

app.get('/pcap', async (req, res) => {
  try {
    const response = await fetch(`${PCAP_SERVICE_URL}/pcap${req.url.substring(req.url.indexOf('?'))}`);
    if (!response.ok) throw new Error(`PCAP service error: ${response.statusText}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    logger.error('Failed to fetch PCAP list:', error);
    res.status(502).json({ error: 'Failed to fetch PCAP list' });
  }
});

app.get('/pcap/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const response = await fetch(`${PCAP_SERVICE_URL}/pcap/download/${filename}`);
    if (!response.ok) throw new Error(`PCAP service error: ${response.statusText}`);
    
    // Stream the file back
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/vnd.tcpdump.pcap');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Node 18 fetch returns a ReadableStream, we need to convert or pipe
    // Using arrayBuffer() for simplicity in this environment, or simpler: pipe if using node-fetch
    // But native fetch body is a stream.
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    logger.error('Failed to download PCAP:', error);
    res.status(502).json({ error: 'Failed to download PCAP' });
  }
});
// AI Service Proxy
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8090';

app.post('/ai/triage', async (req, res) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/ai/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    logger.error('Failed to triage alert:', error);
    res.status(502).json({ error: 'AI Service Unavailable' });
  }
});

app.post('/ai/chat', async (req, res) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    logger.error('Failed to chat with AI:', error);
    res.status(502).json({ error: 'AI Service Unavailable' });
  }
});

app.post('/ai/report', async (req, res) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/ai/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    logger.error('Failed to generate report:', error);
    res.status(502).json({ error: 'AI Service Unavailable' });
  }
});

// Alert Correlation & Lifecycle Management
const { Pool } = require('pg');
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/security_analytics'
});

// Initialize DB
const initDB = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255),
        severity VARCHAR(20),
        status VARCHAR(20),
        timestamp TIMESTAMP,
        description TEXT,
        data JSONB
      );
      CREATE TABLE IF NOT EXISTS alert_notes (
        id SERIAL PRIMARY KEY,
        alert_id VARCHAR(50),
        note TEXT,
        author VARCHAR(100),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS playbook_executions (
        id VARCHAR(50) PRIMARY KEY,
        playbook_id VARCHAR(50),
        alert_id VARCHAR(50),
        status VARCHAR(20),
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        result JSONB
      );
      CREATE TABLE IF NOT EXISTS saved_searches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        query JSONB NOT NULL,
        visualization_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('DB Init Error:', err);
  }
};
initDB();

// Saved Searches API
app.get('/searches', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM saved_searches ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    logger.error('Failed to fetch saved searches:', error);
    res.status(500).json({ error: 'Failed to fetch saved searches' });
  }
});

app.post('/searches', authenticate, async (req, res) => {
  const { name, query, visualization_type } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO saved_searches (name, query, visualization_type) VALUES ($1, $2, $3) RETURNING *',
      [name, JSON.stringify(query), visualization_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to save search:', error);
    res.status(500).json({ error: 'Failed to save search' });
  }
});

app.delete('/searches/:id', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM saved_searches WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete saved search:', error);
    res.status(500).json({ error: 'Failed to delete saved search' });
  }
});

// Get correlated alerts with filtering
app.get('/alerts/correlated', authenticate, async (req, res) => {
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
    logger.error('Failed to fetch correlated alerts:', error);
    res.status(500).json({ error: 'Failed to fetch correlated alerts' });
  }
});

// Update alert status
app.patch('/alerts/:id/status', authenticate, authorize('Admin', 'Analyst'), async (req, res) => {
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
    logger.error('Failed to update alert status:', error);
    res.status(500).json({ error: 'Failed to update alert status' });
  }
});

// Get attack chain for an alert
app.get('/alerts/:id/chain', authenticate, async (req, res) => {
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
    logger.error('Failed to fetch attack chain:', error);
    res.status(500).json({ error: 'Failed to fetch attack chain' });
  }
});

// Add note to alert
app.post('/alerts/:id/notes', authenticate, authorize('Admin', 'Analyst'), async (req, res) => {
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
    logger.error('Failed to add note:', error);
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
    logger.error('Failed to fetch alert stats:', error);
    res.status(500).json({ error: 'Failed to fetch alert stats' });
  }
});

// SOAR Playbooks & Executions (Read-Only from DB)
app.get('/playbooks', async (req, res) => {
  // In a real implementation, this might fetch from a DB table or file system
  // For now, we return a static list of known playbooks
  const playbooks = [
    { id: 'pb-001', name: 'Ransomware Containment', description: 'Isolate host and disable user account', trigger: 'alert.severity == "critical"' },
    { id: 'pb-002', name: 'Phishing Investigation', description: 'Analyze email headers and URL reputation', trigger: 'alert.type == "phishing"' },
    { id: 'pb-003', name: 'Brute Force Block', description: 'Block IP at firewall', trigger: 'alert.rule_id == "brute_force"' }
  ];
  res.json({ playbooks });
});

app.get('/executions', async (req, res) => {
  const { limit = 20, offset = 0, status } = req.query;
  try {
    let query = 'SELECT * FROM playbook_executions WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY started_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);
    res.json({ 
      executions: result.rows,
      total: result.rowCount // Approximation
    });
  } catch (error) {
    // Table might not exist yet if SOAR hasn't run
    logger.warn('Failed to fetch executions (SOAR might not be initialized):', error.message);
    res.json({ executions: [], total: 0 });
  }
});

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  logger.info('Client connected to WebSocket:', socket.id);
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

// Simulate real-time alerts
setInterval(() => {
  const severities = ['low', 'medium', 'high', 'critical'];
  const types = ['Malware', 'Phishing', 'DDoS', 'Intrusion', 'Policy Violation'];
  
  const randomAlert = {
    id: `rt-${Date.now()}`,
    timestamp: new Date().toISOString(),
    severity: severities[Math.floor(Math.random() * severities.length)],
    title: `${types[Math.floor(Math.random() * types.length)]} Detected`,
    description: 'Real-time alert generated by backend simulation',
    source_ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
    status: 'open'
  };
  
  io.emit('alert', randomAlert);
}, 5000);

const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  logger.info(`Dashboard API running on port ${PORT}`);
  logger.info(`WebSocket server ready`);
});

module.exports = app;
