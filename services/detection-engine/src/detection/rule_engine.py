import json
import logging
from typing import List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class RuleEngine:
    def __init__(self, rules_path='services/detection-engine/src/detection/rules.json'):
        self.rules = []
        self.rules_path = rules_path
        self.load_rules()

    def load_rules(self):
        """Load detection rules from a JSON file"""
        try:
            with open(self.rules_path, 'r') as f:
                self.rules = json.load(f)
            logger.info(f"Loaded {len(self.rules)} rules from {self.rules_path}")
        except FileNotFoundError:
            logger.error(f"Rules file not found at {self.rules_path}")
            self.rules = []
        except json.JSONDecodeError:
            logger.error(f"Error decoding JSON from {self.rules_path}")
            self.rules = []

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
        expressions = conditions.get("expressions", [])
        logic = conditions.get("logic", "AND").upper()

        if not expressions:
            return False

        results = []
        for expr in expressions:
            field = expr.get("field")
            operator = expr.get("operator")
            value = expr.get("value")

            if not all([field, operator, value is not None]):
                logger.warning(f"Skipping invalid expression in rule {rule.get('id')}: {expr}")
                continue
            
            event_value = self._get_nested_value(event, field)
            if event_value is None:
                results.append(False)
                continue

            match = self._evaluate_expression(event_value, operator, value)
            results.append(match)

        if logic == "AND":
            return all(results)
        elif logic == "OR":
            return any(results)
        else:
            logger.warning(f"Unsupported logic '{logic}' in rule {rule.get('id')}. Defaulting to AND.")
            return all(results)

    def _evaluate_expression(self, event_value: Any, operator: str, rule_value: Any) -> bool:
        """Evaluate a single expression"""
        op = operator.lower()
        if op == "equals":
            return event_value == rule_value
        elif op == "in":
            if isinstance(rule_value, list):
                return event_value in rule_value
            else:
                logger.warning(f"Operator 'in' requires a list value, but got {type(rule_value)}. Expression will fail.")
                return False
        # Add more operators here in the future
        else:
            logger.warning(f"Unsupported operator '{operator}'. Expression will fail.")
            return False

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