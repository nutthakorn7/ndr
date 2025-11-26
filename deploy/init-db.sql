-- Create databases for different services
CREATE DATABASE IF NOT EXISTS authz;
CREATE DATABASE IF NOT EXISTS assets;
CREATE DATABASE IF NOT EXISTS vulns;

-- Switch to authz database
\c authz;

-- Users and roles tables
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'analyst',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Switch to assets database
\c assets;

-- Asset management tables
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    asset_id VARCHAR(255) UNIQUE NOT NULL,
    hostname VARCHAR(255),
    ip_address INET,
    mac_address MACADDR,
    os_type VARCHAR(100),
    os_version VARCHAR(100),
    asset_type VARCHAR(50) NOT NULL, -- endpoint, server, network_device
    status VARCHAR(50) DEFAULT 'active',
    tags JSONB,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    criteria JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_group_members (
    asset_id INTEGER REFERENCES assets(id),
    group_id INTEGER REFERENCES asset_groups(id),
    PRIMARY KEY (asset_id, group_id)
);

-- Switch to vulns database
\c vulns;

-- Vulnerability management tables
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id SERIAL PRIMARY KEY,
    cve_id VARCHAR(20) UNIQUE,
    vuln_name VARCHAR(255) NOT NULL,
    vuln_type VARCHAR(100),
    severity VARCHAR(20),
    cvss_score DECIMAL(3,1),
    description TEXT,
    discovery_time TIMESTAMP,
    asset_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vulns_cve_id ON vulnerabilities(cve_id);
CREATE INDEX IF NOT EXISTS idx_vulns_asset_id ON vulnerabilities(asset_id);
CREATE INDEX IF NOT EXISTS idx_vulns_severity ON vulnerabilities(severity);