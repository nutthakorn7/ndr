# Open NDR Platform

> **Enterprise-grade Network Detection and Response platform built with open-source technologies**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Docker-blue)](https://www.docker.com/)
[![Features](https://img.shields.io/badge/Parity-100%25-brightgreen)](docs/FEATURES.md)

## 🎯 Overview

Open NDR is a comprehensive Network Detection and Response platform that provides real-time threat detection, automated response, and network visibility. Built on proven open-source technologies (Zeek, Suricata, OpenSearch, Kafka), it delivers enterprise-grade security monitoring at scale.

### Key Capabilities

- **🔍 Real-Time Detection**: Rule-based, ML-powered, and IOC matching
- **🔒 Encrypted Traffic Analysis**: JA3/HASSH fingerprinting without decryption
- **🧠 Threat Intelligence**: AlienVault OTX integration with caching
- **🔗 Alert Correlation**: 70-90% noise reduction through intelligent aggregation
- **🎯 Lateral Movement Detection**: APT & ransomware post-compromise activity
- **🤖 SOAR Automation**: Playbook-based automated response
- **📊 Asset Discovery**: Passive network inventory building
- **📈 Advanced Dashboards**: Traffic visualization & threat hunting

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Data Sources                            │
│  Zeek Sensors  │  Suricata IDS  │  Network Taps  │  Endpoints   │
└────────────────┬─────────────────────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │ Ingestion      │
         │ Gateway        │──────┐
         └───────┬────────┘      │
                 │               │
         ┌───────▼────────┐      │
         │ Parser &       │      │
         │ Normalizer     │      │
         └───────┬────────┘      │
                 │               │
         ┌───────▼────────┐      │
         │ Threat         │      │
         │ Enricher (OTX) │      │
         └───────┬────────┘      │
                 │               │
    ┌────────────▼────────┐     │
    │   Detection Engine  │     │
    │ Rules │ ML │ IOC    │     │
    └────────────┬────────┘     │
                 │               │
         ┌───────▼────────┐     │
         │ Alert          │     │
         │ Correlator     │     │
         └───────┬────────┘     │
                 │               │
         ┌───────▼────────┐     │
         │ SOAR           │     │
         │ Orchestrator   │     │
         └───────┬────────┘     │
                 │               │
         ┌───────▼────────┐     │
         │ OpenSearch     │◄────┘
         │ (Storage)      │
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │ Dashboard API  │
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │ Web UI         │
         │ (React+Vite)   │
         └────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- 8GB+ RAM recommended
- Zeek or Suricata generating logs

### 1. Clone & Start

```bash
git clone https://github.com/yourorg/open-ndr.git
cd open-ndr/deploy
docker-compose up -d
```

### 2. Access UI

```bash
# Web UI
http://localhost:3000

# Dashboard API
http://localhost:8081/health
```

### 3. Send Test Data

```bash
# Send sample log
curl -X POST http://localhost:8080/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-01-01T12:00:00Z",
    "source": {"ip": "192.168.1.100", "port": 50000},
    "destination": {"ip": "10.0.0.5", "port": 22},
    "zeek_log_type": "conn",
    "tenant_id": "company-1"
  }'
```

## 📦 Services

| Service | Port | Description |
|---------|------|-------------|
| **ingestion-gateway** | 8080 | Log ingestion endpoint |
| **dashboard-api** | 8081 | REST API for UI |
| **sensor-controller** | 8084 | PCAP management |
| **asset-service** | 8085 | Asset inventory |
| **UI** | 3000 | React dashboard |
| **OpenSearch** | 9200 | Search & storage |
| **Kafka** | 9092 | Event streaming |

## 🔧 Configuration

### Environment Variables

```bash
# Kafka
KAFKA_BROKERS=kafka:9092

# OpenSearch
OPENSEARCH_URL=http://opensearch:9200

# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/security_analytics

# Threat Intel
OTX_API_KEY=your_api_key_here  # Optional

# SOAR
DRY_RUN=true  # Set to false for production
```

### Sensor Setup

Configure Zeek to send logs to the ingestion gateway:

```bash
# In Zeek's node.cfg
[logger]
type=logger
host=localhost
scripts/json-logs  # Enable JSON output

# Forward to NDR
curl -X POST http://ndr-ingestion:8080/ingest \
  -H "Content-Type: application/json" \
  -d @/path/to/zeek/conn.log
```

## 📊 Features

### Detection Coverage

- **Network Protocols**: HTTP, HTTPS, DNS, SSH, RDP, SMB, Kerberos, NTLM
- **MITRE ATT&CK**: 80+ techniques including:
  - T1558 (Kerberos Attacks)
  - T1550 (Pass-the-Hash)
  - T1021 (Lateral Movement)
  - T1046 (Network Discovery)

### Threat Intelligence

- **AlienVault OTX**: Real-time IOC lookups
- **Redis Caching**: 24h TTL to reduce API calls
- **Auto-enrichment**: IPs, domains, file hashes
- **Severity Elevation**: Automatic based on reputation

### Alert Correlation

- **Deduplication**: Time-windowed aggregation (5min)
- **Composite Scoring**: Rule (40%) + Intel (30%) + Asset (20%) + Frequency (10%)
- **Attack Chains**: Multi-stage attack detection
- **Lifecycle Management**: Status tracking, assignments, notes

### SOAR Playbooks

Pre-built playbooks:
- Critical Threat Containment
- Brute Force Response
- Data Exfiltration Block

Actions:
- IP blocking (firewall integration)
- PCAP capture
- Ticket creation (Jira)
- Email/Slack notifications

## 📖 Documentation

- [Architecture Deep Dive](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Operator Runbook](docs/RUNBOOK.md)
- [Feature Comparison](docs/FEATURES.md)

## 🧪 Development

### Running Tests

```bash
# Unit tests
cd services/detection-engine
pytest tests/

# Integration tests
cd tests
python3 test_pipeline.py
```

### Building Services

```bash
# Build specific service
docker-compose build detection-engine

# Rebuild all
docker-compose build
```

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

Built on:
- [Zeek](https://zeek.org/) - Network security monitoring
- [Suricata](https://suricata.io/) - IDS/IPS
- [OpenSearch](https://opensearch.org/) - Search & analytics
- [Kafka](https://kafka.apache.org/) - Event streaming
- [AlienVault OTX](https://otx.alienvault.com/) - Threat intelligence

## 📞 Support

- GitHub Issues: [Report bugs](https://github.com/yourorg/open-ndr/issues)
- Documentation: [Read the docs](https://docs.open-ndr.io)
- Community: [Join Discord](https://discord.gg/open-ndr)

---

**Built with ❤️ for the security community**
