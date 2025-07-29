from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import uuid

Base = declarative_base()

class AuthenticationLog(Base):
    __tablename__ = "authentication_logs"
    
    # Primary Key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Source Information (ตาม พรบ. คอมพิวเตอร์)
    source_type = Column(String(50), nullable=False, index=True)  # FIREWALL, PROXY, AD, SERVER
    source_name = Column(String(255), nullable=False, index=True)  # ชื่อเครื่อง/เซิร์ฟเวอร์
    source_ip = Column(String(45), nullable=False, index=True)     # IP ของแหล่งข้อมูล
    
    # User Information
    user_id = Column(String(255), nullable=False, index=True)      # รหัสผู้ใช้
    username = Column(String(255), nullable=False, index=True)     # ชื่อผู้ใช้
    domain = Column(String(255), nullable=True, index=True)        # Domain (สำหรับ AD)
    
    # Authentication Details
    action = Column(String(100), nullable=False, index=True)       # LOGIN, LOGOUT, AUTH_FAILED, etc.
    status = Column(String(50), nullable=False, index=True)        # SUCCESS, FAILED, PENDING
    auth_method = Column(String(100), nullable=True)               # PASSWORD, SSO, 2FA, etc.
    
    # Network Information
    client_ip = Column(String(45), nullable=False, index=True)     # IP ของผู้ใช้
    client_port = Column(Integer, nullable=True)                   # Port ของผู้ใช้
    server_ip = Column(String(45), nullable=True)                  # IP ของเซิร์ฟเวอร์ที่เข้าถึง
    server_port = Column(Integer, nullable=True)                   # Port ของเซิร์ฟเวอร์
    
    # Session Information
    session_id = Column(String(255), nullable=True, index=True)    # รหัสเซสชัน
    user_agent = Column(Text, nullable=True)                       # User Agent
    
    # Timestamp Information
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True, default=func.now())
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())
    
    # Additional Details (JSON format for flexibility)
    details = Column(JSON, nullable=True)                          # รายละเอียดเพิ่มเติม
    error_message = Column(Text, nullable=True)                    # ข้อความข้อผิดพลาด
    
    # Security & Compliance
    is_encrypted = Column(Boolean, default=True)                   # ข้อมูลถูกเข้ารหัสหรือไม่
    integrity_hash = Column(String(64), nullable=True)             # Hash สำหรับตรวจสอบความถูกต้อง
    retention_date = Column(DateTime(timezone=True), nullable=True) # วันที่จะลบข้อมูล
    
    # Indexes for better performance
    __table_args__ = (
        Index('idx_source_timestamp', 'source_type', 'timestamp'),
        Index('idx_user_timestamp', 'user_id', 'timestamp'),
        Index('idx_status_timestamp', 'status', 'timestamp'),
        Index('idx_client_ip_timestamp', 'client_ip', 'timestamp'),
    )

class LogSource(Base):
    __tablename__ = "log_sources"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, unique=True)
    source_type = Column(String(50), nullable=False)  # FIREWALL, PROXY, AD, SERVER
    ip_address = Column(String(45), nullable=False)
    port = Column(Integer, nullable=True)
    protocol = Column(String(20), nullable=True)  # SSH, HTTP, HTTPS, etc.
    credentials = Column(JSON, nullable=True)      # Encrypted credentials
    is_active = Column(Boolean, default=True)
    last_collection = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())

class LogCollectionJob(Base):
    __tablename__ = "log_collection_jobs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String(36), nullable=False)
    job_type = Column(String(50), nullable=False)  # SCHEDULED, MANUAL, REAL_TIME
    status = Column(String(50), nullable=False)    # RUNNING, COMPLETED, FAILED
    start_time = Column(DateTime(timezone=True), nullable=False, default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    records_collected = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now()) 