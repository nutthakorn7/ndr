"""
Core dependencies and utilities for FastAPI application.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Generator, Dict, Optional
import jwt
from datetime import datetime
import logging

from .config import settings
from ..database import SessionLocal
from ..utils.encryption import EncryptionManager
from ..utils.log_manager import LogManager

# Configure logging
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format=settings.LOG_FORMAT,
    filename=settings.LOG_FILE
)
logger = logging.getLogger(__name__)

# Global instances (initialized once)
encryption_manager = EncryptionManager(settings.ENCRYPTION_KEY)
log_manager = LogManager()
security = HTTPBearer()

def get_db() -> Generator[Session, None, None]:
    """Database session dependency."""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Validate JWT token and return current user."""
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        username: str = payload.get("username")
        exp = payload.get("exp")
        
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Check token expiration
        if not exp or datetime.utcnow().timestamp() > exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Log access
        log_manager.log_authentication_event(
            event_type="TOKEN_VALIDATION",
            user_id=username,
            status="SUCCESS"
        )
        
        return {"username": username}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTError as e:
        logger.error(f"JWT validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_active_user(
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Get current active user with additional validation."""
    try:
        # Add any additional user validation here
        # For example, check if user is active in database
        return current_user
    except Exception as e:
        logger.error(f"Active user validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is not active"
        )

def get_encryption_manager() -> EncryptionManager:
    """Get encryption manager instance."""
    return encryption_manager

def get_log_manager() -> LogManager:
    """Get log manager instance."""
    return log_manager 