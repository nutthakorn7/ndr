import asyncio
import logging
import json
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
        
        self.rule_engine = RuleEngine()
        self.ml_detector = MLDetector()
        self.ioc_matcher = IOCMatcher()

    async def process_event(self, event):
        try:
            # Rule-based detection
            rule_alerts = await self.rule_engine.evaluate(event)
            
            # ML-based anomaly detection
            ml_alerts = await self.ml_detector.detect_anomalies(event)
            
            # IOC matching
            ioc_alerts = await self.ioc_matcher.match(event)
            
            all_alerts = rule_alerts + ml_alerts + ioc_alerts
            
            for alert in all_alerts:
                await self.send_alert(alert)
                
        except Exception as e:
            logger.error(f"Failed to process event: {e}")

    async def send_alert(self, alert):
        loop = asyncio.get_running_loop()
        future = self.producer.send('security-alerts', value=alert)
        try:
            await loop.run_in_executor(None, lambda: future.get(timeout=10))
        except KafkaError as err:
            logger.error(f"Failed to publish alert to Kafka: {err}")

    def run(self):
        logger.info("Detection Engine started")
        for message in self.consumer:
            asyncio.run(self.process_event(message.value))

if __name__ == "__main__":
    engine = DetectionEngine()
    engine.run()
