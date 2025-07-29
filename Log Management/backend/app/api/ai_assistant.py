"""
AI Assistant API Endpoints
API สำหรับใช้งาน AI Assistant ในการวิเคราะห์ log และตอบคำถาม
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import logging

from ..services.ai_assistant import ai_assistant
from ..utils.log_manager import LogManager
from ..core.config import settings
from .auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Global objects
log_manager = LogManager()

# Pydantic Models for Request/Response
class QuestionRequest(BaseModel):
    question: str
    context: Optional[Dict[str, Any]] = None

class QueryGenerationRequest(BaseModel):
    natural_language: str

class LogAnalysisRequest(BaseModel):
    filters: Optional[Dict[str, Any]] = None
    limit: Optional[int] = 100

class AnomalyDetectionRequest(BaseModel):
    time_range_hours: Optional[int] = 24

@router.post("/ask")
async def ask_ai_assistant(
    request: QuestionRequest,
    current_user: Dict = Depends(get_current_user)
):
    """ถามคำถาม AI Assistant เกี่ยวกับ log"""
    try:
        # เพิ่ม user context
        user_context = request.context or {}
        user_context["user_id"] = current_user.get("username")
        user_context["timestamp"] = datetime.now().isoformat()
        
        # เรียก AI Assistant
        result = await ai_assistant.ask_question(
            question=request.question,
            user_context=user_context
        )
        
        # Log การใช้งาน
        log_manager.log_info(f"AI Assistant used by {current_user.get('username')}: {request.question[:50]}...")
        
        return {
            "success": True,
            "result": result,
            "user": current_user.get("username"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"AI Assistant ask error: {e}")
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาด: {str(e)}")

@router.post("/analyze")
async def analyze_logs_with_ai(
    request: LogAnalysisRequest,
    current_user: Dict = Depends(get_current_user)
):
    """วิเคราะห์ log ด้วย AI"""
    try:
        # วิเคราะห์ log
        analysis = await ai_assistant.analyze_logs(
            filters=request.filters,
            limit=request.limit
        )
        
        # Log การใช้งาน
        log_manager.log_info(f"AI Log analysis by {current_user.get('username')}: {request.filters}")
        
        return {
            "success": True,
            "analysis": analysis,
            "filters_applied": request.filters,
            "user": current_user.get("username"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"AI Log analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการวิเคราะห์: {str(e)}")

@router.post("/generate-query")
async def generate_sql_query(
    request: QueryGenerationRequest,
    current_user: Dict = Depends(get_current_user)
):
    """แปลงคำถามภาษาธรรมชาติเป็น SQL query"""
    try:
        # Generate query
        result = await ai_assistant.generate_query(request.natural_language)
        
        # Log การใช้งาน
        log_manager.log_info(f"Query generation by {current_user.get('username')}: {request.natural_language[:50]}...")
        
        return {
            "success": result.get("success", False),
            "query": result.get("query"),
            "explanation": result.get("explanation"),
            "natural_language": request.natural_language,
            "user": current_user.get("username"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Query generation error: {e}")
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการสร้าง query: {str(e)}")

@router.post("/detect-anomalies")
async def detect_anomalies_with_ai(
    request: AnomalyDetectionRequest,
    current_user: Dict = Depends(get_current_user)
):
    """ตรวจหา anomalies ใน log ด้วย AI"""
    try:
        # ตรวจจับ anomalies
        anomalies = await ai_assistant.detect_anomalies(
            time_range_hours=request.time_range_hours
        )
        
        # Log การใช้งาน
        log_manager.log_info(f"Anomaly detection by {current_user.get('username')}: {request.time_range_hours}h range")
        
        return {
            "success": True,
            "anomalies": anomalies,
            "time_range_hours": request.time_range_hours,
            "user": current_user.get("username"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการตรวจจับ anomaly: {str(e)}")

@router.get("/quick-insights")
async def get_quick_insights(
    hours: int = Query(24, ge=1, le=168, description="จำนวนชั่วโมงย้อนหลัง"),
    current_user: Dict = Depends(get_current_user)
):
    """ได้ข้อมูลเชิงลึกแบบด่วนจาก AI"""
    try:
        # เตรียม filters สำหรับ quick insights
        filters = {
            "start_date": datetime.now() - timedelta(hours=hours),
            "end_date": datetime.now()
        }
        
        # วิเคราะห์ log
        analysis = await ai_assistant.analyze_logs(filters=filters, limit=200)
        
        # ตรวจจับ anomalies
        anomalies = await ai_assistant.detect_anomalies(time_range_hours=hours)
        
        # รวมผลลัพธ์
        insights = {
            "time_range": f"{hours} ชั่วโมงที่ผ่านมา",
            "summary": analysis.get("summary", ""),
            "key_insights": analysis.get("insights", [])[:3],  # แค่ 3 ข้อแรก
            "anomalies_detected": anomalies.get("anomalies_detected", False),
            "risk_level": anomalies.get("risk_level", "UNKNOWN"),
            "top_recommendations": analysis.get("recommendations", [])[:3]  # แค่ 3 ข้อแรก
        }
        
        # Log การใช้งาน
        log_manager.log_info(f"Quick insights by {current_user.get('username')}: {hours}h")
        
        return {
            "success": True,
            "insights": insights,
            "user": current_user.get("username"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Quick insights error: {e}")
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการสร้าง insights: {str(e)}")

@router.get("/status")
async def get_ai_status(
    current_user: Dict = Depends(get_current_user)
):
    """ตรวจสอบสถานะ AI Assistant"""
    try:
        # ดึงสถานะจาก hybrid AI client
        from ..services.local_ai import hybrid_ai_client
        status = hybrid_ai_client.get_status()
        
        # เพิ่มข้อมูลเพิ่มเติม
        available_providers = status["available_providers"]
        ai_available = len(available_providers) > 0
        
        enhanced_status = {
            "ai_available": ai_available,
            "current_provider": status["current_provider"],
            "recommended_provider": status["recommended_provider"],
            "available_providers": available_providers,
            "openai": status["openai"],
            "local": status["local"],
            "config": {
                "ai_provider": settings.AI_PROVIDER,
                "max_tokens": settings.AI_MAX_TOKENS,
                "temperature": settings.AI_TEMPERATURE
            },
            "features": {
                "question_answering": ai_available,
                "log_analysis": ai_available,
                "query_generation": ai_available,
                "anomaly_detection": ai_available
            }
        }
        
        # สร้างข้อความแสดงสถานะ
        if not ai_available:
            enhanced_status["message"] = "AI Assistant ไม่พร้อมใช้งาน กรุณาตั้งค่า OpenAI API key หรือเปิด Local AI (Ollama)"
        elif status["recommended_provider"] == "local":
            enhanced_status["message"] = f"AI Assistant พร้อมใช้งาน (Local AI: {status['local']['model']})"
        elif status["recommended_provider"] == "openai":
            enhanced_status["message"] = f"AI Assistant พร้อมใช้งาน (OpenAI: {status['openai']['model']})"
        else:
            enhanced_status["message"] = "AI Assistant พร้อมใช้งาน"
        
        return enhanced_status
        
    except Exception as e:
        logger.error(f"AI status check error: {e}")
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการตรวจสอบสถานะ: {str(e)}")

@router.get("/suggestions")
async def get_ai_suggestions(
    current_user: Dict = Depends(get_current_user)
):
    """ได้คำแนะนำคำถามที่น่าสนใจจาก AI"""
    try:
        # คำถามตัวอย่างที่ผู้ใช้สามารถถามได้
        suggestions = [
            {
                "category": "การวิเคราะห์เบื้องต้น",
                "questions": [
                    "มี failed login กี่ครั้งในวันนี้?",
                    "IP ไหนที่ล็อกอินผิดพลาดบ่อยที่สุด?",
                    "ช่วยวิเคราะห์ log 24 ชั่วโมงที่ผ่านมา",
                    "มีเหตุการณ์ผิดปกติอะไรบ้าง?"
                ]
            },
            {
                "category": "การสร้าง Query",
                "questions": [
                    "หา login attempts จาก IP 192.168.1.1",
                    "แสดงสถิติ login แยกตาม hour วันนี้",
                    "หา users ที่ login ล้มเหลวมากกว่า 5 ครั้ง",
                    "แสดง top 10 IPs ที่มี activity มากที่สุด"
                ]
            },
            {
                "category": "Security Analysis",
                "questions": [
                    "ตรวจหา brute force attacks",
                    "มี suspicious activities อะไรบ้าง?",
                    "วิเคราะห์รูปแบบการ login ที่ผิดปกติ",
                    "แนะนำมาตรการความปลอดภัยเพิ่มเติม"
                ]
            },
            {
                "category": "Compliance & Reporting",
                "questions": [
                    "สร้าง report สำหรับ compliance audit",
                    "สรุปกิจกรรมการเข้าถึงรายสัปดาห์",
                    "มีการเข้าถึงข้อมูลนอกเวลาทำงานหรือไม่?",
                    "วิเคราะห์ trends การใช้งานระบบ"
                ]
            }
        ]
        
        return {
            "success": True,
            "suggestions": suggestions,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"AI suggestions error: {e}")
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาด: {str(e)}")

@router.post("/feedback")
async def submit_ai_feedback(
    feedback: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """รับ feedback เกี่ยวกับ AI Assistant"""
    try:
        # บันทึก feedback
        feedback_log = {
            "user": current_user.get("username"),
            "timestamp": datetime.now().isoformat(),
            "feedback": feedback,
            "type": "ai_assistant_feedback"
        }
        
        # Log feedback
        log_manager.log_info(f"AI Assistant feedback from {current_user.get('username')}: {feedback.get('rating', 'N/A')}")
        
        return {
            "success": True,
            "message": "ขอบคุณสำหรับ feedback ของคุณ",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"AI feedback error: {e}")
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาด: {str(e)}")

@router.get("/chat-history")
async def get_chat_history(
    limit: int = Query(10, ge=1, le=50, description="จำนวน chat history ที่ต้องการ"),
    current_user: Dict = Depends(get_current_user)
):
    """ดึง chat history ของผู้ใช้ (ถ้ามีการเก็บไว้)"""
    try:
        # ในการ implement จริง อาจต้องเก็บ chat history ใน database
        # สำหรับตอนนี้ return empty array
        
        return {
            "success": True,
            "chat_history": [],
            "message": "Chat history feature จะพัฒนาในอนาคต",
            "user": current_user.get("username"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Chat history error: {e}")
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาด: {str(e)}")

# Health check endpoint สำหรับ AI Assistant
@router.get("/health")
async def ai_health_check():
    """ตรวจสอบสุขภาพของ AI Assistant service"""
    try:
        health_status = {
            "service": "AI Assistant",
            "status": "healthy" if settings.OPENAI_API_KEY else "degraded",
            "openai_configured": bool(settings.OPENAI_API_KEY),
            "model": settings.AI_MODEL,
            "timestamp": datetime.now().isoformat()
        }
        
        return health_status
        
    except Exception as e:
        return {
            "service": "AI Assistant",
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        } 