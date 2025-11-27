# Deployment Guide

> Complete deployment guide for Open NDR Platform

## Production Deployment

### System Requirements

**Minimum:**
- 4 CPU cores
- 8GB RAM
- 50GB disk
- Docker 20.10+
- Docker Compose 2.0+

**Recommended:**
- 8+ CPU cores
- 16GB+ RAM
- 200GB+ SSD
- 10Gbps network

### 1. Pre-Deployment Checklist

- [ ] Docker &amp; Docker Compose installed
- [ ] Sufficient disk space (200GB+)
- [ ] Network access to sensors
- [ ] PostgreSQL backup strategy planned
- [ ] Log rotation configured
- [ ] Firewall rules configured

### 2. Clone Repository

```bash
git clone https://github.com/yourorg/open-ndr.git
cd open-ndr
```

### 3. Configure Environment

```bash
cd deploy
cp .env.example .env
nano .env
```

**Essential Variables:**

```bash
# Kafka
KAFKA_BROKERS=kafka:9092

# OpenSearch
OPENSEARCH_URL=http://opensearch:9200

# Database
DATABASE_URL=postgresql://postgres:CHANGE_ME@postgres:5432/security_analytics

# Threat Intel (optional)
OTX_API_KEY=your_otx_api_key

# SOAR
DRY_RUN=true  # Change to false for production automation

# Alert Correlation
AGGREGATION_WINDOW=300  # 5 minutes
ATTACK_CHAIN_WINDOW=3600  # 1 hour
```

### 4. Initialize Database

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Wait for startup
sleep 10

# Initialize schema
docker exec -it deploy-postgres-1 psql -U postgres -d security_analytics -f /docker-entrypoint-initdb.d/init-db.sql
```

### 5. Start Services

```bash
# Start infrastructure
docker-compose up -d zookeeper kafka redis postgres opensearch clickhouse

# Wait for infrastructure
sleep 30

# Start processing services
docker-compose up -d \
  ingestion-gateway \
  parser-normalizer \
  threat-enricher \
  detection-engine \
  alert-correlator \
  soar-orchestrator

# Wait for services
sleep 20

# Start APIs and UI
docker-compose up -d \
  dashboard-api \
  sensor-controller \
  asset-service \
  ui
```

### 6. Verify Deployment

```bash
# Check all services
docker-compose ps

# Check health
curl http://localhost:8081/health
curl http://localhost:8080/health

# Check OpenSearch
curl http://localhost:9200/_cluster/health

# Check Kafka topics
docker exec deploy-kafka-1 kafka-topics.sh --list --bootstrap-server localhost:9092
```

Expected topics:
- `raw-logs`
- `normalized-logs`
- `enriched-logs`
- `alerts`
- `security-alerts`
- `correlated-alerts`

### 7. Configure Log Shippers

#### Zeek Setup

```bash
# On Zeek sensor
# Edit /etc/zeek/node.cfg
[logger]
type=logger
host=localhost

# Install JSON log writer
zeek-config --install json-logs

# Restart Zeek
zeekctl deploy

# Forward logs
tail -f /var/log/zeek/conn.log | \
  jq -c '.' | \
  while read line; do
    curl -X POST http://NDR_HOST:8080/ingest \
      -H "Content-Type: application/json" \
      -d "$line"
  done
```

#### Suricata Setup

```bash
# On Suricata sensor
# Edit /etc/suricata/suricata.yaml
outputs:
  - eve-log:
      enabled: yes
      filetype: regular
      filename: eve.json
      types:
        - alert
        - http
        - dns
        - tls
        - ssh

# Restart Suricata
systemctl restart suricata

# Forward logs
tail -f /var/log/suricata/eve.json | \
  while read line; do
    curl -X POST http://NDR_HOST:8080/ingest \
      -H "Content-Type: application/json" \
      -d "$line"
  done
```

## High Availability Setup

### Kafka Cluster

```yaml
# docker-compose.prod.yaml
services:
  kafka-1:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-1:9092
      
  kafka-2:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_BROKER_ID: 2
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-2:9092
```

### OpenSearch Cluster

```yaml
opensearch-node1:
  image: opensearchproject/opensearch:2.9.0
  environment:
    - cluster.name=ndr-cluster
    - node.name=opensearch-node1
    - discovery.seed_hosts=opensearch-node1,opensearch-node2
    - cluster.initial_cluster_manager_nodes=opensearch-node1,opensearch-node2
    
opensearch-node2:
  image: opensearchproject/opensearch:2.9.0
  environment:
    - cluster.name=ndr-cluster
    - node.name=opensearch-node2
    - discovery.seed_hosts=opensearch-node1,opensearch-node2
```

## Security Hardening

### 1. Enable TLS

```yaml
# Add TLS certificates
services:
  dashboard-api:
    environment:
      - TLS_CERT=/certs/server.crt
      - TLS_KEY=/certs/server.key
    volumes:
      - ./certs:/certs:ro
```

### 2. Network Segmentation

```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true

services:
  ui:
    networks:
      - frontend
      
  kafka:
    networks:
      - backend
```

### 3. Secrets Management

```bash
# Use Docker secrets
echo "postgres_password" | docker secret create db_password -

# Reference in compose
services:
  postgres:
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
```

## Monitoring

### Prometheus Metrics

```yaml
# Add Prometheus exporter
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
      
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
```

### Health Checks

```yaml
services:
  dashboard-api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Backup & Recovery

### Database Backup

```bash
# Daily backup
docker exec deploy-postgres-1 pg_dump -U postgres security_analytics > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i deploy-postgres-1 psql -U postgres security_analytics < backup_20250101.sql
```

### OpenSearch Snapshots

```bash
# Create snapshot repository
curl -X PUT "localhost:9200/_snapshot/ndr_backup" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/mnt/backups/opensearch"
  }
}
'

# Create snapshot
curl -X PUT "localhost:9200/_snapshot/ndr_backup/snapshot_1?wait_for_completion=true"
```

## Scaling

### Horizontal Scaling

```bash
# Scale processing services
docker-compose up -d --scale parser-normalizer=3
docker-compose up -d --scale detection-engine=2
docker-compose up -d --scale threat-enricher=2
```

### Partition Tuning

```bash
# Increase Kafka partitions
docker exec deploy-kafka-1 kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --alter --topic normalized-logs \
  --partitions 6
```

## Troubleshooting

See [RUNBOOK.md](RUNBOOK.md) for common issues and solutions.

## Upgrading

```bash
# Pull latest
git pull origin main

# Rebuild services
docker-compose build

# Rolling update (one service at a time)
docker-compose up -d --no-deps parser-normalizer
docker-compose up -d --no-deps detection-engine
```
