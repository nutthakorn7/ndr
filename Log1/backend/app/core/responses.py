"""
Standardized API response models and utilities.
"""
from typing import Any, Dict, Generic, List, Optional, TypeVar, Union
from pydantic import BaseModel
from datetime import datetime

T = TypeVar('T')

class ResponseBase(BaseModel):
    """Base response model with common metadata."""
    success: bool
    timestamp: datetime = datetime.utcnow()
    message: Optional[str] = None

class DataResponse(ResponseBase, Generic[T]):
    """Response model for single data object."""
    data: T

class ListResponse(ResponseBase, Generic[T]):
    """Response model for paginated list data."""
    data: List[T]
    total: int
    page: Optional[int] = None
    limit: Optional[int] = None
    has_more: Optional[bool] = None

class ErrorDetail(BaseModel):
    """Detailed error information."""
    code: str
    message: str
    field: Optional[str] = None

class ErrorResponse(ResponseBase):
    """Standard error response."""
    success: bool = False
    error: ErrorDetail

def create_response(
    data: Any,
    message: Optional[str] = None,
    success: bool = True
) -> Union[DataResponse, ListResponse]:
    """Create a standardized successful response."""
    if isinstance(data, list):
        return ListResponse(
            success=success,
            message=message,
            data=data,
            total=len(data)
        )
    return DataResponse(
        success=success,
        message=message,
        data=data
    )

def create_error_response(
    code: str,
    message: str,
    field: Optional[str] = None
) -> ErrorResponse:
    """Create a standardized error response."""
    return ErrorResponse(
        success=False,
        error=ErrorDetail(
            code=code,
            message=message,
            field=field
        )
    )

# Common response messages
MESSAGES = {
    "success": {
        "create": "Resource created successfully",
        "update": "Resource updated successfully",
        "delete": "Resource deleted successfully",
        "fetch": "Data retrieved successfully"
    },
    "error": {
        "not_found": "Resource not found",
        "validation": "Validation error occurred",
        "database": "Database error occurred",
        "unauthorized": "Unauthorized access",
        "forbidden": "Access forbidden"
    }
}

# Response Examples
SUCCESS_RESPONSE = {
    "success": True,
    "timestamp": "2024-03-21T10:00:00Z",
    "message": "Operation completed successfully",
    "data": {}  # Replace with actual data
}

ERROR_RESPONSE = {
    "success": False,
    "timestamp": "2024-03-21T10:00:00Z",
    "message": "An error occurred",
    "error": {
        "code": "ERROR_CODE",
        "message": "Detailed error message",
        "field": "field_name"  # Optional
    }
}

PAGINATED_RESPONSE = {
    "success": True,
    "timestamp": "2024-03-21T10:00:00Z",
    "message": "Data retrieved successfully",
    "data": [],  # List of items
    "total": 0,
    "page": 1,
    "limit": 10,
    "has_more": False
} 