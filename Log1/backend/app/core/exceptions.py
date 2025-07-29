"""
Custom exceptions and exception handlers for the application.
"""
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional

class AppException(HTTPException):
    """Base exception for application-specific errors."""
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.headers = headers

class DatabaseError(AppException):
    """Database-related errors."""
    def __init__(self, detail: str = "Database error occurred", error_code: str = "DB_ERROR"):
        super().__init__(
            status_code=500,
            detail=detail,
            error_code=error_code
        )

class ValidationError(AppException):
    """Validation errors."""
    def __init__(self, detail: str = "Validation error", error_code: str = "VALIDATION_ERROR"):
        super().__init__(
            status_code=400,
            detail=detail,
            error_code=error_code
        )

class AuthenticationError(AppException):
    """Authentication errors."""
    def __init__(
        self,
        detail: str = "Authentication failed",
        error_code: str = "AUTH_ERROR",
        headers: Optional[Dict[str, str]] = None
    ):
        super().__init__(
            status_code=401,
            detail=detail,
            error_code=error_code,
            headers=headers or {"WWW-Authenticate": "Bearer"}
        )

class NotFoundError(AppException):
    """Resource not found errors."""
    def __init__(self, detail: str = "Resource not found", error_code: str = "NOT_FOUND"):
        super().__init__(
            status_code=404,
            detail=detail,
            error_code=error_code
        )

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle application-specific exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.detail,
                "status": exc.status_code
            }
        },
        headers=exc.headers or {}
    )

async def validation_exception_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """Handle validation errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": exc.detail,
                "status": 400,
                "errors": getattr(exc, "errors", [])
            }
        }
    )

async def database_exception_handler(request: Request, exc: DatabaseError) -> JSONResponse:
    """Handle database errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "DATABASE_ERROR",
                "message": "A database error occurred",
                "status": 500
            }
        }
    )

async def not_found_exception_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    """Handle not found errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "NOT_FOUND",
                "message": exc.detail,
                "status": 404
            }
        }
    )

# Register exception handlers
exception_handlers = {
    AppException: app_exception_handler,
    ValidationError: validation_exception_handler,
    DatabaseError: database_exception_handler,
    NotFoundError: not_found_exception_handler
} 