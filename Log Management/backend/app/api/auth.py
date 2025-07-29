from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any
from pydantic import BaseModel
import jwt

from ..models.auth_log import AuthenticationLog
from ..utils.encryption import EncryptionManager
from ..utils.log_manager import LogManager
from ..core.config import settings

router = APIRouter()

# Global objects
encryption_manager = EncryptionManager(settings.ENCRYPTION_KEY)
log_manager = LogManager()

class LoginRequest(BaseModel):
    username: str
    password: str

def get_db():
    from ..main import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    """Validate JWT token and return user info"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username = payload.get("username")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"username": username}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

@router.post("/login")
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
    client_ip: str = "127.0.0.1"
):
    """เข้าสู่ระบบ"""
    try:
        # ตรวจสอบ credentials
        if request.username == "admin" and request.password == "admin123":
            # สร้าง JWT token
            payload = {
                "username": request.username,
                "exp": datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
                "iat": datetime.utcnow()
            }
            token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
            
            # บันทึก Authentication Log
            auth_log = AuthenticationLog(
                source_type="SYSTEM",
                source_name="Auth API",
                source_ip="127.0.0.1",
                user_id=request.username,
                username=request.username,
                action="LOGIN",
                status="SUCCESS",
                auth_method="PASSWORD",
                client_ip=client_ip,
                timestamp=datetime.now(),
                details={"login_method": "api"},
                is_encrypted=True,
                integrity_hash=encryption_manager.generate_hash({"username": request.username, "action": "LOGIN"}),
                retention_date=datetime.now() + timedelta(days=settings.LOG_RETENTION_DAYS)
            )
            
            db.add(auth_log)
            db.commit()
            
            # บันทึก log
            log_manager.log_authentication_event(
                event_type="LOGIN",
                user_id=request.username,
                ip_address=client_ip,
                status="SUCCESS"
            )
            
            return {
                "access_token": token,
                "token_type": "bearer",
                "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                "user": {
                    "username": request.username,
                    "role": "admin"
                }
            }
        else:
            # บันทึก Failed Login
            auth_log = AuthenticationLog(
                source_type="SYSTEM",
                source_name="Auth API",
                source_ip="127.0.0.1",
                user_id=request.username,
                username=request.username,
                action="LOGIN",
                status="FAILED",
                auth_method="PASSWORD",
                client_ip=client_ip,
                timestamp=datetime.now(),
                details={"login_method": "api", "error": "Invalid credentials"},
                is_encrypted=True,
                integrity_hash=encryption_manager.generate_hash({"username": request.username, "action": "LOGIN_FAILED"}),
                retention_date=datetime.now() + timedelta(days=settings.LOG_RETENTION_DAYS)
            )
            
            db.add(auth_log)
            db.commit()
            
            # บันทึก log
            log_manager.log_authentication_event(
                event_type="LOGIN",
                user_id=request.username,
                ip_address=client_ip,
                status="FAILED"
            )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    except HTTPException:
        raise
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการ Login: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.post("/logout")
async def logout(
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    client_ip: str = "127.0.0.1"
):
    """ออกจากระบบ"""
    try:
        # บันทึก Logout Log
        auth_log = AuthenticationLog(
            source_type="SYSTEM",
            source_name="Auth API",
            source_ip="127.0.0.1",
            user_id=current_user["username"],
            username=current_user["username"],
            action="LOGOUT",
            status="SUCCESS",
            auth_method="TOKEN",
            client_ip=client_ip,
            timestamp=datetime.now(),
            details={"logout_method": "api"},
            is_encrypted=True,
            integrity_hash=encryption_manager.generate_hash({"username": current_user["username"], "action": "LOGOUT"}),
            retention_date=datetime.now() + timedelta(days=settings.LOG_RETENTION_DAYS)
        )
        
        db.add(auth_log)
        db.commit()
        
        # บันทึก log
        log_manager.log_authentication_event(
            event_type="LOGOUT",
            user_id=current_user["username"],
            ip_address=client_ip,
            status="SUCCESS"
        )
        
        return {"message": "ออกจากระบบสำเร็จ"}
        
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการ Logout: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.get("/me")
async def get_current_user_info(
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """ดึงข้อมูลผู้ใช้ปัจจุบัน"""
    try:
        return {
            "username": current_user["username"],
            "role": "admin",
            "permissions": [
                "read_logs",
                "write_logs",
                "export_logs",
                "manage_sources",
                "view_analytics",
                "manage_users"
            ]
        }
        
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.post("/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    client_ip: str = "127.0.0.1"
):
    """เปลี่ยนรหัสผ่าน"""
    try:
        # ตรวจสอบรหัสผ่านปัจจุบัน (ในที่นี้จะใช้ mock)
        if current_password != "admin123":
            # บันทึก Failed Password Change
            auth_log = AuthenticationLog(
                source_type="SYSTEM",
                source_name="Auth API",
                source_ip="127.0.0.1",
                user_id=current_user["username"],
                username=current_user["username"],
                action="PASSWORD_CHANGE",
                status="FAILED",
                auth_method="PASSWORD",
                client_ip=client_ip,
                timestamp=datetime.now(),
                details={"error": "Invalid current password"},
                is_encrypted=True,
                integrity_hash=encryption_manager.generate_hash({"username": current_user["username"], "action": "PASSWORD_CHANGE_FAILED"}),
                retention_date=datetime.now() + timedelta(days=settings.LOG_RETENTION_DAYS)
            )
            
            db.add(auth_log)
            db.commit()
            
            raise HTTPException(status_code=400, detail="รหัสผ่านปัจจุบันไม่ถูกต้อง")
        
        # เปลี่ยนรหัสผ่าน (ในที่นี้จะใช้ mock)
        # ใน production ควรเข้ารหัสรหัสผ่านใหม่และบันทึกลงฐานข้อมูล
        
        # บันทึก Successful Password Change
        auth_log = AuthenticationLog(
            source_type="SYSTEM",
            source_name="Auth API",
            source_ip="127.0.0.1",
            user_id=current_user["username"],
            username=current_user["username"],
            action="PASSWORD_CHANGE",
            status="SUCCESS",
            auth_method="PASSWORD",
            client_ip=client_ip,
            timestamp=datetime.now(),
            details={"password_changed": True},
            is_encrypted=True,
            integrity_hash=encryption_manager.generate_hash({"username": current_user["username"], "action": "PASSWORD_CHANGE_SUCCESS"}),
            retention_date=datetime.now() + timedelta(days=settings.LOG_RETENTION_DAYS)
        )
        
        db.add(auth_log)
        db.commit()
        
        # บันทึก log
        log_manager.log_security_event(
            event_type="PASSWORD_CHANGE",
            user_id=current_user["username"],
            ip_address=client_ip
        )
        
        return {"message": "เปลี่ยนรหัสผ่านสำเร็จ"}
        
    except HTTPException:
        raise
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.post("/refresh-token")
async def refresh_token(
    current_user: Dict = Depends(get_current_user)
):
    """รีเฟรช Token"""
    try:
        # สร้าง JWT token ใหม่
        payload = {
            "username": current_user["username"],
            "exp": datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            "iat": datetime.utcnow()
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
        
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการรีเฟรช Token: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.get("/permissions")
async def get_user_permissions(
    current_user: Dict = Depends(get_current_user)
):
    """ดึงสิทธิ์ของผู้ใช้"""
    try:
        # ในที่นี้จะใช้ mock permissions
        # ใน production ควรดึงจากฐานข้อมูล
        permissions = {
            "admin": [
                "read_logs",
                "write_logs",
                "export_logs",
                "manage_sources",
                "view_analytics",
                "manage_users",
                "system_admin"
            ],
            "analyst": [
                "read_logs",
                "export_logs",
                "view_analytics"
            ],
            "viewer": [
                "read_logs"
            ]
        }
        
        user_role = "admin"  # ใน production ควรดึงจากฐานข้อมูล
        user_permissions = permissions.get(user_role, [])
        
        return {
            "username": current_user["username"],
            "role": user_role,
            "permissions": user_permissions
        }
        
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการดึงสิทธิ์: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.post("/verify-token")
async def verify_token(token: str):
    """ตรวจสอบ Token"""
    try:
        # ตรวจสอบ JWT token
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username = payload.get("username")
        
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return {
            "valid": True,
            "username": username,
            "expires_at": datetime.fromtimestamp(payload["exp"]).isoformat()
        }
        
    except jwt.ExpiredSignatureError:
        return {"valid": False, "error": "Token expired"}
    except jwt.InvalidTokenError:
        return {"valid": False, "error": "Invalid token"}
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการตรวจสอบ Token: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์") 