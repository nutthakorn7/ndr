#!/bin/bash

# Sensor Registration Payload
PAYLOAD='{
  "id": "test-sensor-01",
  "name": "Test Sensor 01",
  "location": "Test Lab",
  "tenant_id": "default",
  "metadata": {
    "version": "1.0.0",
    "os": "linux"
  },
  "config": {
    "interface": "eth0"
  }
}'

echo "Registering sensor..."
curl -X POST http://localhost:8084/sensors/register \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"

echo -e "\n\nVerifying registration..."
curl -s http://localhost:8084/sensors | grep "test-sensor-01" && echo "SUCCESS: Sensor found" || echo "FAILURE: Sensor not found"
