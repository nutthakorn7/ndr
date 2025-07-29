"""
Main FastAPI application module.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
from datetime import datetime

from .core.config import settings
from .core.exceptions import (
    AppException,
    ValidationError,
    DatabaseError,
    NotFoundError,
    exception_handlers
)
from .database import init_db, dispose_engine
from .utils.log_manager import LogManager
from .services.collection_service import LogCollectionService
from .api import (
    auth,
    logs,
    logs_clickhouse,
    sources,
    analytics,
    firewall_management,
    server_management,
    ai_assistant
)

# Configure logging
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format=settings.LOG_FORMAT,
    filename=settings.LOG_FILE
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise Log Management & Security Analytics Platform",
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize global objects
log_manager = LogManager()
log_collection_service = LogCollectionService()

# Register exception handlers
for exc, handler in exception_handlers.items():
    app.add_exception_handler(exc, handler)

# Add global request middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests."""
    start_time = datetime.utcnow()
    try:
        response = await call_next(request)
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        log_manager.log_request(
            method=request.method,
            url=str(request.url),
            status_code=response.status_code,
            duration=duration
        )
        return response
        
    except Exception as e:
        logger.error(f"Request error: {e}")
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        log_manager.log_request(
            method=request.method,
            url=str(request.url),
            status_code=500,
            duration=duration,
            error=str(e)
        )
        
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )

# Include API routers with versioning
app.include_router(
    auth.router,
    prefix="/api/v1/auth",
    tags=["Authentication"]
)
app.include_router(
    logs.router,
    prefix="/api/v1/logs",
    tags=["Logs"]
)
app.include_router(
    logs_clickhouse.router,
    prefix="/api/v1/logs-ch",
    tags=["ClickHouse Logs"]
)
app.include_router(
    ai_assistant.router,
    prefix="/api/v1/ai",
    tags=["AI Assistant"]
)
app.include_router(
    sources.router,
    prefix="/api/v1/sources",
    tags=["Log Sources"]
)
app.include_router(
    analytics.router,
    prefix="/api/v1/analytics",
    tags=["Analytics"]
)
app.include_router(
    firewall_management.router,
    prefix="/api/v1/firewall",
    tags=["Firewall Management"]
)
app.include_router(
    server_management.router,
    prefix="/api/v1/servers",
    tags=["Server Management"]
)

@app.on_event("startup")
async def startup_event():
    """Startup event handler."""
    try:
        logger.info("Starting zcrLog system")
        
        # Initialize database
        init_db()
        
        # Start log collection service
        log_collection_service.start_collection()
        
        logger.info("System startup completed successfully")
        
    except Exception as e:
        logger.error(f"System startup failed: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler."""
    try:
        logger.info("Shutting down zcrLog system")
        
        # Stop log collection service
        log_collection_service.stop_collection()
        
        # Dispose database engine
        dispose_engine()
        
        logger.info("System shutdown completed successfully")
        
    except Exception as e:
        logger.error(f"System shutdown error: {e}")
        raise

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=settings.WORKERS,
        log_level=settings.LOG_LEVEL.lower()
    ) 