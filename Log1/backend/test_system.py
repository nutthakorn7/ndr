"""
System test script to verify core functionality.
"""
import os
import sys
import logging
import requests
import json
import time
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SystemTester:
    """Test core system functionality."""
    
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url.rstrip('/')
        self.token = None
        self.headers = {"Content-Type": "application/json"}
    
    def run_all_tests(self):
        """Run all system tests."""
        try:
            logger.info("Starting system tests...")
            
            # Test health endpoint
            self.test_health()
            
            # Test authentication
            self.test_auth()
            
            # Test API endpoints
            self.test_logs_api()
            self.test_sources_api()
            self.test_analytics_api()
            self.test_ai_assistant_api()
            
            logger.info("All tests completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"System tests failed: {e}")
            return False
    
    def test_health(self):
        """Test health check endpoint."""
        logger.info("Testing health check endpoint...")
        response = requests.get(f"{self.base_url}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        logger.info("Health check passed")
    
    def test_auth(self):
        """Test authentication endpoints."""
        logger.info("Testing authentication...")
        
        # Test login
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        response = requests.post(
            f"{self.base_url}/api/v1/auth/login",
            json=login_data
        )
        assert response.status_code == 200
        data = response.json()
        self.token = data["access_token"]
        self.headers["Authorization"] = f"Bearer {self.token}"
        
        # Test current user
        response = requests.get(
            f"{self.base_url}/api/v1/auth/me",
            headers=self.headers
        )
        assert response.status_code == 200
        
        logger.info("Authentication tests passed")
    
    def test_logs_api(self):
        """Test logs API endpoints."""
        logger.info("Testing logs API...")
        
        # Test get logs
        response = requests.get(
            f"{self.base_url}/api/v1/logs",
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Test log stats
        response = requests.get(
            f"{self.base_url}/api/v1/logs/stats",
            headers=self.headers
        )
        assert response.status_code == 200
        
        logger.info("Logs API tests passed")
    
    def test_sources_api(self):
        """Test log sources API endpoints."""
        logger.info("Testing sources API...")
        
        # Test get sources
        response = requests.get(
            f"{self.base_url}/api/v1/sources",
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Test create source
        source_data = {
            "name": "Test Server",
            "source_type": "SERVER",
            "ip_address": "127.0.0.1",
            "port": 22,
            "protocol": "ssh"
        }
        response = requests.post(
            f"{self.base_url}/api/v1/sources",
            headers=self.headers,
            json=source_data
        )
        assert response.status_code in [200, 201]
        
        logger.info("Sources API tests passed")
    
    def test_analytics_api(self):
        """Test analytics API endpoints."""
        logger.info("Testing analytics API...")
        
        # Test dashboard stats
        response = requests.get(
            f"{self.base_url}/api/v1/analytics/dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        
        logger.info("Analytics API tests passed")
    
    def test_ai_assistant_api(self):
        """Test AI assistant API endpoints."""
        logger.info("Testing AI assistant API...")
        
        # Test AI status
        response = requests.get(
            f"{self.base_url}/api/v1/ai/status",
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Test AI query
        query_data = {
            "question": "What are the latest security threats?",
            "context": {"timestamp": datetime.utcnow().isoformat()}
        }
        response = requests.post(
            f"{self.base_url}/api/v1/ai/ask",
            headers=self.headers,
            json=query_data
        )
        assert response.status_code == 200
        
        logger.info("AI assistant API tests passed")

def main():
    """Main entry point."""
    try:
        # Allow custom base URL
        base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
        
        # Run tests
        tester = SystemTester(base_url)
        success = tester.run_all_tests()
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except Exception as e:
        logger.error(f"Test script error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 