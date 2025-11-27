import asyncio
import logging
import json
import os
import requests
from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError
from detection.rule_engine import RuleEngine
from detection.ml_detector import MLDetector
from detection.ioc_matcher import IOCMatcher

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DetectionEngine:
    def __init__(self):
        self.consumer = KafkaConsumer(
            'normalized-logs',
            bootstrap_servers=['kafka:9092'],
            group_id='detection-engine-group',
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        
        self.producer = KafkaProducer(
            bootstrap_servers=['kafka:9092'],
            value_serializer=lambda x: json.dumps(x).encode('utf-8')
        )
        
        
        # Determine rules path based on environment (Docker vs Local)
        default_rules = 'services/detection-engine/src/detection/rules.json'
        docker_rules = 'src/detection/rules.json'
        rules_path = docker_rules if os.path.exists(docker_rules) else default_rules
        
        self.rule_engine = RuleEngine(rules_path=rules_path)
        self.ml_detector = MLDetector()
        self.ioc_matcher = IOCMatcher()
        self.sensor_controller_url = os.getenv('SENSOR_CONTROLLER_URL', 'http://sensor-controller:8084')

    async def process_event(self, event):
        try:
            # Rule-based detection
            rule_alerts = await self.rule_engine.evaluate(event)
            
            # ML-based anomaly detection
            ml_alerts = await self.ml_detector.detect_anomalies(event)
            
            # IOC matching
            ioc_alerts = await self.ioc_matcher.match(event)
            
            all_alerts = rule_alerts + ml_alerts + ioc_alerts
            logger.info(f"Generated {len(all_alerts)} alerts (Rules: {len(rule_alerts)}, ML: {len(ml_alerts)}, IOC: {len(ioc_alerts)})")
            
            for alert in all_alerts:
                logger.info(f"Processing alert {alert.get('id')} severity {alert.get('severity')}")
                try:
                    await self.send_alert(alert)
                except Exception as e:
                    logger.error(f"Error sending alert: {e}")
                
                # Smart PCAP: Trigger capture for critical/high alerts
                if alert.get('severity') in ['critical', 'high']:
                    await self.trigger_pcap(alert)
                else:
                    logger.info(f"Alert {alert.get('id')} severity {alert.get('severity')} not critical/high, skipping PCAP")
            
        except Exception as e:
            logger.error(f"Failed to process event: {e}")

    async def trigger_pcap(self, alert):
        """Trigger PCAP capture on the sensor that generated the alert"""
        logger.info(f"Checking trigger_pcap for alert {alert.get('id')} severity {alert.get('severity')}")
        sensor_id = alert.get('sensor', {}).get('id') or alert.get('events', [{}])[0].get('sensor', {}).get('id')
        
        if not sensor_id:
            logger.warning(f"No sensor_id found for alert {alert.get('id')}, skipping PCAP")
            # Try to find sensor_id in the event if not in alert top-level
            return

        def _request():
            try:
                # Capture 60 seconds of traffic
                payload = {
                    "duration_seconds": 60,
                    "object_key": f"pcap/alerts/{alert['id']}.pcap",
                    "notes": f"Triggered by alert: {alert['title']}"
                }
                url = f"{self.sensor_controller_url}/sensors/{sensor_id}/pcap"
                logger.info(f"Requesting PCAP from {url}")
                
                response = requests.post(url, json=payload, timeout=5)
                
                if response.status_code == 202:
                    logger.info(f"✅ Triggered PCAP for alert {alert['id']} on sensor {sensor_id}")
                else:
                    logger.error(f"❌ Failed to trigger PCAP: {response.status_code} {response.text}")
            except Exception as e:
                logger.error(f"❌ Error triggering PCAP: {e}")

        # Run blocking request in executor
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, _request)

    async def send_alert(self, alert):
        loop = asyncio.get_running_loop()
        # Publish to security-alerts (for dashboard) and alerts (for SOAR)
        futures = [
            self.producer.send('security-alerts', value=alert),
            self.producer.send('alerts', value=alert)
        ]
        try:
            await loop.run_in_executor(None, lambda: [f.get(timeout=10) for f in futures])
        except KafkaError as err:
            logger.error(f"Failed to publish alert to Kafka: {err}")

    def run(self):
        logger.info("Detection Engine started")
        for message in self.consumer:
            asyncio.run(self.process_event(message.value))

if __name__ == "__main__":
    engine = DetectionEngine()
    engine.run()
