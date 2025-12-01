# API Key Authentication - Quick Start Guide

## Overview

API key authentication has been added to both edge agent and edge coordinator services to secure the ingestion and management endpoints.

## How It Works

- **SHA-256 Hashing**: API keys are hashed using SHA-256 before storage
- **Bearer Token**: Supports `Authorization: Bearer <api-key>` header
- **Alternative Header**: Also supports `X-API-Key: <api-key>` header
- **Metrics**: Tracks successful/failed authentication attempts

## Setup

### 1. Edge Agent Authentication

Secures the `/ingest` endpoint.

**Set API Key:**
```bash
# In docker-compose
EDGE_AGENT_API_KEY=your-secret-key-here

# Or as environment variable
export API_KEY=your-secret-key-here
```

**Test with Authentication:**
```bash
curl -X POST http://localhost:8086/ingest \
  -H "Authorization: Bearer your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test"}'
```

**Without API key (will fail):**
```bash
curl -X POST http://localhost:8086/ingest \
  -d '{"event_type":"test"}'
# Returns: 401 Unauthorized
```

### 2. Edge Coordinator Authentication

Secures configuration management endpoint (`/edge/agents/:id/config`).

**Note**: Registration and heartbeat endpoints remain **unauthenticated** so edge agents can connect freely.

**Set API Key:**
```bash
# In docker-compose
COORDINATOR_API_KEY=your-coordinator-secret-key

# Or as environment variable
export COORDINATOR_API_KEY=your-coordinator-secret-key
```

**Update Configuration (requires auth):**
```bash
curl -X POST http://localhost:8085/edge/agents/edge-agent-demo/config \
  -H "Authorization: Bearer your-coordinator-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "forwarding_policy": {
      "compression_enabled": true,
      "sampling_rate": 0.5
    }
  }'
```

## Production Deployment

### Generate Secure Keys

```bash
# Generate strong API keys
EDGE_AGENT_API_KEY=$(openssl rand -base64 32)
COORDINATOR_API_KEY=$(openssl rand -base64 32)

# Store in .env file
echo "EDGE_AGENT_API_KEY=${EDGE_AGENT_API_KEY}" >> .env
echo "COORDINATOR_API_KEY=${COORDINATOR_API_KEY}" >> .env
```

### Docker Compose Production

```bash
# Create .env file with keys
cat > .env << EOF
EDGE_AGENT_API_KEY=$(openssl rand -base64 32)
COORDINATOR_API_KEY=$(openssl rand -base64 32)
EOF

# Start services (will use .env automatically)
docker-compose up -d edge-coordinator edge-agent
```

### Kubernetes Secrets

```bash
# Create secrets
kubectl create secret generic edge-agent-api-key \
  --from-literal=api-key=$(openssl rand -base64 32)

kubectl create secret generic coordinator-api-key \
  --from-literal=api-key=$(openssl rand -base64 32)
```

Update `k8s/services/edge-agent.yaml`:
```yaml
env:
- name: API_KEY
  valueFrom:
    secretKeyRef:
      name: edge-agent-api-key
      key: api-key
```

Update `k8s/services/edge-coordinator.yaml`:
```yaml
env:
- name: COORDINATOR_API_KEY
  valueFrom:
    secretKeyRef:
      name: coordinator-api-key
      key: api-key
```

## Testing Authentication

### Test Script

```bash
#!/bin/bash

API_KEY="your-secret-key-here"
AGENT_URL="http://localhost:8086"

# Test with valid key
echo "Testing with valid API key..."
curl -X POST $AGENT_URL/ingest \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"test":"data"}' \
  && echo "✓ Success" || echo "✗ Failed"

# Test without key
echo -e "\nTesting without API key..."
curl -X POST $AGENT_URL/ingest \
  -d '{"test":"data"}' \
  && echo "✗ Should have failed!" || echo "✓ Correctly rejected"

# Test with invalid key
echo -e "\nTesting with invalid API key..."
curl -X POST $AGENT_URL/ingest \
  -H "Authorization: Bearer wrong-key" \
  -d '{"test":"data"}' \
  && echo "✗ Should have failed!" || echo "✓ Correctly rejected"
```

## Monitoring

### Check Authentication Metrics

```bash
# Edge agent metrics
curl http://localhost:8086/metrics | grep auth

# Expected output:
# edge_agent_auth_success 150
# edge_agent_auth_failed 3

# Edge coordinator metrics
curl http://localhost:8085/metrics | grep auth

# Expected output:
# edge_coordinator_auth_success 45
# edge_coordinator_auth_failed 2
```

## Backward Compatibility

**If no API key is configured:**
- Services will start normally
- Authentication is **disabled**
- Warning logged: `"API key authentication disabled"`

**This allows:**
- Gradual rollout
- Development without keys
- No breaking changes to existing deployments

**For production**: Always set API keys!

## Security Best Practices

1. **Use Strong Keys**: Minimum 32 bytes of random data
2. **Rotate Regularly**: Change keys every 90 days
3. **Use Secrets Management**: Don't hardcode keys in config files
4. **Monitor Failed Attempts**: Alert on high authentication failure rates
5. **Use HTTPS**: Always use TLS in production (prevents key interception)

## Troubleshooting

### "401 Unauthorized" Error

**Check:**
1. Is API key set? `echo $API_KEY`
2. Is key in request header? Check curl command
3. Are you using correct header name? (`Authorization` or `X-API-Key`)
4. Is it prefixed with `Bearer `? (for Authorization header)

**Debug:**
```bash
# Check agent logs
docker logs edge-agent | grep -i auth

# Look for:
# "API key authentication enabled" - Good!
# "Missing API key in request" - Add header
# "Invalid API key provided" - Wrong key
```

### API Key Not Working After Update

**Restart services** to load new environment variables:
```bash
docker-compose restart edge-agent edge-coordinator
```

## Next Steps

- ✅ API key authentication implemented
- 🔄 **Next**: Add TLS/HTTPS encryption
- 🔄 **Next**: Implement mTLS for agent-coordinator communication
- 🔄 **Next**: Add rate limiting to prevent brute force
