# Security Analytics & Incident Response Platform

An on-prem security analytics stack capable of ingesting ≥6,500 events per second, normalizing them to ECS, enriching with MITRE/IOC context, and orchestrating automated incident response playbooks. This repository contains every component required to ingest logs, detect threats (rule-based, ML, threat intel), expose dashboards/APIs, and execute SOAR actions.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Repository Layout](#repository-layout)
3. [Core Services](#core-services)
4. [Data Pipeline Flow](#data-pipeline-flow)
5. [Getting Started](#getting-started)
6. [Configuration](#configuration)
7. [Testing & QA](#testing--qa)
8. [Detection & Response Features](#detection--response-features)
9. [Observability & Operations](#observability--operations)
10. [Documentation Links](#documentation-links)
11. [Recent Updates](#recent-updates)

---

## Architecture Overview

- **Collectors/Agents** push any raw telemetry (network, endpoint, syslog, etc.) to the **ingestion-gateway**.
- Logs are published onto **Kafka** (`raw-logs` topic), parsed with Grok, normalized to ECS, geo-enriched, and republished as `normalized-logs`.
- The **detection-engine** consumes normalized events and applies:
  - Rule-based logic for deterministic detections
  - Simulated ML models (Isolation Forest placeholders) for UEBA signals
  - IOC matching for TI hits
- Alerts are written to `security-alerts`, indexed into **OpenSearch** / **ClickHouse**, and served via **dashboard-api** + **web UI**.
- **SOAR orchestrator** and **connectors** automate response actions (host isolation, IP blocking, ticketing, etc.).
- **Redis** backs caching/rate limiting; **PostgreSQL** persists assets, vulnerabilities, auth info.

**Storage Layer**

- OpenSearch 2.8 – hot storage for events & alerts with MITRE mappings
- ClickHouse 23.8 – high-speed aggregations & reporting
- PostgreSQL 15 – relational data (assets, vulnerabilities, auth)
- Redis 7 – cache, queues, rate limits

---

## Sensors

- **Zeek Sensor** (`sensors/zeek-sensor/`): Docker image bundling Zeek + Vector for forwarding JSON logs to Kafka. Build with `docker build -t ndr/zeek-sensor sensors/zeek-sensor` and configure via environment variables (see component README).
- **Suricata Sensor** (`sensors/suricata-sensor/`): Suricata 7 + Vector appliance streaming EVE JSON flows/alerts to Kafka via TLS/SASL-aware pipeline. Build with `docker build -t ndr/suricata-sensor sensors/suricata-sensor`.
- Additional sensor profiles (e.g., cloud taps) can reuse the same metadata contracts (tenant_id, sensor_id) to plug into the parser/normalizer pipeline.
- Both sensors ship with a PCAP ring buffer utility (`/opt/sensor-tools/pcap-manager.sh`) that keeps rotating captures and supports snapshot/capture commands for rapid evidence export.

Sensor enrollment/config/health is handled by the `sensor-controller` service (port 8084).
### Sensor Controller API
- `POST /sensors/register` – enroll or update a sensor record (metadata/config).
- `POST /sensors/{id}/heartbeat` – update sensor status/metrics.
- `POST /sensors/{id}/pcap` – enqueue a signed PCAP snapshot command; sensors upload to object storage and analysts get the returned download URL.
- `GET /sensors/{id}/pcap` – list recent PCAP requests with status, time range, size, and download links for analyst UI.
- `POST /sensors/{id}/pcap/{requestId}/complete` – sensors acknowledge completion, updating time range, size, and final link metadata.
- `GET /sensors/{id}/config` – fetch the config blob distributed to sensors.

## Repository Layout

```text
security-analytics/
├── deploy/                # Docker Compose + bootstrap scripts
├── docs/                  # API specs, schemas, playbooks, MITRE mappings
├── services/
│   ├── ingestion-gateway  # Express + KafkaJS ingress with Redis rate limiting
│   ├── parser-normalizer  # Kafka consumer/parser/normalizer (Grok + geoip)
│   ├── detection-engine   # Rule/ML/IOC detection workers
│   ├── dashboard-api      # REST API serving events/alerts/assets
│   ├── authz-service      # JWT auth demo service
│   ├── connectors/        # EDR/NGFW/IPS stubs
│   ├── soar-orchestrator  # Playbook runner (placeholder)
│   └── ...                # Asset/vuln/reporting services etc.
├── tests/                 # Integration harness & sample logs
├── ui/                    # Web dashboard (React/static assets)
└── README.md, CHANGELOG.md, etc.
```

---

## Core Services

| Service | Language | Port(s) | Purpose |
| --- | --- | --- | --- |
| ingestion-gateway | Node.js/Express | 8080 | Validates, rate-limits, and forwards raw logs to Kafka |
| parser-normalizer | Node.js worker | n/a | Parses raw logs with Grok, maps to ECS, enriches geo/IP metadata |
| detection-engine | Python | n/a | Runs rules, ML heuristics, and IOC matching against normalized events |
| dashboard-api | Node.js/Express | 8081 | Serves events, alerts, assets, analytics endpoints |
| authz-service | Node.js/Express | 8082 | Issues/verifies JWT tokens (demo users) |
| soar-orchestrator | Python | 8083 | Executes playbooks (stub) |
| connectors | Python/Node | varies | Integrations to EDR/NGFW/IPS for response actions |
| web-ui | React (serve) | 3000 | Analyst dashboard consuming dashboard-api |
| sensor-controller | Node.js/Express | 8084 | Sensor registration, config distribution, heartbeats |

---

## Data Pipeline Flow

1. **Ingest**
   - `/ingest/logs` accepts a JSON event, validates against Joi schema, enriches metadata (`@timestamp`, source service), and enqueues onto Kafka `raw-logs`.
   - `/ingest/logs/batch` handles up to 1,000 events, validating each and enforcing `MAX_LOG_SIZE_BYTES`.

2. **Parse & Normalize**
   - `parser-normalizer` consumes `raw-logs`, detects log type via Grok patterns (syslog, apache, nginx, windows events, netflow), merges existing ECS/tenant data, enriches geo info, and publishes to `normalized-logs`.

3. **Detect**
   - `detection-engine` listens to `normalized-logs` and executes:
     - RuleEngine – deterministic rules for PowerShell abuse, suspicious ports, file encryption, failed auth, etc.
     - MLDetector – IsolationForest placeholders simulating UEBA behavior with per-category feature extraction.
     - IOCMatcher – static IOC feeds for malicious IPs/domains/hashes/processes/URLs.
   - Alerts are sent to `security-alerts` with Kafka ACK handling.

4. **Expose & Respond**
   - `dashboard-api` aggregates events/alerts/assets for APIs or the `web-ui`.
   - `soar-orchestrator` and `connectors` execute playbooks such as ransomware isolation, IOC blocking, ticketing.

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Python 3.9+
- Node.js 18+
- Git + access to a Kafka-compatible environment (provided via Compose)

### Clone & Bootstrap

```bash
git clone https://github.com/nutthakorn7/ndr.git
cd ndr
```

### Environment Variables

Create a `.env` or export variables before running Docker Compose. Key defaults:

```bash
export KAFKA_BROKERS=kafka:9092
export REDIS_URL=redis://redis:6379
export OPENSEARCH_URL=http://opensearch:9200
export CLICKHOUSE_URL=http://clickhouse:8123
export JWT_SECRET="replace-with-secure-value"
export ENABLE_DEMO_USERS=true   # optional (non-prod)
```

### Launch Full Stack (Docker Compose)

```bash
cd deploy
docker-compose up -d
# or
./start-demo.sh   # wraps docker-compose up
```

Services exposed:

- Ingestion Gateway: `http://localhost:8080`
- Dashboard API: `http://localhost:8081`
- AuthZ Service: `http://localhost:8082`
- Web UI: `http://localhost:3000`
- Kafka, Redis, OpenSearch, ClickHouse, PostgreSQL as defined in `deploy/docker-compose.yml`

### Verify Pipeline Locally

```bash
cd tests
python3 test_pipeline.py
```

This script loads `tests/test_data/sample_logs.json`, runs them through rule/ML/IOC detectors, optionally calls the ingestion API (if running), and saves alerts to `tests/test_results.json`.

### Manual Log Submission

```bash
curl -X POST http://localhost:8080/ingest/logs \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-08-15T10:00:00Z",
    "event": { "type": "connection", "category": "network", "action": "connect" },
    "source": { "ip": "192.168.1.10", "port": 12345, "hostname": "workstation01" },
    "destination": { "ip": "8.8.4.4", "port": 4444, "hostname": "suspicious.org" },
    "tenant_id": "company-1"
  }'
```

---

## Configuration

### Global

| Variable | Description | Default |
| --- | --- | --- |
| `KAFKA_BROKERS` | Comma-separated Kafka brokers | `kafka:9092` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `OPENSEARCH_URL` | OpenSearch endpoint | `http://opensearch:9200` |
| `CLICKHOUSE_URL` | ClickHouse HTTP endpoint | `http://clickhouse:8123` |
| `RATE_LIMIT` / `RATE_WINDOW` | Ingestion API rate limiting per IP | `1000 / 60s` |
| `MAX_LOG_SIZE_BYTES` | Per-record payload limit (batch + single) | `1048576` |

### Service-Specific Highlights

- **ingestion-gateway**
  - Rate limiting enforced via Redis counters.
  - Validation uses Joi schemas; extend `logSchema` for new fields.

- **parser-normalizer**
  - Grok patterns defined in `services/parser-normalizer/src/services/parser.js`.
  - Field mappings & enrichment in `normalizer.js`; merges upstream ECS data.

- **detection-engine**
  - Rule definitions live in `detection/rule_engine.py`.
  - IOCs defined in `detection/ioc_matcher.py`.
  - `send_alert` waits for Kafka ACKs; adjust timeouts as needed.

- **authz-service**
  - Requires `JWT_SECRET`. Demo users only enabled when `ENABLE_DEMO_USERS=true` or `NODE_ENV !== production`.

- **UI**
  - `REACT_APP_API_URL` & `REACT_APP_AUTH_URL` configure Dashboard/API endpoints (defaults set in Docker Compose).

---

## Testing & QA

- **Integration Test Harness**  
  `python3 tests/test_pipeline.py` runs detection engines, optional ingestion API checks, and prints a pipeline summary (events processed, alerts by severity/type, MITRE tactics). Results saved to `tests/test_results.json`.

- **API Tests (placeholder)**  
  `pytest tests/api/` – extend with real HTTP tests once services are running.

- **Performance/Load (placeholder)**  
  `tests/performance/load_test.sh` – customize for EPS benchmarking.

CI Recommendation: wire GitHub Actions to execute at least the pipeline test on pull requests.

---

## Detection & Response Features

- **Rule-Based Detections**
  - PowerShell execution with encoded commands
  - Suspicious outbound ports (4444, 6666, 8080, 8888)
  - File encryption extensions (`.encrypted`, `.locked`, `.crypto`)
  - Failed authentication bursts

- **Machine Learning (Simulated UEBA)**
  - Network features: bytes, packets, ports, IP traits
  - Process features: PID/PPID, command line characteristics
  - File features: size, temp directories, executable flags

- **Threat Intelligence / IOC Matching**
  - IPs, domains, hashes (MD5/SHA1/SHA256), process names, URLs
  - Severity scaled by IOC confidence & type

- **SOAR Playbooks**
  - Example: ransomware response (host isolation, IOC blocking, backups verification, forensic capture, stakeholder notification). Extend via `docs/playbooks/`.

- **Performance Targets**
  - ≥6,500 EPS, ≥100 monitored devices, ≥100 GB/day logs
  - Parse accuracy ≥99%, ingest error rate <0.1%

---

## Observability & Operations

- **Health Checks**: `/health` endpoints for ingestion gateway & dashboard API report dependency status (Kafka/Redis/etc.).
- **Metrics**: Prometheus-ready metrics middleware attached to ingestion gateway; extend to other services.
- **Tracing**: OpenTelemetry hooks included conceptually; wire exporters as needed.
- **Logging**: Winston (Node services) and Python logging configured for JSON output; extend with centralized logging stack.
- **Security Controls**
  - Multi-tenant tenant_id partitioning
  - Rate limiting & validation at ingress
  - Audit-friendly logs + MITRE mapping
  - RBAC-ready (auth service issues JWT claims with roles)

---

## Documentation Links

- [API Specifications](docs/api/)
- [Data Schemas](docs/schemas/)
- [Playbook Examples](docs/playbooks/)
- [MITRE ATT&CK Mappings](docs/schemas/mitre-mappings.json)

---

## Recent Updates

- **Parser/Normalizer reliability** – preserves nested ECS fields provided by upstream sources and safely merges user/process/file structures so downstream engines receive full context.
- **Safer ingestion batches** – `/ingest/logs/batch` now validates every log with the Joi schema and enforces a configurable per-record size limit via `MAX_LOG_SIZE_BYTES`.
- **Detection-engine delivery guarantees** – alert publication now waits for Kafka acknowledgements and logs broker failures instead of silently dropping alerts.
- **Auth service hardening** – `authz-service` requires `JWT_SECRET` at startup and only exposes demo accounts when `ENABLE_DEMO_USERS=true` (non-production default only).
- **Portable pipeline tests** – `tests/test_pipeline.py` resolves paths relative to the repo, so the integration harness runs on any workstation or CI runner without edits.

---

For roadmap ideas (multi-tenant isolation, Kubernetes manifests, connector hardening) or contributions, open an issue or submit a PR. Keep the changelog (`CHANGELOG.md`) up to date for all future releases.
