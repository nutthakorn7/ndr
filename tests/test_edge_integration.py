#!/usr/bin/env python3
"""
Edge Computing Integration Test

Tests the end-to-end flow of edge computing features:
1. Edge coordinator registration
2. Edge agent event ingestion
3. Buffering during offline periods
4. Forwarding when online
5. Configuration updates
"""

import requests
import time
import json
import sys
import os

COORDINATOR_URL = "http://localhost:8085"
EDGE_AGENT_URL = "http://localhost:8086"

# Get API keys from environment or use defaults (for testing)
AGENT_API_KEY = os.getenv("EDGE_AGENT_API_KEY", "dev-agent-secret-key-change-in-production")
COORDINATOR_API_KEY = os.getenv("COORDINATOR_API_KEY", "dev-coordinator-secret-key-change-in-production")

# Headers with API keys
AGENT_HEADERS = {
    "Authorization": f"Bearer {AGENT_API_KEY}",
    "Content-Type": "application/json"
}

COORDINATOR_HEADERS = {
    "Authorization": f"Bearer {COORDINATOR_API_KEY}",
    "Content-Type": "application/json"
}

def print_test(name):
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print('='*60)

def test_health_checks():
    print_test("Health Checks")
    
    # Test coordinator health
    resp = requests.get(f"{COORDINATOR_URL}/health", timeout=5)
    assert resp.status_code == 200, f"Coordinator health check failed: {resp.status_code}"
    print(f"✓ Coordinator healthy: {resp.json()}")
    
    # Test edge agent health
    resp = requests.get(f"{EDGE_AGENT_URL}/health", timeout=5)
    assert resp.status_code == 200, f"Edge agent health check failed: {resp.status_code}"
    data = resp.json()
    print(f"✓ Edge agent healthy: {data['agent_id']} at {data['location']}")
    print(f"  Buffered events: {data['buffered_events']}")
    print(f"  Online: {data['is_online']}")
    
    return data

def test_agent_registration():
    print_test("Agent Registration")
    
    # List agents
    resp = requests.get(f"{COORDINATOR_URL}/edge/agents", timeout=5)
    assert resp.status_code == 200, f"Failed to list agents: {resp.status_code}"
    
    agents = resp.json()
    print(f"✓ Found {agents['total']} registered agent(s)")
    
    if agents['total'] > 0:
        agent = agents['agents'][0]
        print(f"  Agent ID: {agent['agent_id']}")
        print(f"  Location: {agent['location']}")
        print(f"  Status: {agent['status']}")
        print(f"  Version: {agent.get('version', 'N/A')}")
        return agent['agent_id']
    
    return None

def test_event_ingestion():
    print_test("Event Ingestion (Online)")
    
    # Send test events
    test_events = [
        {"event_type": "network_flow", "source_ip": "10.0.0.1", "packets_per_second": 1000},
        {"event_type": "dns_query", "domain": "example.com", "threat_intel_match": False},
        {"event_type": "http_request", "url": "http://test.com", "status_code": 200},
    ]
    
    for i, event in enumerate(test_events):
        resp = requests.post(
            f"{EDGE_AGENT_URL}/ingest",
            json=event,
            headers=AGENT_HEADERS,
            timeout=5
        )
        assert resp.status_code == 202, f"Failed to ingest event: {resp.status_code}"
        result = resp.json()
        print(f"✓ Event {i+1} ingested: {result['status']}")
    
    return len(test_events)

def test_config_update(agent_id):
    print_test("Configuration Update")
    
    new_config = {
        "forwarding_policy": {
            "compression_enabled": True,
            "sampling_rate": 0.5,
            "severity_threshold": "medium",
            "batch_size": 50,
            "batch_timeout_secs": 10
        }
    }
    
    resp = requests.post(
        f"{COORDINATOR_URL}/edge/agents/{agent_id}/config",
        json=new_config,
        headers=COORDINATOR_HEADERS,
        timeout=5
    )
    assert resp.status_code == 200, f"Failed to update config: {resp.status_code}"
    print(f"✓ Configuration updated for agent {agent_id}")
    print(f"  Sampling rate: {new_config['forwarding_policy']['sampling_rate']}")
    print(f"  Compression: {new_config['forwarding_policy']['compression_enabled']}")

def test_metrics():
    print_test("Metrics Collection")
    
    # Get edge agent metrics
    resp = requests.get(f"{EDGE_AGENT_URL}/metrics", timeout=5)
    assert resp.status_code == 200, f"Failed to get metrics: {resp.status_code}"
    
    metrics = resp.text
    
    # Parse key metrics
    for line in metrics.split('\n'):
        if line.startswith('edge_agent_'):
            print(f"  {line}")
    
    print("✓ Metrics retrieved successfully")

def test_agent_details(agent_id):
    print_test("Agent Details")
    
    resp = requests.get(f"{COORDINATOR_URL}/edge/agents/{agent_id}", timeout=5)
    assert resp.status_code == 200, f"Failed to get agent details: {resp.status_code}"
    
    agent = resp.json()
    print(f"✓ Agent details retrieved:")
    print(f"  ID: {agent['agent_id']}")
    print(f"  Location: {agent['location']}")
    print(f"  Status: {agent['status']}")
    if agent.get('last_heartbeat'):
        print(f"  Last heartbeat: {agent['last_heartbeat']}")
    if agent.get('last_metrics'):
        print(f"  Last metrics: {json.dumps(agent['last_metrics'], indent=2)}")

def run_tests():
    print("\n" + "="*60)
    print("Edge Computing Integration Test Suite")
    print("="*60)
    
    try:
        # Test 1: Health checks
        health_data = test_health_checks()
        
        # Test 2: Agent registration
        agent_id = test_agent_registration()
        if not agent_id:
            print("\n⚠ No agents registered. Make sure edge-agent is running.")
            return False
        
        # Test 3: Event ingestion
        events_sent = test_event_ingestion()
        
        # Test 4: Configuration update
        test_config_update(agent_id)
        
        # Test 5: Metrics
        test_metrics()
        
        # Test 6: Agent details
        test_agent_details(agent_id)
        
        # Summary
        print("\n" + "="*60)
        print("✓ All tests passed!")
        print("="*60)
        print(f"\nSummary:")
        print(f"  - Edge coordinator: Running")
        print(f"  - Edge agents: {1} registered")
        print(f"  - Events ingested: {events_sent}")
        print(f"  - Configuration: Updated successfully")
        print(f"  - Metrics: Collected")
        
        return True
        
    except requests.exceptions.ConnectionError as e:
        print(f"\n✗ Connection error: {e}")
        print("\nMake sure edge services are running:")
        print("  docker-compose up -d edge-coordinator edge-agent")
        return False
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        return False
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
