#!/usr/bin/env python3
"""
Verification script for Encrypted Traffic Analysis (JA3/HASSH).
Sends Zeek SSL and SSH logs and verifies normalization.
"""

import requests
import json
import time
import sys

INGESTION_URL = "http://localhost:8080"

def send_zeek_ssl_log():
    """Send a Zeek SSL log with JA3 fingerprint"""
    log = {
        "timestamp": "2025-11-27T10:00:00Z",
        "zeek_log_type": "ssl",
        "zeek": {
            "ts": 1638000000.0,
            "uid": "Cabcd1234",
            "id.orig_h": "192.168.1.100",
            "id.orig_p": 54321,
            "id.resp_h": "1.2.3.4",
            "id.resp_p": 443,
            "version": "TLSv12",
            "cipher": "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
            "server_name": "example.com",
            "ja3": "e7d705a3286e19ea42f55823ecd84506",
            "ja3s": "f4febc55ea12b31ae17cfb7e614afda8"
        }
    }
    
    print("📤 Sending Zeek SSL log with JA3...")
    try:
        resp = requests.post(f"{INGESTION_URL}/ingest/logs", json=log, timeout=5)
        resp.raise_for_status()
        print("  ✅ SSL Log ingested")
    except Exception as e:
        print(f"  ❌ Failed to ingest SSL log: {e}")
        sys.exit(1)

def send_zeek_ssh_log():
    """Send a Zeek SSH log with HASSH fingerprint"""
    log = {
        "timestamp": "2025-11-27T10:05:00Z",
        "zeek_log_type": "ssh",
        "zeek": {
            "ts": 1638000300.0,
            "uid": "Cxyzw9876",
            "id.orig_h": "192.168.1.100",
            "id.orig_p": 55555,
            "id.resp_h": "10.0.0.5",
            "id.resp_p": 22,
            "version": 2,
            "auth_success": True,
            "client": "SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5",
            "server": "SSH-2.0-OpenSSH_7.6p1 Ubuntu-4ubuntu0.5",
            "hassh": "28c70c6d669d2a94541909f12d3e3456",
            "hasshServer": "c1c3525db007136f9595b9643dca740b"
        }
    }
    
    print("📤 Sending Zeek SSH log with HASSH...")
    try:
        resp = requests.post(f"{INGESTION_URL}/ingest/logs", json=log, timeout=5)
        resp.raise_for_status()
        print("  ✅ SSH Log ingested")
    except Exception as e:
        print(f"  ❌ Failed to ingest SSH log: {e}")
        sys.exit(1)

def main():
    print("🚀 Starting Encrypted Traffic Analysis Verification")
    print("===================================================")
    
    send_zeek_ssl_log()
    send_zeek_ssh_log()
    
    print("\n⚠️  Please check parser-normalizer logs for 'Normalized encrypted traffic fingerprint'")
    print("    Command: docker logs --tail 20 deploy-parser-normalizer-1")

if __name__ == "__main__":
    main()
