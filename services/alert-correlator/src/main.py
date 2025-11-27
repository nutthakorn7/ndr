#!/usr/bin/env python3
"""
Alert Correlation Engine

Deduplicates and correlates alerts to reduce noise and identify attack patterns
"""
import json
import logging
import os
import hashlib
from datetime import datetime, timedelta
from collections import defaultdict
import psycopg2
from psycopg2.extras import Json
from kafka import KafkaConsumer, KafkaProducer
import redis

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CorrelationEngine:
    def __init__(self):
        # Database
        self.db_conn = psycopg2.connect(
            os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/security_analytics')
        )
        self._init_db()
        
        # Redis for windowing
        self.redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'redis'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=2,
            decode_responses=True
        )
        
        # Configuration
        self.aggregation_window = int(os.getenv('AGGREGATION_WINDOW', 300))  # 5 minutes
        self.attack_chain_window = int(os.getenv('ATTACK_CHAIN_WINDOW', 3600))  # 1 hour
        
        # Kafka
        self.consumer = KafkaConsumer(
            'alerts', 'security-alerts',
            bootstrap_servers=os.getenv('KAFKA_BROKERS', 'kafka:9092').split(','),
            auto_offset_reset='latest',
            enable_auto_commit=True,
            group_id='alert-correlator-group',
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        
        self.producer = KafkaProducer(
            bootstrap_servers=os.getenv('KAFKA_BROKERS', 'kafka:9092').split(','),
            value_serializer=lambda x: json.dumps(x).encode('utf-8')
        )
        
        logger.info("Correlation Engine initialized")
        
    def _init_db(self):
        """Initialize database schema"""
        with self.db_conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS alert_meta (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    correlation_id UUID,
                    original_alert_ids TEXT[],
                    aggregation_count INT DEFAULT 1,
                    first_seen TIMESTAMP DEFAULT NOW(),
                    last_seen TIMESTAMP DEFAULT NOW(),
                    status TEXT DEFAULT 'new',
                    assigned_to TEXT,
                    severity_score INT,
                    attack_chain JSONB DEFAULT '[]',
                    alert_data JSONB,
                    notes TEXT[] DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_correlation_id ON alert_meta(correlation_id)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_status ON alert_meta(status)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_severity ON alert_meta(severity_score DESC)
            """)
            
            self.db_conn.commit()
            
    def generate_alert_key(self, alert):
        """Generate unique key for alert deduplication"""
        # Key components: rule_id + source_ip + destination_ip
        components = [
            alert.get('rule_id', ''),
            alert.get('source', {}).get('ip', ''),
            alert.get('destination', {}).get('ip', ''),
            alert.get('title', '')
        ]
        key_str = '|'.join(str(c) for c in components)
        return hashlib.md5(key_str.encode()).hexdigest()
        
    def check_for_duplicate(self, alert, alert_key):
        """Check if alert is duplicate within time window"""
        # Check Redis for recent similar alerts
        redis_key = f"alert:{alert_key}"
        existing = self.redis_client.get(redis_key)
        
        if existing:
            # Found duplicate - update aggregation
            meta_id = existing
            logger.info(f"Duplicate alert detected, aggregating into {meta_id}")
            return meta_id
        else:
            # New alert - store in Redis with TTL
            meta_id = None
            self.redis_client.setex(redis_key, self.aggregation_window, 'pending')
            return None
            
    def calculate_severity_score(self, alert):
        """Calculate composite severity score (0-100)"""
        score = 0
        
        # Rule severity (40%)
        severity_map = {'critical': 100, 'high': 75, 'medium': 50, 'low': 25}
        rule_severity = alert.get('severity', alert.get('event', {}).get('severity', 'medium'))
        score += severity_map.get(rule_severity, 50) * 0.4
        
        # Threat intel reputation (30%)
        threat_intel = alert.get('threat_intel', {})
        if threat_intel.get('is_threat'):
            reputation = threat_intel.get('max_reputation', 0)
            score += reputation * 0.3
        
        # Asset criticality (20%)
        # TODO: Get from asset service
        dest_ip = alert.get('destination', {}).get('ip', '')
        if dest_ip.startswith('10.0.0.'):  # Mock: infrastructure IPs
            score += 100 * 0.2
        elif dest_ip.startswith('192.168.'):
            score += 50 * 0.2
        
        # Frequency factor (10%)
        # Higher frequency = higher score
        aggregation_count = alert.get('aggregation_count', 1)
        frequency_score = min(aggregation_count * 10, 100)
        score += frequency_score * 0.1
        
        return int(score)
        
    def detect_attack_chain(self, alert):
        """Detect if alert is part of multi-stage attack"""
        source_ip = alert.get('source', {}).get('ip')
        
        if not source_ip:
            return []
            
        # Query recent alerts from same source
        with self.db_conn.cursor() as cur:
            cur.execute("""
                SELECT id, alert_data, first_seen
                FROM alert_meta
                WHERE alert_data->>'source'->>'ip' = %s
                AND first_seen > NOW() - INTERVAL '1 hour'
                AND id != %s
                ORDER BY first_seen ASC
            """, (source_ip, alert.get('id', '')))
            
            related = cur.fetchall()
            
        if not related:
            return []
            
        # Build attack chain
        chain = []
        for row in related:
            chain.append({
                'id': str(row[0]),
                'title': row[1].get('title', ''),
                'severity': row[1].get('severity', ''),
                'timestamp': row[2].isoformat() if row[2] else None
            })
            
        return chain
        
    def create_correlated_alert(self, alert, is_duplicate=False, existing_meta_id=None):
        """Create or update correlated alert in database"""
        alert_id = alert.get('id', '')
        alert_key = self.generate_alert_key(alert)
        
        if is_duplicate and existing_meta_id:
            # Update existing meta-alert
            with self.db_conn.cursor() as cur:
                cur.execute("""
                    UPDATE alert_meta
                    SET aggregation_count = aggregation_count + 1,
                        last_seen = NOW(),
                        original_alert_ids = array_append(original_alert_ids, %s),
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING id, aggregation_count, severity_score
                """, (alert_id, existing_meta_id))
                
                result = cur.fetchone()
                self.db_conn.commit()
                
                if result:
                    # Recalculate severity with new aggregation count
                    alert['aggregation_count'] = result[1]
                    new_score = self.calculate_severity_score(alert)
                    
                    cur.execute("""
                        UPDATE alert_meta
                        SET severity_score = %s
                        WHERE id = %s
                    """, (new_score, result[0]))
                    self.db_conn.commit()
                    
                    logger.info(f"Updated meta-alert {result[0]}: count={result[1]}, score={new_score}")
                    return str(result[0])
        else:
            # Create new meta-alert
            severity_score = self.calculate_severity_score(alert)
            attack_chain = self.detect_attack_chain(alert)
            
            with self.db_conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO alert_meta (
                        original_alert_ids, aggregation_count, severity_score,
                        attack_chain, alert_data
                    )
                    VALUES (%s, 1, %s, %s, %s)
                    RETURNING id
                """, ([alert_id], severity_score, Json(attack_chain), Json(alert)))
                
                meta_id = cur.fetchone()[0]
                self.db_conn.commit()
                
                # Store in Redis for deduplication
                self.redis_client.setex(f"alert:{alert_key}", self.aggregation_window, str(meta_id))
                
                logger.info(f"Created meta-alert {meta_id}: score={severity_score}, chain_length={len(attack_chain)}")
                return str(meta_id)
                
    def enrich_alert(self, alert, meta_id):
        """Add correlation metadata to alert"""
        # Fetch meta data
        with self.db_conn.cursor() as cur:
            cur.execute("""
                SELECT aggregation_count, severity_score, attack_chain, status, first_seen, last_seen
                FROM alert_meta
                WHERE id = %s
            """, (meta_id,))
            
            row = cur.fetchone()
            
        if row:
            alert['correlation'] = {
                'meta_id': meta_id,
                'aggregation_count': row[0],
                'severity_score': row[1],
                'attack_chain': row[2],
                'status': row[3],
                'first_seen': row[4].isoformat() if row[4] else None,
                'last_seen': row[5].isoformat() if row[5] else None
            }
            
        return alert
        
    def process_alert(self, alert):
        """Main correlation logic"""
        try:
            alert_key = self.generate_alert_key(alert)
            
            # Check for duplication
            existing_meta_id = self.check_for_duplicate(alert, alert_key)
            
            if existing_meta_id and existing_meta_id != 'pending':
                # Duplicate - aggregate
                meta_id = self.create_correlated_alert(alert, is_duplicate=True, existing_meta_id=existing_meta_id)
                logger.info(f"Aggregated duplicate alert into {meta_id}")
            else:
                # New alert - create meta
                meta_id = self.create_correlated_alert(alert, is_duplicate=False)
                logger.info(f"Created new correlated alert {meta_id}")
                
            # Enrich with correlation data
            enriched_alert = self.enrich_alert(alert, meta_id)
            
            # Publish correlated alert
            self.producer.send('correlated-alerts', value=enriched_alert)
            
            # Update dashboard-api topic with correlation metadata
            self.producer.send('security-alerts', value=enriched_alert)
            
        except Exception as e:
            logger.error(f"Error processing alert: {e}", exc_info=True)
            
    def run(self):
        """Main processing loop"""
        logger.info("Starting Alert Correlation Engine...")
        
        try:
            for message in self.consumer:
                alert = message.value
                self.process_alert(alert)
        except KeyboardInterrupt:
            logger.info("Shutting down...")
        finally:
            self.consumer.close()
            self.producer.close()
            self.db_conn.close()

if __name__ == '__main__':
    engine = CorrelationEngine()
    engine.run()
