"""
ClickHouse Database Client
จัดการการเชื่อมต่อและ operations กับ ClickHouse
"""
import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
import clickhouse_connect
from contextlib import contextmanager

from .config import settings

logger = logging.getLogger(__name__)

class ClickHouseClient:
    """ClickHouse Database Client for Log Management"""
    
    def __init__(self):
        self.host = getattr(settings, 'CLICKHOUSE_HOST', 'clickhouse')
        self.port = getattr(settings, 'CLICKHOUSE_PORT', 8123)
        self.username = getattr(settings, 'CLICKHOUSE_USER', 'default')
        self.password = getattr(settings, 'CLICKHOUSE_PASSWORD', '')
        self.database = getattr(settings, 'CLICKHOUSE_DB', 'auth_logs')
        self._client = None
    
    @property
    def client(self):
        """Get or create ClickHouse client connection"""
        if self._client is None:
            try:
                self._client = clickhouse_connect.get_client(
                    host=self.host,
                    port=self.port,
                    username=self.username,
                    password=self.password,
                    database=self.database
                )
                logger.info(f"Connected to ClickHouse at {self.host}:{self.port}")
            except Exception as e:
                logger.error(f"Failed to connect to ClickHouse: {e}")
                raise
        return self._client
    
    def test_connection(self) -> bool:
        """Test ClickHouse connection"""
        try:
            result = self.client.query("SELECT 1 as test")
            return result.result_rows[0][0] == 1
        except Exception as e:
            logger.error(f"ClickHouse connection test failed: {e}")
            return False
    
    # Authentication Logs Methods
    def insert_auth_log(self, log_data: Dict[str, Any]) -> bool:
        """Insert authentication log into ClickHouse"""
        try:
            # เตรียมข้อมูลสำหรับ insert
            data = {
                'id': log_data.get('id', str(uuid.uuid4())),
                'source_type': log_data.get('source_type', ''),
                'source_name': log_data.get('source_name', ''),
                'source_ip': log_data.get('source_ip', ''),
                'user_id': log_data.get('user_id', ''),
                'username': log_data.get('username', ''),
                'domain': log_data.get('domain', ''),
                'action': log_data.get('action', ''),
                'status': log_data.get('status', ''),
                'auth_method': log_data.get('auth_method', ''),
                'client_ip': log_data.get('client_ip', ''),
                'client_port': log_data.get('client_port', 0),
                'server_ip': log_data.get('server_ip', ''),
                'server_port': log_data.get('server_port', 0),
                'session_id': log_data.get('session_id', ''),
                'user_agent': log_data.get('user_agent', ''),
                'timestamp': log_data.get('timestamp', datetime.now()),
                'created_at': log_data.get('created_at', datetime.now()),
                'details': log_data.get('details', ''),
                'error_message': log_data.get('error_message', ''),
                'is_encrypted': log_data.get('is_encrypted', 0),
                'integrity_hash': log_data.get('integrity_hash', ''),
                'retention_date': log_data.get('retention_date', None)
            }
            
            self.client.insert('authentication_logs', [data])
            return True
            
        except Exception as e:
            logger.error(f"Failed to insert auth log: {e}")
            return False
    
    def get_auth_logs(self, 
                     source_type: Optional[str] = None,
                     username: Optional[str] = None,
                     ip_address: Optional[str] = None,
                     status: Optional[str] = None,
                     start_date: Optional[datetime] = None,
                     end_date: Optional[datetime] = None,
                     limit: int = 50,
                     offset: int = 0) -> List[Dict[str, Any]]:
        """Get authentication logs with filters"""
        try:
            # สร้าง WHERE clause
            conditions = []
            params = {}
            
            if source_type:
                conditions.append("source_type = %(source_type)s")
                params['source_type'] = source_type
                
            if username:
                conditions.append("username ILIKE %(username)s")
                params['username'] = f"%{username}%"
                
            if ip_address:
                conditions.append("client_ip ILIKE %(ip_address)s")
                params['ip_address'] = f"%{ip_address}%"
                
            if status:
                conditions.append("status = %(status)s")
                params['status'] = status
                
            if start_date:
                conditions.append("timestamp >= %(start_date)s")
                params['start_date'] = start_date
                
            if end_date:
                conditions.append("timestamp <= %(end_date)s")
                params['end_date'] = end_date
            
            where_clause = ""
            if conditions:
                where_clause = "WHERE " + " AND ".join(conditions)
            
            query = f"""
                SELECT * FROM authentication_logs 
                {where_clause}
                ORDER BY timestamp DESC 
                LIMIT %(limit)s OFFSET %(offset)s
            """
            
            params.update({'limit': limit, 'offset': offset})
            
            result = self.client.query(query, params)
            
            # แปลง result เป็น list of dict
            columns = [col[0] for col in result.column_names]
            logs = []
            for row in result.result_rows:
                log_dict = dict(zip(columns, row))
                logs.append(log_dict)
            
            return logs
            
        except Exception as e:
            logger.error(f"Failed to get auth logs: {e}")
            return []
    
    def get_auth_log_by_id(self, log_id: str) -> Optional[Dict[str, Any]]:
        """Get single authentication log by ID"""
        try:
            query = "SELECT * FROM authentication_logs WHERE id = %(log_id)s"
            result = self.client.query(query, {'log_id': log_id})
            
            if result.result_rows:
                columns = [col[0] for col in result.column_names]
                return dict(zip(columns, result.result_rows[0]))
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get auth log by ID {log_id}: {e}")
            return None
    
    def get_auth_log_stats(self) -> Dict[str, Any]:
        """Get authentication log statistics"""
        try:
            queries = {
                'total_logs': "SELECT count() FROM authentication_logs",
                'status_stats': """
                    SELECT status, count() as count 
                    FROM authentication_logs 
                    GROUP BY status
                """,
                'source_stats': """
                    SELECT source_type, count() as count 
                    FROM authentication_logs 
                    GROUP BY source_type
                """,
                'recent_logs': """
                    SELECT timestamp, action, status, user_id, client_ip 
                    FROM authentication_logs 
                    ORDER BY timestamp DESC 
                    LIMIT 5
                """
            }
            
            stats = {}
            
            # Total logs
            result = self.client.query(queries['total_logs'])
            stats['total_logs'] = result.result_rows[0][0] if result.result_rows else 0
            
            # Status stats
            result = self.client.query(queries['status_stats'])
            stats['status_stats'] = [
                {'status': row[0], 'count': row[1]} 
                for row in result.result_rows
            ]
            
            # Source stats
            result = self.client.query(queries['source_stats'])
            stats['source_stats'] = [
                {'source_type': row[0], 'count': row[1]} 
                for row in result.result_rows
            ]
            
            # Recent activity
            result = self.client.query(queries['recent_logs'])
            stats['recent_activity'] = [
                {
                    'timestamp': row[0].isoformat() if row[0] else '',
                    'action': row[1],
                    'status': row[2],
                    'user_id': row[3],
                    'client_ip': row[4]
                }
                for row in result.result_rows
            ]
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get auth log stats: {e}")
            return {}
    
    # Firewall Logs Methods
    def insert_firewall_log(self, log_data: Dict[str, Any]) -> bool:
        """Insert firewall log into ClickHouse"""
        try:
            data = {
                'id': log_data.get('id', str(uuid.uuid4())),
                'device_id': log_data.get('device_id', ''),
                'device_name': log_data.get('device_name', ''),
                'raw_log': log_data.get('raw_log', ''),
                'original_timestamp': log_data.get('original_timestamp', datetime.now()),
                'received_timestamp': log_data.get('received_timestamp', datetime.now()),
                'log_type': log_data.get('log_type', ''),
                'event_type': log_data.get('event_type', ''),
                'severity': log_data.get('severity', ''),
                'source_ip': log_data.get('source_ip', ''),
                'source_port': log_data.get('source_port', 0),
                'dest_ip': log_data.get('dest_ip', ''),
                'dest_port': log_data.get('dest_port', 0),
                'protocol': log_data.get('protocol', ''),
                'action': log_data.get('action', ''),
                'threat_name': log_data.get('threat_name', ''),
                'threat_category': log_data.get('threat_category', ''),
                'risk_level': log_data.get('risk_level', ''),
                'username': log_data.get('username', ''),
                'user_group': log_data.get('user_group', ''),
                'auth_method': log_data.get('auth_method', ''),
                'application': log_data.get('application', ''),
                'application_category': log_data.get('application_category', ''),
                'url': log_data.get('url', ''),
                'bytes_sent': log_data.get('bytes_sent', 0),
                'bytes_received': log_data.get('bytes_received', 0),
                'packets_sent': log_data.get('packets_sent', 0),
                'packets_received': log_data.get('packets_received', 0),
                'duration': log_data.get('duration', 0),
                'vpn_tunnel': log_data.get('vpn_tunnel', ''),
                'vpn_user': log_data.get('vpn_user', ''),
                'vpn_realm': log_data.get('vpn_realm', ''),
                'policy_id': log_data.get('policy_id', ''),
                'rule_name': log_data.get('rule_name', ''),
                'interface_in': log_data.get('interface_in', ''),
                'interface_out': log_data.get('interface_out', ''),
                'nat_source_ip': log_data.get('nat_source_ip', ''),
                'nat_dest_ip': log_data.get('nat_dest_ip', ''),
                'nat_source_port': log_data.get('nat_source_port', 0),
                'nat_dest_port': log_data.get('nat_dest_port', 0)
            }
            
            self.client.insert('firewall_logs', [data])
            return True
            
        except Exception as e:
            logger.error(f"Failed to insert firewall log: {e}")
            return False
    
    # Utility Methods
    def execute_query(self, query: str, params: Optional[Dict] = None) -> Any:
        """Execute raw ClickHouse query"""
        try:
            return self.client.query(query, params or {})
        except Exception as e:
            logger.error(f"Failed to execute query: {e}")
            raise
    
    def close_connection(self):
        """Close ClickHouse connection"""
        if self._client:
            self._client.close()
            self._client = None

# Global ClickHouse client instance
clickhouse_client = ClickHouseClient() 