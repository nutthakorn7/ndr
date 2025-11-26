#!/bin/bash

echo "🚀 Starting Security Analytics Platform Demo"
echo "=========================================="

# Change to deploy directory
cd "$(dirname "$0")"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start the platform
echo "📦 Starting infrastructure services..."
docker-compose up -d zookeeper kafka opensearch clickhouse redis postgres

echo "⏳ Waiting for services to be ready..."
sleep 30

echo "🔧 Starting microservices..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 15

# Check service health
echo "🏥 Checking service health..."

services=("zookeeper:2181" "kafka:9092" "opensearch:9200" "clickhouse:8123" "redis:6379" "postgres:5432")

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if nc -z localhost "$port" 2>/dev/null; then
        echo "  ✅ $name is running on port $port"
    else
        echo "  ❌ $name is not responding on port $port"
    fi
done

echo ""
echo "🌐 Service URLs:"
echo "  - Ingestion API: http://localhost:8080"
echo "  - Dashboard API: http://localhost:8081" 
echo "  - Auth Service: http://localhost:8082"
echo "  - OpenSearch: http://localhost:9200"
echo "  - ClickHouse: http://localhost:8123"

echo ""
echo "📊 To test the pipeline:"
echo "  cd ../tests && python3 test_pipeline.py"

echo ""
echo "🛑 To stop the platform:"
echo "  docker-compose down"

echo ""
echo "✅ Platform started successfully!"