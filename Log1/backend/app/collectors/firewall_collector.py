import paramiko
import re
from datetime import datetime
from typing import List, Dict, Any
from loguru import logger
from ..models.auth_log import AuthenticationLog
from ..core.config import settings

class FirewallCollector:
    """Collector สำหรับเก็บ Authentication Log จาก Firewall"""
    
    def __init__(self, hostname: str, username: str, password: str, port: int = 22):
        self.hostname = hostname
        self.username = username
        self.password = password
        self.port = port
        self.ssh_client = None
        
    def connect(self) -> bool:
        """เชื่อมต่อ SSH ไปยัง Firewall"""
        try:
            self.ssh_client = paramiko.SSHClient()
            self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self.ssh_client.connect(
                hostname=self.hostname,
                username=self.username,
                password=self.password,
                port=self.port,
                timeout=30
            )
            logger.info(f"เชื่อมต่อ Firewall {self.hostname} สำเร็จ")
            return True
        except Exception as e:
            logger.error(f"ไม่สามารถเชื่อมต่อ Firewall {self.hostname}: {str(e)}")
            return False
    
    def disconnect(self):
        """ปิดการเชื่อมต่อ SSH"""
        if self.ssh_client:
            self.ssh_client.close()
    
    def collect_cisco_asa_logs(self, hours_back: int = 1) -> List[Dict[str, Any]]:
        """เก็บ Log จาก Cisco ASA Firewall"""
        logs = []
        try:
            # คำสั่งสำหรับดึง Authentication Log จาก Cisco ASA
            command = f"show logging | include authentication|login|logout|failed"
            
            stdin, stdout, stderr = self.ssh_client.exec_command(command)
            output = stdout.read().decode('utf-8')
            
            for line in output.split('\n'):
                if line.strip():
                    log_entry = self._parse_cisco_asa_line(line)
                    if log_entry:
                        logs.append(log_entry)
                        
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ Log จาก Cisco ASA: {str(e)}")
            
        return logs
    
    def collect_fortinet_logs(self, hours_back: int = 1) -> List[Dict[str, Any]]:
        """เก็บ Log จาก Fortinet Firewall"""
        logs = []
        try:
            # คำสั่งสำหรับดึง Authentication Log จาก Fortinet
            command = f"get log auth-traffic | grep -E '(login|logout|failed)'"
            
            stdin, stdout, stderr = self.ssh_client.exec_command(command)
            output = stdout.read().decode('utf-8')
            
            for line in output.split('\n'):
                if line.strip():
                    log_entry = self._parse_fortinet_line(line)
                    if log_entry:
                        logs.append(log_entry)
                        
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ Log จาก Fortinet: {str(e)}")
            
        return logs
    
    def collect_paloalto_logs(self, hours_back: int = 1) -> List[Dict[str, Any]]:
        """เก็บ Log จาก Palo Alto Firewall"""
        logs = []
        try:
            # คำสั่งสำหรับดึง Authentication Log จาก Palo Alto
            command = f"show log system | match authentication"
            
            stdin, stdout, stderr = self.ssh_client.exec_command(command)
            output = stdout.read().decode('utf-8')
            
            for line in output.split('\n'):
                if line.strip():
                    log_entry = self._parse_paloalto_line(line)
                    if log_entry:
                        logs.append(log_entry)
                        
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ Log จาก Palo Alto: {str(e)}")
            
        return logs
    
    def _parse_cisco_asa_line(self, line: str) -> Dict[str, Any]:
        """แปลง Log Line จาก Cisco ASA เป็น Dictionary"""
        try:
            # ตัวอย่าง Log Format: %ASA-6-113012: AAA user authentication Successful : server = 192.168.1.10 : user = john.doe
            patterns = [
                r'%ASA-\d+-\d+: AAA user authentication (\w+) : server = ([\d.]+) : user = (\S+)',
                r'%ASA-\d+-\d+: User (\S+) logged in to (\S+) from ([\d.]+)',
                r'%ASA-\d+-\d+: User (\S+) logged out from ([\d.]+)'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, line)
                if match:
                    groups = match.groups()
                    if 'authentication' in line:
                        status = 'SUCCESS' if 'Successful' in groups[0] else 'FAILED'
                        return {
                            'source_type': 'FIREWALL',
                            'source_name': self.hostname,
                            'source_ip': self.hostname,
                            'user_id': groups[2],
                            'username': groups[2],
                            'action': 'LOGIN',
                            'status': status,
                            'auth_method': 'AAA',
                            'client_ip': groups[1],
                            'timestamp': datetime.now(),
                            'details': {'raw_line': line}
                        }
                    elif 'logged in' in line:
                        return {
                            'source_type': 'FIREWALL',
                            'source_name': self.hostname,
                            'source_ip': self.hostname,
                            'user_id': groups[0],
                            'username': groups[0],
                            'action': 'LOGIN',
                            'status': 'SUCCESS',
                            'auth_method': 'SSH',
                            'client_ip': groups[2],
                            'timestamp': datetime.now(),
                            'details': {'raw_line': line}
                        }
                    elif 'logged out' in line:
                        return {
                            'source_type': 'FIREWALL',
                            'source_name': self.hostname,
                            'source_ip': self.hostname,
                            'user_id': groups[0],
                            'username': groups[0],
                            'action': 'LOGOUT',
                            'status': 'SUCCESS',
                            'auth_method': 'SSH',
                            'client_ip': groups[1],
                            'timestamp': datetime.now(),
                            'details': {'raw_line': line}
                        }
            
            return None
            
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการแปลง Log Line: {str(e)}")
            return None
    
    def _parse_fortinet_line(self, line: str) -> Dict[str, Any]:
        """แปลง Log Line จาก Fortinet เป็น Dictionary"""
        # Implementation สำหรับ Fortinet Log Format
        pass
    
    def _parse_paloalto_line(self, line: str) -> Dict[str, Any]:
        """แปลง Log Line จาก Palo Alto เป็น Dictionary"""
        # Implementation สำหรับ Palo Alto Log Format
        pass
    
    def collect_logs(self, firewall_type: str = 'cisco_asa') -> List[Dict[str, Any]]:
        """เก็บ Log ตามประเภทของ Firewall"""
        if not self.connect():
            return []
        
        try:
            if firewall_type == 'cisco_asa':
                return self.collect_cisco_asa_logs()
            elif firewall_type == 'fortinet':
                return self.collect_fortinet_logs()
            elif firewall_type == 'paloalto':
                return self.collect_paloalto_logs()
            else:
                logger.error(f"ไม่รองรับ Firewall Type: {firewall_type}")
                return []
        finally:
            self.disconnect() 