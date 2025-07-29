"""
Database connection and session management.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import logging

from .core.config import settings

logger = logging.getLogger(__name__)

# Create database engine with connection pooling
try:
    engine = create_engine(
        settings.DATABASE_URL,
        poolclass=QueuePool,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_pre_ping=True,  # Enable connection health checks
        echo=settings.DEBUG  # Log SQL queries in debug mode
    )
    logger.info("Database engine created successfully")
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    raise

# Create sessionmaker
try:
    SessionLocal = sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False
    )
    logger.info("Database session maker created successfully")
except Exception as e:
    logger.error(f"Failed to create session maker: {e}")
    raise

def get_engine():
    """Get SQLAlchemy engine instance."""
    return engine

def get_session_maker():
    """Get SQLAlchemy session maker."""
    return SessionLocal

def init_db():
    """Initialize database tables and indexes."""
    from .models.base import Base
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Create indexes (if needed)
        # Add any custom index creation here
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

def dispose_engine():
    """Dispose database engine and connection pool."""
    try:
        engine.dispose()
        logger.info("Database engine disposed successfully")
    except Exception as e:
        logger.error(f"Failed to dispose database engine: {e}")
        raise 