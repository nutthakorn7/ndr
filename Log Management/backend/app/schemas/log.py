"""
Pydantic models for log-related requests and responses.
"""
from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class LogBase(BaseModel):
    """Base log model."""
    source_type: Optional[str] = None
    source_name: Optional[str] = None
    source_ip: Optional[str] = None
    user_id: Optional[str] = None
    username: Optional[str] = None
    action: Optional[str] = None
    status: Optional[str] = None
    client_ip: Optional[str] = None
    details: Optional[Dict] = None

class LogCreate(LogBase):
    """Log creation model."""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    auth_method: Optional[str] = "PASSWORD"
    is_encrypted: bool = True
    retention_days: Optional[int] = Field(default=90, ge=1, le=365)

class LogUpdate(LogBase):
    """Log update model."""
    pass

class LogFilter(BaseModel):
    """Log filter parameters."""
    source_type: Optional[str] = None
    username: Optional[str] = None
    ip_address: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class LogInDB(LogBase):
    """Log model with database fields."""
    id: str
    timestamp: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_encrypted: bool
    integrity_hash: Optional[str] = None
    retention_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class LogOut(LogBase):
    """Log output model."""
    id: str
    timestamp: datetime
    details: Optional[Dict] = None

    class Config:
        from_attributes = True

class StatusCount(BaseModel):
    """Status count model."""
    status: str
    count: int

class SourceCount(BaseModel):
    """Source count model."""
    source_type: str
    count: int

class RecentActivity(BaseModel):
    """Recent activity model."""
    timestamp: datetime
    action: str
    status: str
    user_id: str
    client_ip: str

class LogStats(BaseModel):
    """Log statistics model."""
    total_logs: int
    status_stats: List[StatusCount]
    source_stats: List[SourceCount]
    recent_activity: List[RecentActivity]

class LogResponse(BaseModel):
    """Standard log response model."""
    success: bool = True
    message: Optional[str] = None
    data: Dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class LogStatsResponse(BaseModel):
    """Log statistics response model."""
    success: bool = True
    message: Optional[str] = None
    data: LogStats
    timestamp: datetime = Field(default_factory=datetime.utcnow) 