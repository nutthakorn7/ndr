import ldap3
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any
from loguru import logger
from ..models.auth_log import AuthenticationLog
from ..core.config import settings

class ActiveDirectoryCollector:
    """Collector สำหรับเก็บ Authentication Log จาก Active Directory"""
    
    def __init__(self, server: str, username: str, password: str, domain: str, port: int = 389, use_ssl: bool = False):
        self.server = server
        self.username = username
        self.password = password
        self.domain = domain
        self.port = port
        self.use_ssl = use_ssl
        self.connection = None
        
    def connect(self) -> bool:
        """เชื่อมต่อ LDAP ไปยัง Active Directory"""
        try:
            server = ldap3.Server(self.server, port=self.port, use_ssl=self.use_ssl)
            user_dn = f"{self.username}@{self.domain}"
            
            self.connection = ldap3.Connection(
                server,
                user=user_dn,
                password=self.password,
                auto_bind=True
            )
            
            logger.info(f"เชื่อมต่อ Active Directory {self.server} สำเร็จ")
            return True
            
        except Exception as e:
            logger.error(f"ไม่สามารถเชื่อมต่อ Active Directory {self.server}: {str(e)}")
            return False
    
    def disconnect(self):
        """ปิดการเชื่อมต่อ LDAP"""
        if self.connection:
            self.connection.unbind()
    
    def collect_windows_event_logs(self, hours_back: int = 1) -> List[Dict[str, Any]]:
        """เก็บ Windows Event Logs ผ่าน PowerShell"""
        logs = []
        try:
            # ใช้ PowerShell เพื่อดึง Event Logs
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=hours_back)
            
            # Event IDs ที่เกี่ยวข้องกับ Authentication
            auth_event_ids = [
                4624,  # Successful logon
                4625,  # Failed logon
                4634,  # Logoff
                4647,  # User initiated logoff
                4648,  # Explicit credential logon
                4778,  # Session reconnected
                4779,  # Session disconnected
                4800,  # Workstation locked
                4801,  # Workstation unlocked
                4802,  # Screen saver invoked
                4803   # Screen saver dismissed
            ]
            
            # PowerShell command
            ps_command = f"""
            Get-WinEvent -FilterHashtable @{{
                LogName = 'Security'
                ID = @({','.join(map(str, auth_event_ids))})
                StartTime = '{start_time.strftime('%Y-%m-%d %H:%M:%S')}'
                EndTime = '{end_time.strftime('%Y-%m-%d %H:%M:%S')}'
            }} | ConvertTo-Json -Depth 10
            """
            
            # ส่งคำสั่งไปยัง Domain Controller
            # ในที่นี้จะใช้ SSH หรือ WinRM
            # สำหรับตัวอย่างจะใช้ mock data
            
            mock_events = self._get_mock_windows_events()
            for event in mock_events:
                log_entry = self._parse_windows_event(event)
                if log_entry:
                    logs.append(log_entry)
                    
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ Windows Event Logs: {str(e)}")
            
        return logs
    
    def collect_ldap_authentication_logs(self, hours_back: int = 1) -> List[Dict[str, Any]]:
        """เก็บ Authentication Logs ผ่าน LDAP"""
        logs = []
        try:
            if not self.connect():
                return []
            
            # ค้นหา User Objects ที่มีการเปลี่ยนแปลงล่าสุด
            search_base = f"DC={self.domain.replace('.', ',DC=')}"
            search_filter = "(&(objectClass=user)(whenChanged>={}))".format(
                (datetime.now() - timedelta(hours=hours_back)).strftime('%Y%m%d%H%M%S.0Z')
            )
            
            self.connection.search(
                search_base=search_base,
                search_filter=search_filter,
                attributes=['sAMAccountName', 'userPrincipalName', 'whenChanged', 'lastLogon', 'logonCount']
            )
            
            for entry in self.connection.entries:
                log_entry = self._parse_ldap_entry(entry)
                if log_entry:
                    logs.append(log_entry)
                    
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ LDAP Authentication Logs: {str(e)}")
        finally:
            self.disconnect()
            
        return logs
    
    def collect_domain_controller_logs(self, hours_back: int = 1) -> List[Dict[str, Any]]:
        """เก็บ Logs จาก Domain Controller"""
        logs = []
        try:
            # ใช้ WMI หรือ PowerShell เพื่อดึงข้อมูลจาก Domain Controller
            # ในที่นี้จะใช้ mock data
            
            mock_dc_logs = self._get_mock_dc_logs()
            for log in mock_dc_logs:
                log_entry = self._parse_dc_log(log)
                if log_entry:
                    logs.append(log_entry)
                    
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ Domain Controller Logs: {str(e)}")
            
        return logs
    
    def _parse_windows_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """แปลง Windows Event เป็น Dictionary"""
        try:
            event_id = event.get('Id', 0)
            timestamp = datetime.fromisoformat(event.get('TimeCreated', '').replace('Z', '+00:00'))
            
            # แปลง Event ID เป็น Action
            action_map = {
                4624: 'LOGIN',
                4625: 'LOGIN_FAILED',
                4634: 'LOGOUT',
                4647: 'LOGOUT',
                4648: 'LOGIN',
                4778: 'SESSION_RECONNECT',
                4779: 'SESSION_DISCONNECT',
                4800: 'WORKSTATION_LOCK',
                4801: 'WORKSTATION_UNLOCK',
                4802: 'SCREENSAVER_INVOKE',
                4803: 'SCREENSAVER_DISMISS'
            }
            
            action = action_map.get(event_id, 'UNKNOWN')
            status = 'SUCCESS' if event_id in [4624, 4634, 4647, 4648, 4778, 4779, 4800, 4801, 4802, 4803] else 'FAILED'
            
            # ดึงข้อมูลจาก Properties
            properties = event.get('Properties', [])
            username = 'Unknown'
            client_ip = 'Unknown'
            
            for prop in properties:
                if prop.get('Name') == 'TargetUserName':
                    username = prop.get('Value', 'Unknown')
                elif prop.get('Name') == 'IpAddress':
                    client_ip = prop.get('Value', 'Unknown')
            
            return {
                'source_type': 'AD',
                'source_name': self.server,
                'source_ip': self.server,
                'user_id': username,
                'username': username,
                'domain': self.domain,
                'action': action,
                'status': status,
                'auth_method': 'WINDOWS_AUTH',
                'client_ip': client_ip,
                'timestamp': timestamp,
                'details': {
                    'event_id': event_id,
                    'event_data': event
                }
            }
            
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการแปลง Windows Event: {str(e)}")
            return None
    
    def _parse_ldap_entry(self, entry) -> Dict[str, Any]:
        """แปลง LDAP Entry เป็น Dictionary"""
        try:
            username = entry.sAMAccountName.value if hasattr(entry, 'sAMAccountName') else 'Unknown'
            last_logon = entry.lastLogon.value if hasattr(entry, 'lastLogon') else None
            logon_count = entry.logonCount.value if hasattr(entry, 'logonCount') else 0
            
            return {
                'source_type': 'AD',
                'source_name': self.server,
                'source_ip': self.server,
                'user_id': username,
                'username': username,
                'domain': self.domain,
                'action': 'LDAP_QUERY',
                'status': 'SUCCESS',
                'auth_method': 'LDAP',
                'client_ip': 'Unknown',
                'timestamp': datetime.now(),
                'details': {
                    'last_logon': last_logon,
                    'logon_count': logon_count,
                    'ldap_entry': str(entry)
                }
            }
            
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการแปลง LDAP Entry: {str(e)}")
            return None
    
    def _parse_dc_log(self, log: Dict[str, Any]) -> Dict[str, Any]:
        """แปลง Domain Controller Log เป็น Dictionary"""
        try:
            return {
                'source_type': 'AD',
                'source_name': self.server,
                'source_ip': self.server,
                'user_id': log.get('username', 'Unknown'),
                'username': log.get('username', 'Unknown'),
                'domain': self.domain,
                'action': log.get('action', 'UNKNOWN'),
                'status': log.get('status', 'UNKNOWN'),
                'auth_method': 'DOMAIN_AUTH',
                'client_ip': log.get('client_ip', 'Unknown'),
                'timestamp': datetime.fromisoformat(log.get('timestamp', '')),
                'details': log
            }
            
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการแปลง DC Log: {str(e)}")
            return None
    
    def _get_mock_windows_events(self) -> List[Dict[str, Any]]:
        """Mock Windows Events สำหรับการทดสอบ"""
        return [
            {
                'Id': 4624,
                'TimeCreated': datetime.now().isoformat(),
                'Properties': [
                    {'Name': 'TargetUserName', 'Value': 'john.doe'},
                    {'Name': 'IpAddress', 'Value': '192.168.1.100'}
                ]
            },
            {
                'Id': 4625,
                'TimeCreated': datetime.now().isoformat(),
                'Properties': [
                    {'Name': 'TargetUserName', 'Value': 'invalid.user'},
                    {'Name': 'IpAddress', 'Value': '192.168.1.101'}
                ]
            }
        ]
    
    def _get_mock_dc_logs(self) -> List[Dict[str, Any]]:
        """Mock Domain Controller Logs สำหรับการทดสอบ"""
        return [
            {
                'username': 'admin.user',
                'action': 'LOGIN',
                'status': 'SUCCESS',
                'client_ip': '192.168.1.50',
                'timestamp': datetime.now().isoformat()
            }
        ]
    
    def collect_logs(self, collection_type: str = 'windows_events') -> List[Dict[str, Any]]:
        """เก็บ Log ตามประเภทการเก็บข้อมูล"""
        try:
            if collection_type == 'windows_events':
                return self.collect_windows_event_logs()
            elif collection_type == 'ldap':
                return self.collect_ldap_authentication_logs()
            elif collection_type == 'domain_controller':
                return self.collect_domain_controller_logs()
            else:
                logger.error(f"ไม่รองรับ Collection Type: {collection_type}")
                return []
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการเก็บ AD Logs: {str(e)}")
            return [] 