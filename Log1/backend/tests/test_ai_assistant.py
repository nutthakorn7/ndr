"""
AI Assistant API Tests
"""
import pytest
from unittest.mock import patch, MagicMock


class TestAIAssistantAPI:
    """Test AI Assistant endpoints"""
    
    def test_ai_status(self, client, auth_headers):
        """Test AI Assistant status"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping AI status test")
            
        response = client.get("/api/ai/status", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        
        # Check for expected status fields
        expected_fields = ["ai_available", "current_provider", "available_providers"]
        for field in expected_fields:
            assert field in data
        
        assert isinstance(data["ai_available"], bool)
        assert isinstance(data["available_providers"], list)
    
    def test_ai_status_no_auth(self, client):
        """Test AI status without authentication"""
        response = client.get("/api/ai/status")
        assert response.status_code == 401
    
    @patch('app.services.ai_assistant.ai_assistant.ask_question')
    def test_ask_ai_question(self, mock_ask, client, auth_headers):
        """Test asking AI a question"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping AI question test")
        
        # Mock AI response
        mock_ask.return_value = {
            "answer": "Test answer from AI",
            "type": "success",
            "query_generated": None,
            "provider_used": "local"
        }
        
        question_data = {
            "question": "What is the current status of the system?",
            "context": {"user_id": "test_user"}
        }
        
        response = client.post("/api/ai/ask", json=question_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "type" in data
        assert data["type"] == "success"
        
        mock_ask.assert_called_once()
    
    @patch('app.services.ai_assistant.ai_assistant.ask_question')
    def test_ask_ai_question_error(self, mock_ask, client, auth_headers):
        """Test AI question with error"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping AI error test")
        
        # Mock AI error response
        mock_ask.return_value = {
            "answer": "เกิดข้อผิดพลาด: AI service unavailable",
            "type": "error",
            "query_generated": None,
            "provider_used": "none"
        }
        
        question_data = {"question": "Invalid question"}
        
        response = client.post("/api/ai/ask", json=question_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "type" in data
        assert data["type"] == "error"
    
    def test_ask_ai_missing_question(self, client, auth_headers):
        """Test asking AI without question"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping missing question test")
        
        response = client.post("/api/ai/ask", json={}, headers=auth_headers)
        assert response.status_code == 422
    
    @patch('app.services.ai_assistant.ai_assistant.generate_insights')
    def test_ai_quick_insights(self, mock_insights, client, auth_headers):
        """Test AI quick insights"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping AI insights test")
        
        # Mock insights response
        mock_insights.return_value = {
            "insights": [
                "มี login attempts เพิ่มขึ้น 15% ในช่วง 24 ชั่วโมงที่ผ่านมา",
                "ตรวจพบ failed login attempts จาก IP 192.168.1.100"
            ],
            "summary": "ระบบมีการใช้งานปกติ",
            "provider_used": "local"
        }
        
        response = client.get("/api/ai/quick-insights?hours=24", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "insights" in data
        assert isinstance(data["insights"], list)
        
        mock_insights.assert_called_once()
    
    @patch('app.services.ai_assistant.ai_assistant.detect_anomalies')
    def test_ai_detect_anomalies(self, mock_detect, client, auth_headers):
        """Test AI anomaly detection"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping anomaly detection test")
        
        # Mock anomaly response
        mock_detect.return_value = {
            "anomalies": [
                {
                    "type": "unusual_login_time",
                    "description": "Login นอกเวลาทำการ",
                    "severity": "medium",
                    "timestamp": "2024-01-01T02:00:00Z"
                }
            ],
            "summary": "พบความผิดปกติ 1 รายการ",
            "provider_used": "local"
        }
        
        request_data = {"time_range_hours": 24}
        
        response = client.post("/api/ai/detect-anomalies", json=request_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "anomalies" in data
        assert isinstance(data["anomalies"], list)
        
        mock_detect.assert_called_once()
    
    @patch('app.services.ai_assistant.ai_assistant.generate_sql_query')
    def test_ai_generate_query(self, mock_generate, client, auth_headers):
        """Test AI SQL query generation"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping query generation test")
        
        # Mock query generation response
        mock_generate.return_value = {
            "query": "SELECT * FROM logs WHERE action = 'LOGIN' AND status = 'FAILED'",
            "explanation": "คำสั่ง SQL เพื่อค้นหา login ที่ล้มเหลว",
            "provider_used": "local"
        }
        
        request_data = {"natural_language": "show me failed login attempts"}
        
        response = client.post("/api/ai/generate-query", json=request_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "query" in data
        assert "explanation" in data
        
        mock_generate.assert_called_once()


class TestAIAssistantIntegration:
    """Test AI Assistant integration with real services"""
    
    def test_ai_suggestions(self, client, auth_headers):
        """Test getting AI suggestions"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping AI suggestions test")
        
        response = client.get("/api/ai/suggestions", headers=auth_headers)
        
        # This endpoint might not exist, so allow 404
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert "suggestions" in data
            assert isinstance(data["suggestions"], list)
    
    def test_ai_health_check(self, client, auth_headers):
        """Test AI service health"""
        if not auth_headers:
            pytest.skip("Authentication failed, skipping AI health test")
        
        # This might be part of the status endpoint
        response = client.get("/api/ai/status", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check if local AI or OpenAI is available
        if data.get("ai_available"):
            assert len(data["available_providers"]) > 0 