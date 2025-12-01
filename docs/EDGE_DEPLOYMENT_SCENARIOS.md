# Edge Computing Deployment Scenarios

This guide provides 10 real-world deployment scenarios for the NDR edge computing platform, each with specific configurations and use cases.

---

## Scenario 1: Remote Branch Office (Bandwidth-Constrained)

### Use Case
Branch office with 50 employees, limited 10 Mbps internet connection, needs to monitor all network traffic without overwhelming bandwidth.

### Network Constraints
- **Bandwidth**: 10 Mbps shared connection
- **Latency**: 50-100ms to central datacenter
- **Reliability**: 99% uptime, occasional outages during storms

### Configuration

**Edge Agent Settings:**
```bash
# .env file
EDGE_AGENT_ID=branch-office-chicago
EDGE_LOCATION=Chicago, IL - Branch Office

# High compression, aggressive sampling
COORDINATOR_URL=https://central.company.com:8085
BUFFER_DB_PATH=/var/lib/edge-agent/buffer.db
MAX_BUFFER_SIZE_MB=2048

# TLS enabled for security
TLS_ENABLED=true
API_KEY=xxxx-secret-key-xxxx
```

**Custom Forwarding Policy:**
```json
{
  "compression_enabled": true,
  "sampling_rate": 0.2,
  "severity_threshold": "medium",
  "batch_size": 200,
  "batch_timeout_secs": 30
}
```

### Expected Benefits
- ✅ 80% bandwidth reduction via compression and sampling
- ✅ Zero data loss during internet outages (2GB buffer)
- ✅ Critical threats detected locally in <1 second
- ✅ Only high-priority events forwarded in real-time

---

## Scenario 2: Retail Store Chain (Multi-Site)

### Use Case
100 retail stores, each with POS systems, WiFi for customers, and IoT devices. Central security team needs visibility across all locations.

### Network Constraints
- **Bandwidth**: 20 Mbps per store (shared with customer WiFi)
- **Latency**: Variable (50-200ms)
- **Reliability**: 95% uptime per store

### Deployment Architecture
```
Central HQ (Coordinator)
    ↓
    ├─ Edge Agent (Store 001) → Local sensors
    ├─ Edge Agent (Store 002) → Local sensors
    ├─ Edge Agent (Store 003) → Local sensors
    ...
    └─ Edge Agent (Store 100) → Local sensors
```

### Configuration Script
```bash
#!/bin/bash
# Deploy to all stores

STORES=(
  "store-001:New York"
  "store-002:Los Angeles"
  "store-003:Chicago"
  # ... 100 stores
)

for store in "${STORES[@]}"; do
  IFS=':' read -r id location <<< "$store"
  
  docker run -d \
    --name edge-agent-${id} \
    -e EDGE_AGENT_ID=${id} \
    -e EDGE_LOCATION="${location}" \
    -e COORDINATOR_URL=https://hq.retail.com:8085 \
    -e KAFKA_BROKERS=kafka.retail.com:9092 \
    -e MAX_BUFFER_SIZE_MB=1024 \
    -e API_KEY=${RETAIL_API_KEY} \
    -v /data/edge-agent:/var/lib/edge-agent \
    rust-edge-agent:latest
done
```

### Expected Benefits
- ✅ Centralized monitoring of 100 stores from single dashboard
- ✅ Each store maintains local security even when offline
- ✅ Bandwidth usage reduced by 70% through intelligent filtering
- ✅ Automated PCI-DSS compliance reporting

---

## Scenario 3: Manufacturing Plant (OT/ICS Network)

### Use Case
Industrial facility with SCADA systems, PLCs, and critical manufacturing equipment. Air-gapped from corporate network.

### Network Constraints
- **Bandwidth**: 1 Mbps dedicated link to corporate
- **Latency**: 10-20ms (local fiber)
- **Reliability**: 99.99% required (critical infrastructure)

### Configuration

**High-Priority Local Detection:**
```json
{
  "detection_rules": [
    {
      "name": "Unauthorized PLC Access",
      "severity": "critical",
      "pattern": "modbus_write && !authorized_ip",
      "enabled": true
    },
    {
      "name": "Unusual SCADA Command",
      "severity": "high",
      "pattern": "scada_command && off_hours",
      "enabled": true
    }
  ]
}
```

**Agent Configuration:**
```bash
EDGE_AGENT_ID=factory-floor-01
EDGE_LOCATION=Manufacturing Plant - Building A

# Very aggressive filtering - only critical events
COORDINATOR_URL=https://corporate-soc.company.com:8085
MAX_BUFFER_SIZE_MB=512
BUFFER_DB_PATH=/mnt/ssd/edge-buffer.db

# Sampling: send only critical/high severity
# Low/medium are buffered and sent in daily batches
```

### Docker Compose Override
```yaml
services:
  edge-agent:
    network_mode: host  # Direct access to OT network
    volumes:
      - /mnt/ssd:/var/lib/edge-agent  # Fast SSD for buffering
    environment:
      - SAMPLING_RATE=0.05  # Only 5% of low-priority events
      - SEVERITY_THRESHOLD=high
      - BATCH_TIMEOUT_SECS=3600  # Hourly batches for low-priority
```

### Expected Benefits
- ✅ Critical OT threats detected in <500ms
- ✅ Minimal bandwidth usage (< 100 Kbps average)
- ✅ Complete audit trail even if corporate link fails
- ✅ Compliance with IEC 62443 requirements

---

## Scenario 4: Maritime Vessel (Satellite Connection)

### Use Case
Cargo ship with satellite internet, monitoring crew network and ship systems. Very limited and expensive bandwidth.

### Network Constraints
- **Bandwidth**: 256 Kbps satellite (shared)
- **Latency**: 500-800ms (satellite)
- **Cost**: $15/MB
- **Reliability**: 80% (weather dependent)

### Extreme Optimization Configuration

```bash
# Marine vessel edge agent
EDGE_AGENT_ID=vessel-mv-atlantic-star
EDGE_LOCATION=At Sea - Atlantic Ocean

COORDINATOR_URL=https://fleet.shipping.com:8085
MAX_BUFFER_SIZE_MB=10240  # 10GB buffer for offline periods

# Extreme compression and sampling
COMPRESSION_ENABLED=true
SAMPLING_RATE=0.01  # Only 1% of events
SEVERITY_THRESHOLD=critical  # Only critical alerts via satellite
BATCH_SIZE=1000
BATCH_TIMEOUT_SECS=3600  # Hourly sync when satellite available
```

**Local-Only Processing:**
```json
{
  "local_detection": {
    "enabled": true,
    "store_locally": true,
    "forward_only_critical": true
  },
  "sync_schedule": {
    "critical": "immediate",
    "high": "hourly",
    "medium": "daily",
    "low": "when_in_port"
  }
}
```

### Expected Benefits
- ✅ 99% bandwidth savings ($15K/month → $150/month)
- ✅ Full monitoring during days-long offshore periods
- ✅ Automatic sync when in port (WiFi/cellular)
- ✅ Critical crew threats still alerted in real-time

---

## Scenario 5: Healthcare Clinic (HIPAA Compliance)

### Use Case
Medical clinic with 10 doctors, EHR systems, medical devices. Must comply with HIPAA, needs audit trail.

### Network Constraints
- **Bandwidth**: 50 Mbps fiber
- **Latency**: 20ms to cloud
- **Compliance**: HIPAA, HITECH

### HIPAA-Compliant Configuration

```yaml
edge-agent:
  environment:
    - EDGE_AGENT_ID=clinic-downtown-medical
    - EDGE_LOCATION=Downtown Medical Clinic
    
    # HIPAA Requirements
    - TLS_ENABLED=true  # Encrypted in transit
    - API_KEY=${HIPAA_COMPLIANT_KEY}
    - AUDIT_LOGGING=true
    - DATA_RETENTION_DAYS=2555  # 7 years
    
    # PHI Detection
    - SCAN_FOR_PHI=true
    - REDACT_PHI=true  # Redact before forwarding
    
  volumes:
    - /encrypted/edge-data:/var/lib/edge-agent  # Encrypted volume
```

**Detection Rules for Healthcare:**
```json
{
  "detection_rules": [
    {
      "name": "Unauthorized EHR Access",
      "severity": "critical",
      "pattern": "ehr_access && !authorized_workstation"
    },
    {
      "name": "After-Hours PHI Access",
      "severity": "high",
      "pattern": "phi_access && timestamp > 22:00"
    },
    {
      "name": "Mass PHI Export",
      "severity": "critical",
      "pattern": "ehr_export && records > 100"
    }
  ]
}
```

### Expected Benefits
- ✅ HIPAA-compliant encryption at rest and in transit
- ✅ Automated PHI redaction before cloud forwarding
- ✅ 7-year audit trail with tamper detection
- ✅ Real-time alerts for unauthorized EHR access

---

## Scenario 6: Construction Site (Temporary Deployment)

### Use Case
6-month construction project with temporary network, IoT sensors for safety monitoring, construction equipment.

### Network Constraints
- **Bandwidth**: 4G LTE cellular (variable)
- **Reliability**: 85% (cellular coverage gaps)
- **Duration**: Temporary (6 months)

### Mobile Configuration

```bash
# Quick deployment script
docker run -d \
  --name edge-agent-construction-site-42 \
  --restart unless-stopped \
  -e EDGE_AGENT_ID=construction-site-42 \
  -e EDGE_LOCATION="Highway 101 Bridge Project" \
  -e COORDINATOR_URL=https://corporate.construction.com:8085 \
  -e MAX_BUFFER_SIZE_MB=5120 \
  -e API_KEY=${SITE_API_KEY} \
  \
  # Cellular-optimized settings
  -e COMPRESSION_ENABLED=true \
  -e BATCH_SIZE=500 \
  -e BATCH_TIMEOUT_SECS=300 \
  -e SAMPLING_RATE=0.3 \
  \
  -v construction-site-data:/var/lib/edge-agent \
  rust-edge-agent:latest
```

**Safety Monitoring Rules:**
```json
{
  "detection_rules": [
    {
      "name": "Equipment Safety Alert",
      "severity": "critical",
      "pattern": "iot_sensor_alert && type=safety"
    },
    {
      "name": "Unauthorized Site Access",
      "severity": "high",
      "pattern": "camera_motion && after_hours"
    }
  ]
}
```

### Expected Benefits
- ✅ Deploy in 10 minutes with single command
- ✅ Resilient to cellular outages (5GB buffer)
- ✅ Safety alerts even when offline
- ✅ Easy decommission when project completes

---

## Scenario 7: Mining Operation (Remote/Harsh Environment)

### Use Case
Remote mine site 200km from nearest city, monitoring heavy equipment, environmental sensors, worker safety systems.

### Network Constraints
- **Bandwidth**: Microwave link 2 Mbps (unreliable)
- **Latency**: 100-300ms
- **Reliability**: 70% (equipment failures common)
- **Environment**: Dust, heat, vibration

### Ruggedized Deployment

**Hardware:**
- Industrial mini-PC with edge agent
- UPS with 4-hour battery backup
- Redundant SSD storage (RAID 1)

**Configuration:**
```bash
EDGE_AGENT_ID=mine-site-copper-valley
EDGE_LOCATION=Copper Valley Mine - Sector 7

# Large buffer for extended outages
MAX_BUFFER_SIZE_MB=20480  # 20GB
BUFFER_DB_PATH=/mnt/raid1/edge-buffer.db

# Minimal forwarding during outages
HEARTBEAT_INTERVAL_SECS=300  # 5 min (reduce link usage)
SAMPLING_RATE=0.05
SEVERITY_THRESHOLD=high

# Redundancy
BACKUP_COORDINATOR_URL=https://backup.mining.com:8085
FAILOVER_ENABLED=true
```

**Docker Compose with Health Monitoring:**
```yaml
services:
  edge-agent:
    image: rust-edge-agent:latest
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8086/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    volumes:
      - /mnt/raid1:/var/lib/edge-agent
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M
```

### Expected Benefits
- ✅ Continuous monitoring during week-long outages
- ✅ Critical safety alerts even offline (sent via backup radio)
- ✅ Equipment health data buffered and synced when link restored
- ✅ Compliance with mining safety regulations

---

## Scenario 8: Government Agency (Air-Gapped Network)

### Use Case
Classified government network, completely air-gapped from internet. Needs IDS/IPS monitoring with manual data export.

### Network Constraints
- **Bandwidth**: N/A (air-gapped)
- **Data Transfer**: Manual via approved devices only
- **Compliance**: NIST 800-53, DoD STIGs

### Air-Gapped Configuration

```bash
# No coordinator connection - fully local
EDGE_AGENT_ID=classified-network-building-5
EDGE_LOCATION=Facility Alpha - Secure Zone

# No external connectivity
COORDINATOR_URL=  # Empty - local only mode
KAFKA_BROKERS=  # Empty

# Local-only operation
MODE=standalone
BUFFER_DB_PATH=/secure/storage/edge-buffer.db
MAX_BUFFER_SIZE_MB=51200  # 50GB
EXPORT_PATH=/secure/export/
EXPORT_SCHEDULE=daily
EXPORT_FORMAT=encrypted-archive

# Encryption for export
EXPORT_ENCRYPTION=aes-256-gcm
EXPORT_KEY_ID=gov-export-key-001
```

**Export Script (Runs Daily):**
```bash
#!/bin/bash
# Export collected data for manual transfer

DATE=$(date +%Y%m%d)
EXPORT_FILE="/secure/export/ndr-export-${DATE}.enc"

# Export last 24 hours of data
curl -X POST http://localhost:8086/export \
  -H "X-Export-Period: 24h" \
  -H "X-Export-Key-ID: gov-export-key-001" \
  -o "${EXPORT_FILE}"

# Verify encryption
openssl enc -d -aes-256-gcm -in "${EXPORT_FILE}" -pass env:EXPORT_KEY > /dev/null
if [ $? -eq 0 ]; then
  echo "Export successful: ${EXPORT_FILE}"
  # Place on approved transfer device
  cp "${EXPORT_FILE}" /media/approved-usb/
else
  echo "Export failed verification"
  exit 1
fi
```

### Expected Benefits
- ✅ Full NDR capability on classified networks
- ✅ Compliant with air-gap requirements
- ✅ Encrypted exports for manual transfer
- ✅ Local threat detection with zero internet dependency

---

## Scenario 9: Multi-Cloud Edge (Hybrid Architecture)

### Use Case
Enterprise with workloads across AWS, Azure, GCP. Edge agents in each cloud region forward to central coordinator.

### Network Constraints
- **Bandwidth**: Cloud inter-region links (high)
- **Latency**: 10-100ms depending on region pair
- **Cost**: Data egress charges

### Multi-Cloud Architecture

```
                  Central Coordinator
                  (AWS us-east-1)
                         ↓
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
   Edge Agent       Edge Agent       Edge Agent
   (AWS us-west-2)  (Azure WestEU)   (GCP asia-ne1)
        ↓                ↓                ↓
   Local VPCs      Local VNets      Local VPCs
```

**AWS Deployment (Terraform):**
```hcl
resource "aws_ecs_task_definition" "edge_agent" {
  family = "edge-agent-${var.region}"
  
  container_definitions = jsonencode([{
    name  = "edge-agent"
    image = "rust-edge-agent:latest"
    environment = [
      {
        name  = "EDGE_AGENT_ID"
        value = "aws-${var.region}"
      },
      {
        name  = "EDGE_LOCATION"
        value = "AWS ${var.region}"
      },
      {
        name  = "COORDINATOR_URL"
        value = "https://coordinator.company.com:8085"
      },
      {
        name  = "SAMPLING_RATE"
        value = "0.5"  # 50% to reduce egress costs
      }
    ]
  }])
}
```

**Azure Deployment (ARM Template):**
```json
{
  "type": "Microsoft.ContainerInstance/containerGroups",
  "name": "edge-agent-westeu",
  "properties": {
    "containers": [{
      "name": "edge-agent",
      "properties": {
        "image": "rust-edge-agent:latest",
        "environmentVariables": [
          {"name": "EDGE_AGENT_ID", "value": "azure-westeu"},
          {"name": "EDGE_LOCATION", "value": "Azure West Europe"},
          {"name": "COORDINATOR_URL", "value": "https://coordinator.company.com:8085"}
        ]
      }
    }]
  }
}
```

### Expected Benefits
- ✅ Unified security view across all clouds
- ✅ Reduced data egress costs (50% via sampling)
- ✅ Local detection in each region
- ✅ Cloud-agnostic monitoring

---

## Scenario 10: IoT/Smart Building (Thousands of Devices)

### Use Case
Smart office building with 5,000 IoT devices (sensors, cameras, access control, HVAC). Need to monitor all without overwhelming network.

### Network Constraints
- **Devices**: 5,000 IoT endpoints
- **Bandwidth**: 1 Gbps building uplink (shared)
- **Event Rate**: 10,000 events/second at peak

### High-Volume Configuration

```bash
# Edge agent for building IoT network
EDGE_AGENT_ID=smart-building-hq-tower-1
EDGE_LOCATION=HQ Building - 50 Floors

# Handle high event volume
MAX_BUFFER_SIZE_MB=10240
KAFKA_BROKERS=kafka-cluster.company.com:9092

# Aggressive sampling for low-priority IoT events
SAMPLING_RATE=0.1  # Only 10% of normal events
SEVERITY_THRESHOLD=medium
BATCH_SIZE=5000
BATCH_TIMEOUT_SECS=5

# Performance tuning
WORKERS=8  # Parallel processing
BUFFER_WRITE_BATCH=1000
```

**Tiered Processing:**
```json
{
  "processing_tiers": {
    "critical_devices": {
      "pattern": "device_type IN (fire_alarm, security_camera, access_control)",
      "sampling_rate": 1.0,
      "priority": "critical"
    },
    "environmental": {
      "pattern": "device_type IN (hvac, lighting, temperature)",
      "sampling_rate": 0.05,
      "priority": "low",
      "aggregate": "1min_avg"
    },
    "occupancy": {
      "pattern": "device_type = occupancy_sensor",
      "sampling_rate": 0.1,
      "aggregate": "5min_count"
    }
  }
}
```

**Kubernetes Deployment with Auto-Scaling:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-agent-smart-building
spec:
  replicas: 3  # Multiple instances for redundancy
  template:
    spec:
      containers:
      - name: edge-agent
        image: rust-edge-agent:latest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: edge-agent-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: edge-agent-smart-building
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Expected Benefits
- ✅ Monitor 5,000 devices with minimal bandwidth impact
- ✅ 95% data reduction through intelligent sampling
- ✅ Critical alerts (fire, security) always forwarded
- ✅ Auto-scaling handles peak loads (business hours)

---

## Summary Comparison

| Scenario | Bandwidth | Buffer Size | Sampling | Use Case |
|----------|-----------|-------------|----------|----------|
| Branch Office | 10 Mbps | 2 GB | 20% | Cost optimization |
| Retail Chain | 20 Mbps | 1 GB | 30% | Multi-site visibility |
| Manufacturing | 1 Mbps | 512 MB | 5% | OT/ICS protection |
| Maritime | 256 Kbps | 10 GB | 1% | Satellite costs |
| Healthcare | 50 Mbps | 1 GB | 50% | HIPAA compliance |
| Construction | 4G LTE | 5 GB | 30% | Temporary deployment |
| Mining | 2 Mbps | 20 GB | 5% | Remote/harsh |
| Government | Air-gap | 50 GB | N/A | Classified networks |
| Multi-Cloud | High | 2 GB | 50% | Hybrid architecture |
| Smart Building | 1 Gbps | 10 GB | 10% | High-volume IoT |

---

## Quick Start Templates

### Template 1: Basic Remote Site
```bash
docker run -d \
  --name edge-agent \
  -e EDGE_AGENT_ID=site-001 \
  -e EDGE_LOCATION="Remote Site" \
  -e COORDINATOR_URL=https://coordinator.company.com:8085 \
  rust-edge-agent:latest
```

### Template 2: High-Security
```bash
docker run -d \
  --name edge-agent \
  -e TLS_ENABLED=true \
  -e API_KEY=${SECURE_KEY} \
  -e SAMPLING_RATE=1.0 \
  -v /encrypted:/var/lib/edge-agent \
  rust-edge-agent:latest
```

### Template 3: Bandwidth-Constrained
```bash
docker run -d \
  --name edge-agent \
  -e COMPRESSION_ENABLED=true \
  -e SAMPLING_RATE=0.1 \
  -e MAX_BUFFER_SIZE_MB=5120 \
  rust-edge-agent:latest
```

---

## Next Steps

1. **Choose Your Scenario** - Pick the one matching your use case
2. **Customize Configuration** - Adjust sampling, buffer size, etc.
3. **Test in Staging** - Deploy to test environment first
4. **Monitor Metrics** - Use Grafana dashboards
5. **Iterate** - Adjust based on bandwidth/performance

For more details, see:
- [EDGE_DEPLOYMENT.md](file:///Users/pop7/Code/NDR/docs/EDGE_DEPLOYMENT.md)
- [TLS_SETUP.md](file:///Users/pop7/Code/NDR/docs/TLS_SETUP.md)
- [EDGE_MONITORING.md](file:///Users/pop7/Code/NDR/docs/EDGE_MONITORING.md)
