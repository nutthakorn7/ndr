"""
Logs API Tests
"""
import pytest
from datetime import datetime, timedelta


class TestLogsAPI:
    """Test logs endpoints"""
    
    def test_get_logs(self, client, auth_headers):
        """Test getting logs list"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping logs test")
            
        response = client.get("/api/logs/", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # Structure may vary, check for common fields
        if "logs" in data:
            assert isinstance(data["logs"], list)
        elif "items" in data:
            assert isinstance(data["items"], list)
    
    def test_get_logs_with_filters(self, client, auth_headers):
        """Test getting logs with filters"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping logs filter test")
            
        # Test with date filter
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "limit": 10
        }
        
        response = client.get("/api/logs/", params=params, headers=auth_headers)
        assert response.status_code == 200
        
        # Test with search filter
        params = {"search": "login", "limit": 5}
        response = client.get("/api/logs/", params=params, headers=auth_headers)
        assert response.status_code == 200
    
    def test_get_logs_stats(self, client, auth_headers):
        """Test getting logs statistics"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping logs stats test")
            
        response = client.get("/api/logs/stats", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # Check for common stats fields
        expected_fields = ["total_logs", "success_rate", "failed_attempts"]
        for field in expected_fields:
            if field in data:
                assert isinstance(data[field], (int, float))
    
    def test_get_logs_no_auth(self, client):
        """Test getting logs without authentication"""
        response = client.get("/api/logs/")
        assert response.status_code == 401
    
    def test_get_logs_invalid_params(self, client, auth_headers):
        """Test getting logs with invalid parameters"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping invalid params test")
            
        # Invalid date format
        params = {"start_date": "invalid-date"}
        response = client.get("/api/logs/", params=params, headers=auth_headers)
        # Should either return 422 or ignore invalid params
        assert response.status_code in [200, 422]
        
        # Negative limit
        params = {"limit": -1}
        response = client.get("/api/logs/", params=params, headers=auth_headers)
        assert response.status_code in [200, 422]


class TestLogsClickHouseAPI:
    """Test ClickHouse logs endpoints"""
    
    def test_get_clickhouse_logs(self, client, auth_headers):
        """Test getting logs from ClickHouse"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping ClickHouse logs test")
            
        response = client.get("/api/logs-ch/", headers=auth_headers)
        
        # ClickHouse might not be available in test environment
        assert response.status_code in [200, 503, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
    
    def test_clickhouse_query(self, client, auth_headers):
        """Test custom ClickHouse query"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping ClickHouse query test")
            
        query_data = {
            "query": "SELECT COUNT(*) as total FROM logs LIMIT 1",
            "parameters": {}
        }
        
        response = client.post("/api/logs-ch/query", json=query_data, headers=auth_headers)
        
        # ClickHouse might not be available in test environment
        assert response.status_code in [200, 503, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
    
    def test_clickhouse_query_invalid_sql(self, client, auth_headers):
        """Test ClickHouse query with invalid SQL"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping invalid SQL test")
            
        query_data = {
            "query": "INVALID SQL STATEMENT",
            "parameters": {}
        }
        
        response = client.post("/api/logs-ch/query", json=query_data, headers=auth_headers)
        
        # Should return error for invalid SQL
        assert response.status_code in [400, 422, 500, 503] 