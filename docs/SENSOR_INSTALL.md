# Sensor Installation Guide

This guide explains how to install and configure NDR sensors on remote hosts to collect network traffic and forward it to the Management Server.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
- [Docker Installation](#docker-installation)
- [Standalone Binary Installation](#standalone-binary-installation)
- [Sensor Registration](#sensor-registration)
- [Configuration](#configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Overview

NDR sensors are lightweight agents that:
- Capture network traffic using libpcap
- Analyze packets in real-time
- Forward security events to the Management Server
- Support both passive monitoring and inline deployment

---

## Prerequisites

### Hardware Requirements
- **Minimum**: 2 CPU cores, 2GB RAM, 10GB disk space
- **Recommended**: 4 CPU cores, 4GB RAM, 20GB disk space

### Software Requirements
- **OS**: Linux (Ubuntu 20.04+, CentOS 8+, RHEL 8+)
- **Kernel**: 4.15 or later (for eBPF support)
- **Docker**: v20.10 or later (for Docker installation)
- **Rust**: 1.70+ (for standalone binary installation)

### Network Requirements
- Network interface in promiscuous mode
- Outbound connectivity to Management Server:
  - Port `8084` (Sensor Controller)
  - Port `9092` (Kafka - if exposed)

### Permissions
- Root or CAP_NET_RAW capability for packet capture

---

## Installation Methods

Choose one of the following methods:
1. **Docker** (Recommended - easiest deployment)
2. **Standalone Binary** (Recommended for performance)

---

## Docker Installation

### Step 1: Install Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
```

### Step 2: Pull the Sensor Image

```bash
docker pull ghcr.io/nutthakorn7/ndr/rust-sensor:latest
```

Or build locally from source:

```bash
git clone https://github.com/nutthakorn7/ndr.git
cd ndr/services/rust-sensor
docker build -t ndr/rust-sensor:latest .
```

### Step 3: Create Configuration File

Create `/etc/ndr-sensor/config.env`:

```bash
sudo mkdir -p /etc/ndr-sensor

sudo cat > /etc/ndr-sensor/config.env << EOF
# Management Server
CONTROLLER_URL=http://management-server:8084
KAFKA_BROKERS=management-server:9092

# Sensor Configuration
SENSOR_ID=$(hostname)
SENSOR_LOCATION=datacenter-01
CAPTURE_INTERFACE=eth0

# Logging
RUST_LOG=info
EOF
```

### Step 4: Run the Sensor Container

```bash
docker run -d \
  --name ndr-sensor \
  --restart unless-stopped \
  --network host \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  --env-file /etc/ndr-sensor/config.env \
  -v /var/log/ndr:/var/log/ndr \
  ndr/rust-sensor:latest
```

> [!NOTE]
> `--network host` is required for packet capture. The sensor needs direct access to the network interface.

---

## Standalone Binary Installation

### Step 1: Install Dependencies

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y libpcap-dev build-essential pkg-config

# RHEL/CentOS
sudo yum install -y libpcap-devel gcc
```

### Step 2: Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Step 3: Build the Sensor

```bash
git clone https://github.com/nutthakorn7/ndr.git
cd ndr/services/rust-sensor

# Build release binary
cargo build --release

# Install binary
sudo cp target/release/rust-sensor /usr/local/bin/
sudo chmod +x /usr/local/bin/rust-sensor
```

### Step 4: Create Systemd Service

```bash
sudo cat > /etc/systemd/system/ndr-sensor.service << 'EOF'
[Unit]
Description=NDR Sensor
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/rust-sensor
Restart=always
RestartSec=10

# Environment variables
Environment="CONTROLLER_URL=http://management-server:8084"
Environment="KAFKA_BROKERS=management-server:9092"
Environment="SENSOR_ID=sensor-01"
Environment="CAPTURE_INTERFACE=eth0"
Environment="RUST_LOG=info"

[Install]
WantedBy=multi-user.target
EOF
```

### Step 5: Start the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable ndr-sensor
sudo systemctl start ndr-sensor
```

---

## Sensor Registration

### Automatic Registration

Sensors automatically register with the Management Server on first connection. The sensor will:
1. Connect to the Sensor Controller (port 8084)
2. Send registration request with sensor metadata
3. Receive configuration and start forwarding events

### Manual Registration (Optional)

You can pre-register sensors via the Management Server UI:

1. Log in to the Management Server web UI
2. Navigate to **Sensors** > **Add Sensor**
3. Enter sensor details:
   - Sensor ID: `sensor-01`
   - Location: `datacenter-01`
   - Network Interface: `eth0`
4. Copy the registration token
5. Set token in sensor configuration:
   ```bash
   SENSOR_TOKEN=<registration-token>
   ```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CONTROLLER_URL` | Management Server Sensor Controller URL | Required |
| `KAFKA_BROKERS` | Kafka broker addresses | Required |
| `SENSOR_ID` | Unique sensor identifier | `hostname` |
| `SENSOR_LOCATION` | Physical location of sensor | `unknown` |
| `CAPTURE_INTERFACE` | Network interface to monitor | `eth0` |
| `CAPTURE_FILTER` | BPF filter for packet capture | None (all traffic) |
| `RUST_LOG` | Log level (error, warn, info, debug, trace) | `info` |

### Advanced Configuration

#### Packet Capture Filters

To reduce noise and focus on specific traffic:

```bash
# Capture only HTTP/HTTPS traffic
CAPTURE_FILTER="tcp port 80 or tcp port 443"

# Capture traffic to/from specific subnet
CAPTURE_FILTER="net 10.0.0.0/8"

# Exclude certain IPs
CAPTURE_FILTER="not host 10.0.0.1"
```

#### Performance Tuning

For high-traffic environments:

```bash
# Increase buffer size
PCAP_BUFFER_SIZE=16777216  # 16MB

# Enable multi-threaded processing
WORKER_THREADS=4
```

---

## Verification

### Check Sensor Status

#### Docker

```bash
# View logs
docker logs ndr-sensor

# Check if running
docker ps | grep ndr-sensor
```

#### Systemd

```bash
# Check status
sudo systemctl status ndr-sensor

# View logs
sudo journalctl -u ndr-sensor -f
```

### Verify Registration

Check the Management Server logs:

```bash
# Docker Compose
docker-compose logs rust-controller | grep "sensor registered"

# Kubernetes
kubectl logs deployment/rust-controller | grep "sensor registered"
```

Or check via the Web UI:
1. Navigate to **Sensors** page
2. Verify your sensor appears in the list
3. Check status is "Active" with green indicator

### Test Traffic Capture

Generate some test traffic:

```bash
# On the monitored host
curl https://example.com
curl http://google.com
```

Check if events appear in the Management Server UI under **Events** or **Alerts**.

---

## Troubleshooting

### Sensor Not Capturing Traffic

**Check interface is in promiscuous mode:**
```bash
ip link show eth0 | grep PROMISC
```

**Enable promiscuous mode:**
```bash
sudo ip link set eth0 promisc on
```

**Verify pcap permissions:**
```bash
# Check capabilities
sudo getcap /usr/local/bin/rust-sensor

# Set capabilities if missing
sudo setcap cap_net_raw,cap_net_admin=eip /usr/local/bin/rust-sensor
```

### Cannot Connect to Management Server

**Test connectivity:**
```bash
curl http://management-server:8084/health
telnet management-server 8084
```

**Check firewall rules:**
```bash
# Allow outbound traffic
sudo iptables -A OUTPUT -p tcp --dport 8084 -j ACCEPT
```

**Verify DNS resolution:**
```bash
nslookup management-server
```

### High CPU Usage

**Reduce packet capture scope with filters:**
```bash
# Only capture TCP traffic
CAPTURE_FILTER="tcp"

# Sample traffic (capture 1 in every 10 packets)
SAMPLING_RATE=10
```

### Sensor Shows as "Offline"

**Check heartbeat interval:**

The sensor sends heartbeats every 30 seconds. If the Management Server doesn't receive a heartbeat within 2 minutes, it marks the sensor as offline.

**Verify network connectivity:**
```bash
# Ping Management Server
ping management-server

# Check for packet loss
mtr management-server
```

---

## Security Best Practices

### 1. Use Dedicated Service Account

```bash
# Create service account
sudo useradd -r -s /bin/false ndrsensor

# Update systemd service
User=ndrsensor
Group=ndrsensor

# Set capabilities
sudo setcap cap_net_raw,cap_net_admin=eip /usr/local/bin/rust-sensor
```

### 2. Enable TLS for Sensor Communication

Update sensor configuration:

```bash
CONTROLLER_URL=https://management-server:8084
KAFKA_BROKERS=management-server:9093  # TLS port

# Add TLS certificates
TLS_CA_CERT=/etc/ndr-sensor/ca.crt
TLS_CLIENT_CERT=/etc/ndr-sensor/client.crt
TLS_CLIENT_KEY=/etc/ndr-sensor/client.key
```

### 3. Restrict Network Access

Use firewall rules to limit sensor communication:

```bash
# Allow only necessary outbound connections
sudo iptables -A OUTPUT -p tcp --dport 8084 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 9092 -j ACCEPT
sudo iptables -A OUTPUT -j DROP
```

---

## Monitoring

### Health Checks

Sensors expose a health endpoint (if enabled):

```bash
curl http://localhost:9090/health
```

### Metrics

View sensor metrics:

```bash
# Packets captured
curl http://localhost:9090/metrics | grep packets_captured

# Events forwarded
curl http://localhost:9090/metrics | grep events_forwarded
```

---

## Uninstallation

### Docker

```bash
docker stop ndr-sensor
docker rm ndr-sensor
sudo rm -rf /etc/ndr-sensor
```

### Standalone Binary

```bash
sudo systemctl stop ndr-sensor
sudo systemctl disable ndr-sensor
sudo rm /etc/systemd/system/ndr-sensor.service
sudo rm /usr/local/bin/rust-sensor
sudo rm -rf /etc/ndr-sensor
```

---

## Next Steps

- [Configure Alert Rules](alert-configuration.md)
- [Sensor Management](sensor-management.md)
- [Performance Tuning](performance-tuning.md)
