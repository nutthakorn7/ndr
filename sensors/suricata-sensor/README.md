# Suricata Sensor Container

Container appliance that runs Suricata 7, tails `eve.json` with Vector, and pushes enriched events to Kafka. Pair it with the parser-normalizer to feed IDS alerts into the NDR pipeline.

## Features
- Suricata 7 configured for JSON (EVE) output, community-id enabled.
- Vector sidecar forwards logs to Kafka with `sensor_id`/`tenant_id` metadata and TLS/SASL options.
- Supports live capture via AF_PACKET or offline PCAP replay.
- Custom Suricata args/rulesets can be injected via env variables or bind mounts.

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

## Pipeline Integration
1. Create Kafka topic `suricata-logs` (or override `KAFKA_TOPIC`).
2. Update parser-normalizer to subscribe and map Suricata logs (see backend README).
3. Deploy sensor containers near SPAN/TAP feeds or VPC mirrors.
4. Monitor sensor health via future controller service.
