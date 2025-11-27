#!/usr/bin/env python3
"""Test threat intelligence enrichment with known malicious indicators"""
import requests
import time
import json

BASE_URL = "http://localhost:8080"

def test_threat_intel():
    print("🚀 Testing Threat Intelligence Enrichment")
    print("=" * 60)
    
    # Test with a known malicious IP from threat feeds
    # 185.220.101.1 is a known Tor exit node often flagged
    test_log = {
        "timestamp": "2025-11-27T10:00:00.000Z",
        "source": {
            "ip": "192.168.1.100",  # Internal
            "port": 54321
        },
        "destination": {
            "ip": "185.220.101.1",  # Known malicious (Tor exit)
            "port": 443
        },
        "event": {
      "type": "connection",
            "category": "network",
            "action": "connect"
        },
        "network": {
            "protocol": "tcp",
            "bytes": 1500
        },
        "zeek_log_type": "conn",
        "tenant_id": "company-1"
    }
    
    print(f"📤 Sending log with suspicious destination IP: {test_log['destination']['ip']}")
    response = requests.post(f"{BASE_URL}/ingest", json=test_log)
    
    if response.status_code == 202:
        print("  ✅ Log ingested successfully")
    else:
        print(f"  ❌ Failed: {response.status_code}")
        return False
    
    print("\n⏳ Waiting for threat enrichment (15 seconds)...")
    time.sleep(15)
    
    print("\n📋 Expected threat enrichment:")
    print("   - Destination IP checked against AlienVault OTX")
    print("   - threat_intel.ips added to log")
    print("   - threat_intel.is_threat = true if malicious")
    print("   - event.severity elevated if threat detected")
    
    print("\n🔍 Check threat-enricher logs:")
    print("   Command: docker logs deploy-threat-enricher-1 | grep -A 5 'Malicious'")
    
    print("\n🔍 Check enriched-logs topic:")
    print("   The log should now have threat_intel field with OTX data")
    
    return True

if __name__ == "__main__":
    test_threat_intel()
