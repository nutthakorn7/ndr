"""
Local AI Client for Ollama and Local Models
Alternative to OpenAI for privacy and cost savings
"""
import logging
import json
import requests
from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio

from ..core.config import settings

logger = logging.getLogger(__name__)

class LocalAIClient:
    """Local AI Client สำหรับ Ollama และ local models"""
    
    def __init__(self):
        self.ollama_host = getattr(settings, 'OLLAMA_HOST', 'localhost')
        self.ollama_port = getattr(settings, 'OLLAMA_PORT', 11434)
        self.local_model = getattr(settings, 'LOCAL_MODEL', 'llama3.2:3b')
        self.base_url = f"http://{self.ollama_host}:{self.ollama_port}"
        self.timeout = 120  # 2 minutes timeout for local models
    
    def test_connection(self) -> bool:
        """ทดสอบการเชื่อมต่อ Ollama"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Ollama connection test failed: {e}")
            return False
    
    def list_models(self) -> List[str]:
        """ดึงรายการ models ที่มีใน Ollama"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=10)
            if response.status_code == 200:
                data = response.json()
                return [model['name'] for model in data.get('models', [])]
            return []
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return []
    
    def pull_model(self, model_name: str) -> bool:
        """ดาวน์โหลด model (ถ้ายังไม่มี)"""
        try:
            logger.info(f"Pulling model: {model_name}")
            response = requests.post(
                f"{self.base_url}/api/pull",
                json={"name": model_name},
                timeout=600  # 10 minutes for model download
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to pull model {model_name}: {e}")
            return False
    
    def ensure_model_available(self, model_name: str = None) -> bool:
        """ตรวจสอบและดาวน์โหลด model ถ้าจำเป็น"""
        model = model_name or self.local_model
        
        # ตรวจสอบว่ามี model อยู่แล้วหรือไม่
        available_models = self.list_models()
        if model in available_models:
            return True
        
        # ถ้าไม่มี ให้ดาวน์โหลด
        logger.info(f"Model {model} not found, downloading...")
        return self.pull_model(model)
    
    async def generate_response(self, prompt: str, model_name: str = None, system_prompt: str = None) -> str:
        """สร้างคำตอบจาก local model"""
        try:
            model = model_name or self.local_model
            
            # ตรวจสอบ model
            if not self.ensure_model_available(model):
                raise Exception(f"Model {model} not available and failed to download")
            
            # เตรียม payload
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.9,
                    "top_k": 40,
                    "num_ctx": 4096,
                }
            }
            
            # เพิ่ม system prompt ถ้ามี
            if system_prompt:
                payload["system"] = system_prompt
            
            # เรียก Ollama API
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('response', '')
            else:
                raise Exception(f"Ollama API error: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Local AI generation failed: {e}")
            raise e
    
    async def chat_completion(self, messages: List[Dict[str, str]], model_name: str = None) -> str:
        """Chat completion style API (คล้าย OpenAI)"""
        try:
            model = model_name or self.local_model
            
            # แปลง messages format เป็น single prompt
            prompt_parts = []
            system_prompt = None
            
            for message in messages:
                role = message.get('role', 'user')
                content = message.get('content', '')
                
                if role == 'system':
                    system_prompt = content
                elif role == 'user':
                    prompt_parts.append(f"User: {content}")
                elif role == 'assistant':
                    prompt_parts.append(f"Assistant: {content}")
            
            # รวม prompt
            full_prompt = "\n".join(prompt_parts)
            if not full_prompt.endswith("Assistant:"):
                full_prompt += "\nAssistant:"
            
            return await self.generate_response(full_prompt, model, system_prompt)
            
        except Exception as e:
            logger.error(f"Chat completion failed: {e}")
            raise e
    
    def get_model_info(self, model_name: str = None) -> Dict[str, Any]:
        """ดึงข้อมูล model"""
        try:
            model = model_name or self.local_model
            response = requests.post(
                f"{self.base_url}/api/show",
                json={"name": model},
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            return {}
            
        except Exception as e:
            logger.error(f"Failed to get model info: {e}")
            return {}
    
    def estimate_tokens(self, text: str) -> int:
        """ประมาณการจำนวน tokens (สำหรับ local models)"""
        # ประมาณการง่ายๆ: 1 token ≈ 4 characters
        return len(text) // 4
    
    def truncate_text(self, text: str, max_tokens: int = 3000) -> str:
        """ตัดข้อความให้ไม่เกิน max_tokens"""
        estimated_tokens = self.estimate_tokens(text)
        if estimated_tokens <= max_tokens:
            return text
        
        # ตัดข้อความตามสัดส่วน
        ratio = max_tokens / estimated_tokens
        target_length = int(len(text) * ratio)
        return text[:target_length]

class HybridAIClient:
    """Hybrid AI Client ที่รองรับทั้ง OpenAI และ Local AI"""
    
    def __init__(self):
        self.provider = getattr(settings, 'AI_PROVIDER', 'openai').lower()
        self.openai_available = bool(getattr(settings, 'OPENAI_API_KEY', ''))
        self.local_client = LocalAIClient()
        
        # Import OpenAI ถ้ามี API key
        if self.openai_available:
            try:
                import openai
                self.openai = openai
                self.openai.api_key = settings.OPENAI_API_KEY
            except ImportError:
                logger.warning("OpenAI library not available")
                self.openai_available = False
    
    def get_available_providers(self) -> List[str]:
        """ดึงรายการ providers ที่พร้อมใช้งาน"""
        providers = []
        
        if self.openai_available:
            providers.append('openai')
        
        if self.local_client.test_connection():
            providers.append('local')
        
        return providers
    
    def auto_select_provider(self) -> str:
        """เลือก provider อัตโนมัติ"""
        available = self.get_available_providers()
        
        # ลำดับความสำคัญ: local > openai
        if 'local' in available:
            return 'local'
        elif 'openai' in available:
            return 'openai'
        else:
            return 'none'
    
    async def generate_response(self, prompt: str, system_prompt: str = None, provider: str = None) -> str:
        """สร้างคำตอบจาก AI provider ที่เลือก"""
        selected_provider = provider or self.provider
        
        # ถ้า provider ที่เลือกไม่พร้อมใช้งาน ให้เลือกอัตโนมัติ
        if selected_provider not in self.get_available_providers():
            selected_provider = self.auto_select_provider()
        
        if selected_provider == 'local':
            return await self._generate_local_response(prompt, system_prompt)
        elif selected_provider == 'openai':
            return await self._generate_openai_response(prompt, system_prompt)
        else:
            raise Exception("No AI provider available")
    
    async def _generate_local_response(self, prompt: str, system_prompt: str = None) -> str:
        """สร้างคำตอบจาก Local AI"""
        return await self.local_client.generate_response(prompt, system_prompt=system_prompt)
    
    async def _generate_openai_response(self, prompt: str, system_prompt: str = None) -> str:
        """สร้างคำตอบจาก OpenAI"""
        try:
            messages = []
            
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            
            messages.append({"role": "user", "content": prompt})
            
            response = await self.openai.ChatCompletion.acreate(
                model=settings.AI_MODEL,
                messages=messages,
                max_tokens=settings.AI_MAX_TOKENS,
                temperature=settings.AI_TEMPERATURE
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise e
    
    def get_status(self) -> Dict[str, Any]:
        """ดึงสถานะของ AI providers"""
        status = {
            "current_provider": self.provider,
            "available_providers": self.get_available_providers(),
            "recommended_provider": self.auto_select_provider(),
            "openai": {
                "available": self.openai_available,
                "model": getattr(settings, 'AI_MODEL', 'N/A') if self.openai_available else None
            },
            "local": {
                "available": self.local_client.test_connection(),
                "host": f"{self.local_client.ollama_host}:{self.local_client.ollama_port}",
                "model": self.local_client.local_model,
                "available_models": self.local_client.list_models() if self.local_client.test_connection() else []
            }
        }
        
        return status

# Global hybrid AI client instance
hybrid_ai_client = HybridAIClient() 