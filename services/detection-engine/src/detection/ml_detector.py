import json
import logging
import numpy as np
from typing import List, Dict, Any
from datetime import datetime
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

class MLDetector:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_extractors = {}
        self.initialize_models()
    
    def initialize_models(self):
        """Initialize ML models for anomaly detection"""
        # Network behavior model
        self.models['network'] = IsolationForest(
            contamination=0.1,
            random_state=42
        )
        self.scalers['network'] = StandardScaler()
        
        # Process behavior model
        self.models['process'] = IsolationForest(
            contamination=0.05,
            random_state=42
        )
        self.scalers['process'] = StandardScaler()
        
        # File activity model
        self.models['file'] = IsolationForest(
            contamination=0.08,
            random_state=42
        )
        self.scalers['file'] = StandardScaler()
        
        logger.info("ML models initialized")
    
    async def detect_anomalies(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect anomalies using ML models"""
        alerts = []
        event_type = event.get('event', {}).get('category', 'unknown')
        
        if event_type in self.models:
            features = self._extract_features(event, event_type)
            if features is not None:
                anomaly_score = self._predict_anomaly(features, event_type)
                
                if anomaly_score < -0.5:  # Anomaly threshold
                    alert = self._create_ml_alert(event, event_type, anomaly_score)
                    alerts.append(alert)
                    logger.info(f"ML anomaly detected: {event_type} with score {anomaly_score}")
        
        return alerts
    
    def _extract_features(self, event: Dict[str, Any], event_type: str) -> np.ndarray:
        """Extract numerical features from event"""
        features = []
        
        if event_type == 'network':
            features = [
                event.get('network', {}).get('bytes', 0),
                event.get('network', {}).get('packets', 0),
                event.get('source', {}).get('port', 0),
                event.get('destination', {}).get('port', 0),
                len(event.get('destination', {}).get('ip', '')),
                1 if event.get('destination', {}).get('ip_type') == 'public' else 0
            ]
        
        elif event_type == 'process':
            process_name = event.get('process', {}).get('name', '')
            cmd_line = event.get('process', {}).get('command_line', '')
            features = [
                event.get('process', {}).get('pid', 0),
                event.get('process', {}).get('ppid', 0),
                len(process_name),
                len(cmd_line),
                1 if 'powershell' in process_name.lower() else 0,
                1 if 'cmd' in process_name.lower() else 0,
                cmd_line.count('-'),
                cmd_line.count('|')
            ]
        
        elif event_type == 'file':
            file_path = event.get('file', {}).get('path', '')
            file_name = event.get('file', {}).get('name', '')
            features = [
                event.get('file', {}).get('size', 0),
                len(file_path),
                len(file_name),
                1 if file_path.startswith('/tmp') or file_path.startswith('C:\\Temp') else 0,
                1 if any(ext in file_name for ext in ['.exe', '.bat', '.ps1']) else 0,
                file_path.count('\\'),
                file_path.count('/')
            ]
        
        return np.array(features).reshape(1, -1) if features else None
    
    def _predict_anomaly(self, features: np.ndarray, event_type: str) -> float:
        """Predict anomaly score using trained model"""
        try:
            # In production, models would be pre-trained
            # For demo, we'll simulate with basic rules
            if event_type == 'network':
                # Simulate anomaly detection for high-port connections
                port = features[0][3]  # destination port
                bytes_count = features[0][0]
                if port in [4444, 6666, 8080] or bytes_count > 100000:
                    return -0.6  # Anomaly
                return 0.2  # Normal
            
            elif event_type == 'process':
                # Simulate anomaly for suspicious process patterns
                cmd_length = features[0][3]  # command line length
                powershell_flag = features[0][4]
                if cmd_length > 200 or powershell_flag:
                    return -0.7  # Anomaly
                return 0.1  # Normal
            
            elif event_type == 'file':
                # Simulate anomaly for suspicious file operations
                file_size = features[0][0]
                temp_flag = features[0][3]
                if temp_flag or file_size > 50000000:  # 50MB
                    return -0.5  # Anomaly
                return 0.3  # Normal
            
        except Exception as e:
            logger.error(f"Error in anomaly prediction: {e}")
            return 0.0
        
        return 0.0
    
    def _create_ml_alert(self, event: Dict[str, Any], event_type: str, score: float) -> Dict[str, Any]:
        """Create ML-based alert"""
        alert_id = f"ml_alert_{event_type}_{int(datetime.now().timestamp())}"
        
        severity = "high" if score < -0.6 else "medium"
        
        return {
            "id": alert_id,
            "timestamp": datetime.now().isoformat(),
            "severity": severity,
            "status": "open",
            "title": f"ML Anomaly Detected - {event_type.title()}",
            "description": f"Machine learning model detected anomalous {event_type} behavior",
            "rule_id": f"ml_{event_type}_anomaly",
            "rule_name": f"ML {event_type.title()} Anomaly Detection",
            "detection_type": "ml",
            "confidence": abs(score),
            "events": [event],
            "ml_score": score,
            "tenant_id": event.get("tenant_id", "default"),
            "created_at": datetime.now().isoformat()
        }