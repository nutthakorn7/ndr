import re
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from ipaddress import ip_address, AddressValueError
import geoip2.database
import geoip2.errors

from sqlalchemy.orm import Session
from ..models.firewall_devices import (
    FirewallVendor, FirewallModel, FirewallDevice, 
    LogParsingRule, FirewallLog
)

logger = logging.getLogger(__name__)

class UniversalLogParser:
    """Universal parser that handles logs from multiple firewall vendors"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.parsing_rules_cache = {}
        self.geoip_reader = None
        
        # Load GeoIP database if available
        try:
            self.geoip_reader = geoip2.database.Reader('/opt/geoip/GeoLite2-City.mmdb')
        except Exception as e:
            logger.warning(f"GeoIP database not available: {e}")
    
    def parse_log(self, raw_log: str, device_id: str) -> Optional[Dict[str, Any]]:
        """Parse raw log based on device vendor and model"""
        try:
            # Get device information
            device = self.db.query(FirewallDevice).filter(
                FirewallDevice.id == device_id
            ).first()
            
            if not device:
                logger.error(f"Device not found: {device_id}")
                return None
            
            # Get parsing rules for this device model
            parsing_rules = self._get_parsing_rules(device.model_id)
            
            # Try each parsing rule until one succeeds
            for rule in parsing_rules:
                try:
                    parsed_data = self._apply_parsing_rule(raw_log, rule)
                    if parsed_data:
                        # Add device context
                        parsed_data['device_id'] = device_id
                        parsed_data['parsing_rule_id'] = rule.id
                        parsed_data['vendor_name'] = device.model.vendor.name
                        parsed_data['model_name'] = device.model.model_name
                        
                        # Enhance with geolocation
                        self._add_geolocation(parsed_data)
                        
                        # Normalize fields
                        normalized_data = self._normalize_fields(parsed_data)
                        
                        return normalized_data
                        
                except Exception as e:
                    logger.warning(f"Failed to parse with rule {rule.rule_name}: {e}")
                    continue
            
            logger.warning(f"No parsing rule matched for device {device_id}")
            return None
            
        except Exception as e:
            logger.error(f"Error parsing log for device {device_id}: {e}")
            return None
    
    def _get_parsing_rules(self, model_id: str) -> List[LogParsingRule]:
        """Get parsing rules for a specific firewall model"""
        if model_id not in self.parsing_rules_cache:
            rules = self.db.query(LogParsingRule).filter(
                LogParsingRule.model_id == model_id,
                LogParsingRule.is_active == True
            ).order_by(LogParsingRule.priority.asc()).all()
            
            self.parsing_rules_cache[model_id] = rules
        
        return self.parsing_rules_cache[model_id]
    
    def _apply_parsing_rule(self, raw_log: str, rule: LogParsingRule) -> Optional[Dict[str, Any]]:
        """Apply a specific parsing rule to extract fields"""
        try:
            # Use regex to extract fields
            if rule.regex_pattern:
                match = re.search(rule.regex_pattern, raw_log, re.MULTILINE | re.DOTALL)
                if not match:
                    return None
                
                # Extract groups
                groups = match.groups()
                group_dict = match.groupdict()
                
                # Map fields according to rule configuration
                parsed_data = {
                    'raw_log': raw_log,
                    'log_type': rule.log_type,
                    'rule_name': rule.rule_name
                }
                
                # Apply field mapping
                if rule.field_mapping:
                    for standard_field, mapping_config in rule.field_mapping.items():
                        if isinstance(mapping_config, dict):
                            field_name = mapping_config.get('field')
                            if field_name in group_dict:
                                value = group_dict[field_name]
                                # Apply field transformation
                                transformed_value = self._transform_field_value(
                                    value, mapping_config
                                )
                                if transformed_value is not None:
                                    parsed_data[standard_field] = transformed_value
                        elif isinstance(mapping_config, str):
                            # Simple field mapping
                            if mapping_config in group_dict:
                                parsed_data[standard_field] = group_dict[mapping_config]
                
                return parsed_data
                
        except Exception as e:
            logger.error(f"Error applying parsing rule {rule.rule_name}: {e}")
            return None
    
    def _transform_field_value(self, value: str, config: Dict[str, Any]) -> Any:
        """Transform field value according to configuration"""
        if not value:
            return None
        
        try:
            # Apply data type conversion
            data_type = config.get('type', 'string')
            if data_type == 'integer':
                return int(value)
            elif data_type == 'float':
                return float(value)
            elif data_type == 'datetime':
                format_str = config.get('format', '%Y-%m-%d %H:%M:%S')
                return datetime.strptime(value, format_str)
            elif data_type == 'boolean':
                return value.lower() in ['true', '1', 'yes', 'allow', 'accept']
            
            # Apply validation
            validation = config.get('validation')
            if validation == 'ipv4' or validation == 'ipv6':
                try:
                    ip_address(value)
                    return value
                except AddressValueError:
                    return None
            elif validation == 'port':
                port = int(value)
                if 1 <= port <= 65535:
                    return port
                return None
            elif validation == 'protocol':
                return value.upper() if value.upper() in ['TCP', 'UDP', 'ICMP'] else value
            
            # Apply value mapping
            value_mapping = config.get('values')
            if value_mapping and isinstance(value_mapping, dict):
                return value_mapping.get(value, value)
            elif value_mapping and isinstance(value_mapping, list):
                return value if value in value_mapping else None
            
            return value.strip() if isinstance(value, str) else value
            
        except Exception as e:
            logger.warning(f"Error transforming field value '{value}': {e}")
            return value
    
    def _add_geolocation(self, parsed_data: Dict[str, Any]):
        """Add geolocation information for IP addresses"""
        if not self.geoip_reader:
            return
        
        for ip_field in ['source_ip', 'dest_ip']:
            ip_addr = parsed_data.get(ip_field)
            if ip_addr and self._is_public_ip(ip_addr):
                try:
                    response = self.geoip_reader.city(ip_addr)
                    geo_key = f"{ip_field}_geo"
                    parsed_data[geo_key] = {
                        'country': response.country.iso_code,
                        'country_name': response.country.name,
                        'city': response.city.name,
                        'latitude': float(response.location.latitude) if response.location.latitude else None,
                        'longitude': float(response.location.longitude) if response.location.longitude else None
                    }
                except geoip2.errors.AddressNotFoundError:
                    pass
                except Exception as e:
                    logger.warning(f"GeoIP lookup failed for {ip_addr}: {e}")
    
    def _is_public_ip(self, ip_str: str) -> bool:
        """Check if IP address is public (not private/local)"""
        try:
            ip = ip_address(ip_str)
            return ip.is_global
        except AddressValueError:
            return False
    
    def _normalize_fields(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize fields to standard format"""
        normalized = parsed_data.copy()
        
        # Normalize action field
        action = normalized.get('action', '').upper()
        action_mapping = {
            'ACCEPT': 'ALLOW',
            'PERMIT': 'ALLOW',
            'PASS': 'ALLOW',
            'BLOCK': 'DENY',
            'DROP': 'DENY',
            'REJECT': 'DENY'
        }
        if action in action_mapping:
            normalized['action'] = action_mapping[action]
        
        # Normalize severity
        severity = normalized.get('severity', '').upper()
        severity_mapping = {
            'EMERGENCY': 'CRITICAL',
            'ALERT': 'CRITICAL',
            'ERROR': 'HIGH',
            'WARNING': 'MEDIUM',
            'NOTICE': 'LOW',
            'DEBUG': 'INFO'
        }
        if severity in severity_mapping:
            normalized['severity'] = severity_mapping[severity]
        
        # Ensure timestamps
        if 'timestamp' not in normalized:
            normalized['timestamp'] = datetime.utcnow()
        
        # Calculate confidence score
        required_fields = ['source_ip', 'dest_ip', 'action', 'protocol']
        present_fields = sum(1 for field in required_fields if normalized.get(field))
        normalized['confidence_score'] = int((present_fields / len(required_fields)) * 100)
        
        return normalized

class VendorSpecificParsers:
    """Vendor-specific parsing logic"""
    
    @staticmethod
    def parse_fortinet_log(raw_log: str) -> Dict[str, Any]:
        """Parse Fortinet FortiGate logs"""
        # FortiGate logs use key=value format
        pattern = r'(\w+)=([^=]*?)(?=\s+\w+=|\s*$)'
        matches = re.findall(pattern, raw_log)
        
        data = dict(matches)
        
        # Map Fortinet fields to standard fields
        field_mapping = {
            'srcip': 'source_ip',
            'srcport': 'source_port',
            'dstip': 'dest_ip',
            'dstport': 'dest_port',
            'proto': 'protocol',
            'action': 'action',
            'policyid': 'policy_id',
            'user': 'username',
            'app': 'application',
            'service': 'application',
            'sentbyte': 'bytes_sent',
            'rcvdbyte': 'bytes_received'
        }
        
        parsed = {}
        for fortinet_field, standard_field in field_mapping.items():
            if fortinet_field in data:
                parsed[standard_field] = data[fortinet_field]
        
        return parsed
    
    @staticmethod
    def parse_cisco_asa_log(raw_log: str) -> Dict[str, Any]:
        """Parse Cisco ASA logs"""
        # Cisco ASA logs have various formats
        # Example: %ASA-6-302013: Built outbound TCP connection
        
        # Extract ASA message code
        asa_pattern = r'%ASA-(\d)-(\d+): (.+)'
        match = re.search(asa_pattern, raw_log)
        
        if not match:
            return {}
        
        severity_map = {'0': 'CRITICAL', '1': 'CRITICAL', '2': 'CRITICAL', '3': 'HIGH',
                       '4': 'MEDIUM', '5': 'LOW', '6': 'INFO', '7': 'INFO'}
        
        parsed = {
            'severity': severity_map.get(match.group(1), 'INFO'),
            'message_id': match.group(2),
            'message': match.group(3)
        }
        
        # Extract IP addresses and ports
        ip_pattern = r'(\d+\.\d+\.\d+\.\d+)(?::(\d+))?'
        ips = re.findall(ip_pattern, raw_log)
        
        if len(ips) >= 2:
            parsed['source_ip'] = ips[0][0]
            parsed['dest_ip'] = ips[1][0]
            if ips[0][1]:
                parsed['source_port'] = int(ips[0][1])
            if ips[1][1]:
                parsed['dest_port'] = int(ips[1][1])
        
        return parsed
    
    @staticmethod
    def parse_palo_alto_log(raw_log: str) -> Dict[str, Any]:
        """Parse Palo Alto Networks logs"""
        # PAN logs are comma-separated
        fields = raw_log.split(',')
        
        if len(fields) < 20:
            return {}
        
        # Palo Alto field positions (varies by log type)
        parsed = {
            'timestamp': fields[1],
            'source_ip': fields[7],
            'dest_ip': fields[8],
            'source_port': fields[9] if fields[9].isdigit() else None,
            'dest_port': fields[10] if fields[10].isdigit() else None,
            'protocol': fields[11],
            'action': fields[12],
            'application': fields[15] if len(fields) > 15 else None,
            'policy_name': fields[16] if len(fields) > 16 else None
        }
        
        return {k: v for k, v in parsed.items() if v}
    
    @staticmethod
    def parse_sonicwall_log(raw_log: str) -> Dict[str, Any]:
        """Parse SonicWall logs"""
        # SonicWall logs use key=value format similar to Fortinet
        pattern = r'(\w+)=([^=]*?)(?=\s+\w+=|\s*$)'
        matches = re.findall(pattern, raw_log)
        
        data = dict(matches)
        
        # Map SonicWall fields to standard fields
        field_mapping = {
            'src': 'source_ip',
            'dst': 'dest_ip',
            'sport': 'source_port',
            'dport': 'dest_port',
            'proto': 'protocol',
            'fw_action': 'action',
            'rule': 'policy_name',
            'usr': 'username'
        }
        
        parsed = {}
        for sw_field, standard_field in field_mapping.items():
            if sw_field in data:
                parsed[standard_field] = data[sw_field]
        
        return parsed
    
    @staticmethod
    def parse_sophos_log(raw_log: str) -> Dict[str, Any]:
        """Parse Sophos XG/XGS logs"""
        # Sophos logs use key=value format with quoted values
        pattern = r'(\w+)="([^"]*?)"'
        matches = re.findall(pattern, raw_log)
        
        data = dict(matches)
        
        # Also capture non-quoted key=value pairs
        pattern2 = r'(\w+)=([^\s"]+)'
        matches2 = re.findall(pattern2, raw_log)
        data.update(dict(matches2))
        
        # Map Sophos fields to standard fields
        field_mapping = {
            'src_ip': 'source_ip',
            'src_port': 'source_port',
            'dst_ip': 'dest_ip',
            'dst_port': 'dest_port',
            'protocol': 'protocol',
            'status': 'action',
            'fw_rule_id': 'policy_id',
            'user_name': 'username',
            'url': 'url',
            'threat_name': 'threat_name',
            'threat_type': 'threat_category',
            'sent_bytes': 'bytes_sent',
            'recv_bytes': 'bytes_received',
            'sent_pkts': 'packets_sent',
            'recv_pkts': 'packets_received'
        }
        
        parsed = {}
        for sophos_field, standard_field in field_mapping.items():
            if sophos_field in data:
                value = data[sophos_field]
                
                # Convert action values
                if standard_field == 'action':
                    action_map = {'Allow': 'ALLOW', 'Deny': 'DENY', 'Drop': 'DENY', 
                                 'Success': 'ALLOW', 'Failed': 'DENY', 'Blocked': 'DENY'}
                    value = action_map.get(value, value)
                
                # Convert numeric values
                elif standard_field in ['source_port', 'dest_port', 'bytes_sent', 'bytes_received', 
                                       'packets_sent', 'packets_received']:
                    try:
                        value = int(value)
                    except ValueError:
                        continue
                
                parsed[standard_field] = value
        
        # Extract timestamp if available
        timestamp_pattern = r'(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})'
        timestamp_match = re.search(timestamp_pattern, raw_log)
        if timestamp_match:
            parsed['timestamp'] = timestamp_match.group(1)
        
        return parsed
    
    @staticmethod
    def parse_watchguard_log(raw_log: str) -> Dict[str, Any]:
        """Parse WatchGuard Firebox logs"""
        # WatchGuard logs typically follow syslog format with specific message structures
        # Example: May 15 10:30:45 firebox kernel: Deny tcp/External->Trusted 192.168.1.100:80 192.168.1.2:1234 (policy-id-1) msg="Web access denied"
        
        parsed = {}
        
        # Extract timestamp
        timestamp_pattern = r'(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})'
        timestamp_match = re.search(timestamp_pattern, raw_log)
        if timestamp_match:
            parsed['timestamp'] = timestamp_match.group(1)
        
        # Extract action (Allow/Deny/Block)
        action_pattern = r'\b(Allow|Deny|Block)\b'
        action_match = re.search(action_pattern, raw_log, re.IGNORECASE)
        if action_match:
            action = action_match.group(1).title()
            parsed['action'] = 'ALLOW' if action == 'Allow' else 'DENY'
        
        # Extract protocol and interfaces
        protocol_pattern = r'\b(tcp|udp|icmp)/(\w+)->(\w+)\b'
        protocol_match = re.search(protocol_pattern, raw_log, re.IGNORECASE)
        if protocol_match:
            parsed['protocol'] = protocol_match.group(1).upper()
            parsed['interface_in'] = protocol_match.group(2)
            parsed['interface_out'] = protocol_match.group(3)
        
        # Extract IP addresses and ports
        ip_port_pattern = r'(\d+\.\d+\.\d+\.\d+):(\d+)\s+(\d+\.\d+\.\d+\.\d+):(\d+)'
        ip_port_match = re.search(ip_port_pattern, raw_log)
        if ip_port_match:
            parsed['source_ip'] = ip_port_match.group(1)
            parsed['source_port'] = int(ip_port_match.group(2))
            parsed['dest_ip'] = ip_port_match.group(3)
            parsed['dest_port'] = int(ip_port_match.group(4))
        
        # Extract policy information
        policy_pattern = r'\(([^)]+)\)'
        policy_match = re.search(policy_pattern, raw_log)
        if policy_match:
            parsed['policy_name'] = policy_match.group(1)
        
        # Extract message
        msg_pattern = r'msg="([^"]*)"'
        msg_match = re.search(msg_pattern, raw_log)
        if msg_match:
            parsed['event_type'] = msg_match.group(1)
        
        # Extract threat information (for UTM logs)
        threat_pattern = r'threat="([^"]*)"'
        threat_match = re.search(threat_pattern, raw_log)
        if threat_match:
            parsed['threat_name'] = threat_match.group(1)
        
        # Extract URL (for web filtering logs)
        url_pattern = r'url="([^"]*)"'
        url_match = re.search(url_pattern, raw_log)
        if url_match:
            parsed['url'] = url_match.group(1)
        
        # Extract byte counts
        bytes_pattern = r'sent=(\d+).*?rcvd=(\d+)'
        bytes_match = re.search(bytes_pattern, raw_log)
        if bytes_match:
            parsed['bytes_sent'] = int(bytes_match.group(1))
            parsed['bytes_received'] = int(bytes_match.group(2))
        
        # Extract duration
        duration_pattern = r'Duration=(\d+)s'
        duration_match = re.search(duration_pattern, raw_log)
        if duration_match:
            parsed['duration'] = int(duration_match.group(1))
        
        return parsed

class LogParsingEngine:
    """Main engine for coordinating log parsing"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.universal_parser = UniversalLogParser(db_session)
        self.vendor_parsers = VendorSpecificParsers()
    
    def process_log_batch(self, logs: List[Tuple[str, str]]) -> List[Dict[str, Any]]:
        """Process a batch of logs"""
        processed_logs = []
        
        for raw_log, device_id in logs:
            try:
                parsed_data = self.universal_parser.parse_log(raw_log, device_id)
                if parsed_data:
                    processed_logs.append(parsed_data)
                else:
                    # Log parsing failure for monitoring
                    logger.warning(f"Failed to parse log from device {device_id}")
                    
            except Exception as e:
                logger.error(f"Error processing log from device {device_id}: {e}")
        
        return processed_logs
    
    def save_parsed_logs(self, parsed_logs: List[Dict[str, Any]]) -> int:
        """Save parsed logs to database"""
        saved_count = 0
        
        for log_data in parsed_logs:
            try:
                # Create FirewallLog instance
                firewall_log = FirewallLog(
                    device_id=log_data.get('device_id'),
                    parsing_rule_id=log_data.get('parsing_rule_id'),
                    raw_log=log_data.get('raw_log'),
                    original_timestamp=log_data.get('timestamp'),
                    log_type=log_data.get('log_type'),
                    event_type=log_data.get('event_type'),
                    severity=log_data.get('severity'),
                    source_ip=log_data.get('source_ip'),
                    source_port=log_data.get('source_port'),
                    dest_ip=log_data.get('dest_ip'),
                    dest_port=log_data.get('dest_port'),
                    protocol=log_data.get('protocol'),
                    action=log_data.get('action'),
                    threat_name=log_data.get('threat_name'),
                    threat_category=log_data.get('threat_category'),
                    risk_level=log_data.get('risk_level'),
                    username=log_data.get('username'),
                    user_group=log_data.get('user_group'),
                    auth_method=log_data.get('auth_method'),
                    application=log_data.get('application'),
                    application_category=log_data.get('application_category'),
                    url=log_data.get('url'),
                    bytes_sent=log_data.get('bytes_sent'),
                    bytes_received=log_data.get('bytes_received'),
                    packets_sent=log_data.get('packets_sent'),
                    packets_received=log_data.get('packets_received'),
                    duration=log_data.get('duration'),
                    vpn_tunnel=log_data.get('vpn_tunnel'),
                    vpn_user=log_data.get('vpn_user'),
                    vpn_realm=log_data.get('vpn_realm'),
                    policy_id=log_data.get('policy_id'),
                    policy_name=log_data.get('policy_name'),
                    interface_in=log_data.get('interface_in'),
                    interface_out=log_data.get('interface_out'),
                    additional_fields=log_data.get('additional_fields'),
                    geolocation=log_data.get('geolocation'),
                    confidence_score=log_data.get('confidence_score', 100),
                    is_processed=True
                )
                
                self.db.add(firewall_log)
                saved_count += 1
                
            except Exception as e:
                logger.error(f"Error saving parsed log: {e}")
        
        try:
            self.db.commit()
            logger.info(f"Successfully saved {saved_count} parsed logs")
        except Exception as e:
            logger.error(f"Error committing logs to database: {e}")
            self.db.rollback()
            saved_count = 0
        
        return saved_count 