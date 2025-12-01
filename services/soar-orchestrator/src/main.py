import asyncio
import json
import logging
import os
import uuid
from datetime import datetime
from kafka import KafkaConsumer
from playbook_engine import PlaybookEngine
from actions import get_action
import psycopg2
from psycopg2.extras import Json

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SOAROrchestrator:
    def __init__(self):
        self.playbook_engine = PlaybookEngine()
        self.dry_run = os.getenv('DRY_RUN', 'true').lower() == 'true'
        
        # Kafka consumer
        # Kafka consumer
        try:
            self.consumer = KafkaConsumer(
                'alerts',
                bootstrap_servers=os.getenv('KAFKA_BROKERS', 'kafka:9092').split(','),
                auto_offset_reset='latest',
                enable_auto_commit=True,
                group_id='soar-orchestrator-group',
                value_deserializer=lambda x: json.loads(x.decode('utf-8'))
            )
            self.kafka_available = True
        except Exception as e:
            logger.warning(f"Kafka unavailable ({e}). Starting in standalone mode.")
            self.kafka_available = False
            self.consumer = [] # Mock empty consumer
        
        # Database connection
        self.db_conn = psycopg2.connect(
            os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/security_analytics')
        )
        self._init_db()
        
        logger.info(f"SOAR Orchestrator initialized (DRY_RUN={self.dry_run})")
        logger.info(f"Loaded {len(self.playbook_engine.playbooks)} playbooks")
        
    def _init_db(self):
        """Initialize database schema"""
        with self.db_conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS playbook_executions (
                    id UUID PRIMARY KEY,
                    alert_id TEXT NOT NULL,
                    playbook_name TEXT NOT NULL,
                    status TEXT DEFAULT 'running',
                    actions JSONB DEFAULT '[]',
                    started_at TIMESTAMP DEFAULT NOW(),
                    completed_at TIMESTAMP,
                    error TEXT
                )
            """)
            self.db_conn.commit()
            
    async def process_alert(self, alert):
        """Process an alert and execute matching playbooks"""
        logger.info(f"Processing alert: {alert.get('id', 'unknown')} - {alert.get('title', 'No title')}")
        
        # Find matching playbooks
        matched_playbooks = self.playbook_engine.match_alert(alert)
        
        if not matched_playbooks:
            logger.info("No playbooks matched this alert")
            return
            
        # Execute each matched playbook
        for playbook in matched_playbooks:
            await self.execute_playbook(playbook, alert)
            
    async def execute_playbook(self, playbook, alert):
        """Execute a playbook with the given alert context"""
        execution_id = str(uuid.uuid4())
        playbook_name = playbook['name']
        alert_id = alert.get('id', 'unknown')
        
        logger.info(f"Executing playbook '{playbook_name}' for alert {alert_id}")
        
        # Record execution start
        with self.db_conn.cursor() as cur:
            cur.execute(
                "INSERT INTO playbook_executions (id, alert_id, playbook_name, status) VALUES (%s, %s, %s, %s)",
                (execution_id, alert_id, playbook_name, 'running')
            )
            self.db_conn.commit()
            
        context = {'alert': alert}
        action_results = []
        
        try:
            # Execute each action in sequence
            for action_def in playbook.get('actions', []):
                action_type = action_def.get('type')
                action_name = action_def.get('name', action_type)
                params = action_def.get('params', {})
                
                logger.info(f"  Executing action: {action_name} ({action_type})")
                
                action = get_action(action_type, dry_run=self.dry_run)
                if not action:
                    logger.error(f"Unknown action type: {action_type}")
                    action_results.append({
                        'action': action_type,
                        'name': action_name,
                        'success': False,
                        'error': 'Unknown action type'
                    })
                    continue
                    
                result = await action.execute(params, context)
                result['name'] = action_name
                action_results.append(result)
                
                if not result.get('success'):
                    logger.error(f"  Action failed: {result.get('error')}")
                else:
                    logger.info(f"  Action completed: {result}")
                    
            # Record completion
            with self.db_conn.cursor() as cur:
                cur.execute(
                    "UPDATE playbook_executions SET status = %s, actions = %s, completed_at = NOW() WHERE id = %s",
                    ('completed', Json(action_results), execution_id)
                )
                self.db_conn.commit()
                
            logger.info(f"Playbook '{playbook_name}' execution completed")
            
        except Exception as e:
            logger.error(f"Playbook execution failed: {e}")
            with self.db_conn.cursor() as cur:
                cur.execute(
                    "UPDATE playbook_executions SET status = %s, error = %s, completed_at = NOW() WHERE id = %s",
                    ('failed', str(e), execution_id)
                )
                self.db_conn.commit()
                
    async def run(self):
        """Main loop to consume alerts and execute playbooks"""
        logger.info("Starting SOAR orchestrator...")
        
        try:
            if self.kafka_available:
                for message in self.consumer:
                    alert = message.value
                    await self.process_alert(alert)
            else:
                # Standalone mode: Simulate processing or just idle
                logger.info("Running in standalone mode (no Kafka). Waiting for events...")
                while True:
                    await asyncio.sleep(60)
        except KeyboardInterrupt:
            logger.info("Shutting down...")
        finally:
            if hasattr(self.consumer, 'close'):
                self.consumer.close()
            self.db_conn.close()

if __name__ == '__main__':
    orchestrator = SOAROrchestrator()
    asyncio.run(orchestrator.run())
