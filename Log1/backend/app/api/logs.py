"""
Authentication logs API endpoints.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from ..core.dependencies import get_db, get_current_user
from ..core.responses import create_response, create_error_response, MESSAGES
from ..services.log_service import LogService
from ..schemas.log import LogFilter, LogResponse, LogStatsResponse

router = APIRouter()
log_service = LogService()

@router.get("/", response_model=LogResponse)
async def get_logs(
    source_type: Optional[str] = None,
    username: Optional[str] = None,
    ip_address: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get logs with filtering and pagination."""
    try:
        # Convert string dates to datetime if provided
        start = datetime.fromisoformat(start_date) if start_date else None
        end = datetime.fromisoformat(end_date) if end_date else None
        
        # Create filter object
        filters = LogFilter(
            source_type=source_type,
            username=username,
            ip_address=ip_address,
            status=status,
            start_date=start,
            end_date=end
        )
        
        # Calculate skip for pagination
        skip = (page - 1) * limit
        
        # Get logs from service
        result = log_service.get_logs(db, filters, skip, limit)
        
        return create_response(
            data=result,
            message=MESSAGES["success"]["fetch"]
        )
        
    except ValueError as e:
        return create_error_response(
            code="VALIDATION_ERROR",
            message=str(e)
        )
    except Exception as e:
        return create_error_response(
            code="INTERNAL_ERROR",
            message=str(e)
        )

@router.get("/stats", response_model=LogStatsResponse)
async def get_log_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get log statistics."""
    try:
        stats = log_service.get_log_stats(db)
        return create_response(
            data=stats,
            message=MESSAGES["success"]["fetch"]
        )
    except Exception as e:
        return create_error_response(
            code="INTERNAL_ERROR",
            message=str(e)
        )

@router.get("/{log_id}", response_model=LogResponse)
async def get_log_by_id(
    log_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific log entry by ID."""
    try:
        log = log_service.get(db, log_id)
        return create_response(
            data=log_service._format_log(log),
            message=MESSAGES["success"]["fetch"]
        )
    except Exception as e:
        return create_error_response(
            code="INTERNAL_ERROR",
            message=str(e)
        ) 