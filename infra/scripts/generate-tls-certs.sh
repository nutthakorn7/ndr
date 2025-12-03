#!/bin/bash
# Generate self-signed TLS certificates for edge computing services
# For production, use certificates from a trusted CA like Let's Encrypt

set -e

# Configuration
DAYS_VALID=365
CERT_DIR="${1:-./tls-certs}"
COORDINATOR_DOMAIN="${2:-edge-coordinator}"
AGENT_DOMAIN="${3:-edge-agent}"

echo "Generating TLS certificates..."
echo "Certificate directory: $CERT_DIR"
echo "Coordinator domain: $COORDINATOR_DOMAIN"
echo "Agent domain: $AGENT_DOMAIN"
echo "Valid for: $DAYS_VALID days"
echo ""

# Create directories
mkdir -p "$CERT_DIR/coordinator"
mkdir -p "$CERT_DIR/agent"

# Generate CA (Certificate Authority)
echo "1. Generating Certificate Authority (CA)..."
openssl genrsa -out "$CERT_DIR/ca-key.pem" 4096
openssl req -new -x509 -key "$CERT_DIR/ca-key.pem" \
  -out "$CERT_DIR/ca-cert.pem" \
  -days $DAYS_VALID \
  -subj "/C=US/ST=State/L=City/O=NDR/OU=Edge/CN=NDR-CA"

echo "✓ CA certificate generated"
echo ""

# Generate Coordinator certificate
echo "2. Generating Edge Coordinator certificate..."
openssl genrsa -out "$CERT_DIR/coordinator/key.pem" 2048
openssl req -new -key "$CERT_DIR/coordinator/key.pem" \
  -out "$CERT_DIR/coordinator/cert.csr" \
  -subj "/C=US/ST=State/L=City/O=NDR/OU=Edge/CN=$COORDINATOR_DOMAIN"

# Create SAN config for coordinator
cat > "$CERT_DIR/coordinator/san.cnf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $COORDINATOR_DOMAIN
DNS.2 = localhost
DNS.3 = *.local
IP.1 = 127.0.0.1
EOF

openssl x509 -req -in "$CERT_DIR/coordinator/cert.csr" \
  -CA "$CERT_DIR/ca-cert.pem" \
  -CAkey "$CERT_DIR/ca-key.pem" \
  -CAcreateserial \
  -out "$CERT_DIR/coordinator/cert.pem" \
  -days $DAYS_VALID \
  -extensions v3_req \
  -extfile "$CERT_DIR/coordinator/san.cnf"

echo "✓ Coordinator certificate generated"
echo ""

# Generate Agent certificate
echo "3. Generating Edge Agent certificate..."
openssl genrsa -out "$CERT_DIR/agent/key.pem" 2048
openssl req -new -key "$CERT_DIR/agent/key.pem" \
  -out "$CERT_DIR/agent/cert.csr" \
  -subj "/C=US/ST=State/L=City/O=NDR/OU=Edge/CN=$AGENT_DOMAIN"

# Create SAN config for agent
cat > "$CERT_DIR/agent/san.cnf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $AGENT_DOMAIN
DNS.2 = localhost
DNS.3 = *.local
IP.1 = 127.0.0.1
EOF

openssl x509 -req -in "$CERT_DIR/agent/cert.csr" \
  -CA "$CERT_DIR/ca-cert.pem" \
  -CAkey "$CERT_DIR/ca-key.pem" \
  -CAcreateserial \
  -out "$CERT_DIR/agent/cert.pem" \
  -days $DAYS_VALID \
  -extensions v3_req \
  -extfile "$CERT_DIR/agent/san.cnf"

echo "✓ Agent certificate generated"
echo ""

# Set proper permissions
chmod 600 "$CERT_DIR/ca-key.pem"
chmod 600 "$CERT_DIR/coordinator/key.pem"
chmod 600 "$CERT_DIR/agent/key.pem"
chmod 644 "$CERT_DIR"/*.pem
chmod 644 "$CERT_DIR/coordinator/cert.pem"
chmod 644 "$CERT_DIR/agent/cert.pem"

# Display certificate info
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ All certificates generated successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Certificate files:"
echo "  • CA Certificate:        $CERT_DIR/ca-cert.pem"
echo "  • CA Key:                $CERT_DIR/ca-key.pem"
echo "  • Coordinator Cert:      $CERT_DIR/coordinator/cert.pem"
echo "  • Coordinator Key:       $CERT_DIR/coordinator/key.pem"
echo "  • Agent Cert:            $CERT_DIR/agent/cert.pem"
echo "  • Agent Key:             $CERT_DIR/agent/key.pem"
echo ""
echo "Validity: $DAYS_VALID days"
echo ""
echo "To use with Docker Compose:"
echo "  docker-compose up -d"
echo ""
echo "To verify certificates:"
echo "  openssl x509 -in $CERT_DIR/coordinator/cert.pem -text -noout"
echo "  openssl x509 -in $CERT_DIR/agent/cert.pem -text -noout"
echo ""
echo "⚠️  WARNING: These are SELF-SIGNED certificates for development/testing."
echo "    For production, use certificates from a trusted CA like Let's Encrypt."
