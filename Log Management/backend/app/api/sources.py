from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional, Dict, Any, Type, Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, DateTime, JSON, func, ForeignKey, Integer, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import uuid

from ..models.log_source import LogSource
from ..models.auth_log import LogCollectionJob
from ..utils.encryption import EncryptionManager
from ..utils.log_manager import LogManager
from ..core.config import settings

router = APIRouter()

# Global objects
encryption_manager = EncryptionManager(settings.ENCRYPTION_KEY)
log_manager = LogManager()

Base = declarative_base()

class DeviceProfile(Base):
    __tablename__ = "device_profiles"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vendor = Column(String(50), nullable=False)  # Fortinet, Cisco, PaloAlto, pfSense
    model = Column(String(100))  # FGT-60E, ASA-5506, PA-220
    os_version = Column(String(50))  # FortiOS 7.0, ASA 9.19
    log_format = Column(String(50))  # syslog, api, snmp
    connection_methods = Column(JSON)  # SSH, API, SNMP configs
    log_patterns = Column(JSON)  # Regex patterns for parsing
    sample_logs = Column(JSON)  # Sample log formats
    parser_config = Column(JSON)  # Parser configuration
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SourceBase(BaseModel):
    name: str
    source_type: str
    ip_address: str
    port: Optional[int] = None
    protocol: Optional[str] = None
    credentials: Optional[Dict] = None
    is_active: bool = True

class SourceCreate(SourceBase):
    pass

class SourceUpdate(SourceBase):
    pass

class SourceResponse(SourceBase):
    id: str
    last_collection: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

def get_db():
    from ..main import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from .auth import get_current_user

@router.get("/")
async def get_sources(
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """ดึงรายการแหล่งข้อมูล"""
    try:
        sources = db.query(LogSource).offset(skip).limit(limit).all()
        
        # แปลงเป็น dict เพื่อหลีกเลี่ยงปัญหา validation
        result = []
        for source in sources:
            source_dict = {
                "id": source.id,
                "name": source.name,
                "source_type": source.source_type,
                "ip_address": source.ip_address,
                "port": source.port,
                "protocol": source.protocol,
                "is_active": source.is_active,
                "last_collection": source.last_collection.isoformat() if source.last_collection else None,
                "created_at": source.created_at.isoformat() if hasattr(source, 'created_at') and source.created_at else None,
                "updated_at": source.updated_at.isoformat() if hasattr(source, 'updated_at') and source.updated_at else None
            }
            result.append(source_dict)
        
        return {"sources": result, "total": len(result)}
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการดึงรายการแหล่งข้อมูล: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.post("/", response_model=SourceResponse)
async def create_source(
    source: SourceCreate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """สร้างแหล่งข้อมูลใหม่"""
    try:
        # เข้ารหัสข้อมูล credentials ถ้ามี
        if source.credentials:
            encrypted_credentials = encryption_manager.encrypt_data(source.credentials)
        else:
            encrypted_credentials = None

        # สร้าง source ใหม่
        db_source = LogSource(
            **source.dict(exclude={'credentials'}),
            credentials=encrypted_credentials
        )
        
        db.add(db_source)
        db.commit()
        db.refresh(db_source)
        
        return db_source
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการสร้างแหล่งข้อมูล: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.get("/{source_id}", response_model=SourceResponse)
async def get_source(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """ดึงข้อมูลแหล่งข้อมูล"""
    try:
        source = db.query(LogSource).filter(LogSource.id == source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="ไม่พบแหล่งข้อมูล")
        return source
    except HTTPException:
        raise
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการดึงข้อมูลแหล่งข้อมูล: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.put("/{source_id}", response_model=SourceResponse)
async def update_source(
    source_id: str,
    source: SourceUpdate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """อัพเดทข้อมูลแหล่งข้อมูล"""
    try:
        db_source = db.query(LogSource).filter(LogSource.id == source_id).first()
        if not db_source:
            raise HTTPException(status_code=404, detail="ไม่พบแหล่งข้อมูล")
        
        # เข้ารหัสข้อมูล credentials ใหม่ถ้ามีการอัพเดท
        if source.credentials:
            encrypted_credentials = encryption_manager.encrypt_data(source.credentials)
            source_data = source.dict(exclude={'credentials'})
            source_data['credentials'] = encrypted_credentials
        else:
            source_data = source.dict(exclude={'credentials'})

        # อัพเดทข้อมูล
        for key, value in source_data.items():
            setattr(db_source, key, value)

        db.commit()
        db.refresh(db_source)
        
        return db_source
    except HTTPException:
        raise
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการอัพเดทแหล่งข้อมูล: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.delete("/{source_id}")
async def delete_source(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """ลบแหล่งข้อมูล"""
    try:
        source = db.query(LogSource).filter(LogSource.id == source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="ไม่พบแหล่งข้อมูล")
        
        db.delete(source)
        db.commit()
        
        return {"message": "ลบแหล่งข้อมูลสำเร็จ"}
    except HTTPException:
        raise
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการลบแหล่งข้อมูล: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.post("/{source_id}/collect")
async def collect_logs(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """เก็บ logs จากแหล่งข้อมูล"""
    try:
        source = db.query(LogSource).filter(LogSource.id == source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="ไม่พบแหล่งข้อมูล")
        
        # สร้าง collection job
        job = LogCollectionJob(
            source_id=source_id,
            start_time=datetime.now(),
            status="PENDING"
        )
        
        db.add(job)
        db.commit()
        
        # TODO: Implement actual log collection logic
        # For now, just update the job status
        job.status = "SUCCESS"
        job.end_time = datetime.now()
        job.logs_collected = 0
        
        # Update source last collection time
        source.last_collection = job.end_time
        
        db.commit()
        
        return {"message": "เริ่มการเก็บ logs แล้ว", "job_id": job.id}
    except HTTPException:
        raise
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการเก็บ logs: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.get("/{source_id}/history")
async def get_collection_history(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """ดึงประวัติการเก็บ logs"""
    try:
        source = db.query(LogSource).filter(LogSource.id == source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="ไม่พบแหล่งข้อมูล")
        
        history = db.query(LogCollectionJob).filter(
            LogCollectionJob.source_id == source_id
        ).order_by(
            LogCollectionJob.start_time.desc()
        ).offset(skip).limit(limit).all()
        
        return history
    except HTTPException:
        raise
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการดึงประวัติการเก็บ logs: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์") 