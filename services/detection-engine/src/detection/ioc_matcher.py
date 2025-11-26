import json
import logging
import re
from typing import List, Dict, Any, Set
from datetime import datetime

logger = logging.getLogger(__name__)

class IOCMatcher:
    def __init__(self):
        self.ioc_feeds = {}
        self.load_ioc_feeds()
    
    def load_ioc_feeds(self):
        """Load IOC feeds from threat intelligence sources"""
        # Simulated IOC feeds - in production these would come from TI feeds
        self.ioc_feeds = {
            "malicious_ips": {
                "192.168.100.50",
                "10.0.0.99",
                "172.16.0.100",
                "8.8.4.4"  # Example suspicious IP
            },
            "malicious_domains": {
                "evil.com",
                "malware-c2.net",
                "suspicious.org",
                "badactor.io"
            },
            "malicious_hashes": {
                "5d41402abc4b2a76b9719d911017c592",
                "098f6bcd4621d373cade4e832627b4f6",
                "aec070645fe53ee3b3763059376134f058cc337247c978add178b6ccdfb0019f"
            },
            "malicious_urls": {
                "http://evil.com/payload",
                "https://malware-c2.net/download",
                "http://suspicious.org/backdoor.exe"
            },
            "malicious_processes": {
                "mimikatz.exe",
                "psexec.exe",
                "powershell.exe -encodedcommand",
                "cmd.exe /c ping"
            }
        }
        
        logger.info("IOC feeds loaded")
    
    async def match(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Match event against IOC feeds"""
        alerts = []
        matched_iocs = self._find_iocs_in_event(event)
        
        if matched_iocs:
            alert = self._create_ioc_alert(event, matched_iocs)
            alerts.append(alert)
            logger.info(f"IOC match found: {len(matched_iocs)} indicators")
        
        return alerts
    
    def _find_iocs_in_event(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find IOCs in the event data"""
        matched_iocs = []
        
        # Check IPs
        source_ip = event.get('source', {}).get('ip')
        dest_ip = event.get('destination', {}).get('ip')
        
        if source_ip in self.ioc_feeds["malicious_ips"]:
            matched_iocs.append({
                "type": "ip",
                "value": source_ip,
                "field": "source.ip",
                "confidence": 0.9,
                "source": "threat_intelligence"
            })
        
        if dest_ip in self.ioc_feeds["malicious_ips"]:
            matched_iocs.append({
                "type": "ip",
                "value": dest_ip,
                "field": "destination.ip",
                "confidence": 0.9,
                "source": "threat_intelligence"
            })
        
        # Check domains
        dest_hostname = event.get('destination', {}).get('hostname')
        if dest_hostname in self.ioc_feeds["malicious_domains"]:
            matched_iocs.append({
                "type": "domain",
                "value": dest_hostname,
                "field": "destination.hostname",
                "confidence": 0.95,
                "source": "threat_intelligence"
            })
        
        # Check file hashes
        file_hash = event.get('file', {}).get('hash', {})
        for hash_type in ['md5', 'sha1', 'sha256']:
            hash_value = file_hash.get(hash_type)
            if hash_value in self.ioc_feeds["malicious_hashes"]:
                matched_iocs.append({
                    "type": "hash",
                    "value": hash_value,
                    "field": f"file.hash.{hash_type}",
                    "confidence": 0.98,
                    "source": "threat_intelligence"
                })
        
        # Check process names and command lines
        process_name = event.get('process', {}).get('name', '')
        cmd_line = event.get('process', {}).get('command_line', '')
        
        for malicious_process in self.ioc_feeds["malicious_processes"]:
            if malicious_process.lower() in process_name.lower():
                matched_iocs.append({
                    "type": "process",
                    "value": malicious_process,
                    "field": "process.name",
                    "confidence": 0.8,
                    "source": "threat_intelligence"
                })
            
            if malicious_process.lower() in cmd_line.lower():
                matched_iocs.append({
                    "type": "command",
                    "value": malicious_process,
                    "field": "process.command_line",
                    "confidence": 0.85,
                    "source": "threat_intelligence"
                })
        
        # Check URLs in various fields
        url_patterns = [
            event.get('network', {}).get('url', ''),
            event.get('file', {}).get('path', ''),
            cmd_line
        ]
        
        for url_text in url_patterns:
            if url_text:
                for malicious_url in self.ioc_feeds["malicious_urls"]:
                    if malicious_url in url_text:
                        matched_iocs.append({
                            "type": "url",
                            "value": malicious_url,
                            "field": "detected_in_event",
                            "confidence": 0.9,
                            "source": "threat_intelligence"
                        })
        
        return matched_iocs
    
    def _create_ioc_alert(self, event: Dict[str, Any], iocs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create IOC-based alert"""
        alert_id = f"ioc_alert_{int(datetime.now().timestamp())}"
        
        # Determine severity based on IOC types and confidence
        max_confidence = max(ioc['confidence'] for ioc in iocs)
        has_hash_match = any(ioc['type'] == 'hash' for ioc in iocs)
        
        if has_hash_match or max_confidence >= 0.95:
            severity = "critical"
        elif max_confidence >= 0.9:
            severity = "high"
        else:
            severity = "medium"
        
        ioc_summary = ", ".join([f"{ioc['type']}:{ioc['value']}" for ioc in iocs[:3]])
        if len(iocs) > 3:
            ioc_summary += f" (+{len(iocs) - 3} more)"
        
        return {
            "id": alert_id,
            "timestamp": datetime.now().isoformat(),
            "severity": severity,
            "status": "open",
            "title": f"Threat Intelligence Match - {len(iocs)} IOCs",
            "description": f"Event matched {len(iocs)} indicators of compromise: {ioc_summary}",
            "rule_id": "ioc_matcher",
            "rule_name": "Threat Intelligence IOC Matcher",
            "detection_type": "ioc",
            "confidence": max_confidence,
            "events": [event],
            "iocs": iocs,
            "mitre": {
                "tactic": "TA0011",  # Command and Control
                "technique": "T1071"  # Application Layer Protocol
            },
            "tenant_id": event.get("tenant_id", "default"),
            "created_at": datetime.now().isoformat()
        }