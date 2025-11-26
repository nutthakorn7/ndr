# Suricata Sensor Container

Container appliance that runs Suricata 7, tails `eve.json` with Vector, and pushes enriched events to Kafka. Pair it with the parser-normalizer to feed IDS alerts into the NDR pipeline.

## Features
- Suricata 7 configured for JSON (EVE) output, community-id enabled.
- Vector sidecar forwards logs to Kafka with `sensor_id`/`tenant_id` metadata and TLS/SASL options.
- Supports live capture via AF_PACKET or offline PCAP replay.
- Custom Suricata args/rulesets can be injected via env variables or bind mounts.
- Includes a PCAP ring buffer utility for quick snapshots/export.

## Build
```bash
cd sensors/suricata-sensor
docker build -t ndr/suricata-sensor .
```

## Run (live capture)
```bash
docker run --net=host \
  -e CAPTURE_INTERFACE=eth1 \
  -e SENSOR_ID=core-site-1 \
  -e TENANT_ID=customer-a \
  -e KAFKA_BROKERS="kafka1:9092,kafka2:9092" \
  -e KAFKA_TOPIC=suricata-logs \
  -e KAFKA_TLS_ENABLED=true \
  -v /certs:/certs:ro \
  ndr/suricata-sensor
```

## Run (PCAP replay)
```bash
docker run -v $(pwd)/pcaps:/pcaps ndr/suricata-sensor \
  -e PCAP_FILE=/pcaps/traffic.pcap
```

## Key Environment Variables
| Variable | Description | Default |
| --- | --- | --- |
| `CAPTURE_INTERFACE` | AF_PACKET interface for live monitoring | `eth0` |
| `PCAP_FILE` | Optional PCAP for offline analysis | empty |
| `SURICATA_ARGS` | Extra CLI args (e.g., `-S /rules/custom.rules`) | empty |
| `SENSOR_ID` | Identifier stamped on every log | `suricata-sensor` |
| `TENANT_ID` | Tenant/customer identifier | `default` |
| `KAFKA_BROKERS` | Kafka bootstrap servers | `kafka:9092` |
| `KAFKA_TOPIC` | Kafka topic for Suricata logs | `suricata-logs` |
| TLS/SASL vars | `KAFKA_TLS_ENABLED`, `KAFKA_{CA,CERT,KEY}_PATH`, `KAFKA_SECURITY_PROTOCOL`, `KAFKA_SASL_*` | optional |
| `PCAP_RING_ENABLED` | Enable rotating PCAP capture | `true` |
| `PCAP_RING_ROTATE_SECONDS` | Rotation interval per file | `60` |
| `PCAP_RING_FILE_COUNT` | Number of files to retain | `20` |
| `PCAP_RING_DIR` | Directory storing ring files | `/pcap/ring` |
| `PCAP_EXPORT_DIR` | Where snapshot/capture outputs are written | `/pcap/exports` |
| `CONTROLLER_URL` | Sensor-controller base URL | empty |
| `CONTROLLER_TOKEN` | Optional bearer token for controller API calls | empty |
| `SENSOR_COMMAND_SECRET` | Shared HMAC secret to verify commands | empty |
| `PCAP_COMMAND_POLL_INTERVAL` | Seconds between controller polls | `60` |

### PCAP Ring & Snapshot

Invoke `/opt/sensor-tools/pcap-manager.sh snapshot <seconds> <output.tar.gz>` to bundle the most recent traffic:

```bash
docker exec <container> /opt/sensor-tools/pcap-manager.sh snapshot 300 /pcap/exports/req-$(date +%s).tar.gz
```

For an active capture window:

```bash
docker exec <container> /opt/sensor-tools/pcap-manager.sh capture 60 /pcap/exports/live-$(date +%s).pcap
```

Mount `/pcap/exports` (and `/pcap/ring` if desired) to retrieve the data.

### Controller Integration

Set `CONTROLLER_URL` (and optionally `CONTROLLER_TOKEN`, `SENSOR_COMMAND_SECRET`) to enable automated fulfillment of PCAP requests issued by `sensor-controller`. The sensor agent polls `GET /sensors/{id}/pcap/pending`, snapshots traffic via `pcap-manager.sh`, uploads to the provided URL, and calls the completion endpoint with metadata.

## Pipeline Integration
1. Create Kafka topic `suricata-logs` (or override `KAFKA_TOPIC`).
2. Update parser-normalizer to subscribe and map Suricata logs (see backend README).
3. Deploy sensor containers near SPAN/TAP feeds or VPC mirrors.
4. Monitor sensor health via future controller service.
