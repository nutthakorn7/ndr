import asyncio
import socket
import ssl
import paramiko
import requests
import logging
import json
from datetime import datetime
from typing import Dict, List, Optional, Any, AsyncGenerator, Tuple
from dataclasses import dataclass
from abc import ABC, abstractmethod

import aiohttp
from pysnmp.hlapi.asyncio import *
from pysnmp.proto.rfc1902 import ObjectName

logger = logging.getLogger(__name__)

@dataclass
class ConnectionConfig:
    """Configuration for different connection types"""
    host: str
    port: int
    protocol: str  # SYSLOG, SNMP, API, SSH
    auth_method: str  # PASSWORD, KEY, TOKEN, COMMUNITY
    credentials: Dict[str, Any]
    ssl_enabled: bool = False
    timeout: int = 30
    retry_count: int = 3
    additional_params: Dict[str, Any] = None

class ConnectionProtocol(ABC):
    """Abstract base class for connection protocols"""
    
    def __init__(self, config: ConnectionConfig):
        self.config = config
        self.logger = logger
    
    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection"""
        pass
    
    @abstractmethod
    async def disconnect(self):
        """Close connection"""
        pass
    
    @abstractmethod
    async def collect_logs(self, start_time: datetime = None, end_time: datetime = None) -> AsyncGenerator[str, None]:
        """Collect logs from the device"""
        pass
    
    @abstractmethod
    async def test_connection(self) -> Tuple[bool, str]:
        """Test if connection is working"""
        pass

class SyslogListener(ConnectionProtocol):
    """Syslog server to receive logs"""
    
    def __init__(self, config: ConnectionConfig):
        super().__init__(config)
        self.server = None
        self.transport = None
        self.protocol = None
        self.log_queue = asyncio.Queue()
    
    async def connect(self) -> bool:
        """Start syslog server"""
        try:
            loop = asyncio.get_event_loop()
            
            # Create UDP server for syslog
            self.transport, self.protocol = await loop.create_datagram_endpoint(
                lambda: SyslogProtocol(self.log_queue),
                local_addr=(self.config.host, self.config.port)
            )
            
            self.logger.info(f"Syslog server started on {self.config.host}:{self.config.port}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to start syslog server: {e}")
            return False
    
    async def disconnect(self):
        """Stop syslog server"""
        if self.transport:
            self.transport.close()
            self.transport = None
            self.protocol = None
    
    async def collect_logs(self, start_time: datetime = None, end_time: datetime = None) -> AsyncGenerator[str, None]:
        """Yield logs from queue"""
        while True:
            try:
                # Wait for logs with timeout
                log_data = await asyncio.wait_for(self.log_queue.get(), timeout=1.0)
                yield log_data
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                self.logger.error(f"Error collecting syslog: {e}")
                break
    
    async def test_connection(self) -> Tuple[bool, str]:
        """Test syslog server"""
        try:
            # Test by sending a test UDP packet to ourselves
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            test_message = "TEST SYSLOG MESSAGE"
            sock.sendto(test_message.encode(), (self.config.host, self.config.port))
            sock.close()
            
            # Wait for the message
            try:
                received = await asyncio.wait_for(self.log_queue.get(), timeout=5.0)
                return True, "Syslog server is working"
            except asyncio.TimeoutError:
                return False, "Syslog server not receiving messages"
                
        except Exception as e:
            return False, f"Syslog test failed: {e}"

class SyslogProtocol(asyncio.DatagramProtocol):
    """UDP protocol handler for syslog"""
    
    def __init__(self, log_queue: asyncio.Queue):
        self.log_queue = log_queue
    
    def datagram_received(self, data, addr):
        """Handle incoming syslog message"""
        try:
            message = data.decode('utf-8', errors='ignore')
            # Add source IP to message
            enhanced_message = f"[{addr[0]}] {message}"
            asyncio.create_task(self.log_queue.put(enhanced_message))
        except Exception as e:
            logger.error(f"Error processing syslog from {addr}: {e}")

class SNMPCollector(ConnectionProtocol):
    """SNMP collector for polling device information"""
    
    def __init__(self, config: ConnectionConfig):
        super().__init__(config)
        self.community = self.config.credentials.get('community', 'public')
        self.version = self.config.credentials.get('version', 'v2c')
        
        # Common SNMP OIDs for firewall monitoring
        self.log_oids = {
            'sysDescr': '1.3.6.1.2.1.1.1.0',
            'sysUpTime': '1.3.6.1.2.1.1.3.0',
            'sysName': '1.3.6.1.2.1.1.5.0',
            'ifNumber': '1.3.6.1.2.1.2.1.0',
            'interfaces': '1.3.6.1.2.1.2.2.1',
            # Vendor-specific OIDs would be added here
        }
    
    async def connect(self) -> bool:
        """Test SNMP connection"""
        try:
            success, message = await self.test_connection()
            return success
        except Exception as e:
            self.logger.error(f"SNMP connection failed: {e}")
            return False
    
    async def disconnect(self):
        """SNMP doesn't maintain persistent connections"""
        pass
    
    async def collect_logs(self, start_time: datetime = None, end_time: datetime = None) -> AsyncGenerator[str, None]:
        """Collect SNMP data (not traditional logs)"""
        try:
            # Get basic system information
            for name, oid in self.log_oids.items():
                try:
                    value = await self._snmp_get(oid)
                    if value:
                        log_entry = {
                            'timestamp': datetime.utcnow().isoformat(),
                            'source': 'snmp',
                            'oid': oid,
                            'name': name,
                            'value': value
                        }
                        yield json.dumps(log_entry)
                except Exception as e:
                    self.logger.warning(f"Failed to get SNMP OID {oid}: {e}")
                    
        except Exception as e:
            self.logger.error(f"SNMP collection failed: {e}")
    
    async def _snmp_get(self, oid: str) -> Optional[str]:
        """Perform SNMP GET operation"""
        try:
            for (errorIndication, errorStatus, errorIndex, varBinds) in await getCmd(
                SnmpEngine(),
                CommunityData(self.community),
                UdpTransportTarget((self.config.host, self.config.port)),
                ContextData(),
                ObjectType(ObjectIdentity(oid))
            ):
                if errorIndication:
                    self.logger.error(f"SNMP error: {errorIndication}")
                    return None
                elif errorStatus:
                    self.logger.error(f"SNMP error: {errorStatus.prettyPrint()} at {errorIndex and varBinds[int(errorIndex) - 1][0] or '?'}")
                    return None
                else:
                    for varBind in varBinds:
                        return str(varBind[1])
            
        except Exception as e:
            self.logger.error(f"SNMP GET failed for OID {oid}: {e}")
            return None
    
    async def test_connection(self) -> Tuple[bool, str]:
        """Test SNMP connectivity"""
        try:
            sysDescr = await self._snmp_get(self.log_oids['sysDescr'])
            if sysDescr:
                return True, f"SNMP connection successful. Device: {sysDescr[:100]}"
            else:
                return False, "SNMP connection failed - no response"
        except Exception as e:
            return False, f"SNMP test failed: {e}"

class APICollector(ConnectionProtocol):
    """REST API collector for modern firewalls"""
    
    def __init__(self, config: ConnectionConfig):
        super().__init__(config)
        self.session = None
        self.headers = {'Content-Type': 'application/json'}
        self.base_url = f"{'https' if self.config.ssl_enabled else 'http'}://{self.config.host}:{self.config.port}"
        
        # Set authentication headers
        auth_type = self.config.auth_method
        if auth_type == 'TOKEN':
            self.headers['Authorization'] = f"Bearer {self.config.credentials.get('token')}"
        elif auth_type == 'API_KEY':
            self.headers['X-API-Key'] = self.config.credentials.get('api_key')
    
    async def connect(self) -> bool:
        """Establish API session"""
        try:
            connector = aiohttp.TCPConnector(
                ssl=False if not self.config.ssl_enabled else ssl.create_default_context()
            )
            timeout = aiohttp.ClientTimeout(total=self.config.timeout)
            self.session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
                headers=self.headers
            )
            
            # Test connection
            success, message = await self.test_connection()
            return success
            
        except Exception as e:
            self.logger.error(f"API connection failed: {e}")
            return False
    
    async def disconnect(self):
        """Close API session"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def collect_logs(self, start_time: datetime = None, end_time: datetime = None) -> AsyncGenerator[str, None]:
        """Collect logs via API"""
        try:
            # Different vendors have different API endpoints
            vendor_endpoints = {
                'fortinet': '/api/v2/monitor/log/device',
                'paloalto': '/api/',
                'cisco': '/api/objects/logginghosts',
                'sonicwall': '/api/sonicos/reporting/log',
                'pfsense': '/api/v1/diagnostics/logs'
            }
            
            # Determine vendor-specific endpoint
            device_info = self.config.additional_params or {}
            vendor = device_info.get('vendor', '').lower()
            endpoint = vendor_endpoints.get(vendor, '/api/logs')
            
            # Build API request
            params = {}
            if start_time:
                params['start'] = start_time.isoformat()
            if end_time:
                params['end'] = end_time.isoformat()
            
            async with self.session.get(f"{self.base_url}{endpoint}", params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Handle different response formats
                    if isinstance(data, list):
                        for log_entry in data:
                            yield json.dumps(log_entry)
                    elif isinstance(data, dict):
                        # Check for common pagination patterns
                        logs = data.get('logs', data.get('results', data.get('data', [])))
                        for log_entry in logs:
                            yield json.dumps(log_entry)
                else:
                    self.logger.error(f"API request failed: {response.status}")
                    
        except Exception as e:
            self.logger.error(f"API log collection failed: {e}")
    
    async def test_connection(self) -> Tuple[bool, str]:
        """Test API connectivity"""
        try:
            # Try to get basic device info
            endpoints_to_try = ['/api/v1/status', '/api/status', '/api/system/status']
            
            for endpoint in endpoints_to_try:
                try:
                    async with self.session.get(f"{self.base_url}{endpoint}") as response:
                        if response.status == 200:
                            return True, f"API connection successful via {endpoint}"
                        elif response.status == 401:
                            return False, "API authentication failed"
                        elif response.status == 403:
                            return False, "API access forbidden"
                except Exception:
                    continue
            
            return False, "No valid API endpoint found"
            
        except Exception as e:
            return False, f"API test failed: {e}"

class SSHCollector(ConnectionProtocol):
    """SSH collector for command-line log collection"""
    
    def __init__(self, config: ConnectionConfig):
        super().__init__(config)
        self.ssh_client = None
        self.username = self.config.credentials.get('username')
        self.password = self.config.credentials.get('password')
        self.key_file = self.config.credentials.get('key_file')
    
    async def connect(self) -> bool:
        """Establish SSH connection"""
        try:
            self.ssh_client = paramiko.SSHClient()
            self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Connect with password or key
            if self.key_file:
                self.ssh_client.connect(
                    hostname=self.config.host,
                    port=self.config.port,
                    username=self.username,
                    key_filename=self.key_file,
                    timeout=self.config.timeout
                )
            else:
                self.ssh_client.connect(
                    hostname=self.config.host,
                    port=self.config.port,
                    username=self.username,
                    password=self.password,
                    timeout=self.config.timeout
                )
            
            return True
            
        except Exception as e:
            self.logger.error(f"SSH connection failed: {e}")
            return False
    
    async def disconnect(self):
        """Close SSH connection"""
        if self.ssh_client:
            self.ssh_client.close()
            self.ssh_client = None
    
    async def collect_logs(self, start_time: datetime = None, end_time: datetime = None) -> AsyncGenerator[str, None]:
        """Collect logs via SSH commands"""
        try:
            if not self.ssh_client:
                await self.connect()
            
            # Vendor-specific commands
            vendor_commands = {
                'fortinet': [
                    'execute log filter category 0',
                    'execute log display'
                ],
                'cisco': [
                    'show logging'
                ],
                'pfsense': [
                    'clog /var/log/system.log',
                    'clog /var/log/filter.log'
                ],
                'linux': [
                    'tail -f /var/log/messages',
                    'tail -f /var/log/syslog'
                ]
            }
            
            # Determine vendor
            device_info = self.config.additional_params or {}
            vendor = device_info.get('vendor', 'linux').lower()
            commands = vendor_commands.get(vendor, vendor_commands['linux'])
            
            # Execute commands
            for command in commands:
                try:
                    stdin, stdout, stderr = self.ssh_client.exec_command(command)
                    
                    # Read output line by line
                    for line in stdout:
                        if line.strip():
                            yield line.strip()
                            
                except Exception as e:
                    self.logger.warning(f"SSH command '{command}' failed: {e}")
                    
        except Exception as e:
            self.logger.error(f"SSH log collection failed: {e}")
    
    async def test_connection(self) -> Tuple[bool, str]:
        """Test SSH connectivity"""
        try:
            if not self.ssh_client:
                success = await self.connect()
                if not success:
                    return False, "SSH connection failed"
            
            # Test with a simple command
            stdin, stdout, stderr = self.ssh_client.exec_command('whoami', timeout=10)
            output = stdout.read().decode().strip()
            
            if output:
                return True, f"SSH connection successful. User: {output}"
            else:
                return False, "SSH command execution failed"
                
        except Exception as e:
            return False, f"SSH test failed: {e}"

class MultiVendorConnectionManager:
    """Manager for handling connections to multiple firewall vendors"""
    
    def __init__(self):
        self.active_connections: Dict[str, ConnectionProtocol] = {}
        self.connection_configs: Dict[str, ConnectionConfig] = {}
    
    def register_device(self, device_id: str, config: ConnectionConfig):
        """Register a device with its connection configuration"""
        self.connection_configs[device_id] = config
    
    async def connect_device(self, device_id: str) -> bool:
        """Connect to a specific device"""
        try:
            config = self.connection_configs.get(device_id)
            if not config:
                logger.error(f"No configuration found for device {device_id}")
                return False
            
            # Create appropriate connection protocol
            protocol_map = {
                'SYSLOG': SyslogListener,
                'SNMP': SNMPCollector,
                'API': APICollector,
                'SSH': SSHCollector
            }
            
            protocol_class = protocol_map.get(config.protocol.upper())
            if not protocol_class:
                logger.error(f"Unsupported protocol: {config.protocol}")
                return False
            
            # Create and connect
            connection = protocol_class(config)
            success = await connection.connect()
            
            if success:
                self.active_connections[device_id] = connection
                logger.info(f"Successfully connected to device {device_id} via {config.protocol}")
                return True
            else:
                logger.error(f"Failed to connect to device {device_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error connecting to device {device_id}: {e}")
            return False
    
    async def disconnect_device(self, device_id: str):
        """Disconnect from a specific device"""
        connection = self.active_connections.get(device_id)
        if connection:
            await connection.disconnect()
            del self.active_connections[device_id]
            logger.info(f"Disconnected from device {device_id}")
    
    async def collect_logs_from_device(self, device_id: str, 
                                     start_time: datetime = None, 
                                     end_time: datetime = None) -> AsyncGenerator[Tuple[str, str], None]:
        """Collect logs from a specific device"""
        connection = self.active_connections.get(device_id)
        if not connection:
            logger.error(f"No active connection for device {device_id}")
            return
        
        try:
            async for log_entry in connection.collect_logs(start_time, end_time):
                yield (log_entry, device_id)
        except Exception as e:
            logger.error(f"Error collecting logs from device {device_id}: {e}")
    
    async def test_device_connection(self, device_id: str) -> Tuple[bool, str]:
        """Test connection to a device"""
        connection = self.active_connections.get(device_id)
        if not connection:
            return False, "No active connection"
        
        return await connection.test_connection()
    
    async def disconnect_all(self):
        """Disconnect from all devices"""
        for device_id in list(self.active_connections.keys()):
            await self.disconnect_device(device_id)
    
    def get_connection_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all connections"""
        status = {}
        for device_id, config in self.connection_configs.items():
            is_connected = device_id in self.active_connections
            status[device_id] = {
                'connected': is_connected,
                'protocol': config.protocol,
                'host': config.host,
                'port': config.port
            }
        
        return status 