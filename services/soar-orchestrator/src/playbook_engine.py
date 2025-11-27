import yaml
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class PlaybookEngine:
    def __init__(self, playbooks_dir='src/playbooks'):
        self.playbooks_dir = playbooks_dir
        self.playbooks = []
        self.load_playbooks()
        
    def load_playbooks(self):
        """Load all YAML playbooks from the playbooks directory"""
        playbook_path = Path(self.playbooks_dir)
        if not playbook_path.exists():
            logger.warning(f"Playbooks directory not found: {self.playbooks_dir}")
            return
            
        for yaml_file in playbook_path.glob('*.yaml'):
            try:
                with open(yaml_file, 'r') as f:
                    playbook = yaml.safe_load(f)
                    if playbook.get('enabled', True):
                        self.playbooks.append(playbook)
                        logger.info(f"Loaded playbook: {playbook['name']}")
            except Exception as e:
                logger.error(f"Failed to load playbook {yaml_file}: {e}")
                
    def match_alert(self, alert):
        """Find playbooks that match the given alert"""
        matched = []
        
        for playbook in self.playbooks:
            if self._matches_trigger(alert, playbook.get('trigger', {})):
                matched.append(playbook)
                logger.info(f"Alert matched playbook: {playbook['name']}")
                
        return matched
        
    def _matches_trigger(self, alert, trigger):
        """Check if alert matches playbook trigger conditions"""
        # Check severity
        if 'severity' in trigger:
            alert_severity = alert.get('severity', '').lower()
            if alert_severity not in trigger['severity']:
                return False
                
        # Check categories
        if 'categories' in trigger:
            alert_category = alert.get('category', '')
            rule_id = alert.get('rule_id', '')
            if not any(cat in alert_category or cat in rule_id for cat in trigger['categories']):
                return False
                
        # Check title contains
        if 'title_contains' in trigger:
            alert_title = alert.get('title', '').lower()
            if not any(keyword in alert_title for keyword in trigger['title_contains']):
                return False
                
        return True
        
    def get_playbook(self, name):
        """Get a specific playbook by name"""
        for playbook in self.playbooks:
            if playbook['name'] == name:
                return playbook
        return None
