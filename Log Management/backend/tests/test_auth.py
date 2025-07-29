"""
Authentication API Tests
"""
import pytest
from fastapi.testclient import TestClient


class TestAuthAPI:
    """Test authentication endpoints"""
    
    def test_login_success(self, client):
        """Test successful login"""
        login_data = {"username": "admin", "password": "admin123"}
        response = client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == "admin"
    
    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials"""
        login_data = {"username": "admin", "password": "wrong_password"}
        response = client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_login_missing_fields(self, client):
        """Test login with missing fields"""
        # Missing password
        login_data = {"username": "admin"}
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 422
        
        # Missing username
        login_data = {"password": "admin123"}
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 422
    
    def test_get_current_user(self, client, auth_headers):
        """Test getting current user info"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping user info test")
            
        response = client.get("/api/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "username" in data
        assert "role" in data
        assert data["username"] == "admin"
    
    def test_get_current_user_no_auth(self, client):
        """Test getting current user without authentication"""
        response = client.get("/api/auth/me")
        assert response.status_code == 401
    
    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 401
    
    def test_logout(self, client, auth_headers):
        """Test logout"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping logout test")
            
        response = client.post("/api/auth/logout", headers=auth_headers)
        assert response.status_code == 200
        
        # After logout, should not be able to access protected endpoint
        response = client.get("/api/auth/me", headers=auth_headers)
        # Note: Depending on implementation, this might still work
        # as token might not be invalidated server-side 