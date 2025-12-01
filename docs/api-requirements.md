# NDR Dashboard API Requirements

## 📋 Overview

This document defines the API contract required by the NDR Dashboard UI. The UI is designed to be resilient and will fall back to mock data if these endpoints are unavailable or return unexpected formats.

**Base URL**: `http://localhost:8081` (configurable via `VITE_API_BASE_URL`)

---

## 🔐 Authentication Service
**Base URL**: `http://localhost:8087`

### `POST /login`
Authenticates a user and returns a JWT token.
- **Request**: `{ "username": "...", "password": "..." }`
- **Response**: `{ "token": "jwt_token", "user": { "id": 1, "name": "...", "role": "..." } }`

---

## 📊 Dashboard API
**Base URL**: `http://localhost:8081`

### `GET /analytics/dashboard`
Returns high-level KPI statistics for the main dashboard.
- **Response**:
  ```json
  {
    "totalAlerts": 123,
    "criticalAlerts": 5,
    "totalEvents": 1000000,
    "activeAssets": 50,
    "sensors": 3,
    "mitigatedThreats": 10,
    "eps": 1500
  }
  ```

### `GET /stats/traffic`
Returns network traffic statistics for charts.
- **Response**:
  ```json
  {
    "inbound": [ { "time": "10:00", "mbps": 450 }, ... ],
    "outbound": [ { "time": "10:00", "mbps": 320 }, ... ]
  }
  ```

### `GET /stats/protocols`
Returns protocol distribution data.
- **Response**:
  ```json
  [
    { "name": "HTTP", "value": 45 },
    { "name": "DNS", "value": 25 },
    ...
  ]
  ```

### `POST /events`
Searches for security events (OpenSearch proxy).
- **Request**:
  ```json
  {
    "query": "search term",
    "timeRange": "24h",
    "limit": 50
  }
  ```
- **Response**:
  ```json
  {
    "hits": [
      {
        "_source": {
          "@timestamp": "2023-11-20T10:00:00Z",
          "source_ip": "192.168.1.1",
          "dest_ip": "10.0.0.1",
          "event_type": "alert",
          "description": "..."
        }
      }
    ],
    "total": 150
  }
  ```

### `GET /alerts`
Returns a list of recent alerts.
- **Query Params**: `limit` (default: 20)
- **Response**:
  ```json
  [
    {
      "id": "alert-1",
      "timestamp": "2023-11-20T10:00:00Z",
      "severity": "high",
      "title": "Malware Detected",
      "description": "...",
      "source_ip": "..."
    }
  ]
  ```

### `GET /sensors`
Returns the status of all registered sensors.
- **Response**:
  ```json
  [
    {
      "id": "sensor-1",
      "name": "Gateway Sensor",
      "status": "active",
      "cpu": 45,
      "ram": 60,
      "disk": 30,
      "uptime": 123456,
      "version": "1.2.0"
    }
  ]
  ```

### `GET /sensors/:id/certificates`
Returns SSL/TLS certificates discovered by a specific sensor.
- **Response**:
  ```json
  [
    {
      "id": "cert-1",
      "subject": "example.com",
      "issuer": "Let's Encrypt",
      "valid_from": "...",
      "valid_to": "...",
      "is_expired": false,
      "is_weak_key": false
    }
  ]
  ```

### `GET /rules`
Returns intrusion detection rules.
- **Response**:
  ```json
  [
    {
      "id": 1,
      "sid": "2001234",
      "protocol": "tcp",
      "msg": "ET MALWARE...",
      "severity": 1,
      "category": "Malware",
      "enabled": true
    }
  ]
  ```

### `GET /detections/stats`
Returns statistics about rule detections.
- **Response**:
  ```json
  {
    "total_rules": 15000,
    "active_rules": 12000,
    "total_hits": 4500
  }
  ```

---

## 📦 Asset Service
**Base URL**: `http://localhost:8088`

### `GET /assets`
Returns discovered assets.
- **Response**:
  ```json
  [
    {
      "id": "asset-1",
      "ip": "192.168.1.50",
      "hostname": "server-01",
      "type": "server",
      "os": "Linux",
      "risk_score": 85,
      "last_seen": "..."
    }
  ]
  ```

### `GET /assets/stats`
Returns asset inventory statistics.
- **Response**:
  ```json
  {
    "total_assets": 150,
    "new_assets_24h": 5,
    "high_risk_assets": 12
  }
  ```

---

## 🤖 SOAR Service
**Base URL**: `http://localhost:8089` (or via Dashboard API proxy)

### `GET /playbooks`
Returns automation playbooks.
- **Response**:
  ```json
  [
    {
      "id": 1,
      "name": "Block IP",
      "trigger": "Critical Alert",
      "enabled": true,
      "execution_count": 145,
      "success_rate": 98,
      "last_execution": "..."
    }
  ]
  ```

### `GET /executions`
Returns playbook execution history.
- **Response**:
  ```json
  [
    {
      "id": 101,
      "playbook_name": "Block IP",
      "status": "completed",
      "started_at": "...",
      "duration": "2s",
      "target": "1.2.3.4"
    }
  ]
  ```

---

## 🔮 Future Requirements (TODO)

The following endpoints are currently mocked in the UI and should be implemented in the backend:

1. **Threat Intel Feeds**: `GET /threat-intel/feeds`
2. **DNS Query History**: `GET /dns/queries`
3. **File Analysis List**: `GET /files`
4. **SOC Metrics Time-Series**: `GET /soc/metrics/history`
5. **Connector Status**: `GET /connectors`

---

## ⚠️ Error Handling Contract

- **401 Unauthorized**: UI redirects to login.
- **403 Forbidden**: UI shows "Access Denied".
- **404 Not Found**: UI handles gracefully (empty state).
- **500 Internal Error**: UI retries 3 times, then falls back to mock data.
- **Network Error**: UI retries 3 times, then falls back to mock data.
