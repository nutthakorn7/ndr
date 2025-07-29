import paramiko
import requests
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any
from loguru import logger
from ..models.auth_log import AuthenticationLog
from ..core.config import settings

class ServerCollector:
    """Collector สำหรับเก็บ Authentication Log จาก Server ต่างๆ"""
    
    def __init__(self, hostname: str, username: str = None, password: str = None, 
                 port: int = 22, server_type: str = 'linux', api_key: str = None):
        self.hostname = hostname
        self.username = username
        self.password = password
        self.port = port
        self.server_type = server_type
        self.api_key = api_key
        self.ssh_client = None
        self.session = requests.Session()
        
        if api_key:
            self.session.headers.update({'Authorization': f'Bearer {api_key}'})
    
    def connect_ssh(self) -> bool:
        """เชื่อมต่อ SSH ไปยัง Server"""
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
            logger.info(f"เชื่อมต่อ Server {self.hostname} สำเร็จ")
            return True
        except Exception as e:
            logger.error(f"ไม่สามารถเชื่อมต่อ Server {self.hostname}: {str(e)}")
            return False
    
    def disconnect_ssh(self):
        """ปิดการเชื่อมต่อ SSH"""
        if self.ssh_client:
            self.ssh_client.close()
    
    def collect_linux_auth_logs(self, hours_back: int = 1) -> List[Dict[str, Any]]:
        """เก็บ Authentication Log จาก Linux Server"""
        logs = []
        try:
            if not self.connect_ssh():
                return []
            
            # คำสั่งสำหรับดึง Authentication Log จาก Linux
            commands = [
                "tail -n 1000 /var/log/auth.log",
                "tail -n 1000 /var/log/secure",
                "journalctl -u ssh --since '1 hour ago' --no-pager"
            ]
            
            for command in commands:
                try:
                    stdin, stdout, stderr = self.ssh_client.exec_command(command)
                    output = stdout.read().decode('utf-8')
                    
                    for line in output.split('\n'):
                        if line.strip():
                            log_entry = self._parse_linux_auth_line(line)
                            if log_entry:
                                logs.append(log_entry)
                except Exception as e:
                    logger.warning(f"ไม่สามารถรันคำสั่ง {command}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ Linux zcrLog: {str(e)}")
        finally:
            self.disconnect_ssh()
            
        return logs
    
    def collect_windows_server_logs(self, hours_back: int = 1) -> List[Dict[str, Any]]:
        """เก็บ Authentication Log จาก Windows Server"""
        logs = []
        try:
            # ใช้ PowerShell หรือ WMI เพื่อดึง Event Logs
            # ในที่นี้จะใช้ mock data
            
            mock_windows_logs = self._get_mock_windows_server_logs()
            for log in mock_windows_logs:
                log_entry = self._parse_windows_server_log(log)
                if log_entry:
                    logs.append(log_entry)
                    
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ Windows Server Logs: {str(e)}")
            
        return logs
    
    def collect_web_server_logs(self, hours_back: int = 1) -> List[Dict[str, Any]]:
        """เก็บ Authentication Log จาก Web Server"""
        logs = []
        try:
            if not self.connect_ssh():
                return []
            
            # คำสั่งสำหรับดึง Web Server Logs
            web_log_paths = [
                "/var/log/apache2/access.log",
                "/var/log/nginx/access.log",
                "/var/log/httpd/access_log"
            ]
            
            for log_path in web_log_paths:
                try:
                    command = f"tail -n 1000 {log_path} | grep -E '(login|auth|admin)'"
                    stdin, stdout, stderr = self.ssh_client.exec_command(command)
                    output = stdout.read().decode('utf-8')
                    
                    for line in output.split('\n'):
                        if line.strip():
                            log_entry = self._parse_web_server_line(line, log_path)
                            if log_entry:
                                logs.append(log_entry)
                except Exception as e:
                    logger.warning(f"ไม่สามารถอ่านไฟล์ {log_path}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ Web Server Logs: {str(e)}")
        finally:
            self.disconnect_ssh()
            
        return logs
    
    def collect_database_logs(self, hours_back: int = 1) -> List[Dict[str, Any]]:
        """เก็บ Authentication Log จาก Database Server"""
        logs = []
        try:
            if not self.connect_ssh():
                return []
            
            # คำสั่งสำหรับดึง Database Logs
            db_log_paths = {
                'mysql': "/var/log/mysql/error.log",
                'postgresql': "/var/log/postgresql/postgresql-*.log",
                'oracle': "/u01/app/oracle/diag/rdbms/*/trace/alert_*.log"
            }
            
            for db_type, log_path in db_log_paths.items():
                try:
                    command = f"tail -n 1000 {log_path} | grep -E '(authentication|login|failed)'"
                    stdin, stdout, stderr = self.ssh_client.exec_command(command)
                    output = stdout.read().decode('utf-8')
                    
                    for line in output.split('\n'):
                        if line.strip():
                            log_entry = self._parse_database_line(line, db_type)
                            if log_entry:
                                logs.append(log_entry)
                except Exception as e:
                    logger.warning(f"ไม่สามารถอ่าน Database Log {db_type}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ Database Logs: {str(e)}")
        finally:
            self.disconnect_ssh()
            
        return logs
    
    def _parse_linux_auth_line(self, line: str) -> Dict[str, Any]:
        """แปลง Linux Auth Log Line เป็น Dictionary"""
        try:
            # Linux Auth Log Format: Dec 20 10:30:00 server sshd[1234]: Accepted password for user from 192.168.1.100 port 12345 ssh2
            # หรือ: Dec 20 10:30:00 server sshd[1234]: Failed password for invalid user admin from 192.168.1.101 port 12346 ssh2
            
            # แยก timestamp และ message
            parts = line.split('sshd[')
            if len(parts) < 2:
                return None
            
            timestamp_part = parts[0].strip()
            message_part = parts[1].split(']: ', 1)
            if len(message_part) < 2:
                return None
            
            message = message_part[1]
            
            # แปลง timestamp
            try:
                timestamp = datetime.strptime(timestamp_part, '%b %d %H:%M:%S')
                # เพิ่มปีปัจจุบัน
                timestamp = timestamp.replace(year=datetime.now().year)
            except:
                timestamp = datetime.now()
            
            # ตรวจสอบประเภทของ message
            if 'Accepted password' in message:
                # Successful login
                match = re.search(r'Accepted password for (\S+) from ([\d.]+) port (\d+)', message)
                if match:
                    username = match.group(1)
                    client_ip = match.group(2)
                    client_port = int(match.group(3))
                    
                    return {
                        'source_type': 'SERVER',
                        'source_name': self.hostname,
                        'source_ip': self.hostname,
                        'user_id': username,
                        'username': username,
                        'action': 'LOGIN',
                        'status': 'SUCCESS',
                        'auth_method': 'SSH_PASSWORD',
                        'client_ip': client_ip,
                        'client_port': client_port,
                        'timestamp': timestamp,
                        'details': {'raw_line': line}
                    }
            
            elif 'Failed password' in message:
                # Failed login
                match = re.search(r'Failed password for (\S+) from ([\d.]+) port (\d+)', message)
                if match:
                    username = match.group(1)
                    client_ip = match.group(2)
                    client_port = int(match.group(3))
                    
                    return {
                        'source_type': 'SERVER',
                        'source_name': self.hostname,
                        'source_ip': self.hostname,
                        'user_id': username,
                        'username': username,
                        'action': 'LOGIN',
                        'status': 'FAILED',
                        'auth_method': 'SSH_PASSWORD',
                        'client_ip': client_ip,
                        'client_port': client_port,
                        'timestamp': timestamp,
                        'details': {'raw_line': line}
                    }
            
            elif 'session opened' in message:
                # Session opened
                match = re.search(r'session opened for user (\S+) by \(uid=\d+\)', message)
                if match:
                    username = match.group(1)
                    
                    return {
                        'source_type': 'SERVER',
                        'source_name': self.hostname,
                        'source_ip': self.hostname,
                        'user_id': username,
                        'username': username,
                        'action': 'SESSION_OPEN',
                        'status': 'SUCCESS',
                        'auth_method': 'SSH',
                        'client_ip': 'Unknown',
                        'timestamp': timestamp,
                        'details': {'raw_line': line}
                    }
            
            elif 'session closed' in message:
                # Session closed
                match = re.search(r'session closed for user (\S+)', message)
                if match:
                    username = match.group(1)
                    
                    return {
                        'source_type': 'SERVER',
                        'source_name': self.hostname,
                        'source_ip': self.hostname,
                        'user_id': username,
                        'username': username,
                        'action': 'SESSION_CLOSE',
                        'status': 'SUCCESS',
                        'auth_method': 'SSH',
                        'client_ip': 'Unknown',
                        'timestamp': timestamp,
                        'details': {'raw_line': line}
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการแปลง Linux Auth Line: {str(e)}")
            return None
    
    def _parse_web_server_line(self, line: str, log_path: str) -> Dict[str, Any]:
        """แปลง Web Server Log Line เป็น Dictionary"""
        try:
            # Apache/Nginx Log Format
            pattern = r'(\S+) - (\S+) \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\d+) "([^"]*)" "([^"]*)"'
            match = re.search(pattern, line)
            
            if match:
                client_ip = match.group(1)
                user = match.group(2)
                timestamp_str = match.group(3)
                method = match.group(4)
                url = match.group(5)
                status_code = match.group(7)
                
                # แปลง timestamp
                timestamp = datetime.strptime(timestamp_str, '%d/%b/%Y:%H:%M:%S %z')
                
                # ตรวจสอบว่าเป็นการ Authentication หรือไม่
                if 'login' in url.lower() or 'auth' in url.lower() or status_code in ['401', '403']:
                    return {
                        'source_type': 'SERVER',
                        'source_name': self.hostname,
                        'source_ip': self.hostname,
                        'user_id': user if user != '-' else client_ip,
                        'username': user if user != '-' else client_ip,
                        'action': 'WEB_ACCESS',
                        'status': 'SUCCESS' if status_code == '200' else 'FAILED',
                        'auth_method': 'HTTP_AUTH',
                        'client_ip': client_ip,
                        'server_ip': url.split('/')[2] if '//' in url else url,
                        'timestamp': timestamp,
                        'details': {
                            'method': method,
                            'url': url,
                            'status_code': status_code,
                            'log_file': log_path,
                            'raw_line': line
                        }
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการแปลง Web Server Line: {str(e)}")
            return None
    
    def _parse_database_line(self, line: str, db_type: str) -> Dict[str, Any]:
        """แปลง Database Log Line เป็น Dictionary"""
        try:
            # ตรวจสอบว่าเป็นการ Authentication หรือไม่
            if 'authentication' in line.lower() or 'login' in line.lower() or 'failed' in line.lower():
                return {
                    'source_type': 'SERVER',
                    'source_name': self.hostname,
                    'source_ip': self.hostname,
                    'user_id': 'database_user',
                    'username': 'database_user',
                    'action': 'DB_ACCESS',
                    'status': 'SUCCESS' if 'failed' not in line.lower() else 'FAILED',
                    'auth_method': f'{db_type.upper()}_AUTH',
                    'client_ip': 'Unknown',
                    'timestamp': datetime.now(),
                    'details': {
                        'database_type': db_type,
                        'raw_line': line
                    }
                }
            
            return None
            
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการแปลง Database Line: {str(e)}")
            return None
    
    def _parse_windows_server_log(self, log: Dict[str, Any]) -> Dict[str, Any]:
        """แปลง Windows Server Log เป็น Dictionary"""
        try:
            return {
                'source_type': 'SERVER',
                'source_name': self.hostname,
                'source_ip': self.hostname,
                'user_id': log.get('username', 'Unknown'),
                'username': log.get('username', 'Unknown'),
                'action': log.get('action', 'UNKNOWN'),
                'status': log.get('status', 'UNKNOWN'),
                'auth_method': 'WINDOWS_AUTH',
                'client_ip': log.get('client_ip', 'Unknown'),
                'timestamp': datetime.fromisoformat(log.get('timestamp', '')),
                'details': log
            }
            
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการแปลง Windows Server Log: {str(e)}")
            return None
    
    def _get_mock_windows_server_logs(self) -> List[Dict[str, Any]]:
        """Mock Windows Server Logs สำหรับการทดสอบ"""
        return [
            {
                'username': 'admin',
                'action': 'LOGIN',
                'status': 'SUCCESS',
                'client_ip': '192.168.1.100',
                'timestamp': datetime.now().isoformat()
            }
        ]
    
    def collect_logs(self, log_type: str = 'auth') -> List[Dict[str, Any]]:
        """เก็บ Log ตามประเภทของ Server"""
        try:
            if self.server_type == 'linux':
                if log_type == 'auth':
                    return self.collect_linux_auth_logs()
                elif log_type == 'web':
                    return self.collect_web_server_logs()
                elif log_type == 'database':
                    return self.collect_database_logs()
            elif self.server_type == 'windows':
                return self.collect_windows_server_logs()
            else:
                logger.error(f"ไม่รองรับ Server Type: {self.server_type}")
                return []
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ Server Logs: {str(e)}")
            return [] 