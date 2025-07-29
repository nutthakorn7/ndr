from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid

from .base import Base

class LogSource(Base):
    __tablename__ = "log_sources"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    source_type = Column(String(50), nullable=False)  # FIREWALL, PROXY, AD, SERVER
    ip_address = Column(String(255), nullable=False)
    port = Column(Integer)
    protocol = Column(String(50))  # SSH, SFTP, API, etc.
    auth_method = Column(String(50))  # PASSWORD, KEY, TOKEN
    credentials = Column(JSON)  # Encrypted credentials
    is_active = Column(Boolean, default=True)
    last_collection = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Collection history
    collection_history = relationship("LogCollectionJob", back_populates="source")

class LogCollectionJob(Base):
    __tablename__ = "log_collection_jobs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String(36), ForeignKey('log_sources.id'), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True))
    status = Column(String(50), nullable=False)  # PENDING, RUNNING, SUCCESS, FAILED
    logs_collected = Column(Integer, default=0)
    error_message = Column(String(1000))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    source = relationship("LogSource", back_populates="collection_history") 