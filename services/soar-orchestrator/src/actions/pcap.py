import logging
import requests
from .base import BaseAction

logger = logging.getLogger(__name__)

class PCAPRequestAction(BaseAction):
    """Request PCAP capture from sensor"""
    
    async def execute(self, params, context):
        resolved_params = self.resolve_params(params, context)
        
        sensor_id = resolved_params.get('sensor_id', '')
        duration = resolved_params.get('duration', 60)
        alert_id = context.get('alert', {}).get('id', 'unknown')
        
        if not sensor_id:
            logger.warning("No sensor_id provided for PCAP request")
            return {'success': False, 'error': 'Missing sensor_id'}
            
        if self.dry_run:
            logger.info(f"[DRY-RUN] Would request {duration}s PCAP from sensor {sensor_id}")
            return {
                'success': True,
                'dry_run': True,
                'action': 'pcap_request',
                'sensor_id': sensor_id,
                'duration': duration
            }
        else:
            try:
                url = f"http://sensor-controller:8084/sensors/{sensor_id}/pcap"
                payload = {
                    'duration_seconds': duration,
                    'object_key': f'pcap/soar/{alert_id}.pcap',
                    'notes': f'SOAR automated capture for alert {alert_id}'
                }
                response = requests.post(url, json=payload, timeout=5)
                
                if response.status_code == 202:
                    logger.info(f"PCAP request sent to sensor {sensor_id}")
                    return {
                        'success': True,
                        'action': 'pcap_request',
                        'sensor_id': sensor_id,
                        'request_id': response.json().get('request_id')
                    }
                else:
                    logger.error(f"PCAP request failed: {response.status_code}")
                    return {'success': False, 'error': f'HTTP {response.status_code}'}
            except Exception as e:
                logger.error(f"PCAP request error: {e}")
                return {'success': False, 'error': str(e)}
