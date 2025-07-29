import requests
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any
from loguru import logger
from ..models.auth_log import AuthenticationLog
from ..core.config import settings

class ProxyCollector:
    """Collector สำหรับเก็บ Authentication Log จาก Proxy Server"""
    
    def __init__(self, proxy_url: str, username: str = None, password: str = None, api_key: str = None):
        self.proxy_url = proxy_url
        self.username = username
        self.password = password
        self.api_key = api_key
        self.session = requests.Session()
        
        # ตั้งค่า Authentication
        if username and password:
            self.session.auth = (username, password)
        if api_key:
            self.session.headers.update({'Authorization': f'Bearer {api_key}'})
    
    def collect_squid_proxy_logs(self, hours_back: int = 1) -> List[Dict[str, Any]]:
        """เก็บ Log จาก Squid Proxy"""
        logs = []
        try:
            # อ่าน Log File จาก Squid Proxy
            log_file_path = "/var/log/squid/access.log"
            command = f"tail -n 1000 {log_file_path}"
            
            # ใช้ SSH หรือ API ในการดึงข้อมูล
            response = self.session.get(f"{self.proxy_url}/api/logs", params={
                'file': log_file_path,
                'lines': 1000
            })
            
            if response.status_code == 200:
                log_lines = response.text.split('\n')
                for line in log_lines:
                    if line.strip():
                        log_entry = self._parse_squid_line(line)
                        if log_entry:
                            logs.append(log_entry)
                            
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ Log จาก Squid Proxy: {str(e)}")
            
        return logs
    
    def collect_nginx_proxy_logs(self, hours_back: int = 1) -> List[Dict[str, Any]]:
        """เก็บ Log จาก Nginx Proxy"""
        logs = []
        try:
            # อ่าน Log File จาก Nginx Proxy
            log_file_path = "/var/log/nginx/access.log"
            
            response = self.session.get(f"{self.proxy_url}/api/logs", params={
                'file': log_file_path,
                'lines': 1000
            })
            
            if response.status_code == 200:
                log_lines = response.text.split('\n')
                for line in log_lines:
                    if line.strip():
                        log_entry = self._parse_nginx_line(line)
                        if log_entry:
                            logs.append(log_entry)
                            
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ Log จาก Nginx Proxy: {str(e)}")
            
        return logs
    
    def collect_bluecoat_proxy_logs(self, hours_back: int = 1) -> List[Dict[str, Any]]:
        """เก็บ Log จาก Blue Coat Proxy"""
        logs = []
        try:
            # ใช้ Blue Coat API
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=hours_back)
            
            response = self.session.get(f"{self.proxy_url}/api/v1/logs", params={
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'log_type': 'authentication'
            })
            
            if response.status_code == 200:
                data = response.json()
                for log_entry in data.get('logs', []):
                    parsed_entry = self._parse_bluecoat_entry(log_entry)
                    if parsed_entry:
                        logs.append(parsed_entry)
                        
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ Log จาก Blue Coat Proxy: {str(e)}")
            
        return logs
    
    def _parse_squid_line(self, line: str) -> Dict[str, Any]:
        """แปลง Log Line จาก Squid Proxy เป็น Dictionary"""
        try:
            # Squid Log Format: timestamp elapsed remotehost code/status bytes method URL rfc931 peerstatus/peerhost type
            # ตัวอย่าง: 1640995200.000 0 192.168.1.100 TCP_DENIED/403 0 GET http://example.com - HIER_NONE/- text/html
            parts = line.split()
            if len(parts) >= 8:
                timestamp = float(parts[0])
                client_ip = parts[2]
                status_code = parts[3].split('/')[1] if '/' in parts[3] else parts[3]
                method = parts[5]
                url = parts[6]
                
                # ตรวจสอบว่าเป็นการ Authentication หรือไม่
                if 'login' in url.lower() or 'auth' in url.lower() or status_code in ['401', '403']:
                    return {
                        'source_type': 'PROXY',
                        'source_name': 'Squid Proxy',
                        'source_ip': self.proxy_url,
                        'user_id': client_ip,  # ใช้ IP เป็น User ID
                        'username': client_ip,
                        'action': 'PROXY_ACCESS',
                        'status': 'SUCCESS' if status_code == '200' else 'FAILED',
                        'auth_method': 'HTTP_AUTH',
                        'client_ip': client_ip,
                        'server_ip': url.split('/')[2] if '//' in url else url,
                        'timestamp': datetime.fromtimestamp(timestamp),
                        'details': {
                            'method': method,
                            'url': url,
                            'status_code': status_code,
                            'raw_line': line
                        }
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการแปลง Squid Log Line: {str(e)}")
            return None
    
    def _parse_nginx_line(self, line: str) -> Dict[str, Any]:
        """แปลง Log Line จาก Nginx Proxy เป็น Dictionary"""
        try:
            # Nginx Log Format: $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
            # ตัวอย่าง: 192.168.1.100 - - [20/Dec/2023:10:30:00 +0000] "GET /login HTTP/1.1" 200 1234 "-" "Mozilla/5.0..."
            pattern = r'(\S+) - (\S+) \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\d+) "([^"]*)" "([^"]*)"'
            match = re.search(pattern, line)
            
            if match:
                client_ip = match.group(1)
                user = match.group(2)
                timestamp_str = match.group(3)
                method = match.group(4)
                url = match.group(5)
                protocol = match.group(6)
                status_code = match.group(7)
                
                # แปลง timestamp
                timestamp = datetime.strptime(timestamp_str, '%d/%b/%Y:%H:%M:%S %z')
                
                # ตรวจสอบว่าเป็นการ Authentication หรือไม่
                if 'login' in url.lower() or 'auth' in url.lower() or status_code in ['401', '403']:
                    return {
                        'source_type': 'PROXY',
                        'source_name': 'Nginx Proxy',
                        'source_ip': self.proxy_url,
                        'user_id': user if user != '-' else client_ip,
                        'username': user if user != '-' else client_ip,
                        'action': 'PROXY_ACCESS',
                        'status': 'SUCCESS' if status_code == '200' else 'FAILED',
                        'auth_method': 'HTTP_AUTH',
                        'client_ip': client_ip,
                        'server_ip': url.split('/')[2] if '//' in url else url,
                        'timestamp': timestamp,
                        'details': {
                            'method': method,
                            'url': url,
                            'status_code': status_code,
                            'raw_line': line
                        }
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการแปลง Nginx Log Line: {str(e)}")
            return None
    
    def _parse_bluecoat_entry(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        """แปลง Log Entry จาก Blue Coat Proxy เป็น Dictionary"""
        try:
            # Blue Coat Log Format (JSON)
            timestamp = datetime.fromisoformat(entry.get('timestamp', '').replace('Z', '+00:00'))
            client_ip = entry.get('client_ip', '')
            user = entry.get('user', '')
            action = entry.get('action', '')
            status = entry.get('status', '')
            
            return {
                'source_type': 'PROXY',
                'source_name': 'Blue Coat Proxy',
                'source_ip': self.proxy_url,
                'user_id': user if user else client_ip,
                'username': user if user else client_ip,
                'action': action.upper(),
                'status': 'SUCCESS' if status == 'success' else 'FAILED',
                'auth_method': 'PROXY_AUTH',
                'client_ip': client_ip,
                'timestamp': timestamp,
                'details': entry
            }
            
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการแปลง Blue Coat Log Entry: {str(e)}")
            return None
    
    def collect_logs(self, proxy_type: str = 'squid') -> List[Dict[str, Any]]:
        """เก็บ Log ตามประเภทของ Proxy"""
        try:
            if proxy_type == 'squid':
                return self.collect_squid_proxy_logs()
            elif proxy_type == 'nginx':
                return self.collect_nginx_proxy_logs()
            elif proxy_type == 'bluecoat':
                return self.collect_bluecoat_proxy_logs()
            else:
                logger.error(f"ไม่รองรับ Proxy Type: {proxy_type}")
                return []
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ Proxy Logs: {str(e)}")
            return [] 