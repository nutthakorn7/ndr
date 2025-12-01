# Management Server Installation Guide

This guide explains how to install and configure the NDR Management Server, which consists of all backend services, databases, and the web UI.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
- [Docker Compose Installation](#docker-compose-installation)
- [Kubernetes Installation](#kubernetes-installation)
- [Post-Installation Configuration](#post-installation-configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Hardware Requirements
- **Minimum**: 4 CPU cores, 8GB RAM, 50GB disk space
- **Recommended**: 8 CPU cores, 16GB RAM, 100GB disk space

### Software Requirements
- **Docker**: v20.10 or later
- **Docker Compose**: v2.0 or later (for Docker installation)
- **Kubernetes**: v1.24 or later (for K8s installation)
- **kubectl**: Latest version (for K8s installation)

### Network Requirements
- Ports to expose:
  - `80/443` - Web UI (HTTPS)
  - `8081` - Dashboard API
  - `8084` - Sensor Controller (for sensor registration)

---

## Installation Methods

You can install the Management Server using:
1. **Docker Compose** (Recommended for single-node deployments)
2. **Kubernetes** (Recommended for production/multi-node deployments)

---

## Docker Compose Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/nutthakorn7/ndr.git
cd ndr
```

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cat > .env << EOF
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=ChangeMe123!
POSTGRES_DB=security_analytics

# Security
JWT_SECRET=$(openssl rand -base64 32)

# Admin Account
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=ChangeMe123!

# Logging
RUST_LOG=info
EOF
```

### Step 3: Build and Start Services

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d
```

### Step 4: Wait for Services to Initialize

```bash
# Check service health
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 5: Access the Web UI

Open your browser and navigate to:
- **HTTP**: http://localhost
- **HTTPS**: https://localhost (if SSL configured)

**Default Login:**
- Email: `admin@ndr.local`
- Password: `admin`

> [!WARNING]
> Change the default admin password immediately after first login!

---

## Kubernetes Installation

### Step 1: Prepare Kubernetes Cluster

Ensure you have a running Kubernetes cluster:

```bash
# Verify cluster access
kubectl get nodes
```

### Step 2: Create Namespace (Optional)

```bash
kubectl create namespace ndr
kubectl config set-context --current --namespace=ndr
```

### Step 3: Configure Secrets

Update the secrets in `k8s/base/config.yaml`:

```bash
# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Edit secrets
kubectl create secret generic ndr-secrets \
  --from-literal=postgres-user=postgres \
  --from-literal=postgres-password=YourSecurePassword \
  --from-literal=jwt-secret=$JWT_SECRET
```

### Step 4: Deploy Infrastructure

```bash
# Deploy base configuration
kubectl apply -f k8s/base/

# Deploy databases and infrastructure
kubectl apply -f k8s/infra/

# Wait for infrastructure to be ready
kubectl get pods -w
```

### Step 5: Deploy Application Services

```bash
# Deploy all services
kubectl apply -f k8s/services/

# Verify deployment
kubectl get deployments
kubectl get services
```

### Step 6: Expose the UI

#### Option A: Port Forward (Development)

```bash
kubectl port-forward svc/ui 8080:80
```

Access at: http://localhost:8080

#### Option B: LoadBalancer (Cloud)

Update `k8s/services/ui.yaml`:

```yaml
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 80
```

```bash
kubectl apply -f k8s/services/ui.yaml
kubectl get svc ui  # Get external IP
```

#### Option C: Ingress (Recommended)

Create an Ingress resource:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ndr-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - ndr.yourdomain.com
    secretName: ndr-tls
  rules:
  - host: ndr.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ui
            port:
              number: 80
```

---

## Post-Installation Configuration

### 1. Initialize Database Schema

The services will automatically create database tables on first run. Verify:

```bash
# Docker Compose
docker-compose logs dashboard-api | grep "Database"

# Kubernetes
kubectl logs deployment/dashboard-api | grep "Database"
```

### 2. Configure Sensor Controller Endpoint

Update your firewall to allow sensors to reach:
- **Port 8084** (Sensor Controller)

### 3. Enable SSL/TLS (Production)

#### Docker Compose

1. Generate or obtain SSL certificates
2. Place certificates in `certs/` directory:
   - `certs/server.crt`
   - `certs/server.key`

3. Update `ui/nginx.conf` to enable HTTPS

#### Kubernetes

Use cert-manager to automatically provision certificates:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer (see Ingress example above)
```

---

## Verification

### Check Service Health

```bash
# Docker Compose
curl http://localhost:8081/health

# Kubernetes
kubectl port-forward svc/dashboard-api 8081:8081
curl http://localhost:8081/health
```

Expected response:
```json
{
  "status": "healthy"
}
```

### Run End-to-End Tests

```bash
# Ensure services are running
python3 tests/e2e_test.py
```

---

## Troubleshooting

### Services Won't Start

**Check logs:**
```bash
# Docker
docker-compose logs <service-name>

# Kubernetes
kubectl logs deployment/<service-name>
```

**Common issues:**
- Database connection failed: Ensure Postgres is running and accessible
- Port conflicts: Check if ports 80, 8081, 8084 are already in use

### Cannot Access Web UI

**Check Nginx logs:**
```bash
docker-compose logs ui
```

**Verify port forwarding:**
```bash
curl -I http://localhost
```

### Database Connection Errors

**Verify Postgres is running:**
```bash
# Docker
docker-compose ps postgres

# Kubernetes
kubectl get pods -l app=postgres
```

**Test connection manually:**
```bash
# Docker
docker-compose exec postgres psql -U postgres -d security_analytics

# Kubernetes
kubectl exec -it postgres-0 -- psql -U postgres -d security_analytics
```

---

## Maintenance

### Backup Database

```bash
# Docker Compose
docker-compose exec postgres pg_dump -U postgres security_analytics > backup.sql

# Kubernetes
kubectl exec postgres-0 -- pg_dump -U postgres security_analytics > backup.sql
```

### Restore Database

```bash
# Docker Compose
docker-compose exec -T postgres psql -U postgres security_analytics < backup.sql

# Kubernetes
kubectl exec -i postgres-0 -- psql -U postgres security_analytics < backup.sql
```

### Update Services

```bash
# Docker Compose
git pull
docker-compose build
docker-compose up -d

# Kubernetes
kubectl apply -f k8s/
kubectl rollout restart deployment/<service-name>
```

---

## Next Steps

- [Install Sensors](SENSOR_INSTALL.md)
- [Configure Alert Rules](alert-configuration.md)
- [Set Up Integrations](integrations.md)
