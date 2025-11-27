#!/usr/bin/env python3
"""
YARA Scanner Service
Scans files extracted from network traffic for malware signatures
"""
import os
import json
import hashlib
import logging
from pathlib import Path
from kafka import KafkaProducer
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

try:
    import yara
    YARA_AVAILABLE = True
except ImportError:
    YARA_AVAILABLE = False
    logging.warning("YARA not available - scanner will run in simulation mode")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class YARAScanner:
    def __init__(self, rules_path='/app/rules'):
        self.rules_path = rules_path
        self.rules = None
        self.producer = KafkaProducer(
            bootstrap_servers=os.getenv('KAFKA_BROKERS', 'kafka:9092').split(','),
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        
        if YARA_AVAILABLE:
            self.load_rules()
        
        logger.info('YARA Scanner initialized')
    
    def load_rules(self):
        """Load all YARA rules from rules directory"""
        try:
            rule_files = list(Path(self.rules_path).glob('**/*.yar'))
            
            if not rule_files:
                logger.warning(f'No YARA rules found in {self.rules_path}')
                return
            
            # Compile all rules
            rules_dict = {str(i): str(f) for i, f in enumerate(rule_files)}
            self.rules = yara.compile(filepaths=rules_dict)
            
            logger.info(f'Loaded {len(rule_files)} YARA rule files')
        except Exception as e:
            logger.error(f'Failed to load YARA rules: {e}')
    
    def scan_file(self, file_path, metadata=None):
        """Scan a file with YARA rules"""
        try:
            if not os.path.exists(file_path):
                logger.warning(f'File not found: {file_path}')
                return None
            
            # Calculate file hash
            file_hash = self.calculate_hash(file_path)
            file_size = os.path.getsize(file_path)
            
            matches = []
            
            if YARA_AVAILABLE and self.rules:
                # Scan with YARA
                yara_matches = self.rules.match(file_path)
                
                for match in yara_matches:
                    matches.append({
                        'rule': match.rule,
                        'namespace': match.namespace,
                        'tags': match.tags,
                        'meta': match.meta
                    })
            
            if matches:
                severity = self.get_max_severity(matches)
                
                alert = {
                    'timestamp': self.get_timestamp(),
                    'file': {
                        'path': file_path,
                        'name': os.path.basename(file_path),
                        'size': file_size,
                        'hash': {
                            'sha256': file_hash
                        }
                    },
                    'yara': {
                        'matches': matches,
                        'match_count': len(matches)
                    },
                    'title': f'Malware Detected: {matches[0]["rule"]}',
                    'description': f'YARA scan detected {len(matches)} malware signature(s)',
                    'severity': severity,
                    'category': 'malware',
                    'mitre_attack': 'T1204',  # User Execution
                    'source': metadata.get('source', {}) if metadata else {},
                    'destination': metadata.get('destination', {}) if metadata else {}
                }
                
                self.publish_alert(alert)
                logger.info(f'Malware detected in {file_path}: {[m["rule"] for m in matches]}')
                
                return alert
            else:
                logger.debug(f'No malware found in {file_path}')
                return None
                
        except Exception as e:
            logger.error(f'Error scanning file {file_path}: {e}')
            return None
    
    def calculate_hash(self, file_path):
        """Calculate SHA256 hash of file"""
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                sha256.update(chunk)
        return sha256.hexdigest()
    
    def get_max_severity(self, matches):
        """Get maximum severity from matches"""
        severity_order = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}
        max_severity = 'low'
        
        for match in matches:
            match_severity = match.get('meta', {}).get('severity', 'low')
            if severity_order.get(match_severity, 1) > severity_order.get(max_severity, 1):
                max_severity = match_severity
        
        return max_severity
    
    def get_timestamp(self):
        """Get current ISO timestamp"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + 'Z'
    
    def publish_alert(self, alert):
        """Publish alert to Kafka"""
        try:
            self.producer.send('security-alerts', alert)
            self.producer.flush()
        except Exception as e:
            logger.error(f'Failed to publish alert: {e}')


class FileWatcher(FileSystemEventHandler):
    """Watch directory for new files and scan them"""
    
    def __init__(self, scanner):
        self.scanner = scanner
    
    def on_created(self, event):
        if event.is_directory:
            return
        
        logger.info(f'New file detected: {event.src_path}')
        self.scanner.scan_file(event.src_path)


def main():
    scanner = YARAScanner()
    
    # Watch directory for extracted files
    watch_dir = os.getenv('WATCH_DIR', '/data/extracted_files')
    os.makedirs(watch_dir, exist_ok=True)
    
    logger.info(f'Watching directory: {watch_dir}')
    
    # Scan existing files
    for root, dirs, files in os.walk(watch_dir):
        for file in files:
            file_path = os.path.join(root, file)
            scanner.scan_file(file_path)
    
    # Watch for new files
    event_handler = FileWatcher(scanner)
    observer = Observer()
    observer.schedule(event_handler, watch_dir, recursive=True)
    observer.start()
    
    logger.info('YARA scanner started')
    
    try:
        observer.join()
    except KeyboardInterrupt:
        observer.stop()
        observer.join()


if __name__ == '__main__':
    main()
