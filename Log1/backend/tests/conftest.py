"""
Test Configuration and Fixtures
"""
import pytest
import asyncio
import tempfile
import os
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from httpx import AsyncClient

# Import app and dependencies
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.main import app
from app.models.base import Base
from app.core.config import settings
from app.database import get_db

# Test database URL (SQLite for testing)
TEST_DATABASE_URL = "sqlite:///./test.db"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
def test_db():
    """Create a test database"""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    
    yield TestingSessionLocal()
    
    # Cleanup
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test.db"):
        os.remove("./test.db")

@pytest.fixture
def client(test_db):
    """Create a test client"""
    with TestClient(app) as c:
        yield c

@pytest.fixture
async def async_client(test_db):
    """Create an async test client"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def auth_headers(client):
    """Get authentication headers for test user"""
    # Create test user and login
    login_data = {"username": "admin", "password": "admin123"}
    response = client.post("/api/auth/login", json=login_data)
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    else:
        # If login fails, return empty headers (some tests might not need auth)
        return {}

@pytest.fixture
def sample_log_data():
    """Sample log data for testing"""
    return {
        "source_type": "FIREWALL",
        "source_name": "test-firewall",
        "source_ip": "192.168.1.1",
        "user_id": "test-user",
        "username": "testuser",
        "domain": "test.local",
        "action": "LOGIN",
        "status": "SUCCESS",
        "auth_method": "PASSWORD",
        "client_ip": "192.168.1.100",
        "client_port": 12345,
        "server_ip": "192.168.1.1",
        "server_port": 22,
        "session_id": "test-session-123",
        "user_agent": "TestAgent/1.0",
        "timestamp": datetime.now().isoformat(),
        "details": {"test": "data"},
        "error_message": None
    }

@pytest.fixture
def sample_source_data():
    """Sample log source data for testing"""
    return {
        "name": "Test Firewall",
        "description": "Test firewall for automated testing",
        "source_type": "FIREWALL",
        "ip_address": "192.168.1.1",
        "port": 22,
        "credentials": {
            "username": "testuser",
            "password": "testpass",
            "firewall_type": "cisco_asa"
        },
        "is_active": True,
        "collection_interval": 300
    } 