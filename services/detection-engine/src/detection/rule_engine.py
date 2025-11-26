import json
import re
import logging
from typing import List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class RuleEngine:
    def __init__(self):
        self.rules = []
        self.load_rules()
    
    def load_rules(self):
        """Load detection rules from configuration"""
        self.rules = [
            {
                "id": "powershell_execution",
                "name": "PowerShell Execution Detected",
                "severity": "medium",
                "enabled": True,
                "conditions": {
                    "process.name": ["powershell.exe", "pwsh.exe"],
                    "event.type": "process"
                },
                "mitre": {
                    "tactic": "TA0002",
                    "technique": "T1059",
                    "sub_technique": "T1059.001"
                }
            },
            {
                "id": "suspicious_network_connection",
                "name": "Suspicious Network Connection",
                "severity": "high",
                "enabled": True,
                "conditions": {
                    "network.direction": "outbound",
                    "destination.port": [4444, 6666, 8080, 8888],
                    "event.type": "connection"
                },
                "mitre": {
                    "tactic": "TA0011",
                    "technique": "T1105"
                }
            },
            {
                "id": "file_encryption_activity",
                "name": "File Encryption Activity",
                "severity": "critical",
                "enabled": True,
                "conditions": {
                    "file.extension": [".encrypted", ".locked", ".crypto"],
                    "event.type": "file"
                },
                "mitre": {
                    "tactic": "TA0040",
                    "technique": "T1486"
                }
            },
            {
                "id": "failed_authentication",
                "name": "Failed Authentication Attempt",
                "severity": "low",
                "enabled": True,
                "conditions": {
                    "event.type": "authentication",
                    "event.outcome": "failure"
                },
                "mitre": {
                    "tactic": "TA0006",
                    "technique": "T1110"
                }
            }
        ]
    
    async def evaluate(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate event against all rules"""
        alerts = []
        
        for rule in self.rules:
            if not rule.get("enabled", True):
                continue
                
            if self._match_rule(event, rule):
                alert = self._create_alert(event, rule)
                alerts.append(alert)
                logger.info(f"Rule triggered: {rule['id']} for event")
        
        return alerts
    
    def _match_rule(self, event: Dict[str, Any], rule: Dict[str, Any]) -> bool:
        """Check if event matches rule conditions"""
        conditions = rule.get("conditions", {})
        
        for field_path, expected_values in conditions.items():
            event_value = self._get_nested_value(event, field_path)
            
            if event_value is None:
                return False
            
            if isinstance(expected_values, list):
                if event_value not in expected_values:
                    return False
            else:
                if event_value != expected_values:
                    return False
        
        return True
    
    def _get_nested_value(self, data: Dict[str, Any], path: str) -> Any:
        """Get nested value from dict using dot notation"""
        keys = path.split('.')
        current = data
        
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        
        return current
    
    def _create_alert(self, event: Dict[str, Any], rule: Dict[str, Any]) -> Dict[str, Any]:
        """Create alert from matched rule and event"""
        alert_id = f"alert_{rule['id']}_{int(datetime.now().timestamp())}"
        
        return {
            "id": alert_id,
            "timestamp": datetime.now().isoformat(),
            "severity": rule["severity"],
            "status": "open",
            "title": rule["name"],
            "description": f"Rule {rule['id']} triggered by event",
            "rule_id": rule["id"],
            "rule_name": rule["name"],
            "detection_type": "rule",
            "confidence": 0.8,
            "events": [event],
            "mitre": rule.get("mitre", {}),
            "tenant_id": event.get("tenant_id", "default"),
            "created_at": datetime.now().isoformat()
        }