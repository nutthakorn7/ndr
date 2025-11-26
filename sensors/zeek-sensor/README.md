# Zeek Sensor Container

Network sensor image that runs Zeek, emits JSON logs, and forwards them to Kafka via Vector. Use it as the foundation for the NDR data plane.

## Features

- Zeek 6.0 with JSON logging enabled by default.
- Optional Suricata/other tooling can be layered later.
- Vector tails Zeek logs and publishes them to a configurable Kafka topic with tenant/sensor metadata.
- Supports live capture (`-i <interface>`) or offline PCAP replay (`-r <file>`).
- Exposes environment variables to control interface, BPF filters, TLS credentials, and tenant identifiers.

## Build

```bash
cd sensors/zeek-sensor
Docker build -t ndr/zeek-sensor .
```

## Run (live capture)

```bash
docker run --net=host \
  -e CAPTURE_INTERFACE=eth0 \
  -e SENSOR_ID=branch-office-1 \
  -e TENANT_ID=customer-a \
  -e KAFKA_BROKERS="kafka1:9092,kafka2:9092" \
  -e KAFKA_TOPIC=zeek-logs \
  -e KAFKA_TLS_ENABLED=true \
  -e KAFKA_CA_PATH=/certs/ca.pem \
  -e KAFKA_CERT_PATH=/certs/sensor.pem \
  -e KAFKA_KEY_PATH=/certs/sensor.key \
  -v /certs:/certs:ro \
  ndr/zeek-sensor
```

## Run (PCAP replay)

```bash
docker run -v $(pwd)/pcaps:/pcaps ndr/zeek-sensor \
  -e PCAP_FILE=/pcaps/test.pcap
```

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `CAPTURE_INTERFACE` | Network interface Zeek should monitor | `eth0` |
| `PCAP_FILE` | Optional PCAP for offline processing | empty |
| `ZEEK_BPF` | BPF filter string | empty |
| `SENSOR_ID` | Unique sensor identifier forwarded with every log | `zeek-sensor` |
| `TENANT_ID` | Tenant/customer identifier | `default` |
| `KAFKA_BROKERS` | Kafka bootstrap servers | `kafka:9092` |
| `KAFKA_TOPIC` | Topic to publish Zeek logs | `zeek-logs` |
| `KAFKA_TLS_ENABLED` | `true` to enable TLS | `false` |
| `KAFKA_{CA,CERT,KEY}_PATH` | TLS material | empty |
| `KAFKA_SECURITY_PROTOCOL` | SASL/TLS protocol if needed | `PLAINTEXT` |
| `KAFKA_SASL_*` | SASL credentials | empty |

## Pipeline Integration

1. Deploy one or more sensor containers near your SPAN/TAP feeds.
2. Ensure Kafka topic `zeek-logs` exists (or customize via `KAFKA_TOPIC`).
3. Update the parser-normalizer to subscribe to `zeek-logs` (see backend README for details) and map Zeek fields into ECS events.
4. Confirm data arrival by querying the dashboard API or OpenSearch index.
