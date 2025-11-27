import asyncio
import unittest
from unittest.mock import patch, MagicMock
import sys
import os
from pathlib import Path

# Add detection engine to path
REPO_ROOT = Path(__file__).parent.parent
sys.path.append(str(REPO_ROOT / 'services/detection-engine/src'))

# Mock kafka module before importing main
sys.modules['kafka'] = MagicMock()
sys.modules['kafka.errors'] = MagicMock()

from main import DetectionEngine

class TestSmartPCAP(unittest.IsolatedAsyncioTestCase):
    async def test_trigger_pcap_critical(self):
        # Mock Kafka
        with patch('main.KafkaConsumer'), patch('main.KafkaProducer'):
            engine = DetectionEngine()
            
            # Mock requests.post
            with patch('requests.post') as mock_post:
                mock_post.return_value.status_code = 202
                
                alert = {
                    'id': 'alert-123',
                    'title': 'Test Critical Alert',
                    'severity': 'critical',
                    'sensor': {'id': 'sensor-001'}
                }
                
                await engine.trigger_pcap(alert)
                
                # Verify request
                mock_post.assert_called_once()
                args, kwargs = mock_post.call_args
                self.assertIn('/sensors/sensor-001/pcap', args[0])
                self.assertEqual(kwargs['json']['duration_seconds'], 60)
                print("\n✅ Smart PCAP triggered correctly for critical alert")

    async def test_trigger_pcap_no_sensor(self):
         with patch('main.KafkaConsumer'), patch('main.KafkaProducer'):
            engine = DetectionEngine()
            with patch('requests.post') as mock_post:
                alert = {
                    'id': 'alert-456',
                    'severity': 'critical'
                    # No sensor ID
                }
                await engine.trigger_pcap(alert)
                mock_post.assert_not_called()
                print("✅ Smart PCAP skipped correctly when no sensor ID")

if __name__ == '__main__':
    unittest.main()
