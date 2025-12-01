# Edge Computing Architecture Diagrams

Visual reference guide for the NDR edge computing platform architecture and deployment scenarios.

---

## Overall Architecture

### Edge Computing Platform Overview

![Edge Architecture Overview](/Users/pop7/.gemini/antigravity/brain/f56be6c8-53a2-42f0-a96d-57f51ff1ee74/edge_architecture_overview_1764599574514.png)

**Key Components:**
- **Edge Agents**: Deployed at remote sites for local data collection and processing
- **Central Coordinator**: Manages agent registration, configuration, and health monitoring
- **Kafka Cluster**: Receives aggregated data from coordinator for processing
- **Local Buffers**: SQLite databases for offline resilience
- **TLS Encryption**: Secure communication between components

---

## Data Flow Pipeline

### Edge Agent Processing

![Edge Data Flow](/Users/pop7/.gemini/antigravity/brain/f56be6c8-53a2-42f0-a96d-57f51ff1ee74/edge_data_flow_1764599714632.png)

**Processing Stages:**
1. **Ingestion**: Collect from multiple sources (sensors, logs, APIs)
2. **Local Detection**: Analyze events for threats (< 1 second)
3. **Priority Assignment**: Critical, High, Medium, Low
4. **Compression & Sampling**: Reduce bandwidth usage
5. **Buffering**: Store locally when offline (SQLite)
6. **Forwarding**: Send to Kafka when online

**Priority-Based Forwarding:**
- 🔴 **Critical**: Always forwarded immediately (100%)
- 🟠 **High**: Forwarded with minimal delay (100%)
- 🟡 **Medium**: Sampled forwarding (50%)
- 🟢 **Low**: Heavily sampled (10%)

---

## Deployment Scenarios

### Scenario 2: Retail Store Chain

![Retail Chain Deployment](/Users/pop7/.gemini/antigravity/brain/f56be6c8-53a2-42f0-a96d-57f51ff1ee74/retail_chain_deployment_1764599602902.png)

**Architecture:**
- Central HQ with coordinator
- 100+ retail locations with edge agents
- Each store monitors: POS, WiFi, IoT devices
- **Bandwidth Reduction**: 70% via compression and sampling
- **Real-time Monitoring**: Centralized security operations center

**Benefits:**
- ✅ Single pane of glass for all locations
- ✅ Reduced WAN bandwidth costs
- ✅ Local threat detection at each store
- ✅ Offline resilience for each location

---

### Scenario 3: Manufacturing Plant

![Manufacturing OT Network](/Users/pop7/.gemini/antigravity/brain/f56be6c8-53a2-42f0-a96d-57f51ff1ee74/manufacturing_ot_network_1764599638127.png)

**Architecture:**
- Air-gapped OT/ICS network (left)
- Edge agent with large buffer (center)
- Thin 1 Mbps link to corporate (right)
- Security barrier/firewall isolation

**Critical Requirements:**
- **99.99% Uptime**: Industrial-grade reliability
- **Sub-500ms Alerts**: Real-time safety monitoring
- **Minimal Bandwidth**: Only critical data forwarded

**Use Cases:**
- SCADA system monitoring
- PLC anomaly detection
- Safety system alerts
- Compliance (IEC 62443)

---

### Scenario 4: Maritime Vessel

![Maritime Satellite Deployment](/Users/pop7/.gemini/antigravity/brain/f56be6c8-53a2-42f0-a96d-57f51ff1ee74/maritime_satellite_deployment_1764599671906.png)

**Extreme Constraints:**
- **Bandwidth**: 256 Kbps satellite
- **Cost**: $15/MB
- **Latency**: 500-800ms
- **Reliability**: 80% (weather dependent)

**Optimization:**
- 10GB local buffer for offline periods
- 99% bandwidth reduction ($15K/month → $150/month)
- Only critical alerts via expensive satellite
- Bulk sync when in port (WiFi/cellular)

**Benefits:**
- ✅ Massive cost savings
- ✅ Continuous monitoring offshore
- ✅ Automatic port synchronization
- ✅ Crew safety alerts even offline

---

### Scenario 10: Smart Building IoT

![Smart Building IoT](/Users/pop7/.gemini/antigravity/brain/f56be6c8-53a2-42f0-a96d-57f51ff1ee74/smart_building_iot_1764599695199.png)

**High-Volume Monitoring:**
- **5,000 IoT devices** across 50 floors
- **10,000 events/second** at peak
- **95% data reduction** through intelligent filtering
- **Auto-scaling**: 3-10 edge agent replicas

**Device Types:**
- 🔴 Security: Cameras, access control (100% monitoring)
- 🟢 Environmental: HVAC, lighting, temperature (5% sampling)
- 🔵 Occupancy: Sensors, motion detectors (10% sampling)

**Kubernetes Deployment:**
- Horizontal pod autoscaler
- Load balancing across replicas
- Real-time critical alerts
- Aggregated low-priority data

---

## Architecture Patterns

### Pattern 1: Hub-and-Spoke

```
           Central Coordinator (Hub)
                    |
        ┌──────────┼──────────┐
        ↓          ↓          ↓
    Agent 1    Agent 2    Agent 3
   (Spoke)    (Spoke)    (Spoke)
```

**Best For**: Retail chains, branch offices, distributed enterprises

---

### Pattern 2: Hierarchical Edge

```
        Corporate Coordinator
                |
        ┌──────┴──────┐
        ↓             ↓
   Regional        Regional
   Coordinator     Coordinator
        |             |
    ┌───┴───┐     ┌───┴───┐
    ↓       ↓     ↓       ↓
  Agent   Agent Agent   Agent
```

**Best For**: Large enterprises, multi-region deployments

---

### Pattern 3: Isolated Edge

```
    Edge Agent (Standalone)
           |
     Local Storage
    (No Central Connection)
```

**Best For**: Air-gapped networks, classified environments, maritime

---

## Related Documentation

- [Deployment Scenarios](file:///Users/pop7/Code/NDR/docs/EDGE_DEPLOYMENT_SCENARIOS.md) - 10 real-world examples
- [Deployment Guide](file:///Users/pop7/Code/NDR/docs/EDGE_DEPLOYMENT.md) - Setup instructions
- [TLS Setup](file:///Users/pop7/Code/NDR/docs/TLS_SETUP.md) - Security configuration
- [Monitoring Guide](file:///Users/pop7/Code/NDR/docs/EDGE_MONITORING.md) - Metrics and dashboards
