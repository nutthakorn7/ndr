# Rust Edge Agent

The **Rust Edge Agent** is a lightweight, high-performance service designed to run on remote edge devices. It collects security events, buffers them locally to ensure data integrity during network outages, and forwards them to a central coordinator or Kafka cluster.

## Key Features

- **High Performance**: Built with Rust and Tokio for asynchronous I/O.
- **Resilience**: Local SQLite buffering ensures zero data loss during network interruptions.
- **Security**: 
  - TLS/HTTPS encryption for all communications.
  - API Key authentication for ingestion endpoints.
- **Efficiency**: 
  - Smart compression (Gzip) to reduce bandwidth.
  - Configurable sampling and priority-based forwarding.
- **Observability**: Built-in Prometheus metrics and health monitoring.

## Configuration

The service is configured via environment variables or a `.env` file.

| Variable | Description | Default |
|----------|-------------|---------|
| `EDGE_AGENT_ID` | Unique identifier for the agent | `edge-agent-001` |
| `EDGE_LOCATION` | Human-readable location | `Unknown Location` |
| `COORDINATOR_URL` | URL of the central coordinator | `http://localhost:8085` |
| `API_KEY` | Secret key for authentication | (Required for auth) |
| `TLS_ENABLED` | Enable HTTPS | `false` |
| `MAX_BUFFER_SIZE_MB` | Max size of local buffer | `1024` (1GB) |
| `LOG_LEVEL` | Logging verbosity | `info` |

## API Endpoints

### Ingestion
- `POST /ingest`: Ingest a new security event.
  - Headers: `Authorization: Bearer <API_KEY>`
  - Body: JSON event data

### Monitoring
- `GET /health`: Health status check.
- `GET /metrics`: Prometheus metrics.

## Development

### Prerequisites
- Rust 1.70+
- SQLite 3

### Running Locally
```bash
# Install dependencies
cargo build

# Run the service
cargo run
```

### Running Tests
```bash
# Run unit and integration tests
cargo test
```

## Docker Deployment

```bash
docker run -d \
  -e EDGE_AGENT_ID=my-agent \
  -e COORDINATOR_URL=https://coordinator.example.com \
  -v /data/buffer:/var/lib/edge-agent \
  rust-edge-agent:latest
```
