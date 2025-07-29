import os
from datetime import datetime
from loguru import logger
from ..core.config import settings

class LogManager:
    """Manager สำหรับจัดการระบบ Log ของแอปพลิเคชัน"""
    
    def __init__(self):
        # สร้างโฟลเดอร์ logs ถ้ายังไม่มี
        os.makedirs("logs", exist_ok=True)
        
        # ตั้งค่า Loguru
        logger.remove()  # ลบ default handler
        
        # เพิ่ม console handler
        logger.add(
            lambda msg: print(msg, end=""),
            level=settings.LOG_LEVEL,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
        )
        
        # เพิ่ม file handler
        logger.add(
            settings.LOG_FILE,
            level=settings.LOG_LEVEL,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            rotation="1 day",
            retention="30 days",
            compression="zip"
        )
        
        # เพิ่ม error file handler
        logger.add(
            "logs/error.log",
            level="ERROR",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            rotation="1 day",
            retention="90 days",
            compression="zip"
        )
    
    def log_info(self, message: str):
        """บันทึก Info Log"""
        logger.info(f"[AUTH_SYSTEM] {message}")
    
    def log_warning(self, message: str):
        """บันทึก Warning Log"""
        logger.warning(f"[AUTH_SYSTEM] {message}")
    
    def log_error(self, message: str):
        """บันทึก Error Log"""
        logger.error(f"[AUTH_SYSTEM] {message}")
    
    def log_debug(self, message: str):
        """บันทึก Debug Log"""
        logger.debug(f"[AUTH_SYSTEM] {message}")
    
    def log_critical(self, message: str):
        """บันทึก Critical Log"""
        logger.critical(f"[AUTH_SYSTEM] {message}")
    
    def log_security_event(self, event_type: str, user_id: str, ip_address: str, details: dict = None):
        """บันทึก Security Event Log"""
        message = f"SECURITY_EVENT | Type: {event_type} | User: {user_id} | IP: {ip_address}"
        if details:
            message += f" | Details: {details}"
        logger.warning(f"[AUTH_SYSTEM] {message}")
    
    def log_authentication_event(self, event_type: str, user_id: str, ip_address: str, status: str, details: dict = None):
        """บันทึก Authentication Event Log"""
        message = f"AUTH_EVENT | Type: {event_type} | User: {user_id} | IP: {ip_address} | Status: {status}"
        if details:
            message += f" | Details: {details}"
        
        if status == "SUCCESS":
            logger.info(f"[AUTH_SYSTEM] {message}")
        else:
            logger.warning(f"[AUTH_SYSTEM] {message}")
    
    def log_compliance_event(self, event_type: str, source: str, details: dict = None):
        """บันทึก Compliance Event Log (ตาม พรบ. คอมพิวเตอร์)"""
        message = f"COMPLIANCE_EVENT | Type: {event_type} | Source: {source}"
        if details:
            message += f" | Details: {details}"
        logger.info(f"[AUTH_SYSTEM] {message}")
    
    def log_data_access_event(self, user_id: str, data_type: str, action: str, ip_address: str, details: dict = None):
        """บันทึก Data Access Event Log"""
        message = f"DATA_ACCESS | User: {user_id} | Data: {data_type} | Action: {action} | IP: {ip_address}"
        if details:
            message += f" | Details: {details}"
        logger.info(f"[AUTH_SYSTEM] {message}")
    
    def log_system_event(self, event_type: str, component: str, details: dict = None):
        """บันทึก System Event Log"""
        message = f"SYSTEM_EVENT | Type: {event_type} | Component: {component}"
        if details:
            message += f" | Details: {details}"
        logger.info(f"[AUTH_SYSTEM] {message}")
    
    def log_collection_event(self, source_type: str, source_name: str, records_collected: int, status: str, details: dict = None):
        """บันทึก Log Collection Event"""
        message = f"COLLECTION_EVENT | Source: {source_type}/{source_name} | Records: {records_collected} | Status: {status}"
        if details:
            message += f" | Details: {details}"
        
        if status == "SUCCESS":
            logger.info(f"[AUTH_SYSTEM] {message}")
        else:
            logger.error(f"[AUTH_SYSTEM] {message}")
    
    def log_retention_event(self, action: str, records_affected: int, details: dict = None):
        """บันทึก Log Retention Event"""
        message = f"RETENTION_EVENT | Action: {action} | Records: {records_affected}"
        if details:
            message += f" | Details: {details}"
        logger.info(f"[AUTH_SYSTEM] {message}")
    
    def log_backup_event(self, action: str, backup_path: str, status: str, details: dict = None):
        """บันทึก Backup Event"""
        message = f"BACKUP_EVENT | Action: {action} | Path: {backup_path} | Status: {status}"
        if details:
            message += f" | Details: {details}"
        
        if status == "SUCCESS":
            logger.info(f"[AUTH_SYSTEM] {message}")
        else:
            logger.error(f"[AUTH_SYSTEM] {message}")
    
    def log_encryption_event(self, action: str, data_type: str, status: str, details: dict = None):
        """บันทึก Encryption Event"""
        message = f"ENCRYPTION_EVENT | Action: {action} | Data: {data_type} | Status: {status}"
        if details:
            message += f" | Details: {details}"
        
        if status == "SUCCESS":
            logger.info(f"[AUTH_SYSTEM] {message}")
        else:
            logger.error(f"[AUTH_SYSTEM] {message}")
    
    def log_integrity_event(self, action: str, data_type: str, status: str, details: dict = None):
        """บันทึก Integrity Check Event"""
        message = f"INTEGRITY_EVENT | Action: {action} | Data: {data_type} | Status: {status}"
        if details:
            message += f" | Details: {details}"
        
        if status == "PASS":
            logger.info(f"[AUTH_SYSTEM] {message}")
        else:
            logger.error(f"[AUTH_SYSTEM] {message}")
    
    def get_log_statistics(self, hours: int = 24) -> dict:
        """ดึงสถิติ Log ในช่วงเวลาที่กำหนด"""
        # ในที่นี้จะใช้ mock data
        # ใน production ควรอ่านจาก log files จริง
        return {
            "total_logs": 1000,
            "info_logs": 800,
            "warning_logs": 150,
            "error_logs": 50,
            "security_events": 25,
            "auth_events": 300,
            "collection_events": 50,
            "time_period_hours": hours
        }
    
    def export_logs(self, start_time: datetime, end_time: datetime, log_level: str = None) -> str:
        """ส่งออก Logs ในช่วงเวลาที่กำหนด"""
        # ในที่นี้จะใช้ mock data
        # ใน production ควรอ่านจาก log files จริง
        export_filename = f"logs_export_{start_time.strftime('%Y%m%d_%H%M%S')}_{end_time.strftime('%Y%m%d_%H%M%S')}.log"
        
        # สร้างไฟล์ export
        with open(f"logs/{export_filename}", "w") as f:
            f.write(f"# Log Export\n")
            f.write(f"# Start Time: {start_time}\n")
            f.write(f"# End Time: {end_time}\n")
            f.write(f"# Generated: {datetime.now()}\n")
            f.write(f"# Total Records: 1000\n\n")
            
            # Mock log entries
            for i in range(100):
                f.write(f"2023-12-20 10:30:00 | INFO     | AUTH_SYSTEM:log_export:100 - Mock log entry {i}\n")
        
        return export_filename 