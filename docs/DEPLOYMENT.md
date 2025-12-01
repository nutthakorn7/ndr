# Deployment Guide

## 🐳 Docker Deployment (Recommended)

The easiest way to deploy the NDR Dashboard and its dependencies is using Docker Compose.

### Prerequisites
- Docker Engine (v20.10+)
- Docker Compose (v2.0+)

### Quick Start

1. **Build and Start Services**
   ```bash
   docker-compose up -d --build
   ```

2. **Access the Application**
   - **Dashboard UI**: [http://localhost](http://localhost)
   - **API**: [http://localhost:8081](http://localhost:8081)
   - **OpenSearch**: [http://localhost:9200](http://localhost:9200)

3. **View Logs**
   ```bash
   docker-compose logs -f
   ```

4. **Stop Services**
   ```bash
   docker-compose down
   ```

---

## 🏗️ Architecture

The `docker-compose.yml` orchestrates the following services:

| Service | Internal Port | External Port | Description |
|---------|---------------|---------------|-------------|
| `ui` | 80, 443 | 80, 443 | React frontend (HTTPS enabled) |
| `dashboard-api` | 8081 | 8081 | Rust backend API |
| `opensearch` | 9200 | 9200 | Search engine for events |
| `postgres` | 5432 | 5432 | Relational database for alerts |
| `redis` | 6379 | 6379 | Cache and session store |

### Network Flow
1. User accesses `http://localhost` (Nginx).
2. Nginx redirects to `https://localhost` (Port 443).
3. Nginx serves static assets with **Security Headers** (HSTS, CSP, etc.).
4. API requests (`/api/*`) are proxied to `dashboard-api:8081`.
4. WebSocket requests (`/socket.io/*`) are proxied to `dashboard-api:8081`.
5. `dashboard-api` connects to `opensearch`, `postgres`, and `redis` internally.
   - *Note: Database ports are no longer exposed to the host for security.*

---

## 🔧 Production Configuration

### Security Features Enabled
- **Network Isolation**: Databases are only accessible within the Docker network.
- **HTTP Headers**: Nginx adds HSTS, X-Frame-Options, and Content-Security-Policy.
- **Rate Limiting**: API limits requests to 100 per 15 minutes per IP.
- **Helmet**: API uses Helmet middleware for additional header security.

### Environment Variables
Create a `.env` file in the root directory to override defaults:

```env
# API Configuration
# API Configuration
PORT=8081
RUST_LOG=info

# Database Credentials
POSTGRES_USER=admin
POSTGRES_PASSWORD=secure_password_here
POSTGRES_DB=security_analytics

# OpenSearch
OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g
```

### Security Notes
- **Change Default Passwords**: The default `docker-compose.yml` uses default credentials. Change them for production.
- **SSL/TLS**: The current Nginx config uses HTTP. For production, mount SSL certificates and update `nginx.conf` to listen on 443.
- **Firewall**: Ensure only port 80/443 is exposed to the public internet. Database ports should be restricted.

---

## 🛠️ Troubleshooting

**Container fails to start?**
Check logs: `docker-compose logs <service_name>`

**"Connection Refused" from UI to API?**
Ensure Nginx proxy pass is correctly configured to point to `http://dashboard-api:8081`.

**OpenSearch exits with code 137?**
This usually means OOM (Out of Memory). Increase Docker memory limit or adjust `OPENSEARCH_JAVA_OPTS`.
