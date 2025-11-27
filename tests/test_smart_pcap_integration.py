#!/usr/bin/env python3
"""
Integration test for Smart PCAP functionality.
Verifies that a critical alert triggers a PCAP request in the sensor controller.
"""

import requests
import json
import time
import uuid
import sys

INGESTION_URL = "http://localhost:8080"
SENSOR_CONTROLLER_URL = "http://localhost:8084"

def register_sensor():
    """Register a dummy sensor to receive PCAP commands"""
    sensor_id = str(uuid.uuid4())
    payload = {
        "id": sensor_id,
        "name": "test-sensor-01",
        "location": "integration-test",
        "tenant_id": "test-tenant"
    }
    print(f"🔌 Registering sensor: {sensor_id}")
    try:
        resp = requests.post(f"{SENSOR_CONTROLLER_URL}/sensors/register", json=payload, timeout=5)
        resp.raise_for_status()
        print("  ✅ Sensor registered")
        return sensor_id
    except Exception as e:
        print(f"  ❌ Failed to register sensor: {e}")
        sys.exit(1)

def send_critical_log(sensor_id):
    """Send a log that triggers a critical alert (Mimikatz)"""
    log = {
        "timestamp": "2025-11-27T10:00:00Z",
        "event": {
            "type": "process",
            "category": "process",
            "action": "create",
            "outcome": "success"
        },
        "file": {
            "path": "C:\\Windows\\System32\\mimikatz.exe",
            "hash": {
                "md5": "098f6bcd4621d373cade4e832627b4f6"
            }
        },
        "process": {
            "name": "mimikatz.exe",
            "pid": 3456,
            "command_line": "mimikatz.exe sekurlsa::logonpasswords",
            "hash": {
                "md5": "098f6bcd4621d373cade4e832627b4f6"
            }
        },
        "user": {
            "name": "system"
        },

        "sensor": {
            "id": sensor_id
        },
        "tenant_id": "test-tenant",
        "raw_log": "Process executed: C:\\Temp\\mimikatz.exe"
    }
    
    print("📤 Sending critical log event...")
    try:
        resp = requests.post(f"{INGESTION_URL}/ingest/logs", json=log, timeout=5)
        resp.raise_for_status()
        print("  ✅ Log ingested")
    except Exception as e:
        print(f"  ❌ Failed to ingest log: {e}")
        sys.exit(1)

def verify_pcap_request(sensor_id):
    """Poll sensor controller for PCAP request"""
    print("🕵️  Polling for PCAP request...")
    start_time = time.time()
    timeout = 30  # seconds
    
    while time.time() - start_time < timeout:
        try:
            resp = requests.get(f"{SENSOR_CONTROLLER_URL}/sensors/{sensor_id}/pcap", timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                requests_list = data.get('requests', [])
                if requests_list:
                    print(f"  ✅ PCAP request found! ID: {requests_list[0]['id']}")
                    print(f"     Status: {requests_list[0]['status']}")
                    print(f"     Object Key: {requests_list[0]['object_key']}")
                    return True
            else:
                print(f"  ⚠️  API Error: {resp.status_code}")
        except Exception as e:
            print(f"  ⚠️  Connection error: {e}")
        
        time.sleep(2)
        print(".", end="", flush=True)
    
    print("\n❌ Timeout waiting for PCAP request")
    return False

def main():
    print("🚀 Starting Smart PCAP Integration Test")
    print("="*40)
    
    # 1. Register Sensor
    sensor_id = register_sensor()
    
    # 2. Send Critical Log
    send_critical_log(sensor_id)
    
    # 3. Verify PCAP Request
    success = verify_pcap_request(sensor_id)
    
    if success:
        print("\n✅ TEST PASSED: Smart PCAP triggered successfully")
        sys.exit(0)
    else:
        print("\n❌ TEST FAILED: No PCAP request generated")
        sys.exit(1)

if __name__ == "__main__":
    main()
