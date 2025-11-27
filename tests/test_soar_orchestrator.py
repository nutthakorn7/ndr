#!/usr/bin/env python3
"""Test script to verify SOAR orchestrator playbook execution"""
import requests
import time
import json

BASE_URL = "http://localhost:8080"

def send_test_log():
    """Send a test log that will trigger a critical alert"""
    print("🚀 Testing SOAR Orchestrator")
    print("=" * 50)
    
    # Send a log that matches the Mimikatz rule (critical severity)
    test_log = {
        "timestamp": "2025-11-27T10:00:00.000Z",
        "source": {
            "ip": "192.168.1.50",
            "hostname": "suspicious-host",
            "port": 50123
        },
        "destination": {
            "ip": "10.0.0.100",
            "port": 445
        },
        "process": {
            "name": "mimikatz.exe",
            "pid": 4567,
            "command_line": "mimikatz.exe sekurlsa::logonpasswords"
        },
        "file": {
            "path": "C:\\\\Users\\\\Admin\\\\Downloads\\\\mimikatz.exe",
            "hash": "8a883a413cbc0c1059e99" # Mimikatz hash
        },
        "event": {
            "type": "process",
            "category": "process",
            "action": "execution"
        },
        "user": {
            "name": "Admin"
        },
        "zeek_log_type": "process",
        "tenant_id": "company-1"
    }
    
    print("📤 Sending test log (Mimikatz execution)...")
    response = requests.post(f"{BASE_URL}/logs", json=test_log)
    
    if response.status_code == 202:
        print("  ✅ Log ingested successfully")
    else:
        print(f"  ❌ Failed with endpoint /logs, trying /ingest...")
        response = requests.post("http://localhost:8080/ingest", json=test_log)
        if response.status_code == 202:
            print("  ✅ Log ingested successfully via /ingest")
        else:
            print(f"  ❌ Failed to ingest log: {response.status_code}")
            print(f"  {response.text}")
            return False
    
    print("\n⏳ Waiting for detection and SOAR processing (10 seconds)...")
    time.sleep(10)
    
    print("\n📋 Check SOAR logs to verify playbook execution:")
    print("   Command: docker logs deploy-soar-orchestrator-1")
    print("\n   Expected to see:")
    print("   - Alert matched playbook: Critical Threat Containment")
    print("   - Executing action: Block malicious IP at firewall")  
    print("   - Executing action: Capture network traffic")
    print("   - Executing action: Create incident ticket")
    print("   - Executing action: Notify SOC team")
    
    return True

if __name__ == "__main__":
    send_test_log()
