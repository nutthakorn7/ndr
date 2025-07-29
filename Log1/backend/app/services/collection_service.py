"""
Log collection service implementation.
"""
import threading
import time
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from ..core.config import settings
from ..database import SessionLocal
from ..models.auth_log import LogSource, LogCollectionJob
from ..collectors.firewall_collector import FirewallCollector
from ..collectors.proxy_collector import ProxyCollector
from ..collectors.ad_collector import ActiveDirectoryCollector
from ..collectors.server_collector import ServerCollector
from ..utils.encryption import EncryptionManager
from ..utils.log_manager import LogManager

logger = logging.getLogger(__name__)

class LogCollectionService:
    """Service for managing continuous log collection."""
    
    def __init__(self):
        self.running = False
        self.collection_thread: Optional[threading.Thread] = None
        self.encryption_manager = EncryptionManager(settings.ENCRYPTION_KEY)
        self.log_manager = LogManager()
        
    def start_collection(self):
        """Start continuous log collection."""
        if not self.running:
            try:
                self.running = True
                self.collection_thread = threading.Thread(
                    target=self._collection_loop,
                    daemon=True
                )
                self.collection_thread.start()
                logger.info("Started continuous log collection")
            except Exception as e:
                logger.error(f"Failed to start collection service: {e}")
                self.running = False
                raise
    
    def stop_collection(self):
        """Stop log collection."""
        try:
            self.running = False
            if self.collection_thread and self.collection_thread.is_alive():
                self.collection_thread.join(timeout=settings.COLLECTION_TIMEOUT)
                if self.collection_thread.is_alive():
                    logger.warning("Collection thread did not stop gracefully")
                else:
                    logger.info("Stopped log collection")
        except Exception as e:
            logger.error(f"Error stopping collection service: {e}")
            raise
    
    def _collection_loop(self):
        """Main collection loop."""
        while self.running:
            try:
                with SessionLocal() as db:
                    self._collect_all_sources(db)
            except Exception as e:
                logger.error(f"Error in collection loop: {e}")
            finally:
                time.sleep(settings.COLLECTION_INTERVAL)
    
    def _collect_all_sources(self, db: Session):
        """Collect logs from all active sources."""
        try:
            # Get all active sources
            sources = db.query(LogSource).filter(
                LogSource.is_active == True
            ).all()
            
            for source in sources:
                try:
                    self._collect_from_source(source, db)
                except Exception as e:
                    logger.error(f"Error collecting from source {source.name}: {e}")
                    
        except Exception as e:
            logger.error(f"Error collecting from all sources: {e}")
            raise
    
    def _collect_from_source(self, source: LogSource, db: Session):
        """Collect logs from a specific source."""
        # Create collection job
        job = LogCollectionJob(
            source_id=source.id,
            start_time=datetime.utcnow(),
            status="RUNNING"
        )
        db.add(job)
        db.commit()
        
        try:
            # Handle credentials
            credentials = {}
            if source.credentials:
                try:
                    if isinstance(source.credentials, dict):
                        credentials = source.credentials
                    else:
                        credentials = self.encryption_manager.decrypt_data(source.credentials)
                except Exception as e:
                    logger.error(f"Failed to decrypt credentials for {source.name}: {e}")
            
            # Initialize collector based on source type
            collector = None
            if source.source_type == "FIREWALL":
                collector = FirewallCollector(
                    hostname=source.ip_address,
                    username=credentials.get('username'),
                    password=credentials.get('password'),
                    port=source.port or 22
                )
            elif source.source_type == "PROXY":
                collector = ProxyCollector(
                    proxy_url=f"http://{source.ip_address}:{source.port or 80}",
                    username=credentials.get('username'),
                    password=credentials.get('password'),
                    api_key=credentials.get('api_key')
                )
            elif source.source_type == "AD":
                collector = ActiveDirectoryCollector(
                    server=source.ip_address,
                    username=credentials.get('username'),
                    password=credentials.get('password'),
                    domain=credentials.get('domain'),
                    port=source.port or 389,
                    use_ssl=credentials.get('use_ssl', False)
                )
            elif source.source_type == "SERVER":
                collector = ServerCollector(
                    hostname=source.ip_address,
                    username=credentials.get('username'),
                    password=credentials.get('password'),
                    port=source.port or 22,
                    server_type=credentials.get('server_type', 'linux'),
                    api_key=credentials.get('api_key')
                )
            else:
                raise ValueError(f"Unsupported source type: {source.source_type}")
            
            # Collect and process logs
            logs_collected = 0
            if collector:
                raw_logs = collector.collect_logs()
                for raw_log in raw_logs:
                    try:
                        # Encrypt sensitive data
                        encrypted_details = self.encryption_manager.encrypt_data(
                            raw_log.get('details', {})
                        )
                        
                        # Create log entry
                        log_entry = LogCollectionJob(
                            source_id=source.id,
                            timestamp=raw_log.get('timestamp', datetime.utcnow()),
                            details=encrypted_details,
                            status="SUCCESS",
                            logs_collected=1
                        )
                        
                        db.add(log_entry)
                        logs_collected += 1
                        
                        # Commit in batches
                        if logs_collected % settings.COLLECTION_BATCH_SIZE == 0:
                            db.commit()
                            
                    except Exception as e:
                        logger.error(f"Error processing log entry: {e}")
                
                # Final commit
                db.commit()
            
            # Update job status
            job.status = "COMPLETED"
            job.end_time = datetime.utcnow()
            job.logs_collected = logs_collected
            
            # Update source last collection time
            source.last_collection = datetime.utcnow()
            
            db.commit()
            logger.info(f"Collected {logs_collected} logs from {source.name}")
            
        except Exception as e:
            logger.error(f"Error collecting from {source.name}: {e}")
            job.status = "FAILED"
            job.end_time = datetime.utcnow()
            job.error_message = str(e)
            db.commit()
            raise 