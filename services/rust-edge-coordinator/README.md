# Rust Edge Coordinator

The **Rust Edge Coordinator** is the central management service for the NDR edge computing platform. It orchestrates edge agents, manages their configuration, and monitors their health status.

## Key Features

- **Central Management**: Registry of all connected edge agents.
- **Configuration Management**: Push configuration updates (sampling rates, rules) to agents.
- **Health Monitoring**: Tracks agent heartbeats and online/offline status.
- **Security**:
  - TLS/HTTPS support.
  - API Key authentication for management endpoints.
- **Database**: Uses PostgreSQL for persistent storage of agent state.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service listening port | `8085` |
| `DATABASE_URL` | PostgreSQL connection string | (Required) |
| `COORDINATOR_API_KEY` | Secret key for admin API | (Required for auth) |
| `TLS_ENABLED` | Enable HTTPS | `false` |
| `TLS_CERT_PATH` | Path to TLS certificate | `certs/coordinator.crt` |
| `TLS_KEY_PATH` | Path to TLS private key | `certs/coordinator.key` |

## API Endpoints

### Agent Management
- `POST /edge/register`: Register a new edge agent.
- `POST /edge/heartbeat`: Receive agent heartbeat.
- `GET /edge/agents`: List all registered agents.
- `GET /edge/agents/:id`: Get details for a specific agent.
- `POST /edge/agents/:id/config`: Update agent configuration.

### Monitoring
- `GET /health`: Service health check.
- `GET /metrics`: Prometheus metrics.

## Development

### Prerequisites
- Rust 1.70+
- PostgreSQL 14+

### Database Setup
```bash
# Create database
createdb edge_coordinator

# Run migrations (using sqlx-cli)
sqlx migrate run
```

### Running Locally
```bash
cargo run
```

## Docker Deployment

```bash
docker run -d \
  -e DATABASE_URL=postgres://user:pass@db:5432/edge_coordinator \
  -p 8085:8085 \
  rust-edge-coordinator:latest
```
