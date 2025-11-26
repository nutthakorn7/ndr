#!/usr/bin/env python3
"""
Test script to demonstrate the complete log ingestion pipeline
"""

import json
import asyncio
import requests
import time
import sys
import os
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve()
REPO_ROOT = CURRENT_DIR.parent.parent

# Add the detection engine to path for testing
sys.path.append(str(REPO_ROOT / 'services/detection-engine/src'))

from detection.rule_engine import RuleEngine
from detection.ml_detector import MLDetector
from detection.ioc_matcher import IOCMatcher

class PipelineTest:
    def __init__(self):
        self.ingestion_url = "http://localhost:8080"
        self.dashboard_url = "http://localhost:8081"
        self.test_data_path = REPO_ROOT / 'tests/test_data/sample_logs.json'
        self.results_path = REPO_ROOT / 'tests/test_results.json'
        
        # Initialize detection engines for local testing
        self.rule_engine = RuleEngine()
        self.ml_detector = MLDetector()
        self.ioc_matcher = IOCMatcher()
    
    def load_test_data(self):
        """Load sample log data"""
        with open(self.test_data_path, 'r') as f:
            return json.load(f)
    
    async def test_detection_engines(self, events):
        """Test detection engines with sample events"""
        print("\n=== Testing Detection Engines ===")
        
        all_alerts = []
        
        for event in events:
            print(f"\nProcessing event: {event['event']['type']} - {event.get('process', {}).get('name', event.get('destination', {}).get('hostname', 'N/A'))}")
            
            # Test rule engine
            rule_alerts = await self.rule_engine.evaluate(event)
            if rule_alerts:
                print(f"  🔍 Rule alerts: {len(rule_alerts)}")
                for alert in rule_alerts:
                    print(f"    - {alert['title']} (severity: {alert['severity']})")
                all_alerts.extend(rule_alerts)
            
            # Test ML detector
            ml_alerts = await self.ml_detector.detect_anomalies(event)
            if ml_alerts:
                print(f"  🤖 ML alerts: {len(ml_alerts)}")
                for alert in ml_alerts:
                    print(f"    - {alert['title']} (score: {alert.get('ml_score', 'N/A')})")
                all_alerts.extend(ml_alerts)
            
            # Test IOC matcher
            ioc_alerts = await self.ioc_matcher.match(event)
            if ioc_alerts:
                print(f"  🎯 IOC alerts: {len(ioc_alerts)}")
                for alert in ioc_alerts:
                    iocs = alert.get('iocs', [])
                    print(f"    - {alert['title']} ({len(iocs)} IOCs matched)")
                    for ioc in iocs[:2]:  # Show first 2 IOCs
                        print(f"      * {ioc['type']}: {ioc['value']}")
                all_alerts.extend(ioc_alerts)
        
        return all_alerts
    
    def test_ingestion_api(self, events):
        """Test the ingestion API (if running)"""
        print("\n=== Testing Ingestion API ===")
        
        try:
            # Test health endpoint
            response = requests.get(f"{self.ingestion_url}/health", timeout=5)
            print(f"Health check: {response.status_code}")
            
            # Test single log ingestion
            test_event = events[0]
            response = requests.post(
                f"{self.ingestion_url}/ingest/logs",
                json=test_event,
                timeout=5
            )
            print(f"Single log ingestion: {response.status_code}")
            if response.status_code == 202:
                print("  ✅ Log accepted for processing")
            
            # Test batch ingestion
            response = requests.post(
                f"{self.ingestion_url}/ingest/logs/batch",
                json={"logs": events[:3]},
                timeout=5
            )
            print(f"Batch log ingestion: {response.status_code}")
            if response.status_code == 202:
                print("  ✅ Batch logs accepted for processing")
        
        except requests.exceptions.ConnectionError:
            print("  ⚠️  Ingestion API not running - skipping API tests")
        except Exception as e:
            print(f"  ❌ Error testing API: {e}")
    
    def generate_pipeline_summary(self, events, alerts):
        """Generate pipeline processing summary"""
        print("\n" + "="*60)
        print("SECURITY ANALYTICS PIPELINE SUMMARY")
        print("="*60)
        
        # Event statistics
        event_types = {}
        for event in events:
            event_type = event['event']['type']
            event_types[event_type] = event_types.get(event_type, 0) + 1
        
        print(f"\n📊 Events Processed: {len(events)}")
        for event_type, count in event_types.items():
            print(f"  - {event_type}: {count}")
        
        # Alert statistics
        alert_severities = {}
        detection_types = {}
        for alert in alerts:
            severity = alert['severity']
            detection_type = alert['detection_type']
            alert_severities[severity] = alert_severities.get(severity, 0) + 1
            detection_types[detection_type] = detection_types.get(detection_type, 0) + 1
        
        print(f"\n🚨 Alerts Generated: {len(alerts)}")
        print("  By Severity:")
        for severity in ['critical', 'high', 'medium', 'low']:
            count = alert_severities.get(severity, 0)
            if count > 0:
                print(f"    - {severity}: {count}")
        
        print("  By Detection Type:")
        for det_type, count in detection_types.items():
            print(f"    - {det_type}: {count}")
        
        # Critical alerts
        critical_alerts = [a for a in alerts if a['severity'] == 'critical']
        if critical_alerts:
            print(f"\n🔥 Critical Alerts ({len(critical_alerts)}):")
            for alert in critical_alerts:
                print(f"  - {alert['title']}")
                if 'iocs' in alert:
                    ioc_count = len(alert['iocs'])
                    print(f"    IOCs: {ioc_count} indicators matched")
        
        # MITRE ATT&CK coverage
        mitre_tactics = set()
        for alert in alerts:
            mitre = alert.get('mitre', {})
            if mitre.get('tactic'):
                mitre_tactics.add(mitre['tactic'])
        
        if mitre_tactics:
            print(f"\n🎯 MITRE ATT&CK Tactics Detected: {len(mitre_tactics)}")
            tactic_names = {
                'TA0001': 'Initial Access',
                'TA0002': 'Execution', 
                'TA0005': 'Defense Evasion',
                'TA0006': 'Credential Access',
                'TA0008': 'Lateral Movement',
                'TA0011': 'Command and Control',
                'TA0040': 'Impact'
            }
            for tactic in sorted(mitre_tactics):
                name = tactic_names.get(tactic, 'Unknown')
                print(f"  - {tactic}: {name}")
        
        print("\n" + "="*60)
    
    async def run_test(self):
        """Run the complete pipeline test"""
        print("🚀 Starting Security Analytics Pipeline Test")
        print("="*60)
        
        # Load test data
        events = self.load_test_data()
        print(f"📥 Loaded {len(events)} test events")
        
        # Test detection engines
        alerts = await self.test_detection_engines(events)
        
        # Test ingestion API (if available)
        self.test_ingestion_api(events)
        
        # Generate summary
        self.generate_pipeline_summary(events, alerts)
        
        print("\n✅ Pipeline test completed!")
        return alerts

async def main():
    """Main test function"""
    test = PipelineTest()
    alerts = await test.run_test()
    
    # Optionally save alerts to file
    try:
        with open(test.results_path, 'w') as f:
            json.dump(alerts, f, indent=2)
        print(f"\n💾 {len(alerts)} alerts saved to test_results.json")
    except PermissionError:
        print("\n⚠️  Unable to write test_results.json (permission denied). Skipping file output.")

if __name__ == "__main__":
    asyncio.run(main())
