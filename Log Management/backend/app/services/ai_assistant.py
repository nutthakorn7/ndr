"""
AI Assistant Service for Log Management
ใช้ OpenAI GPT เพื่อช่วยวิเคราะห์ log และตอบคำถามผู้ใช้
"""
import logging
import json
import re
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import openai
import tiktoken

from ..core.config import settings
from ..core.clickhouse import clickhouse_client
from ..utils.log_manager import LogManager
from .local_ai import hybrid_ai_client

logger = logging.getLogger(__name__)

class AIAssistant:
    """AI Assistant สำหรับการวิเคราะห์และตอบคำถามเกี่ยวกับ log"""
    
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.AI_MODEL
        self.max_tokens = settings.AI_MAX_TOKENS
        self.temperature = settings.AI_TEMPERATURE
        self.provider = getattr(settings, 'AI_PROVIDER', 'openai').lower()
        self.log_manager = LogManager()
        self.hybrid_client = hybrid_ai_client
        
        if self.api_key:
            openai.api_key = self.api_key
        else:
            logger.warning("OpenAI API key not configured")
        
        # Token counter สำหรับจำกัด context length
        try:
            self.encoding = tiktoken.encoding_for_model(self.model)
        except:
            self.encoding = tiktoken.get_encoding("cl100k_base")
    
    def count_tokens(self, text: str) -> int:
        """นับจำนวน tokens ในข้อความ"""
        return len(self.encoding.encode(text))
    
    def truncate_text(self, text: str, max_tokens: int = 3000) -> str:
        """ตัดข้อความให้ไม่เกิน max_tokens"""
        tokens = self.encoding.encode(text)
        if len(tokens) <= max_tokens:
            return text
        
        truncated_tokens = tokens[:max_tokens]
        return self.encoding.decode(truncated_tokens)
    
    async def ask_question(self, question: str, user_context: Dict = None) -> Dict[str, Any]:
        """ตอบคำถามเกี่ยวกับ log โดยใช้ AI"""
        try:
            # ตรวจสอบ AI providers ที่พร้อมใช้งาน
            available_providers = self.hybrid_client.get_available_providers()
            if not available_providers:
                return {
                    "answer": "AI Assistant ไม่พร้อมใช้งาน กรุณาตั้งค่า OpenAI API key หรือ Local AI model",
                    "type": "error",
                    "query_generated": None,
                    "provider_used": "none"
                }
            
            # วิเคราะห์คำถามและสร้าง context
            context = await self._build_context(question, user_context)
            
            # สร้าง prompt
            prompt = self._create_analysis_prompt(question, context)
            
            # เรียก AI (hybrid - จะเลือก provider ที่ดีที่สุด)
            response = await self._call_ai(prompt)
            
            # Parse response
            result = self._parse_ai_response(response, question)
            
            # เพิ่มข้อมูล provider ที่ใช้
            result["provider_used"] = self.hybrid_client.auto_select_provider()
            
            # Log การใช้งาน AI
            self.log_manager.log_info(f"AI Assistant question ({result['provider_used']}): {question[:100]}...")
            
            return result
            
        except Exception as e:
            logger.error(f"AI Assistant error: {e}")
            return {
                "answer": f"เกิดข้อผิดพลาด: {str(e)}",
                "type": "error",
                "query_generated": None,
                "provider_used": "error"
            }
    
    async def analyze_logs(self, filters: Dict = None, limit: int = 100) -> Dict[str, Any]:
        """วิเคราะห์ log และสรุปข้อมูลสำคัญ"""
        try:
            # ดึง log ล่าสุด
            logs = clickhouse_client.get_auth_logs(
                source_type=filters.get('source_type') if filters else None,
                status=filters.get('status') if filters else None,
                start_date=filters.get('start_date') if filters else datetime.now() - timedelta(hours=24),
                end_date=filters.get('end_date') if filters else None,
                limit=limit
            )
            
            if not logs:
                return {
                    "summary": "ไม่พบ log ในช่วงเวลาที่ระบุ",
                    "insights": [],
                    "anomalies": [],
                    "recommendations": []
                }
            
            # เตรียมข้อมูลสำหรับ AI
            log_summary = self._summarize_logs_for_ai(logs)
            
            # สร้าง prompt สำหรับวิเคราะห์
            prompt = self._create_analysis_prompt_for_logs(log_summary, filters)
            
            # เรียก AI
            response = await self._call_ai(prompt)
            
            # Parse ผลลัพธ์
            analysis = self._parse_log_analysis(response)
            
            self.log_manager.log_info(f"AI Log analysis completed for {len(logs)} logs")
            
            return analysis
            
        except Exception as e:
            logger.error(f"AI Log analysis error: {e}")
            return {
                "summary": f"เกิดข้อผิดพลาดในการวิเคราะห์: {str(e)}",
                "insights": [],
                "anomalies": [],
                "recommendations": []
            }
    
    async def generate_query(self, natural_language: str) -> Dict[str, Any]:
        """แปลงคำถามภาษาธรรมชาติเป็น SQL query สำหรับ ClickHouse"""
        try:
            # ตรวจสอบ AI providers
            available_providers = self.hybrid_client.get_available_providers()
            if not available_providers:
                return {
                    "query": None,
                    "explanation": "AI Assistant ไม่พร้อมใช้งาน",
                    "success": False,
                    "provider_used": "none"
                }
            
            # สร้าง prompt สำหรับ query generation
            prompt = self._create_query_generation_prompt(natural_language)
            
            # เรียก AI
            response = await self._call_ai(prompt)
            
            # Parse SQL query
            result = self._parse_query_response(response)
            result["provider_used"] = self.hybrid_client.auto_select_provider()
            
            return result
            
        except Exception as e:
            logger.error(f"Query generation error: {e}")
            return {
                "query": None,
                "explanation": f"เกิดข้อผิดพลาด: {str(e)}",
                "success": False,
                "provider_used": "error"
            }
    
    async def detect_anomalies(self, time_range_hours: int = 24) -> Dict[str, Any]:
        """ตรวจหา anomalies ใน log ด้วย AI"""
        try:
            # ดึงสถิติ log
            stats = clickhouse_client.get_auth_log_stats()
            
            # ดึงข้อมูล time series
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=time_range_hours)
            
            hourly_query = """
                SELECT 
                    toHour(timestamp) as hour,
                    status,
                    count() as count
                FROM authentication_logs 
                WHERE timestamp >= %(start_time)s AND timestamp <= %(end_time)s
                GROUP BY hour, status
                ORDER BY hour
            """
            
            result = clickhouse_client.execute_query(hourly_query, {
                'start_time': start_time,
                'end_time': end_time
            })
            
            hourly_data = [
                {"hour": row[0], "status": row[1], "count": row[2]}
                for row in result.result_rows
            ]
            
            # สร้าง prompt สำหรับตรวจจับ anomaly
            prompt = self._create_anomaly_detection_prompt(stats, hourly_data)
            
            # เรียก AI
            response = await self._call_ai(prompt)
            
            # Parse ผลลัพธ์
            anomalies = self._parse_anomaly_response(response)
            
            return anomalies
            
        except Exception as e:
            logger.error(f"Anomaly detection error: {e}")
            return {
                "anomalies_detected": False,
                "findings": [],
                "risk_level": "unknown",
                "recommendations": []
            }
    
    async def _build_context(self, question: str, user_context: Dict = None) -> Dict[str, Any]:
        """สร้าง context สำหรับคำถาม"""
        context = {
            "recent_stats": clickhouse_client.get_auth_log_stats(),
            "table_schema": self._get_table_schema_info(),
            "user_context": user_context or {}
        }
        
        # ถ้าคำถามเกี่ยวกับ log เฉพาะ ให้ดึงข้อมูลตัวอย่าง
        if any(keyword in question.lower() for keyword in ['ล่าสุด', 'recent', 'latest', 'วันนี้', 'today']):
            recent_logs = clickhouse_client.get_auth_logs(limit=10)
            context["recent_logs"] = recent_logs[:5]  # จำกัดข้อมูล
        
        return context
    
    def _get_table_schema_info(self) -> str:
        """ข้อมูล schema ของ table สำหรับ AI"""
        return """
        authentication_logs table schema:
        - id: String (unique identifier)
        - source_type: String (FIREWALL, PROXY, AD, SERVER)
        - source_name: String (device/server name)
        - source_ip: String (source IP address)
        - user_id: String (user identifier)
        - username: String (username)
        - domain: String (user domain)
        - action: String (LOGIN, LOGOUT, AUTH_FAILED, etc.)
        - status: String (SUCCESS, FAILED, PENDING)
        - auth_method: String (PASSWORD, SSO, 2FA, etc.)
        - client_ip: String (client IP address)
        - timestamp: DateTime (log timestamp)
        - created_at: DateTime (record creation time)
        """
    
    def _create_analysis_prompt(self, question: str, context: Dict) -> str:
        """สร้าง prompt สำหรับการวิเคราะห์คำถาม"""
        context_text = self.truncate_text(json.dumps(context, default=str, ensure_ascii=False), 2000)
        
        prompt = f"""
คุณเป็น AI Assistant ผู้เชี่ยวชาญในการวิเคราะห์ Security Log และ Authentication Log

ข้อมูล Context:
{context_text}

คำถามจากผู้ใช้: {question}

กรุณาตอบคำถามอย่างละเอียดและแม่นยำ โดย:
1. วิเคราะห์ข้อมูลจาก context ที่ให้มา
2. ให้คำตอบที่เป็นประโยชน์และใช้งานได้จริง
3. หากต้องการข้อมูลเพิ่มเติม ให้แนะนำ query หรือการกรองข้อมูล
4. ตอบเป็นภาษาไทยอย่างชัดเจนและเป็นมิตร

หากคำถามเกี่ยวกับการสร้าง query ให้สร้าง ClickHouse SQL query ที่เหมาะสม

Response format (JSON):
{{
    "answer": "คำตอบที่ละเอียด",
    "type": "answer|query|analysis",
    "query_generated": "SQL query (ถ้ามี)",
    "recommendations": ["คำแนะนำ 1", "คำแนะนำ 2"]
}}
"""
        return prompt
    
    def _create_analysis_prompt_for_logs(self, log_summary: str, filters: Dict = None) -> str:
        """สร้าง prompt สำหรับวิเคราะห์ logs"""
        filter_text = json.dumps(filters, ensure_ascii=False) if filters else "ไม่มีการกรอง"
        
        prompt = f"""
คุณเป็น Security Analyst ผู้เชี่ยวชาญ กรุณาวิเคราะห์ข้อมูล authentication log ต่อไปนี้:

การกรองข้อมูล: {filter_text}

ข้อมูล Log (สรุป):
{log_summary}

กรุณาวิเคราะห์และให้ข้อมูลในรูปแบบ JSON:
{{
    "summary": "สรุปสถานการณ์โดยรวม",
    "insights": [
        "ข้อมูลเชิงลึกที่สำคัญ 1",
        "ข้อมูลเชิงลึกที่สำคัญ 2"
    ],
    "anomalies": [
        "สิ่งผิดปกติหรือน่าสงสัย 1",
        "สิ่งผิดปกติหรือน่าสงสัย 2"
    ],
    "recommendations": [
        "คำแนะนำการแก้ไขหรือติดตาม 1",
        "คำแนะนำการแก้ไขหรือติดตาม 2"
    ],
    "risk_level": "LOW|MEDIUM|HIGH|CRITICAL"
}}

ให้ความสำคัญกับ:
- Failed login attempts
- Unusual IP addresses or patterns
- Authentication method anomalies
- Time-based patterns
- High-frequency activities
"""
        return prompt
    
    def _create_query_generation_prompt(self, natural_language: str) -> str:
        """สร้าง prompt สำหรับ query generation"""
        schema_info = self._get_table_schema_info()
        
        prompt = f"""
คุณเป็นผู้เชี่ยวชาญ ClickHouse SQL โปรดแปลงคำถามภาษาธรรมชาติเป็น SQL query

Table Schema:
{schema_info}

คำถาม: {natural_language}

กรุณาสร้าง ClickHouse SQL query ที่:
1. ถูกต้องตาม syntax ของ ClickHouse
2. มีประสิทธิภาพและใช้ index ที่เหมาะสม
3. จำกัดผลลัพธ์ด้วย LIMIT หากจำเป็น
4. ใช้ฟังก์ชัน ClickHouse ที่เหมาะสม (เช่น toYYYYMM, toHour)

Response format (JSON):
{{
    "query": "SELECT ... FROM authentication_logs ...",
    "explanation": "อธิบายว่า query นี้ทำอะไร",
    "success": true
}}

หากไม่สามารถสร้าง query ได้ ให้ response:
{{
    "query": null,
    "explanation": "เหตุผลที่ไม่สามารถสร้าง query ได้",
    "success": false
}}
"""
        return prompt
    
    def _create_anomaly_detection_prompt(self, stats: Dict, hourly_data: List[Dict]) -> str:
        """สร้าง prompt สำหรับตรวจจับ anomaly"""
        stats_text = json.dumps(stats, default=str, ensure_ascii=False)
        hourly_text = json.dumps(hourly_data, ensure_ascii=False)
        
        prompt = f"""
คุณเป็น Security Analyst ผู้เชี่ยวชาญในการตรวจจับ anomalies ในระบบ authentication

ข้อมูลสถิติรวม:
{stats_text}

ข้อมูลรายชั่วโมง:
{hourly_text}

กรุณาวิเคราะห์และตรวจหา anomalies:

Response format (JSON):
{{
    "anomalies_detected": true/false,
    "findings": [
        "รายงานการพบ anomaly 1",
        "รายงานการพบ anomaly 2"
    ],
    "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
    "recommendations": [
        "คำแนะนำการดำเนินการ 1",
        "คำแนะนำการดำเนินการ 2"
    ],
    "patterns": [
        "รูปแบบที่พบ 1",
        "รูปแบบที่พบ 2"
    ]
}}

ให้ความสำคัญกับ:
- Spike ในจำนวน failed logins
- การเข้าถึงในช่วงเวลาผิดปกติ
- IP addresses ที่ไม่ธรรมดา
- Volume ที่เพิ่มขึ้นผิดปกติ
"""
        return prompt
    
    async def _call_ai(self, prompt: str) -> str:
        """เรียก AI (hybrid - OpenAI หรือ Local)"""
        try:
            system_prompt = "คุณเป็น AI Assistant ผู้เชี่ยวชาญด้าน Cybersecurity และ Log Analysis"
            response = await self.hybrid_client.generate_response(prompt, system_prompt)
            return response
            
        except Exception as e:
            logger.error(f"AI API call failed: {e}")
            raise e
    
    async def _call_openai(self, prompt: str) -> str:
        """เรียก OpenAI API (เก็บไว้เพื่อ backward compatibility)"""
        try:
            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": "คุณเป็น AI Assistant ผู้เชี่ยวชาญด้าน Cybersecurity และ Log Analysis"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise e
    
    def _parse_ai_response(self, response: str, question: str) -> Dict[str, Any]:
        """Parse AI response"""
        try:
            # ลองแปลง JSON
            if response.strip().startswith('{'):
                return json.loads(response)
            
            # ถ้าไม่ใช่ JSON ให้สร้างเป็น dict
            return {
                "answer": response,
                "type": "answer",
                "query_generated": None,
                "recommendations": []
            }
            
        except:
            return {
                "answer": response,
                "type": "answer", 
                "query_generated": None,
                "recommendations": []
            }
    
    def _parse_log_analysis(self, response: str) -> Dict[str, Any]:
        """Parse log analysis response"""
        try:
            if response.strip().startswith('{'):
                return json.loads(response)
                
            # Default structure
            return {
                "summary": response,
                "insights": [],
                "anomalies": [],
                "recommendations": [],
                "risk_level": "MEDIUM"
            }
            
        except:
            return {
                "summary": response,
                "insights": [],
                "anomalies": [],
                "recommendations": [],
                "risk_level": "MEDIUM"
            }
    
    def _parse_query_response(self, response: str) -> Dict[str, Any]:
        """Parse query generation response"""
        try:
            if response.strip().startswith('{'):
                return json.loads(response)
                
            # ถ้าไม่ใช่ JSON แต่มี SQL
            if 'SELECT' in response.upper():
                return {
                    "query": response,
                    "explanation": "Generated SQL query",
                    "success": True
                }
            
            return {
                "query": None,
                "explanation": response,
                "success": False
            }
            
        except:
            return {
                "query": None,
                "explanation": "ไม่สามารถแปลงคำถามเป็น SQL ได้",
                "success": False
            }
    
    def _parse_anomaly_response(self, response: str) -> Dict[str, Any]:
        """Parse anomaly detection response"""
        try:
            if response.strip().startswith('{'):
                return json.loads(response)
                
            return {
                "anomalies_detected": False,
                "findings": [response],
                "risk_level": "MEDIUM",
                "recommendations": [],
                "patterns": []
            }
            
        except:
            return {
                "anomalies_detected": False,
                "findings": [response],
                "risk_level": "MEDIUM", 
                "recommendations": [],
                "patterns": []
            }
    
    def _summarize_logs_for_ai(self, logs: List[Dict], max_logs: int = 50) -> str:
        """สรุป logs สำหรับส่งให้ AI"""
        if not logs:
            return "ไม่มี log"
        
        # จำกัดจำนวน logs
        limited_logs = logs[:max_logs]
        
        # สรุปข้อมูลสำคัญ
        summary = {
            "total_logs": len(logs),
            "analyzed_logs": len(limited_logs),
            "time_range": {
                "start": limited_logs[-1].get('timestamp', '') if limited_logs else '',
                "end": limited_logs[0].get('timestamp', '') if limited_logs else ''
            },
            "status_distribution": {},
            "source_distribution": {},
            "top_users": {},
            "top_ips": {},
            "sample_logs": []
        }
        
        # คำนวณสถิติ
        for log in limited_logs:
            status = log.get('status', 'UNKNOWN')
            source = log.get('source_type', 'UNKNOWN')
            user = log.get('username', 'UNKNOWN')
            ip = log.get('client_ip', 'UNKNOWN')
            
            summary["status_distribution"][status] = summary["status_distribution"].get(status, 0) + 1
            summary["source_distribution"][source] = summary["source_distribution"].get(source, 0) + 1
            summary["top_users"][user] = summary["top_users"].get(user, 0) + 1
            summary["top_ips"][ip] = summary["top_ips"].get(ip, 0) + 1
        
        # เพิ่มตัวอย่าง logs (แค่ field สำคัญ)
        for log in limited_logs[:10]:
            sample = {
                "timestamp": str(log.get('timestamp', '')),
                "action": log.get('action', ''),
                "status": log.get('status', ''),
                "username": log.get('username', ''),
                "client_ip": log.get('client_ip', ''),
                "source_type": log.get('source_type', '')
            }
            summary["sample_logs"].append(sample)
        
        return json.dumps(summary, default=str, ensure_ascii=False)

# Global AI Assistant instance
ai_assistant = AIAssistant() 