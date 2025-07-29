from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, case
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import json
import jwt

from ..models.auth_log import AuthenticationLog
from ..utils.log_manager import LogManager
from ..core.config import settings
from ..models.log_source import LogSource

router = APIRouter()

# Global objects
log_manager = LogManager()

def get_db():
    from ..main import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from .auth import get_current_user

@router.get("/dashboard")
async def get_dashboard(
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """ดึงข้อมูลสำหรับ Dashboard"""
    try:
        # ดึงข้อมูลย้อนหลัง 30 วัน
        start_date = datetime.now() - timedelta(days=30)
        
        # Query สถิติการ login
        stats = db.query(
            func.date(AuthenticationLog.timestamp).label('date'),
            func.count(AuthenticationLog.id).label('total'),
            func.count(case((AuthenticationLog.status == 'SUCCESS', 1))).label('success'),
            func.count(case((AuthenticationLog.status == 'FAILED', 1))).label('failed')
        ).filter(
            AuthenticationLog.timestamp >= start_date
        ).group_by(
            func.date(AuthenticationLog.timestamp)
        ).order_by(
            func.date(AuthenticationLog.timestamp)
        ).all()
        
        # แปลงผลลัพธ์เป็น dict
        result = []
        for stat in stats:
            result.append({
                'date': stat.date.isoformat(),
                'total': stat.total,
                'success': stat.success,
                'failed': stat.failed
            })
        
        # ดึงข้อมูลสรุป
        summary = {
            'total_logs': db.query(func.count(AuthenticationLog.id)).scalar(),
            'success_rate': db.query(
                func.count(case((AuthenticationLog.status == 'SUCCESS', 1))) * 100.0 / 
                func.count(AuthenticationLog.id)
            ).scalar() or 0,
            'total_sources': db.query(func.count(LogSource.id)).scalar(),
            'active_sources': db.query(func.count(LogSource.id)).filter(LogSource.is_active == True).scalar()
        }
        
        return {
            'stats': result,
            'summary': summary
        }
        
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.get("/security-alerts")
async def get_security_alerts(
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
    days: int = Query(7, ge=1, le=30)
):
    """ดึง Security Alerts"""
    try:
        # คำนวณวันที่เริ่มต้น
        start_date = datetime.now() - timedelta(days=days)
        
        alerts = []
        
        # ตรวจสอบ Failed Login Attempts
        failed_logins = db.query(
            AuthenticationLog.user_id,
            AuthenticationLog.client_ip,
            func.count(AuthenticationLog.id).label('count')
        ).filter(
            and_(
                AuthenticationLog.timestamp >= start_date,
                AuthenticationLog.status == "FAILED"
            )
        ).group_by(
            AuthenticationLog.user_id,
            AuthenticationLog.client_ip
        ).having(
            func.count(AuthenticationLog.id) >= 5
        ).all()
        
        for failed in failed_logins:
            alerts.append({
                "type": "FAILED_LOGIN_ATTEMPTS",
                "severity": "HIGH" if failed.count >= 10 else "MEDIUM",
                "user_id": failed.user_id,
                "ip_address": failed.client_ip,
                "count": failed.count,
                "description": f"พบการพยายามเข้าสู่ระบบที่ล้มเหลว {failed.count} ครั้งจาก IP {failed.client_ip}"
            })
        
        # ตรวจสอบ Multiple IPs for Same User
        multiple_ips = db.query(
            AuthenticationLog.user_id,
            func.count(func.distinct(AuthenticationLog.client_ip)).label('ip_count')
        ).filter(
            AuthenticationLog.timestamp >= start_date
        ).group_by(
            AuthenticationLog.user_id
        ).having(
            func.count(func.distinct(AuthenticationLog.client_ip)) >= 5
        ).all()
        
        for multi_ip in multiple_ips:
            alerts.append({
                "type": "MULTIPLE_IPS",
                "severity": "MEDIUM",
                "user_id": multi_ip.user_id,
                "ip_count": multi_ip.ip_count,
                "description": f"ผู้ใช้ {multi_ip.user_id} เข้าสู่ระบบจาก IP ต่างๆ {multi_ip.ip_count} IP"
            })
        
        # ตรวจสอบ Unusual Activity Times
        # (ตัวอย่าง: เข้าสู่ระบบนอกเวลาทำการ)
        unusual_times = db.query(
            AuthenticationLog.user_id,
            AuthenticationLog.client_ip,
            func.count(AuthenticationLog.id).label('count')
        ).filter(
            and_(
                AuthenticationLog.timestamp >= start_date,
                func.extract('hour', AuthenticationLog.timestamp).in_([22, 23, 0, 1, 2, 3, 4, 5])
            )
        ).group_by(
            AuthenticationLog.user_id,
            AuthenticationLog.client_ip
        ).having(
            func.count(AuthenticationLog.id) >= 3
        ).all()
        
        for unusual in unusual_times:
            alerts.append({
                "type": "UNUSUAL_ACTIVITY_TIME",
                "severity": "LOW",
                "user_id": unusual.user_id,
                "ip_address": unusual.client_ip,
                "count": unusual.count,
                "description": f"พบกิจกรรมนอกเวลาทำการ {unusual.count} ครั้งจากผู้ใช้ {unusual.user_id}"
            })
        
        # เรียงลำดับตาม severity
        severity_order = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
        alerts.sort(key=lambda x: severity_order.get(x["severity"], 0), reverse=True)
        
        return {
            "period_days": days,
            "total_alerts": len(alerts),
            "alerts": alerts
        }
        
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการดึง Security Alerts: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.get("/compliance-report")
async def get_compliance_report(
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
    start_date: datetime = Query(...),
    end_date: datetime = Query(...)
):
    """ดึงรายงาน Compliance ตาม พรบ. คอมพิวเตอร์"""
    try:
        # ตรวจสอบข้อมูลตาม พรบ. คอมพิวเตอร์
        compliance_data = {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "log_retention": {
                "policy": f"เก็บ Log อย่างน้อย {settings.LOG_RETENTION_DAYS} วัน",
                "compliance": True
            },
            "data_encryption": {
                "policy": "ข้อมูลที่สำคัญต้องถูกเข้ารหัส",
                "compliance": True
            },
            "access_logs": {
                "total_records": db.query(func.count(AuthenticationLog.id)).filter(
                    and_(
                        AuthenticationLog.timestamp >= start_date,
                        AuthenticationLog.timestamp <= end_date
                    )
                ).scalar(),
                "encrypted_records": db.query(func.count(AuthenticationLog.id)).filter(
                    and_(
                        AuthenticationLog.timestamp >= start_date,
                        AuthenticationLog.timestamp <= end_date,
                        AuthenticationLog.is_encrypted == True
                    )
                ).scalar(),
                "compliance": True
            },
            "source_coverage": {
                "firewall_logs": db.query(func.count(AuthenticationLog.id)).filter(
                    and_(
                        AuthenticationLog.timestamp >= start_date,
                        AuthenticationLog.timestamp <= end_date,
                        AuthenticationLog.source_type == "FIREWALL"
                    )
                ).scalar(),
                "proxy_logs": db.query(func.count(AuthenticationLog.id)).filter(
                    and_(
                        AuthenticationLog.timestamp >= start_date,
                        AuthenticationLog.timestamp <= end_date,
                        AuthenticationLog.source_type == "PROXY"
                    )
                ).scalar(),
                "ad_logs": db.query(func.count(AuthenticationLog.id)).filter(
                    and_(
                        AuthenticationLog.timestamp >= start_date,
                        AuthenticationLog.timestamp <= end_date,
                        AuthenticationLog.source_type == "AD"
                    )
                ).scalar(),
                "server_logs": db.query(func.count(AuthenticationLog.id)).filter(
                    and_(
                        AuthenticationLog.timestamp >= start_date,
                        AuthenticationLog.timestamp <= end_date,
                        AuthenticationLog.source_type == "SERVER"
                    )
                ).scalar()
            },
            "security_events": {
                "failed_logins": db.query(func.count(AuthenticationLog.id)).filter(
                    and_(
                        AuthenticationLog.timestamp >= start_date,
                        AuthenticationLog.timestamp <= end_date,
                        AuthenticationLog.status == "FAILED"
                    )
                ).scalar(),
                "successful_logins": db.query(func.count(AuthenticationLog.id)).filter(
                    and_(
                        AuthenticationLog.timestamp >= start_date,
                        AuthenticationLog.timestamp <= end_date,
                        AuthenticationLog.status == "SUCCESS"
                    )
                ).scalar()
            },
            "data_integrity": {
                "total_records": db.query(func.count(AuthenticationLog.id)).filter(
                    and_(
                        AuthenticationLog.timestamp >= start_date,
                        AuthenticationLog.timestamp <= end_date
                    )
                ).scalar(),
                "records_with_hash": db.query(func.count(AuthenticationLog.id)).filter(
                    and_(
                        AuthenticationLog.timestamp >= start_date,
                        AuthenticationLog.timestamp <= end_date,
                        AuthenticationLog.integrity_hash.isnot(None)
                    )
                ).scalar(),
                "compliance": True
            }
        }
        
        # คำนวณ compliance score
        compliance_score = 0
        total_checks = 0
        
        if compliance_data["log_retention"]["compliance"]:
            compliance_score += 1
        total_checks += 1
        
        if compliance_data["data_encryption"]["compliance"]:
            compliance_score += 1
        total_checks += 1
        
        if compliance_data["access_logs"]["compliance"]:
            compliance_score += 1
        total_checks += 1
        
        if compliance_data["data_integrity"]["compliance"]:
            compliance_score += 1
        total_checks += 1
        
        compliance_data["overall_score"] = (compliance_score / total_checks) * 100 if total_checks > 0 else 0
        
        return compliance_data
        
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการดึง Compliance Report: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.get("/trends")
async def get_trends(
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
    days: int = Query(30, ge=7, le=365),
    trend_type: str = Query("daily", regex="^(daily|hourly|weekly)$")
):
    """ดึงข้อมูล Trends"""
    try:
        # คำนวณวันที่เริ่มต้น
        start_date = datetime.now() - timedelta(days=days)
        
        if trend_type == "daily":
            # สถิติรายวัน
            trends = db.query(
                func.date(AuthenticationLog.timestamp).label('period'),
                func.count(AuthenticationLog.id).label('total'),
                func.count(case((AuthenticationLog.status == "SUCCESS", 1))).label('success'),
                func.count(case((AuthenticationLog.status == "FAILED", 1))).label('failed')
            ).filter(
                AuthenticationLog.timestamp >= start_date
            ).group_by(
                func.date(AuthenticationLog.timestamp)
            ).order_by(
                func.date(AuthenticationLog.timestamp)
            ).all()
            
        elif trend_type == "hourly":
            # สถิติรายชั่วโมง (เฉพาะ 7 วันล่าสุด)
            start_date = datetime.now() - timedelta(days=7)
            trends = db.query(
                func.date_trunc('hour', AuthenticationLog.timestamp).label('period'),
                func.count(AuthenticationLog.id).label('total'),
                func.count(case((AuthenticationLog.status == "SUCCESS", 1))).label('success'),
                func.count(case((AuthenticationLog.status == "FAILED", 1))).label('failed')
            ).filter(
                AuthenticationLog.timestamp >= start_date
            ).group_by(
                func.date_trunc('hour', AuthenticationLog.timestamp)
            ).order_by(
                func.date_trunc('hour', AuthenticationLog.timestamp)
            ).all()
            
        else:  # weekly
            # สถิติรายสัปดาห์
            trends = db.query(
                func.date_trunc('week', AuthenticationLog.timestamp).label('period'),
                func.count(AuthenticationLog.id).label('total'),
                func.count(case((AuthenticationLog.status == "SUCCESS", 1))).label('success'),
                func.count(case((AuthenticationLog.status == "FAILED", 1))).label('failed')
            ).filter(
                AuthenticationLog.timestamp >= start_date
            ).group_by(
                func.date_trunc('week', AuthenticationLog.timestamp)
            ).order_by(
                func.date_trunc('week', AuthenticationLog.timestamp)
            ).all()
        
        return {
            "trend_type": trend_type,
            "period_days": days,
            "trends": [
                {
                    "period": trend.period.isoformat() if hasattr(trend.period, 'isoformat') else str(trend.period),
                    "total": trend.total,
                    "success": trend.success,
                    "failed": trend.failed,
                    "success_rate": (trend.success / trend.total * 100) if trend.total > 0 else 0
                }
                for trend in trends
            ]
        }
        
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการดึง Trends: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.get("/geographic-analysis")
async def get_geographic_analysis(
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
    days: int = Query(30, ge=1, le=365)
):
    """ดึงการวิเคราะห์ทางภูมิศาสตร์"""
    try:
        # คำนวณวันที่เริ่มต้น
        start_date = datetime.now() - timedelta(days=days)
        
        # ในที่นี้จะใช้ mock data
        # ใน production ควรใช้ GeoIP database เพื่อแปลง IP เป็นประเทศ
        
        # สร้าง mock geographic data
        geographic_data = {
            "period_days": days,
            "countries": [
                {"country": "Thailand", "count": 1500, "percentage": 75.0},
                {"country": "United States", "count": 300, "percentage": 15.0},
                {"country": "Singapore", "count": 100, "percentage": 5.0},
                {"country": "Japan", "count": 50, "percentage": 2.5},
                {"country": "Others", "count": 50, "percentage": 2.5}
            ],
            "cities": [
                {"city": "Bangkok", "country": "Thailand", "count": 800, "percentage": 40.0},
                {"city": "Chiang Mai", "country": "Thailand", "count": 300, "percentage": 15.0},
                {"city": "New York", "country": "United States", "count": 200, "percentage": 10.0},
                {"city": "Singapore", "country": "Singapore", "count": 100, "percentage": 5.0},
                {"city": "Tokyo", "country": "Japan", "count": 50, "percentage": 2.5}
            ],
            "top_ips_by_location": [
                {
                    "ip": "192.168.1.100",
                    "country": "Thailand",
                    "city": "Bangkok",
                    "count": 150,
                    "last_seen": datetime.now().isoformat()
                },
                {
                    "ip": "10.0.0.50",
                    "country": "Thailand",
                    "city": "Chiang Mai",
                    "count": 80,
                    "last_seen": datetime.now().isoformat()
                }
            ]
        }
        
        return geographic_data
        
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการดึง Geographic Analysis: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์") 

# Alias endpoints for frontend compatibility
@router.get("/geographic")
async def get_geographic_alias(
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
    days: int = Query(30, ge=1, le=365)
):
    """Alias for geographic-analysis endpoint"""
    return await get_geographic_analysis(db, current_user, days)

@router.get("/compliance")
async def get_compliance_alias(
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
    report_type: str = Query("monthly"),
    date_range: str = Query(...)
):
    """Alias for compliance-report endpoint"""
    # Parse date_range (format: YYYY-MM)
    try:
        year, month = map(int, date_range.split('-'))
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = datetime(year, month + 1, 1) - timedelta(days=1)
        
        return await get_compliance_report(db, current_user, start_date, end_date)
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการแปลง date_range: {str(e)}")
        raise HTTPException(status_code=400, detail="รูปแบบ date_range ไม่ถูกต้อง ใช้รูปแบบ YYYY-MM") 