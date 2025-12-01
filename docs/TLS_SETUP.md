# TLS/HTTPS Support for Edge Computing

## Overview

Added TLS/HTTPS support to both edge agent and edge coordinator services to encrypt all communication. TLS is **optional** and can be enabled per service with automatic HTTP fallback.

## Features

✅ **TLS/HTTPS encryption** for edge agent and coordinator  
✅ **Automatic HTTP fallback** if certificates are missing  
✅ **Self-signed certificate generation** for development  
✅ **Production-ready** with support for trusted CA certificates  
✅ **Per-service configuration** - enable TLS independently  
✅ **Docker volume mounts** for certificate management  

---

## Quick Start

### 1. Generate Certificates (Development)

```bash
cd /Users/pop7/Code/NDR

# Generate self-signed certificates
./scripts/generate-tls-certs.sh

# Certificates will be created in ./tls-certs/
```

**Output:**
```
tls-certs/
├── ca-cert.pem        # Certificate Authority
├── ca-key.pem
├── coordinator/
│   ├── cert.pem       # Coordinator certificate
│   └── key.pem
└── agent/
    ├── cert.pem       # Agent certificate
    └── key.pem
```

### 2. Enable TLS in Docker Compose

```bash
# Create .env file or add to existing
cat >> .env << EOF
# Enable TLS for both services
COORDINATOR_TLS_ENABLED=true
AGENT_TLS_ENABLED=true

# Or enable individually
# COORDINATOR_TLS_ENABLED=true
# AGENT_TLS_ENABLED=false
EOF

# Start services
docker-compose up -d edge-coordinator edge-agent
```

### 3. Verify TLS

```bash
# Test HTTPS coordinator
curl https://localhost:8085/health --insecure
# or with CA cert
curl --cacert tls-certs/ca-cert.pem https://localhost:8085/health

# Test HTTPS agent
curl https://localhost:8086/health --insecure
# or with CA cert
curl --cacert tls-certs/ca-cert.pem https://localhost:8086/health
```

---

## Configuration

### Environment Variables

#### Edge Coordinator

| Variable | Description | Default |
|----------|-------------|---------|
| `TLS_ENABLED` | Enable HTTPS | `false` |
| `TLS_CERT_PATH` | Certificate file path | `/etc/edge-coordinator/tls/cert.pem` |
| `TLS_KEY_PATH` | Private key file path | `/etc/edge-coordinator/tls/key.pem` |

#### Edge Agent

| Variable | Description | Default |
|----------|-------------|---------|
| `TLS_ENABLED` | Enable HTTPS | `false` |
| `TLS_CERT_PATH` | Certificate file path | `/etc/edge-agent/tls/cert.pem` |
| `TLS_KEY_PATH` | Private key file path | `/etc/edge-agent/tls/key.pem` |

### Updating Coordinator URL

When TLS is enabled on the coordinator, update agent config:

```bash
# In .env or docker-compose.yml
COORDINATOR_URL=https://edge-coordinator:8085  # Changed from http to https
```

---

## Production Deployment

### Option 1: Let's Encrypt (Recommended)

Use Certbot to get free trusted certificates:

```bash
# Install certbot
sudo apt-get install certbot

# Get certificates for your domain
sudo certbot certonly --standalone \
  -d edge-coordinator.yourdomain.com \
  -d edge-agent.yourdomain.com

# Certificates will be in /etc/letsencrypt/live/
```

**Docker Compose volumes:**
```yaml
volumes:
  - /etc/letsencrypt/live/edge-coordinator.yourdomain.com:/etc/edge-coordinator/tls:ro
```

### Option 2: Corporate CA

Use certificates from your organization's Certificate Authority:

```yaml
edge-coordinator:
  environment:
    - TLS_ENABLED=true
    - TLS_CERT_PATH=/etc/edge-coordinator/tls/cert.pem
    - TLS_KEY_PATH=/etc/edge-coordinator/tls/key.pem
  volumes:
    - /path/to/corporate/certs:/etc/edge-coordinator/tls:ro
```

### Option 3: Cloud Provider Certificates

For AWS, GCP, Azure:
- Use cloud load balancer for TLS termination
- Set `TLS_ENABLED=false` for edge services
- Load balancer handles HTTPS → HTTP forwarding

---

## Kubernetes Deployment

### Using Cert-Manager

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Update Deployments

**edge-coordinator.yaml:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: coordinator-tls
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-coordinator
spec:
  template:
    spec:
      containers:
      - name: edge-coordinator
        env:
        - name: TLS_ENABLED
          value: "true"
        - name: TLS_CERT_PATH
          value: /etc/tls/tls.crt
        - name: TLS_KEY_PATH
          value: /etc/tls/tls.key
        volumeMounts:
        - name: tls-certs
          mountPath: /etc/tls
          readOnly: true
      volumes:
      - name: tls-certs
        secret:
          secretName: coordinator-tls
```

---

## Testing

### Test HTTP → HTTPS Upgrade

```bash
# Start with HTTP
docker-compose up -d

# Verify HTTP works
curl http://localhost:8085/health

# Generate certificates
./scripts/generate-tls-certs.sh

# Enable TLS
echo "COORDINATOR_TLS_ENABLED=true" >> .env
docker-compose restart edge-coordinator

# Verify HTTPS works
curl --cacert tls-certs/ca-cert.pem https://localhost:8085/health
```

### Test Fallback

```bash
# Enable TLS but don't provide certs
export TLS_ENABLED=true
# (certificates missing)

# Service should fall back to HTTP with warning
docker logs edge-coordinator
# Expected: "Failed to load TLS config. Falling back to HTTP."
```

### Test Certificate Validation

```bash
# Valid certificate
curl --cacert tls-certs/ca-cert.pem https://localhost:8085/health
# ✓ Works

# Invalid certificate
curl https://localhost:8085/health
# ✗ SSL certificate problem (unless using --insecure)
```

---

## Troubleshooting

### "Certificate file not found"

**Error:**
```
Failed to load TLS config: Certificate file not found: /etc/edge-coordinator/tls/cert.pem
```

**Solution:**
1. Generate certificates: `./scripts/generate-tls-certs.sh`
2. Verify volume mount in `docker-compose.yml`
3. Check file permissions: `chmod 644 tls-certs/coordinator/cert.pem`

### "Connection refused" with HTTPS

**Check:**
1. Is TLS enabled? `echo $TLS_ENABLED`
2. Are you using `https://` in the URL?
3. Is the service running? `docker ps | grep edge-coordinator`

### "SSL certificate problem: self signed certificate"

**For curl:**
```bash
# Option 1: Use CA cert
curl --cac

ert tls-certs/ca-cert.pem https://localhost:8085/health

# Option 2: Skip verification (development only!)
curl --insecure https://localhost:8085/health
```

**For applications:**
- Install CA certificate in system trust store
- Or configure application to trust the CA cert

### Service falls back to HTTP

**Check logs:**
```bash
docker logs edge-coordinator | grep -i tls
```

**Common reasons:**
- Certificates not found at specified paths
- Invalid certificate format
- Permission denied reading cert files

---

## Security Best Practices

### 1. Certificate Management

✅ **Use trusted CA** in production (Let's Encrypt, DigiCert, etc.)  
✅ **Rotate certificates** before expiration  
✅ **Protect private keys** - chmod 600, never commit to git  
✅ **Use separate certs** for each service  

### 2. Deployment

✅ **Always enable TLS** in production  
✅ **Disable HTTP** endpoints in production firewalls  
✅ **Use strong cipher suites** (default in Rustls)  
✅ **Enable HSTS** header for browsers  

### 3. Monitoring

✅ **Monitor certificate expiration** dates  
✅ **Alert on TLS fallback** events  
✅ **Log all TLS handshake failures**  

---

## Files Modified

### Edge Agent
- [Cargo.toml](file:///Users/pop7/Code/NDR/services/rust-edge-agent/Cargo.toml) - Added axum-server, rustls
- [src/tls.rs](file:///Users/pop7/Code/NDR/services/rust-edge-agent/src/tls.rs) - NEW - TLS configuration
- [src/main.rs](file:///Users/pop7/Code/NDR/services/rust-edge-agent/src/main.rs) - TLS support

### Edge Coordinator
- [Cargo.toml](file:///Users/pop7/Code/NDR/services/rust-edge-coordinator/Cargo.toml) - Added axum-server, rustls
- [src/tls.rs](file:///Users/pop7/Code/NDR/services/rust-edge-coordinator/src/tls.rs) - NEW - TLS configuration
- [src/main.rs](file:///Users/pop7/Code/NDR/services/rust-edge-coordinator/src/main.rs) - TLS support

### Infrastructure
- [scripts/generate-tls-certs.sh](file:///Users/pop7/Code/NDR/scripts/generate-tls-certs.sh) - NEW - Certificate generator
- [docker-compose.yml](file:///Users/pop7/Code/NDR/docker-compose.yml) - TLS configuration

---

## Summary

✅ **TLS/HTTPS support** added to both services  
✅ **Optional & backward compatible** - HTTP still works  
✅ **Self-signed certs** for development included  
✅ **Production-ready** with CA cert support  
✅ **Automatic fallback** prevents downtime  
✅ **Fully documented** with examples  

Communication between edge agents and coordinator can now be **fully encrypted**!
