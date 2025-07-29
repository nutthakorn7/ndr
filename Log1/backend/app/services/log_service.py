"""
Log management service implementation.
"""
from typing import Dict, List, Optional, Union
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func

from ..core.service import BaseService
from ..core.exceptions import DatabaseError, NotFoundError
from ..models.auth_log import AuthenticationLog
from ..schemas.log import LogCreate, LogUpdate, LogFilter
from ..utils.encryption import EncryptionManager
from ..core.config import settings

class LogService(BaseService[AuthenticationLog, LogCreate, LogUpdate]):
    """Service for managing authentication logs."""
    
    def __init__(self):
        super().__init__(AuthenticationLog)
        self.encryption_manager = EncryptionManager(settings.ENCRYPTION_KEY)

    def get_logs(
        self,
        db: Session,
        filters: LogFilter,
        skip: int = 0,
        limit: int = 50
    ) -> Dict:
        """Get logs with filtering and pagination."""
        try:
            query = db.query(self.model)

            # Apply filters
            if filters.source_type:
                query = query.filter(self.model.source_type == filters.source_type)
            if filters.username:
                query = query.filter(self.model.username.ilike(f"%{filters.username}%"))
            if filters.ip_address:
                query = query.filter(self.model.client_ip.ilike(f"%{filters.ip_address}%"))
            if filters.status:
                query = query.filter(self.model.status == filters.status)
            if filters.start_date:
                query = query.filter(self.model.timestamp >= filters.start_date)
            if filters.end_date:
                query = query.filter(self.model.timestamp <= filters.end_date)

            # Get total count
            total = query.count()

            # Apply pagination
            query = query.order_by(desc(self.model.timestamp))
            logs = query.offset(skip).limit(limit).all()

            # Format response
            return {
                'total': total,
                'page': (skip // limit) + 1,
                'limit': limit,
                'logs': [self._format_log(log) for log in logs]
            }

        except Exception as e:
            raise DatabaseError(f"Error retrieving logs: {str(e)}")

    def get_log_stats(self, db: Session, hours: int = 24) -> Dict:
        """Get log statistics."""
        try:
            start_date = datetime.now() - timedelta(hours=hours)
            
            # Total logs
            total_logs = db.query(func.count(self.model.id)).scalar()
            
            # Status stats
            status_stats = db.query(
                self.model.status,
                func.count(self.model.id).label('count')
            ).group_by(
                self.model.status
            ).all()
            
            # Source type stats
            source_stats = db.query(
                self.model.source_type,
                func.count(self.model.id).label('count')
            ).group_by(
                self.model.source_type
            ).all()
            
            # Recent activity
            recent_logs = db.query(
                self.model.timestamp,
                self.model.action,
                self.model.status,
                self.model.user_id,
                self.model.client_ip
            ).order_by(
                self.model.timestamp.desc()
            ).limit(5).all()

            return {
                'total_logs': total_logs,
                'status_stats': [
                    {'status': stat.status, 'count': stat.count}
                    for stat in status_stats
                ],
                'source_stats': [
                    {'source_type': stat.source_type, 'count': stat.count}
                    for stat in source_stats
                ],
                'recent_activity': [
                    {
                        'timestamp': log.timestamp.isoformat(),
                        'action': log.action,
                        'status': log.status,
                        'user_id': log.user_id,
                        'client_ip': log.client_ip
                    }
                    for log in recent_logs
                ]
            }

        except Exception as e:
            raise DatabaseError(f"Error getting log stats: {str(e)}")

    def create_auth_log(
        self,
        db: Session,
        *,
        user_id: str,
        action: str,
        status: str,
        source_type: str = "SYSTEM",
        client_ip: str = "127.0.0.1",
        details: Optional[Dict] = None
    ) -> AuthenticationLog:
        """Create an authentication log entry."""
        try:
            log_data = {
                "source_type": source_type,
                "source_name": "Auth API",
                "source_ip": "127.0.0.1",
                "user_id": user_id,
                "username": user_id,
                "action": action,
                "status": status,
                "auth_method": "PASSWORD",
                "client_ip": client_ip,
                "timestamp": datetime.now(),
                "details": details,
                "is_encrypted": True,
                "integrity_hash": self.encryption_manager.generate_hash({
                    "username": user_id,
                    "action": action
                }),
                "retention_date": datetime.now() + timedelta(days=settings.LOG_RETENTION_DAYS)
            }

            return self.create(db, obj_in=log_data)

        except Exception as e:
            raise DatabaseError(f"Error creating auth log: {str(e)}")

    def _format_log(self, log: AuthenticationLog) -> Dict:
        """Format log object for response."""
        log_data = {
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "source_type": log.source_type,
            "source_name": log.source_name,
            "source_ip": log.source_ip,
            "user_id": log.user_id,
            "username": log.username,
            "action": log.action,
            "status": log.status,
            "client_ip": log.client_ip
        }

        # Decrypt details if encrypted
        if log.details and log.is_encrypted:
            try:
                log_data["details"] = self.encryption_manager.decrypt_data(log.details)
            except:
                log_data["details"] = {"error": "Unable to decrypt details"}
        else:
            log_data["details"] = log.details

        return log_data 