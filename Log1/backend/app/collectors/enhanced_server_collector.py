import paramiko
import requests
import json
import re
import subprocess
import winrm
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Generator
from loguru import logger
import asyncio
import aiohttp
from pathlib import Path

class EnhancedServerCollector:
    """Enhanced collector for various types of servers and log sources"""
    
    def __init__(self, hostname: str, username: str = None, password: str = None, 
                 port: int = 22, server_type: str = 'linux', protocol: str = 'ssh',
                 api_key: str = None, ssl_verify: bool = True):
        self.hostname = hostname
        self.username = username
        self.password = password
        self.port = port
        self.server_type = server_type.lower()
        self.protocol = protocol.lower()
        self.api_key = api_key
        self.ssl_verify = ssl_verify
        
        # Connection objects
        self.ssh_client = None
        self.winrm_session = None
        self.http_session = requests.Session()
        
        # Configure HTTP session
        if api_key:
            self.http_session.headers.update({
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            })
        
        # Server-specific configurations
        self.log_configurations = {
            'linux': {
                'auth_logs': [
                    '/var/log/auth.log',
                    '/var/log/secure',
                    '/var/log/messages'
                ],
                'web_logs': [
                    '/var/log/apache2/access.log',
                    '/var/log/nginx/access.log',
                    '/var/log/httpd/access_log'
                ],
                'system_logs': [
                    '/var/log/syslog',
                    '/var/log/messages',
                    '/var/log/kern.log'
                ]
            },
            'windows': {
                'security_logs': 'Security',
                'system_logs': 'System',
                'application_logs': 'Application'
            },
            'web_server': {
                'access_logs': [
                    '/var/log/apache2/access.log',
                    '/var/log/nginx/access.log',
                    '/var/log/httpd/access_log'
                ],
                'error_logs': [
                    '/var/log/apache2/error.log',
                    '/var/log/nginx/error.log',
                    '/var/log/httpd/error_log'
                ]
            },
            'database': {
                'mysql_logs': [
                    '/var/log/mysql/error.log',
                    '/var/log/mysql/slow.log'
                ],
                'postgresql_logs': [
                    '/var/log/postgresql/postgresql.log'
                ]
            }
        }

    async def connect(self) -> bool:
        """Establish connection based on protocol"""
        try:
            if self.protocol == 'ssh':
                return await self._connect_ssh()
            elif self.protocol == 'winrm':
                return await self._connect_winrm()
            elif self.protocol in ['http', 'https', 'api']:
                return await self._connect_http()
            else:
                logger.error(f"Unsupported protocol: {self.protocol}")
                return False
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            return False

    async def _connect_ssh(self) -> bool:
        """Connect via SSH"""
        try:
            self.ssh_client = paramiko.SSHClient()
            self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            await asyncio.get_event_loop().run_in_executor(
                None,
                self.ssh_client.connect,
                self.hostname,
                self.port,
                self.username,
                self.password,
                30  # timeout
            )
            
            logger.info(f"SSH connection established to {self.hostname}")
            return True
        except Exception as e:
            logger.error(f"SSH connection failed: {e}")
            return False

    async def _connect_winrm(self) -> bool:
        """Connect via WinRM for Windows servers"""
        try:
            self.winrm_session = winrm.Session(
                f'{self.hostname}:{self.port}',
                auth=(self.username, self.password),
                transport='ntlm'
            )
            
            # Test connection
            result = self.winrm_session.run_cmd('echo test')
            if result.status_code == 0:
                logger.info(f"WinRM connection established to {self.hostname}")
                return True
            else:
                logger.error(f"WinRM test failed: {result.std_err}")
                return False
        except Exception as e:
            logger.error(f"WinRM connection failed: {e}")
            return False

    async def _connect_http(self) -> bool:
        """Connect via HTTP/HTTPS API"""
        try:
            base_url = f"{'https' if self.protocol == 'https' else 'http'}://{self.hostname}:{self.port}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{base_url}/health",
                    headers=self.http_session.headers,
                    ssl=self.ssl_verify
                ) as response:
                    if response.status == 200:
                        logger.info(f"HTTP connection established to {self.hostname}")
                        return True
                    else:
                        logger.warning(f"HTTP health check returned {response.status}")
                        return True  # Some APIs don't have health endpoints
        except Exception as e:
            logger.error(f"HTTP connection failed: {e}")
            return False

    async def collect_logs(self, log_type: str = 'auth', 
                          start_time: Optional[datetime] = None,
                          end_time: Optional[datetime] = None,
                          limit: int = 1000) -> Generator[Dict[str, Any], None, None]:
        """Collect logs based on server type and log type"""
        
        if not start_time:
            start_time = datetime.now() - timedelta(hours=1)
        if not end_time:
            end_time = datetime.now()

        try:
            if self.server_type == 'linux':
                async for log in self._collect_linux_logs(log_type, start_time, end_time, limit):
                    yield log
            elif self.server_type == 'windows':
                async for log in self._collect_windows_logs(log_type, start_time, end_time, limit):
                    yield log
            elif self.server_type == 'web_server':
                async for log in self._collect_web_server_logs(log_type, start_time, end_time, limit):
                    yield log
            elif self.server_type == 'database':
                async for log in self._collect_database_logs(log_type, start_time, end_time, limit):
                    yield log
            elif self.server_type == 'application':
                async for log in self._collect_application_logs(log_type, start_time, end_time, limit):
                    yield log
            else:
                logger.error(f"Unsupported server type: {self.server_type}")
                
        except Exception as e:
            logger.error(f"Log collection failed: {e}")

    async def _collect_linux_logs(self, log_type: str, start_time: datetime, 
                                end_time: datetime, limit: int) -> Generator[Dict[str, Any], None, None]:
        """Collect logs from Linux servers"""
        if self.protocol != 'ssh' or not self.ssh_client:
            logger.error("SSH connection required for Linux log collection")
            return

        log_paths = self.log_configurations['linux'].get(f'{log_type}_logs', [])
        
        for log_path in log_paths:
            try:
                # Check if log file exists
                stdin, stdout, stderr = self.ssh_client.exec_command(f'test -f {log_path} && echo exists')
                if 'exists' not in stdout.read().decode():
                    continue

                # Read recent logs
                command = f"tail -n {limit} {log_path}"
                stdin, stdout, stderr = self.ssh_client.exec_command(command)
                
                logs = stdout.read().decode().strip().split('\n')
                
                for log_line in logs:
                    if not log_line.strip():
                        continue
                        
                    parsed_log = self._parse_linux_log(log_line, log_path)
                    if parsed_log and self._is_in_time_range(parsed_log.get('timestamp'), start_time, end_time):
                        yield parsed_log
                        
            except Exception as e:
                logger.error(f"Error collecting from {log_path}: {e}")

    async def _collect_windows_logs(self, log_type: str, start_time: datetime, 
                                  end_time: datetime, limit: int) -> Generator[Dict[str, Any], None, None]:
        """Collect logs from Windows servers"""
        if self.protocol != 'winrm' or not self.winrm_session:
            logger.error("WinRM connection required for Windows log collection")
            return

        log_name = self.log_configurations['windows'].get(f'{log_type}_logs', 'Security')
        
        try:
            # PowerShell command to get Windows Event Logs
            ps_command = f"""
            Get-WinEvent -LogName {log_name} -MaxEvents {limit} | 
            Where-Object {{$_.TimeCreated -ge '{start_time.strftime('%Y-%m-%d %H:%M:%S')}' -and 
                         $_.TimeCreated -le '{end_time.strftime('%Y-%m-%d %H:%M:%S')}'}} |
            ConvertTo-Json
            """
            
            result = self.winrm_session.run_ps(ps_command)
            
            if result.status_code == 0:
                events = json.loads(result.std_out)
                if not isinstance(events, list):
                    events = [events]
                
                for event in events:
                    parsed_log = self._parse_windows_log(event)
                    if parsed_log:
                        yield parsed_log
                        
        except Exception as e:
            logger.error(f"Error collecting Windows logs: {e}")

    async def _collect_web_server_logs(self, log_type: str, start_time: datetime, 
                                     end_time: datetime, limit: int) -> Generator[Dict[str, Any], None, None]:
        """Collect logs from web servers"""
        if self.protocol == 'ssh' and self.ssh_client:
            log_paths = self.log_configurations['web_server'].get(f'{log_type}_logs', [])
            
            for log_path in log_paths:
                try:
                    # Check if log file exists
                    stdin, stdout, stderr = self.ssh_client.exec_command(f'test -f {log_path} && echo exists')
                    if 'exists' not in stdout.read().decode():
                        continue

                    # Read recent logs
                    command = f"tail -n {limit} {log_path}"
                    stdin, stdout, stderr = self.ssh_client.exec_command(command)
                    
                    logs = stdout.read().decode().strip().split('\n')
                    
                    for log_line in logs:
                        if not log_line.strip():
                            continue
                            
                        parsed_log = self._parse_web_log(log_line, log_path)
                        if parsed_log and self._is_in_time_range(parsed_log.get('timestamp'), start_time, end_time):
                            yield parsed_log
                            
                except Exception as e:
                    logger.error(f"Error collecting from {log_path}: {e}")
        
        elif self.protocol in ['http', 'https']:
            # Collect via API
            async for log in self._collect_via_api('/api/logs', start_time, end_time, limit):
                yield log

    async def _collect_application_logs(self, log_type: str, start_time: datetime, 
                                      end_time: datetime, limit: int) -> Generator[Dict[str, Any], None, None]:
        """Collect logs from application servers via API"""
        if self.protocol not in ['http', 'https', 'api']:
            logger.error("HTTP/API connection required for application log collection")
            return

        async for log in self._collect_via_api('/api/logs', start_time, end_time, limit):
            yield log

    async def _collect_via_api(self, endpoint: str, start_time: datetime, 
                             end_time: datetime, limit: int) -> Generator[Dict[str, Any], None, None]:
        """Collect logs via REST API"""
        try:
            base_url = f"{'https' if self.protocol == 'https' else 'http'}://{self.hostname}:{self.port}"
            
            params = {
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'limit': limit
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{base_url}{endpoint}",
                    params=params,
                    headers=self.http_session.headers,
                    ssl=self.ssl_verify
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Handle different API response formats
                        logs = data.get('logs', data.get('data', data.get('events', [])))
                        
                        for log_entry in logs:
                            parsed_log = self._parse_api_log(log_entry)
                            if parsed_log:
                                yield parsed_log
                    else:
                        logger.error(f"API request failed: {response.status}")
                        
        except Exception as e:
            logger.error(f"API log collection failed: {e}")

    def _parse_linux_log(self, log_line: str, log_path: str) -> Optional[Dict[str, Any]]:
        """Parse Linux log entry"""
        try:
            # Common Linux log patterns
            auth_pattern = r'(\w+\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+(\S+)(?:\[(\d+)\])?\s*:\s*(.*)'
            
            match = re.match(auth_pattern, log_line)
            if match:
                timestamp_str, hostname, process, pid, message = match.groups()
                
                # Parse timestamp
                timestamp = datetime.strptime(
                    f"{datetime.now().year} {timestamp_str}",
                    "%Y %b %d %H:%M:%S"
                )
                
                # Determine action and status
                action = "UNKNOWN"
                status = "UNKNOWN"
                username = "unknown"
                client_ip = "unknown"
                
                if "authentication failure" in message.lower():
                    action = "AUTH_FAILED"
                    status = "FAILED"
                elif "session opened" in message.lower():
                    action = "LOGIN"
                    status = "SUCCESS"
                elif "session closed" in message.lower():
                    action = "LOGOUT"
                    status = "SUCCESS"
                
                # Extract username and IP
                user_match = re.search(r'user=(\S+)', message)
                if user_match:
                    username = user_match.group(1)
                
                ip_match = re.search(r'rhost=(\S+)', message)
                if ip_match:
                    client_ip = ip_match.group(1)
                
                return {
                    'timestamp': timestamp,
                    'source_type': 'SERVER',
                    'source_name': hostname,
                    'source_ip': self.hostname,
                    'user_id': username,
                    'username': username,
                    'action': action,
                    'status': status,
                    'client_ip': client_ip,
                    'server_ip': self.hostname,
                    'server_port': self.port,
                    'details': {
                        'log_path': log_path,
                        'process': process,
                        'pid': pid,
                        'raw_message': message
                    }
                }
                
        except Exception as e:
            logger.error(f"Error parsing Linux log: {e}")
        
        return None

    def _parse_windows_log(self, event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parse Windows Event Log entry"""
        try:
            # Map Windows Event IDs to actions
            event_actions = {
                4624: "LOGIN",      # Successful logon
                4625: "AUTH_FAILED", # Failed logon
                4634: "LOGOUT",     # Logoff
                4648: "LOGIN",      # Logon with explicit credentials
            }
            
            event_id = event.get('Id', 0)
            action = event_actions.get(event_id, "UNKNOWN")
            status = "SUCCESS" if event_id in [4624, 4634, 4648] else "FAILED"
            
            return {
                'timestamp': datetime.fromisoformat(event.get('TimeCreated', '').replace('Z', '+00:00')),
                'source_type': 'SERVER',
                'source_name': event.get('MachineName', 'unknown'),
                'source_ip': self.hostname,
                'user_id': event.get('UserId', 'unknown'),
                'username': event.get('AccountName', 'unknown'),
                'action': action,
                'status': status,
                'client_ip': event.get('IpAddress', 'unknown'),
                'server_ip': self.hostname,
                'server_port': self.port,
                'details': {
                    'event_id': event_id,
                    'level_display_name': event.get('LevelDisplayName'),
                    'message': event.get('Message', ''),
                    'raw_event': event
                }
            }
            
        except Exception as e:
            logger.error(f"Error parsing Windows log: {e}")
        
        return None

    def _parse_web_log(self, log_line: str, log_path: str) -> Optional[Dict[str, Any]]:
        """Parse web server log entry"""
        try:
            # Apache/Nginx Combined Log Format
            pattern = r'(\S+) \S+ \S+ \[(.*?)\] "(\S+) (\S+) (\S+)" (\d+) (\d+) "(.*?)" "(.*?)"'
            
            match = re.match(pattern, log_line)
            if match:
                ip, timestamp_str, method, url, protocol, status_code, size, referer, user_agent = match.groups()
                
                # Parse timestamp
                timestamp = datetime.strptime(timestamp_str, "%d/%b/%Y:%H:%M:%S %z")
                
                # Determine if this is an authentication-related request
                auth_urls = ['/login', '/logout', '/auth', '/api/auth']
                is_auth = any(auth_url in url for auth_url in auth_urls)
                
                if is_auth:
                    action = "LOGIN" if "/login" in url else "LOGOUT" if "/logout" in url else "AUTH"
                    status = "SUCCESS" if int(status_code) < 400 else "FAILED"
                    
                    return {
                        'timestamp': timestamp,
                        'source_type': 'SERVER',
                        'source_name': self.hostname,
                        'source_ip': self.hostname,
                        'user_id': 'web_user',
                        'username': 'web_user',
                        'action': action,
                        'status': status,
                        'client_ip': ip,
                        'server_ip': self.hostname,
                        'server_port': self.port,
                        'user_agent': user_agent,
                        'details': {
                            'log_path': log_path,
                            'method': method,
                            'url': url,
                            'status_code': int(status_code),
                            'response_size': int(size) if size.isdigit() else 0,
                            'referer': referer
                        }
                    }
                    
        except Exception as e:
            logger.error(f"Error parsing web log: {e}")
        
        return None

    def _parse_api_log(self, log_entry: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parse API log entry"""
        try:
            return {
                'timestamp': datetime.fromisoformat(log_entry.get('timestamp', datetime.now().isoformat())),
                'source_type': 'SERVER',
                'source_name': log_entry.get('hostname', self.hostname),
                'source_ip': self.hostname,
                'user_id': log_entry.get('user_id', 'api_user'),
                'username': log_entry.get('username', 'api_user'),
                'action': log_entry.get('action', 'API_CALL'),
                'status': log_entry.get('status', 'SUCCESS'),
                'client_ip': log_entry.get('client_ip', 'unknown'),
                'server_ip': self.hostname,
                'server_port': self.port,
                'details': log_entry
            }
            
        except Exception as e:
            logger.error(f"Error parsing API log: {e}")
        
        return None

    def _is_in_time_range(self, timestamp: Optional[datetime], 
                         start_time: datetime, end_time: datetime) -> bool:
        """Check if timestamp is within the specified range"""
        if not timestamp:
            return False
        return start_time <= timestamp <= end_time

    async def disconnect(self):
        """Close all connections"""
        try:
            if self.ssh_client:
                self.ssh_client.close()
                self.ssh_client = None
            
            if self.winrm_session:
                self.winrm_session = None
            
            if self.http_session:
                self.http_session.close()
                
            logger.info(f"Disconnected from {self.hostname}")
            
        except Exception as e:
            logger.error(f"Error during disconnect: {e}")

    async def test_connection(self) -> Dict[str, Any]:
        """Test the connection and return status"""
        try:
            success = await self.connect()
            
            if success:
                # Try to collect a small sample
                sample_logs = []
                async for log in self.collect_logs('auth', limit=1):
                    sample_logs.append(log)
                    break
                
                await self.disconnect()
                
                return {
                    'success': True,
                    'message': 'Connection successful',
                    'sample_logs_found': len(sample_logs),
                    'server_type': self.server_type,
                    'protocol': self.protocol
                }
            else:
                return {
                    'success': False,
                    'message': 'Connection failed',
                    'server_type': self.server_type,
                    'protocol': self.protocol
                }
                
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return {
                'success': False,
                'message': f'Connection test failed: {str(e)}',
                'server_type': self.server_type,
                'protocol': self.protocol
            }
