#!/usr/bin/env python3
"""
Threat Intelligence Enrichment Service

Enriches network logs with threat intelligence from AlienVault OTX
Extracts IOCs (IPs, domains, hashes) and adds reputation/context
"""
import json
import logging
import os
import time
from datetime import datetime, timedelta
from kafka import KafkaConsumer, KafkaProducer
from OTXv2 import OTXv2
import IndicatorTypes
import redis

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ThreatEnricher:
    def __init__(self):
        # AlienVault OTX API (no key required for basic queries)
        self.otx = OTXv2(os.getenv('OTX_API_KEY', ''), server='https://otx.alienvault.com')
        
        # Redis cache to avoid repeated API calls
        self.redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'redis'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=1,
            decode_responses=True
        )
        self.cache_ttl = int(os.getenv('CACHE_TTL', 86400))  # 24 hours
        
        # Kafka setup
        self.consumer = KafkaConsumer(
            'normalized-logs',
            bootstrap_servers=os.getenv('KAFKA_BROKERS', 'kafka:9092').split(','),
            auto_offset_reset='latest',
            enable_auto_commit=True,
            group_id='threat-enricher-group',
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        
        self.producer = KafkaProducer(
            bootstrap_servers=os.getenv('KAFKA_BROKERS', 'kafka:9092').split(','),
            value_serializer=lambda x: json.dumps(x).encode('utf-8')
        )
        
        logger.info("Threat Enricher initialized")
        
    def extract_iocs(self, log):
        """Extract Indicators of Compromise from log"""
        iocs = {
            'ips': [],
            'domains': [],
            'hashes': []
        }
        
        # Extract IPs
        if log.get('source', {}).get('ip'):
            ip = log['source']['ip']
            # Only check public IPs
            if not self._is_private_ip(ip):
                iocs['ips'].append(ip)
                
        if log.get('destination', {}).get('ip'):
            ip = log['destination']['ip']
            if not self._is_private_ip(ip):
                iocs['ips'].append(ip)
        
        # Extract domains
        if log.get('dns', {}).get('query'):
            iocs['domains'].append(log['dns']['query'])
            
        if log.get('tls', {}).get('server_name'):
            iocs['domains'].append(log['tls']['server_name'])
            
        if log.get('http', {}).get('hostname'):
            iocs['domains'].append(log['http']['hostname'])
        
        # Extract file hashes
        if log.get('file', {}).get('hash'):
            iocs['hashes'].append(log['file']['hash'])
            
        return iocs
        
    def _is_private_ip(self, ip):
        """Check if IP is private/internal"""
        parts = ip.split('.')
        if len(parts) != 4:
            return False
        try:
            first = int(parts[0])
            second = int(parts[1])
            if first == 10:
                return True
            if first == 172 and 16 <= second <= 31:
                return True
            if first == 192 and second == 168:
                return True
            if first == 127:
                return True
        except:
            pass
        return False
        
    def check_ip_reputation(self, ip):
        """Check IP reputation via OTX"""
        cache_key = f"otx:ip:{ip}"
        
        # Check cache first
        cached = self.redis_client.get(cache_key)
        if cached:
            logger.debug(f"Cache hit for IP {ip}")
            return json.loads(cached)
        
        try:
            # Query OTX
            result = self.otx.get_indicator_details_by_section(
                IndicatorTypes.IPv4, ip, 'general'
            )
            
            threat_data = {
                'reputation': 0,
                'is_malicious': False,
                'pulse_count': result.get('pulse_info', {}).get('count', 0),
                'pulses': [],
                'tags': [],
                'checked_at': datetime.utcnow().isoformat()
            }
            
            # Extract pulse information
            pulses = result.get('pulse_info', {}).get('pulses', [])
            if pulses:
                threat_data['is_malicious'] = True
                threat_data['reputation'] = min(len(pulses) * 10, 100)
                
                for pulse in pulses[:5]:  # Top 5 pulses
                    threat_data['pulses'].append({
                        'name': pulse.get('name'),
                        'description': pulse.get('description', '')[:200],
                        'created': pulse.get('created'),
                        'tags': pulse.get('tags', [])
                    })
                    threat_data['tags'].extend(pulse.get('tags', []))
                
                threat_data['tags'] = list(set(threat_data['tags']))[:10]
            
            # Cache the result
            self.redis_client.setex(cache_key, self.cache_ttl, json.dumps(threat_data))
            
            return threat_data
            
        except Exception as e:
            logger.error(f"Error checking IP {ip}: {e}")
            return None
            
    def check_domain_reputation(self, domain):
        """Check domain reputation via OTX"""
        cache_key = f"otx:domain:{domain}"
        
        cached = self.redis_client.get(cache_key)
        if cached:
            logger.debug(f"Cache hit for domain {domain}")
            return json.loads(cached)
            
        try:
            result = self.otx.get_indicator_details_by_section(
                IndicatorTypes.DOMAIN, domain, 'general'
            )
            
            threat_data = {
                'reputation': 0,
                'is_malicious': False,
                'pulse_count': result.get('pulse_info', {}).get('count', 0),
                'pulses': [],
                'tags': [],
                'checked_at': datetime.utcnow().isoformat()
            }
            
            pulses = result.get('pulse_info', {}).get('pulses', [])
            if pulses:
                threat_data['is_malicious'] = True
                threat_data['reputation'] = min(len(pulses) * 10, 100)
                
                for pulse in pulses[:5]:
                    threat_data['pulses'].append({
                        'name': pulse.get('name'),
                        'description': pulse.get('description', '')[:200],
                        'created': pulse.get('created')
                    })
            
            self.redis_client.setex(cache_key, self.cache_ttl, json.dumps(threat_data))
            return threat_data
            
        except Exception as e:
            logger.error(f"Error checking domain {domain}: {e}")
            return None
            
    def check_hash_reputation(self, file_hash):
        """Check file hash reputation via OTX"""
        cache_key = f"otx:hash:{file_hash}"
        
        cached = self.redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
            
        try:
            result = self.otx.get_indicator_details_by_section(
                IndicatorTypes.FILE_HASH_MD5, file_hash, 'general'
            )
            
            threat_data = {
                'reputation': 0,
                'is_malicious': False,
                'pulse_count': result.get('pulse_info', {}).get('count', 0),
                'malware_families': [],
                'checked_at': datetime.utcnow().isoformat()
            }
            
            pulses = result.get('pulse_info', {}).get('pulses', [])
            if pulses:
                threat_data['is_malicious'] = True
                threat_data['reputation'] = 100
                
                for pulse in pulses:
                    if 'malware' in pulse.get('tags', []):
                        threat_data['malware_families'].extend(pulse.get('tags', []))
            
            self.redis_client.setex(cache_key, self.cache_ttl, json.dumps(threat_data))
            return threat_data
            
        except Exception as e:
            logger.error(f"Error checking hash {file_hash}: {e}")
            return None
            
    def enrich_log(self, log):
        """Enrich log with threat intelligence"""
        iocs = self.extract_iocs(log)
        
        threat_intel = {
            'enriched_at': datetime.utcnow().isoformat(),
            'ips': {},
            'domains': {},
            'hashes': {},
            'is_threat': False,
            'max_reputation': 0
        }
        
        # Check IPs
        for ip in iocs['ips']:
            intel = self.check_ip_reputation(ip)
            if intel:
                threat_intel['ips'][ip] = intel
                if intel['is_malicious']:
                    threat_intel['is_threat'] = True
                    threat_intel['max_reputation'] = max(
                        threat_intel['max_reputation'],
                        intel['reputation']
                    )
                    logger.info(f"⚠️  Malicious IP detected: {ip} (reputation: {intel['reputation']})")
        
        # Check domains
        for domain in iocs['domains']:
            intel = self.check_domain_reputation(domain)
            if intel:
                threat_intel['domains'][domain] = intel
                if intel['is_malicious']:
                    threat_intel['is_threat'] = True
                    threat_intel['max_reputation'] = max(
                        threat_intel['max_reputation'],
                        intel['reputation']
                    )
                    logger.info(f"⚠️  Malicious domain detected: {domain}")
        
        # Check hashes
        for file_hash in iocs['hashes']:
            intel = self.check_hash_reputation(file_hash)
            if intel:
                threat_intel['hashes'][file_hash] = intel
                if intel['is_malicious']:
                    threat_intel['is_threat'] = True
                    threat_intel['max_reputation'] = 100
                    logger.info(f"⚠️  Malicious file detected: {file_hash}")
        
        # Add threat intel to log
        log['threat_intel'] = threat_intel
        
        # Elevate severity if threat detected
        if threat_intel['is_threat'] and log.get('event'):
            original_severity = log['event'].get('severity', 'low')
            if original_severity in ['low', 'medium']:
                log['event']['severity'] = 'high'
                log['event']['severity_reason'] = 'Elevated due to threat intelligence match'
                logger.info(f"Elevated severity from {original_severity} to high due to threat intel")
        
        return log
        
    def run(self):
        """Main processing loop"""
        logger.info("Starting Threat Enricher service...")
        
        try:
            for message in self.consumer:
                try:
                    log = message.value
                    
                    # Enrich with threat intel
                    enriched_log = self.enrich_log(log)
                    
                    # Publish enriched log
                    self.producer.send('enriched-logs', value=enriched_log)
                    
                    # Also send malicious ones to alerts topic
                    if enriched_log.get('threat_intel', {}).get('is_threat'):
                        self.producer.send('security-alerts', value=enriched_log)
                        
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    
        except KeyboardInterrupt:
            logger.info("Shutting down...")
        finally:
            self.consumer.close()
            self.producer.close()

if __name__ == '__main__':
    enricher = ThreatEnricher()
    enricher.run()
