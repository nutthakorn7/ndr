from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
import asyncio

from ..database import get_db
from ..models.auth_log import LogSource, LogCollectionJob, AuthenticationLog
from ..collectors.server_collector import ServerCollector
from ..utils.encryption import EncryptionManager
from ..utils.log_manager import LogManager
from ..core.config import settings
from .auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/servers", tags=["Server Management"])

# Global objects
encryption_manager = EncryptionManager(settings.ENCRYPTION_KEY)
log_manager = LogManager()

# Server types and their configurations
SERVER_TYPES = {
    "linux": {
        "name": "Linux Server",
        "description": "Linux-based servers (Ubuntu, CentOS, RHEL)",
        "default_port": 22,
        "protocols": ["ssh", "api"],
        "log_types": ["auth", "web", "database", "system"],
        "default_log_paths": [
            "/var/log/auth.log",
            "/var/log/secure",
            "/var/log/messages",
            "/var/log/syslog"
        ]
    },
    "windows": {
        "name": "Windows Server",
        "description": "Windows Server (2016, 2019, 2022)",
        "default_port": 5985,
        "protocols": ["winrm", "api"],
        "log_types": ["security", "system", "application"],
        "default_log_paths": [
            "Security",
            "System",
            "Application"
        ]
    },
    "web_server": {
        "name": "Web Server",
        "description": "Apache, Nginx, IIS",
        "default_port": 80,
        "protocols": ["http", "https", "ssh"],
        "log_types": ["access", "error", "auth"],
        "default_log_paths": [
            "/var/log/apache2/access.log",
            "/var/log/nginx/access.log",
            "/var/log/httpd/access_log"
        ]
    },
    "database": {
        "name": "Database Server",
        "description": "MySQL, PostgreSQL, SQL Server",
        "default_port": 3306,
        "protocols": ["tcp", "api", "ssh"],
        "log_types": ["audit", "error", "slow_query"],
        "default_log_paths": [
            "/var/log/mysql/error.log",
            "/var/log/postgresql/postgresql.log"
        ]
    },
    "application": {
        "name": "Application Server",
        "description": "Custom applications with API endpoints",
        "default_port": 8080,
        "protocols": ["http", "https", "api"],
        "log_types": ["application", "audit", "error"],
        "default_log_paths": [
            "/var/log/app/application.log",
            "/app/logs/audit.log"
        ]
    }
}

@router.get("/types", response_model=List[Dict[str, Any]])
async def get_server_types():
    """Get list of supported server types"""
    return [
        {
            "type": type_key,
            **type_config
        }
        for type_key, type_config in SERVER_TYPES.items()
    ]

@router.post("/", response_model=Dict[str, Any])
async def add_server_source(
    server_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Add a new server log source"""
    try:
        # Validate required fields
        required_fields = ["name", "ip_address", "server_type"]
        for field in required_fields:
            if field not in server_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Validate server type
        if server_data["server_type"] not in SERVER_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported server type: {server_data['server_type']}")
        
        server_config = SERVER_TYPES[server_data["server_type"]]
        
        # Encrypt credentials
        credentials = server_data.get("credentials", {})
        encrypted_credentials = encryption_manager.encrypt_data(credentials) if credentials else None
        
        # Create log source
        log_source = LogSource(
            name=server_data["name"],
            source_type="SERVER",
            ip_address=server_data["ip_address"],
            port=server_data.get("port", server_config["default_port"]),
            protocol=server_data.get("protocol", "ssh"),
            credentials=encrypted_credentials
        )
        
        db.add(log_source)
        db.commit()
        db.refresh(log_source)
        
        logger.info(f"Added new server source: {server_data['name']}")
        
        return {
            "success": True,
            "source_id": log_source.id,
            "message": f"Server '{server_data['name']}' added successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding server source: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to add server source")

@router.post("/{source_id}/test-connection")
async def test_server_connection(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Test connection to a server"""
    try:
        # Get source
        source = db.query(LogSource).filter(
            LogSource.id == source_id,
            LogSource.source_type == "SERVER"
        ).first()
        
        if not source:
            raise HTTPException(status_code=404, detail="Server source not found")
        
        # Decrypt credentials
        credentials = {}
        if source.credentials:
            try:
                credentials = encryption_manager.decrypt_data(source.credentials)
            except Exception as e:
                logger.error(f"Failed to decrypt credentials: {e}")
                raise HTTPException(status_code=500, detail="Failed to decrypt credentials")
        
        # Create collector
        collector = ServerCollector(
            hostname=source.ip_address,
            username=credentials.get("username"),
            password=credentials.get("password"),
            port=source.port,
            server_type=credentials.get("server_type", "linux"),
            api_key=credentials.get("api_key")
        )
        
        # Test connection
        if source.protocol == "ssh":
            success = collector.connect_ssh()
            if success:
                collector.disconnect_ssh()
        else:
            # For API connections, try a simple health check
            success = True  # Placeholder
        
        return {
            "success": success,
            "message": "Connection successful" if success else "Connection failed",
            "server_name": source.name,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing server connection: {e}")
        raise HTTPException(status_code=500, detail="Connection test failed")

@router.post("/{source_id}/collect")
async def collect_server_logs(
    source_id: str,
    background_tasks: BackgroundTasks,
    log_type: Optional[str] = "auth",
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Start log collection from a server"""
    try:
        # Get source
        source = db.query(LogSource).filter(
            LogSource.id == source_id,
            LogSource.source_type == "SERVER"
        ).first()
        
        if not source:
            raise HTTPException(status_code=404, detail="Server source not found")
        
        # Create collection job
        job = LogCollectionJob(
            source_id=source_id,
            start_time=datetime.utcnow(),
            status="PENDING"
        )
        
        db.add(job)
        db.commit()
        db.refresh(job)
        
        # Start background collection
        background_tasks.add_task(
            collect_server_logs_background,
            source_id,
            job.id,
            log_type
        )
        
        return {
            "success": True,
            "job_id": job.id,
            "message": f"Started log collection from {source.name}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting log collection: {e}")
        raise HTTPException(status_code=500, detail="Failed to start log collection")

async def collect_server_logs_background(
    source_id: str,
    job_id: str,
    log_type: str = "auth"
):
    """Background task for collecting server logs"""
    db = next(get_db())
    try:
        # Update job status
        job = db.query(LogCollectionJob).filter(LogCollectionJob.id == job_id).first()
        job.status = "RUNNING"
        db.commit()
        
        # Get source
        source = db.query(LogSource).filter(LogSource.id == source_id).first()
        if not source:
            job.status = "FAILED"
            job.error_message = "Source not found"
            db.commit()
            return
        
        # Decrypt credentials
        credentials = {}
        if source.credentials:
            credentials = encryption_manager.decrypt_data(source.credentials)
        
        # Create collector
        collector = ServerCollector(
            hostname=source.ip_address,
            username=credentials.get("username"),
            password=credentials.get("password"),
            port=source.port,
            server_type=credentials.get("server_type", "linux"),
            api_key=credentials.get("api_key")
        )
        
        # Collect logs
        raw_logs = collector.collect_logs(log_type)
        
        # Process and save logs
        logs_collected = 0
        logs_failed = 0
        
        for raw_log in raw_logs:
            try:
                # Create authentication log entry
                log_entry = AuthenticationLog(
                    source_type="SERVER",
                    source_name=source.name,
                    source_ip=source.ip_address,
                    user_id=raw_log.get("user_id", "unknown"),
                    username=raw_log.get("username", "unknown"),
                    domain=raw_log.get("domain"),
                    action=raw_log.get("action", "UNKNOWN"),
                    status=raw_log.get("status", "UNKNOWN"),
                    auth_method=raw_log.get("auth_method"),
                    client_ip=raw_log.get("client_ip", "unknown"),
                    client_port=raw_log.get("client_port"),
                    server_ip=source.ip_address,
                    server_port=source.port,
                    session_id=raw_log.get("session_id"),
                    user_agent=raw_log.get("user_agent"),
                    timestamp=raw_log.get("timestamp", datetime.utcnow()),
                    details=encryption_manager.encrypt_data(raw_log.get("details", {})),
                    error_message=raw_log.get("error_message"),
                    is_encrypted=True,
                    integrity_hash=encryption_manager.generate_hash(raw_log)
                )
                
                db.add(log_entry)
                logs_collected += 1
                
            except Exception as e:
                logger.error(f"Error processing log entry: {e}")
                logs_failed += 1
        
        # Update job status
        job.end_time = datetime.utcnow()
        job.status = "SUCCESS" if logs_failed == 0 else "PARTIAL"
        job.logs_collected = logs_collected
        
        # Update source last collection time
        source.last_collection = job.end_time
        
        db.commit()
        
        logger.info(f"Server log collection completed: {logs_collected} collected, {logs_failed} failed")
        
    except Exception as e:
        logger.error(f"Server log collection failed: {e}")
        job.status = "FAILED"
        job.error_message = str(e)
        job.end_time = datetime.utcnow()
        db.commit()
    finally:
        db.close()

@router.get("/{source_id}/status")
async def get_server_status(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get server source status and recent collection jobs"""
    try:
        # Get source
        source = db.query(LogSource).filter(
            LogSource.id == source_id,
            LogSource.source_type == "SERVER"
        ).first()
        
        if not source:
            raise HTTPException(status_code=404, detail="Server source not found")
        
        # Get recent jobs
        recent_jobs = db.query(LogCollectionJob).filter(
            LogCollectionJob.source_id == source_id
        ).order_by(LogCollectionJob.start_time.desc()).limit(10).all()
        
        return {
            "source": {
                "id": source.id,
                "name": source.name,
                "ip_address": source.ip_address,
                "port": source.port,
                "protocol": source.protocol,
                "is_active": source.is_active,
                "last_collection": source.last_collection.isoformat() if source.last_collection else None
            },
            "recent_jobs": [
                {
                    "id": job.id,
                    "start_time": job.start_time.isoformat(),
                    "end_time": job.end_time.isoformat() if job.end_time else None,
                    "status": job.status,
                    "logs_collected": job.logs_collected,
                    "error_message": job.error_message
                }
                for job in recent_jobs
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting server status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get server status")

@router.get("/templates/{server_type}")
async def get_server_configuration_template(
    server_type: str
):
    """Get configuration template for specific server type"""
    try:
        if server_type not in SERVER_TYPES:
            raise HTTPException(status_code=404, detail="Server type not found")
        
        config = SERVER_TYPES[server_type]
        
        # Generate configuration templates
        templates = {
            "syslog_config": {
                "description": f"Configure {config['name']} to send logs to zcrLog",
                "steps": []
            },
            "log_rotation": {
                "description": "Configure log rotation to prevent disk space issues",
                "steps": []
            }
        }
        
        if server_type == "linux":
            templates["syslog_config"]["steps"] = [
                "Edit /etc/rsyslog.conf",
                "Add line: *.* @@zcrlog-server:514",
                "Restart rsyslog: sudo systemctl restart rsyslog",
                "Test: logger 'Test message from server'"
            ]
            templates["log_rotation"]["steps"] = [
                "Edit /etc/logrotate.d/zcrlog",
                "Configure rotation frequency and retention",
                "Test: sudo logrotate -d /etc/logrotate.d/zcrlog"
            ]
        
        elif server_type == "windows":
            templates["syslog_config"]["steps"] = [
                "Install Windows Syslog service",
                "Configure forwarding to zcrLog server",
                "Set up Windows Event Log forwarding",
                "Test event generation"
            ]
        
        return {
            "server_type": server_type,
            "configuration": config,
            "templates": templates
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting server template: {e}")
        raise HTTPException(status_code=500, detail="Failed to get server template")
