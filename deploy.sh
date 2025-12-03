#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting NDR Platform Deployment${NC}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
if ! command_exists docker; then
    echo "Error: docker is not installed."
    exit 1
fi

if ! command_exists cargo; then
    echo "Error: cargo is not installed."
    exit 1
fi

# Build Rust binaries
echo -e "\n${BLUE}📦 Building Rust Workspace...${NC}"
cargo build --release --workspace

# Build Docker images
echo -e "\n${BLUE}🐳 Building Docker Images...${NC}"
docker-compose build

# Start services
echo -e "\n${BLUE}🚀 Starting Services...${NC}"
docker-compose up -d

echo -e "\n${GREEN}✅ Deployment Complete!${NC}"
echo -e "UI available at: http://localhost"
echo -e "Dashboard API: http://localhost:8081"
echo -e "Grafana (if enabled): http://localhost:3000"
