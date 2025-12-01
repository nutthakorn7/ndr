# Edge Computing Deployment Guide

This guide explains how to deploy and configure edge computing capabilities in the NDR platform for distributed network monitoring.

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Deployment Options](#deployment-options)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Configuration](#configuration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

The NDR edge computing architecture enables distributed processing at network edges, providing:

- **Reduced Bandwidth**: Local filtering and compression reduce data sent to central servers
- **Offline Resilience**: Local buffering ensures no data loss during network outages
- **Faster Response**: Local threat detection for immediate alerts
- **Scalability**: Support for hundreds of remote sites with limited connectivity

### Components

1. **Edge Agent** (`rust-edge-agent`) - Deployed at remote sites
   - Collects network events from local sensors
   - Buffers data locally using SQLite
   - Performs local threat detection
   - Forwards high-priority events to central infrastructure
   - Compresses and samples data to optimize bandwidth

2. **Edge Coordinator** (`rust-edge-coordinator`) - Central management service
   - Registers and tracks edge agents
   - Distributes configuration and detection rules
   - Monitors edge agent health and metrics
   - Aggregates data from all edges

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Central Infrastructure                    │
│  ┌──────────────┐  ┌──────────┐  ┌────────┐  ┌───────────┐ │
│  │Edge          │  │ Kafka    │  │ Postgres│ │ Dashboard │ │
│  │Coordinator   │←→│          │  │         │ │ API       │ │
│  └──────────────┘  └──────────┘  └────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │ Heartbeat + Forwarding
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼──────┐        ┌────▼──────┐        ┌────▼──────┐
   │Edge Agent │        │Edge Agent │        │Edge Agent │
   │(Site A)   │        │(Site B)   │        │(Site C)   │
   ├───────────┤        ├───────────┤        ├───────────┤
   │• Buffer   │        │• Buffer   │        │• Buffer   │
   │• Detect   │        │• Detect   │        │• Detect   │
   │• Forward  │        │• Forward  │        │• Forward  │
   └───────────┘        └───────────┘        └───────────┘
        ↑                     ↑                     ↑
   Local Sensors         Local Sensors         Local Sensors
```

---

## Deployment Options

### Option 1: Docker Compose (Development/Testing)
Best for: Local development, testing, single-node deployments

### Option 2: Kubernetes (Production)
Best for: Production deployments, high availability, scalability

### Option 3: Standalone Binary (Edge Sites)
Best for: Resource-constrained edge sites, minimal dependencies

---

## Docker Deployment

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available

### Step 1: Start Full Stack

```bash
cd /Users/pop7/Code/NDR
docker-compose up -d
```

This starts:
- Central infrastructure (Postgres, Kafka, OpenSearch)
- Edge Coordinator (port 8085)
- Edge Agent (port 8086) - demo instance

### Step 2: Verify Edge Services

```bash
# Check edge coordinator
curl http://localhost:8085/health
# Expected: {"status":"healthy"}

# Check edge agent
curl http://localhost:8086/health
# Expected: {"status":"healthy","agent_id":"edge-agent-demo",...}

# List registered agents
curl http://localhost:8085/edge/agents
```

### Step 3: Deploy Additional Edge Agents

To simulate multiple edge sites:

```bash
docker run -d \
  --name edge-agent-site2 \
  --network ndr_default \
  -e EDGE_AGENT_ID=edge-agent-site2 \
  -e EDGE_LOCATION=branch-office-2 \
  -e COORDINATOR_URL=http://edge-coordinator:8085 \
  -e KAFKA_BROKERS=kafka:29092 \
  -e KAFKA_TOPIC=edge-events \
  -v edge-site2-data:/var/lib/edge-agent \
  rust-edge-agent:latest
```

### Step 4: Test Event Flow

```bash
# Send test event to edge agent
curl -X POST http://localhost:8086/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "network_event",
    "source_ip": "10.0.0.100",
    "dest_ip": "8.8.8.8",
    "packets_per_second": 1000
  }'

# Expected: {"status":"forwarded","buffered":false}
```

---

## Kubernetes Deployment

### Prerequisites
- Kubernetes 1.24+
- kubectl configured
- Cluster with at least 2 nodes

### Step 1: Deploy Infrastructure

```bash
# Deploy base infrastructure (if not already deployed)
kubectl apply -f k8s/infra/

# Wait for Postgres and Kafka to be ready
kubectl get pods -w
```

### Step 2: Deploy Edge Coordinator

```bash
kubectl apply -f k8s/services/edge-coordinator.yaml

# Verify deployment
kubectl get pods -l app=edge-coordinator
kubectl logs -l app=edge-coordinator
```

### Step 3: Deploy Edge Agents (DaemonSet)

The DaemonSet deploys one agent per node:

```bash
kubectl apply -f k8s/services/edge-agent.yaml

# Verify agents running on all nodes
kubectl get pods -l app=edge-agent -o wide
```

### Step 4: Expose Edge Coordinator

For external edge agents to register:

```bash
# Option A: LoadBalancer (cloud environments)
kubectl patch svc edge-coordinator -p '{"spec":{"type":"LoadBalancer"}}'
kubectl get svc edge-coordinator

# Option B: NodePort (on-premises)
kubectl patch svc edge-coordinator -p '{"spec":{"type":"NodePort"}}'
```

---

## Configuration

### Edge Agent Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `EDGE_AGENT_ID` | Unique agent identifier | `edge-agent-{hostname}` |
| `EDGE_LOCATION` | Physical location | `unknown` |
| `COORDINATOR_URL` | Edge coordinator endpoint | `http://localhost:8085` |
| `KAFKA_BROKERS` | Kafka brokers | `localhost:9092` |
| `KAFKA_TOPIC` | Kafka topic for events | `edge-events` |
| `BUFFER_DB_PATH` | SQLite buffer location | `/var/lib/edge-agent/buffer.db` |
| `MAX_BUFFER_SIZE_MB` | Maximum buffer size | `1024` |
| `HEARTBEAT_INTERVAL_SECS` | Heartbeat frequency | `30` |

### Forwarding Policy

Update forwarding policy via coordinator:

```bash
curl -X POST http://localhost:8085/edge/agents/edge-agent-demo/config \
  -H "Content-Type: application/json" \
  -d '{
    "forwarding_policy": {
      "compression_enabled": true,
      "sampling_rate": 0.1,
      "severity_threshold": "medium",
      "batch_size": 100,
      "batch_timeout_secs": 5
    }
  }'
```

### Detection Rules

Update local detection rules:

```bash
curl -X POST http://localhost:8085/edge/agents/edge-agent-demo/config \
  -H "Content-Type: application/json" \
  -d '{
    "detection_rules": [
      {
        "name": "Suspicious Traffic Spike",
        "severity": "high",
        "pattern": "packets_per_second > 50000",
        "enabled": true
      }
    ]
  }'
```

---

## Testing

### Test 1: Event Ingestion

```bash
# Send event to edge agent
curl -X POST http://localhost:8086/ingest \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test","message":"hello edge"}'
```

### Test 2: Offline Buffering

```bash
# Simulate network failure (stop coordinator)
docker stop edge-coordinator  # or kubectl scale deployment edge-coordinator --replicas=0

# Send events (should buffer locally)
for i in {1..10}; do
  curl -X POST http://localhost:8086/ingest -d "{\"event\":\"offline-$i\"}"
done

# Check buffer status
curl http://localhost:8086/health
# Look for "buffered_events": 10

# Restore coordinator
docker start edge-coordinator  # or kubectl scale deployment edge-coordinator --replicas=2

# Events should automatically forward
```

### Test 3: Agent Metrics

```bash
# View Prometheus metrics
curl http://localhost:8086/metrics | grep edge_agent

# Example metrics:
# edge_agent_events_buffered 150
# edge_agent_events_forwarded 1234
# edge_agent_events_dropped 5
```

---

## Troubleshooting

### Edge Agent Not Registering

**Check coordinator connectivity:**
```bash
docker logs edge-agent | grep -i register
```

**Verify coordinator is running:**
```bash
curl http://edge-coordinator:8085/health
```

### Events Not Forwarding

**Check Kafka connectivity:**
```bash
docker logs edge-agent | grep -i kafka
```

**Check buffer status:**
```bash
curl http://localhost:8086/health
# If buffered_events is growing, Kafka may be unreachable
```

### High Buffer Size

**Check forwarding policy:**
```bash
curl http://localhost:8085/edge/agents/edge-agent-demo
# Review sampling_rate and batch_size
```

**Manually trigger forwarding:**
The buffer forwarder runs every 5 seconds when online. Check logs for errors.

### Agent Shows Offline

**Check heartbeat logs:**
```bash
docker logs edge-agent | grep -i heartbeat
```

**Verify heartbeat interval:**
Default is 30 seconds. Agent marks as offline after 2 minutes without heartbeat.

---

## Monitoring

### Edge Coordinator Metrics

```bash
curl http://localhost:8085/metrics | grep edge_coordinator

# edge_coordinator_agents_registered - Total agents
# edge_coordinator_heartbeats_received - Heartbeat count
```

### List All Agents

```bash
curl http://localhost:8085/edge/agents | jq
```

### Agent Details

```bash
curl http://localhost:8085/edge/agents/edge-agent-demo | jq
```

---

## Best Practices

1. **Sizing**: Allocate buffer size based on expected outage duration
   - Formula: `buffer_size = events_per_sec × outage_duration × avg_event_size`

2. **Sampling**: Use sampling for low-priority events in bandwidth-constrained sites
   - Critical events: `sampling_rate = 1.0` (always forward)
   - Informational: `sampling_rate = 0.1` (10%)

3. **Compression**: Enable for sites with <10 Mbps connectivity

4. **Heartbeat**: Increase interval for satellite/cellular links (e.g., 120 seconds)

5. **Local Detection**: Deploy lightweight rules at edge for faster response

---

## Next Steps

- Configure [forwarding policies](#forwarding-policy) for your use case
- Deploy edge agents at [remote sites](#step-3-deploy-additional-edge-agents)
- Monitor [agent health](#monitoring) via coordinator API
- Integrate with existing [sensors](SENSOR_INSTALL.md)
