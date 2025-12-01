# API Reference

> REST API documentation for Open NDR Platform

Base URL: `http://localhost:8081`

## Authentication

Currently no authentication required. See [Authentication Implementation](../ROADMAP.md#authentication) for future plans.

## Endpoints

### Health & Status

#### `GET /health`
Service health check

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

---

### Events & Alerts

#### `GET /events`
Retrieve security events

**Query Parameters:**
- `limit` (int): Max results, default 100
- `offset` (int): Pagination offset
- `severity` (string): Filter by severity (critical, high, medium, low)
- `event_type` (string): Filter by event type
- `from` (ISO8601): Start time
- `to` (ISO8601): End time
- `q` (string): Query string search

**Response:**
```json
{
  "events": [...],
  "total": 1234,
  "limit": 100,
  "offset": 0,
  "took": 45
}
```

#### `GET /alerts`
Get alerts (legacy endpoint)

**Response:**
```json
{
  "alerts": [...],
  "total": 50
}
```

#### `GET /alerts/correlated`
Get correlated alerts with deduplication

**Query Parameters:**
- `status` (string): Filter by status (new, investigating, resolved, false_positive)
- `severity_min` (int): Minimum severity score (0-100)
- `limit` (int): Max results
- `offset` (int): Pagination offset

**Response:**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "aggregation_count": 5,
      "severity_score": 85,
      "status": "new",
      "attack_chain": [...],
      "first_seen": "2025-01-01T12:00:00Z",
      "last_seen": "2025-01-01T12:05:00Z"
    }
  ],
  "total": 25
}
```

#### `PATCH /alerts/:id/status`
Update alert status and assignment

**Body:**
```json
{
  "status": "investigating",
  "assigned_to": "analyst@company.com"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "investigating",
  "assigned_to": "analyst@company.com",
  "updated_at": "2025-01-01T12:10:00Z"
}
```

#### `GET /alerts/:id/chain`
Get attack chain for alert

**Response:**
```json
{
  "alert_id": "uuid",
  "attack_chain": [
    {
      "id": "uuid2",
      "title": "Port Scan",
      "severity": "medium",
      "timestamp": "2025-01-01T11:55:00Z"
    },
    {
      "id": "uuid3",
      "title": "Exploit Attempt",
      "severity": "high",
      "timestamp": "2025-01-01T12:00:00Z"
    }
  ]
}
```

#### `POST /alerts/:id/notes`
Add analyst note to alert

**Body:**
```json
{
  "note": "Confirmed malicious - escalating to IR team"
}
```

**Response:**
```json
{
  "alert_id": "uuid",
  "notes": [
    "Confirmed malicious - escalating to IR team"
  ]
}
```

---

### Analytics & Dashboard

#### `GET /analytics/dashboard`
Dashboard summary statistics

**Query Parameters:**
- `timeframe` (string): Time window (24h, 7d, 30d)

**Response:**
```json
{
  "summary": {
    "total_events": 12450,
    "open_alerts": 23,
    "critical_alerts": 5,
    "assets_count": 156
  },
  "trends": {
    "events_over_time": [
      {"timestamp": "2025-01-01T00:00:00Z", "count": 1200}
    ]
  },
  "top_sources": [
    {"ip": "192.168.1.100", "count": 450}
  ]
}
```

#### `GET /stats/traffic`
Network traffic statistics

**Response:**
```json
[
  {
    "timestamp": "2025-01-01T00:00:00Z",
    "bytes": 1500000
  }
]
```

#### `GET /stats/protocols`
Protocol distribution

**Response:**
```json
[
  {"protocol": "https", "count": 5000},
  {"protocol": "dns", "count": 3000},
  {"protocol": "ssh", "count": 500}
]
```

#### `GET /alerts/stats/summary`
Alert statistics by status and severity

**Response:**
```json
{
  "by_status": [
    {"status": "new", "count": "15"},
    {"status": "investigating", "count": "8"}
  ],
  "by_severity": [
    {"severity": "critical", "count": "5"},
    {"severity": "high", "count": "12"}
  ]
}
```

---

### Assets

#### `GET /assets`
Query asset inventory

**Query Parameters:**
- `ip_address` (string): Filter by IP
- `hostname` (string): Filter by hostname (ILIKE)
- `criticality` (string): Filter by criticality
- `device_type` (string): Filter by device type
- `limit` (int): Max results
- `offset` (int): Pagination offset

**Response:**
```json
{
  "assets": [
    {
      "id": "uuid",
      "ip_address": "192.168.1.100",
      "mac_address": "00:11:22:33:44:55",
      "hostname": "workstation-01",
      "os_type": "Windows",
      "device_type": "endpoint",
      "criticality": "medium",
      "first_seen": "2025-01-01T00:00:00Z",
      "last_seen": "2025-01-01T12:00:00Z",
      "tags": ["traffic:network", "protocol:https"]
    }
  ],
  "total": 156
}
```

#### `GET /assets/:id`
Get asset details

**Response:**
```json
{
  "id": "uuid",
  "ip_address": "192.168.1.100",
  "hostname": "workstation-01",
  "metadata": {
    "ports_seen": [80, 443, 22],
    "protocols_seen": ["https", "ssh"],
    "last_event_type": "connection"
  }
}
```

#### `GET /assets/stats/summary`
Asset statistics

**Response:**
```json
{
  "total": 156,
  "by_type": [
    {"device_type": "endpoint", "count": "120"},
    {"device_type": "server", "count": "36"}
  ],
  "by_criticality": [
    {"criticality": "high", "count": "10"},
    {"criticality": "medium", "count": "100"}
  ]
}
```

---

### Sensors (via sensor-controller)

#### `GET /sensors`
List all sensors

**Response:**
```json
{
  "sensors": [
    {
      "id": "sensor-001",
      "name": "Branch Office Sensor",
      "location": "Bangkok",
      "status": "online",
      "last_heartbeat": "2025-01-01T12:00:00Z"
    }
  ]
}
```

#### `POST /sensors/:id/pcap`
Request PCAP capture from sensor

**Body:**
```json
{
  "duration_seconds": 60,
  "object_key": "pcap/incident-123.pcap",
  "notes": "Manual request for investigation"
}
```

**Response:**
```json
{
  "request_id": "uuid",
  "sensor_id": "sensor-001",
  "status": "accepted",
  "estimated_completion": "2025-01-01T12:01:00Z"
}
```

---

## Error Responses

All endpoints return standard error format:

```json
{
  "error": "Error description",
  "details": "Additional details if available"
}
```

**HTTP Status Codes:**
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error
- `502` - Bad Gateway (upstream service unavailable)

## Rate Limiting

Currently no rate limiting. Future implementation planned.

## Pagination

All list endpoints support pagination via `limit` and `offset`:

```bash
# Page 1
GET /events?limit=100&offset=0

# Page 2
GET /events?limit=100&offset=100
```

## Search Syntax

The `q` parameter supports OpenSearch query string syntax:

```bash
# Simple search
GET /events?q=malware

# Field search
GET /events?q=source.ip:192.168.1.100

# Boolean
GET /events?q=severity:critical AND event.type:malware

# Wildcard
GET /events?q=destination.ip:10.0.*
```

---

## Edge Computing APIs

### Edge Agent APIs (`Port 8086`)

#### `POST /ingest`
Ingest security events from local sensors.

**Headers:**
- `Authorization`: `Bearer <API_KEY>`
- `Content-Type`: `application/json`

**Body:**
```json
{
  "event_type": "network_flow",
  "source_ip": "192.168.1.50",
  "destination_ip": "10.0.0.5",
  "protocol": "TCP",
  "payload": "..."
}
```

#### `GET /health`
Check agent health status.

**Response:**
```json
{
  "status": "healthy",
  "uptime_seconds": 3600,
  "buffer_usage_percent": 12.5
}
```

### Edge Coordinator APIs (`Port 8085`)

#### `POST /edge/register`
Register a new edge agent.

**Body:**
```json
{
  "agent_id": "agent-001",
  "location": "New York Branch",
  "version": "1.0.0",
  "capabilities": ["compression", "sampling"]
}
```

#### `POST /edge/heartbeat`
Send heartbeat to confirm online status.

**Body:**
```json
{
  "agent_id": "agent-001",
  "status": "online",
  "metrics": {
    "buffer_size": 1024,
    "events_processed": 5000
  }
}
```

#### `GET /edge/agents`
List all registered edge agents.

**Response:**
```json
[
  {
    "agent_id": "agent-001",
    "location": "New York Branch",
    "status": "online",
    "last_heartbeat": "2025-01-01T12:00:00Z"
  }
]
```

#### `POST /edge/agents/:id/config`
Update configuration for a specific agent.

**Headers:**
- `Authorization`: `Bearer <COORDINATOR_API_KEY>`

**Body:**
```json
{
  "forwarding_policy": {
    "compression_enabled": true,
    "sampling_rate": 0.5,
    "severity_threshold": "medium"
  }
}
```
