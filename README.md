# Network Detection and Response (NDR) Platform

This repository hosts a full network detection and response pipeline: high-fidelity sensors (Zeek, Suricata), ingestion and normalization services, rule/ML detection, threat-intel enrichment, SOAR automation, and analyst-facing APIs/UI. Everything is designed for on-prem or self-managed deployments.

---

## Highlights
- **End-to-end pipeline**: sensors → Kafka → parser/normalizer → detection engine → OpenSearch/ClickHouse → APIs/UI.
- **Sensor stack**: Zeek + Suricata containers with Vector forwarding and PCAP ring buffers.
- **Detection engine**: rule logic, ML heuristics (IsolationForest-style scoring), IOC matching.
- **Operations**: sensor-controller API for registration, heartbeats, PCAP exports, plus deployment scripts.
- **Extensibility**: connectors for SOAR playbooks, asset/vuln services, reporting, and UI dashboards.

---

## Repository Layout
```
NDR/
├── deploy/                 # Docker Compose + bootstrap scripts
├── docs/                   # API specs, schemas, playbooks, MITRE mappings
├── sensors/                # Zeek & Suricata images + PCAP utilities
├── services/               # Backend microservices (ingest, parser, detection, controller, etc.)
├── tests/                  # Integration harness & sample data
├── ui/                     # React-based analyst dashboard
├── README.md               # You're here
└── CHANGELOG.md
```

---

## Architecture Overview
1. **Sensors** capture traffic (SPAN/TAP or cloud mirroring), produce ECS-like logs, and forward via Kafka.
2. **Ingestion Gateway** enforces schema validation, rate limits, and publishes to `raw-logs`.
3. **Parser/Normalizer** converts raw events (including Zeek/Suricata) into ECS, enriches geo/IP, and publishes `normalized-logs`.
4. **Detection Engine** runs rule-based checks, ML/UEBA heuristics, and IOC matching; alerts stream to OpenSearch/ClickHouse and `dashboard-api`.
5. **SOAR / Connectors** execute automated response actions (block IP, isolate host, ticketing) and expose APIs for analysts/UI.

Core storage components: OpenSearch (hot alerts/events), ClickHouse (analytics), PostgreSQL (assets/sensors), Redis (cache/limits).

---

## Core Services
| Service | Description | Port |
| --- | --- | --- |
| `sensors/` | Zeek & Suricata containers with Vector + PCAP ring buffer utilities | n/a |
| `ingestion-gateway` | Validates inbound logs, rate limits, and streams to Kafka `raw-logs` | 8080 |
| `parser-normalizer` | Grok/JSON parsing, ECS normalization, geo enrichment | n/a |
| `detection-engine` | Rule/ML/IOC detection worker | n/a |
| `dashboard-api` | REST API for querying events/alerts/assets | 8081 |
| `sensor-controller` | Sensor registration, heartbeats, config, PCAP requests | 8084 |
| `authz-service` | JWT auth demo service | 8082 |
| `soar-orchestrator` | Playbook runner (stub) | 8083 |
| `connectors/` | Stubs for EDR/NGFW/IPS/actions | varies |
| `ui/` | React dashboard | 3000 |

---

## Sensors
- **Zeek Sensor** (`sensors/zeek-sensor/`): Zeek 6 + Vector; JSON logs, Kafka forwarding, BPF filters, PCAP ring.
- **Suricata Sensor** (`sensors/suricata-sensor/`): Suricata 7 + Vector; EVE JSON, TLS/SASL, PCAP ring.
- `pcap-manager.sh`: shared utility to start/stop ring buffers, snapshot recent minutes, or capture specific windows (`/opt/sensor-tools/pcap-manager.sh snapshot 300 /pcap/exports/request.tar.gz`).

### Sensor Controller API (port 8084)
- `POST /sensors/register` – create/update sensor metadata/config.
- `POST /sensors/{id}/heartbeat` – update status/metrics.
- `POST /sensors/{id}/pcap` – enqueue signed PCAP snapshot request; returns object storage URL + signature for sensor to honor.
- `GET /sensors/{id}/pcap/pending` – sensors poll for pending requests (status auto-transitions to `in_progress`).
- `GET /sensors/{id}/pcap` – list requests with status, time range, size, download URL.
- `POST /sensors/{id}/pcap/{requestId}/complete` – sensor reports completion, providing start/end times, size, final link.
- `GET /sensors/{id}/config` – fetch config blob delivered to sensors.

---

## Data Pipeline Flow
1. **Ingest** – `/ingest/logs` (single) and `/ingest/logs/batch` (<=1,000 items) validate with Joi and publish to Kafka (`raw-logs`).
2. **Normalize** – parser consumes `raw-logs` + `zeek-logs` + `suricata-logs`, maps to ECS, enriches IPs, and republishes to `normalized-logs`.
3. **Detect** – detection-engine consumes `normalized-logs`, runs rules (PowerShell, suspicious ports, file encryption, failed auth), ML heuristics (network/process/file features), and IOC matching; alerts go to Kafka `security-alerts` + OpenSearch/ClickHouse via `dashboard-api`.
4. **Respond** – connectors/SOAR orchestrate isolation/blocking/ticketing; analysts use `dashboard-api` + `ui`.

---

## Getting Started
### Prerequisites
- Docker & Docker Compose
- Python 3.9+, Node.js 18+
- Git access to this repo (`https://github.com/nutthakorn7/ndr.git`)

### Clone & Navigate
```bash
git clone https://github.com/nutthakorn7/ndr.git
cd ndr
```

### Environment Variables (example)
```bash
export KAFKA_BROKERS=kafka:9092
export REDIS_URL=redis://redis:6379
export OPENSEARCH_URL=http://opensearch:9200
export CLICKHOUSE_URL=http://clickhouse:8123
export JWT_SECRET="change-me"
export ENABLE_DEMO_USERS=true
export SENSOR_COMMAND_SECRET="sensor-cmd-secret"
export OBJECT_STORAGE_BASE_URL="https://storage.local"
```

### Run with Docker Compose
```bash
cd deploy
docker-compose up -d
# or ./start-demo.sh
```
Services exposed locally:
- Ingestion gateway: `http://localhost:8080`
- Dashboard API: `http://localhost:8081`
- AuthZ: `http://localhost:8082`
- Sensor controller: `http://localhost:8084`
- UI: `http://localhost:3000`
- Kafka/OpenSearch/ClickHouse/Postgres/Redis per compose file

### Pipeline Smoke Test
```bash
cd tests
python3 test_pipeline.py
```
Loads sample events (`tests/test_data/sample_logs.json`), runs detection engines, optionally hits ingestion API (if running), and prints summary (alerts by severity/type). If file output is blocked, the script prints a warning instead of failing.

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

## Configuration Cheat Sheet

| Variable | Description | Default |
| --- | --- | --- |
| `KAFKA_BROKERS` | Kafka bootstrap servers | `kafka:9092` |
| `REDIS_URL` | Redis URL for rate limiting | `redis://redis:6379` |
| `OPENSEARCH_URL` | OpenSearch node | `http://opensearch:9200` |
| `CLICKHOUSE_URL` | ClickHouse HTTP endpoint | `http://clickhouse:8123` |
| `JWT_SECRET` | AuthZ service secret | _required_ |
| `ENABLE_DEMO_USERS` | Allow demo accounts (non-prod) | `true` |
| `SENSOR_COMMAND_SECRET` | HMAC key for sensor controller commands | `ndr-demo-secret` |
| `OBJECT_STORAGE_BASE_URL` | Base URL for sensor-uploaded artifacts | `https://storage.local` |
| `CONTROLLER_URL` | (Sensors) URL of sensor-controller | unset |
| `ZEEK_TOPIC` / `SURICATA_TOPIC` | Kafka topics for sensor logs | `zeek-logs` / `suricata-logs` |
| `MAX_LOG_SIZE_BYTES` | Ingestion payload limit for batch logs | `1048576` |

Sensor-specific knobs (partial list):
| Variable | Description | Default |
| --- | --- | --- |
| `CAPTURE_INTERFACE` | Interface to monitor | `eth0` |
| `PCAP_RING_ENABLED` | Toggle ring buffer | `true` |
| `PCAP_RING_ROTATE_SECONDS` | Rotation interval | `60` |
| `PCAP_RING_FILE_COUNT` | Number of files retained | `20` |
| `PCAP_RING_DIR` | Ring directory | `/pcap/ring` |
| `PCAP_EXPORT_DIR` | Snapshot output dir | `/pcap/exports` |
| `SENSOR_ID` / `TENANT_ID` | Metadata tags for logs | sensor defaults |

---

## Testing & QA
- `tests/test_pipeline.py` – integration harness (rule/ML/IOC engines, optional ingestion API). Outputs summary and (when permitted) writes `tests/test_results.json`.
- TODO: add unit tests per service and GitHub Actions workflows (planned in roadmap).

---

## Detection & Response Features
- **Rules**: PowerShell abuse, suspicious outbound ports (4444/6666/8080/8888), file encryption artifacts (`.encrypted`), failed auth, etc.
- **ML Heuristics**: simple IsolationForest-inspired scoring for network/process/file events.
- **IOC Matching**: static sets for IPs/domains/hashes/processes/URLs; severity based on match confidence.
- **SOAR Playbooks**: example ransomware response (isolation, IOC blocking, backup validation, notifications).

**Performance Targets**: ≥6,500 EPS, ≥100 devices, ≥100 GB/day, ≥99% parse accuracy.

---

## Observability & Operations
- `/health` endpoints per service; vector metrics planned via `/metrics`.
- Sensor-controller tracks heartbeats, status, and PCAP requests (with metadata for UI).
- Logging: Pino/Winston/py logging with structured output; recommend central log aggregation.
- Rate limiting: Redis-based counters in ingestion gateway.
- TLS: define envs for Kafka TLS/SASL, sensor command secrets, etc.

---

## Documentation & References
- `docs/api/*.yaml` – OpenAPI specs for ingestion/dashboard/SOAR APIs.
- `docs/schemas/*.json` – Event/alert schemas + MITRE mappings.
- `docs/playbooks/` – Example SOAR playbooks (e.g., ransomware response).
- `CHANGELOG.md` – release history (hardening updates, sensor features, etc.).

---

## Recent Updates
- Added PCAP ring buffer utilities to Zeek/Suricata sensors (snapshot & capture commands).
- Sensor-controller now supports PCAP request lifecycle (`POST /pcap`, list, completion) with metadata (time range, size, signed commands).
- Parser-normalizer subscribes to `raw-logs`, `zeek-logs`, and `suricata-logs`, mapping Zeek/Suricata fields to ECS.
- Zeek/Suricata sensors forward logs to Kafka with TLS/SASL options and metadata.
- Legacy projects (`Log1`, `Log2`) removed; repo root now contains only the NDR stack.

---

## Roadmap (Sprint Outlook)
1. **Finish Sprint 1**: add PCAP cloud uploads, TLS enrollment automation, sensor dashboards, CI pipelines.
2. **Sprint 2**: advanced detection packs (beaconing, DNS tunneling, TLS anomalies), analytics UI, PCAP download UI.
3. **Sprint 3**: full management plane (updates/licensing), response automation connectors, RBAC.

Contributions/issues welcome. Open a PR or reach out via GitHub issues. Happy hunting!
