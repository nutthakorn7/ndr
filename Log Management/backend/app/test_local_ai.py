#!/usr/bin/env python3
"""
Test Local AI Integration
ทดสอบการใช้งาน Local AI models กับ Ollama
"""
import sys
import os
import asyncio
import time
from datetime import datetime

# เพิ่ม path สำหรับ import module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.local_ai import LocalAIClient, HybridAIClient
from app.core.config import settings

def test_ollama_connection():
    """ทดสอบการเชื่อมต่อ Ollama"""
    print("🔗 ทดสอบการเชื่อมต่อ Ollama...")
    
    client = LocalAIClient()
    
    # ตรวจสอบการเชื่อมต่อ
    connection_ok = client.test_connection()
    print(f"  การเชื่อมต่อ: {'✅ สำเร็จ' if connection_ok else '❌ ล้มเหลว'}")
    
    if connection_ok:
        print(f"  Ollama URL: {client.base_url}")
        print(f"  Default Model: {client.local_model}")
    
    return connection_ok

def test_model_management():
    """ทดสอบการจัดการ models"""
    print("\n📦 ทดสอบการจัดการ Models...")
    
    client = LocalAIClient()
    
    # ดึงรายการ models
    models = client.list_models()
    print(f"  Models ที่มีอยู่: {len(models)} models")
    for model in models:
        print(f"    - {model}")
    
    # ตรวจสอบ default model
    default_model = client.local_model
    model_available = client.ensure_model_available(default_model)
    print(f"  Default model ({default_model}): {'✅ พร้อมใช้งาน' if model_available else '❌ ไม่พร้อม'}")
    
    return len(models) > 0

async def test_text_generation():
    """ทดสอบการสร้างข้อความ"""
    print("\n💬 ทดสอบการสร้างข้อความ...")
    
    client = LocalAIClient()
    
    try:
        # ทดสอบ prompt ง่ายๆ
        prompt = "สวัสดี ผมคือ AI Assistant สำหรับระบบ Log Management"
        start_time = time.time()
        
        print(f"  Prompt: {prompt}")
        print("  กำลังสร้างคำตอบ...")
        
        response = await client.generate_response(prompt)
        duration = time.time() - start_time
        
        print(f"  คำตอบ: {response[:100]}{'...' if len(response) > 100 else ''}")
        print(f"  เวลาที่ใช้: {duration:.2f} วินาที")
        
        return len(response) > 0
        
    except Exception as e:
        print(f"  ❌ เกิดข้อผิดพลาด: {e}")
        return False

async def test_chat_completion():
    """ทดสอบ chat completion API"""
    print("\n💭 ทดสอบ Chat Completion...")
    
    client = LocalAIClient()
    
    try:
        messages = [
            {"role": "system", "content": "คุณเป็น AI Assistant ผู้เชี่ยวชาญด้าน cybersecurity"},
            {"role": "user", "content": "วิเคราะห์ log ที่มี failed login จำนวนมาก"}
        ]
        
        start_time = time.time()
        response = await client.chat_completion(messages)
        duration = time.time() - start_time
        
        print(f"  คำตอบ: {response[:100]}{'...' if len(response) > 100 else ''}")
        print(f"  เวลาที่ใช้: {duration:.2f} วินาที")
        
        return len(response) > 0
        
    except Exception as e:
        print(f"  ❌ เกิดข้อผิดพลาด: {e}")
        return False

def test_hybrid_ai_client():
    """ทดสอบ Hybrid AI Client"""
    print("\n🔀 ทดสอบ Hybrid AI Client...")
    
    hybrid = HybridAIClient()
    
    # ตรวจสอบ providers ที่พร้อมใช้งาน
    providers = hybrid.get_available_providers()
    print(f"  Providers ที่พร้อมใช้งาน: {providers}")
    
    # ตรวจสอบการเลือก provider อัตโนมัติ
    recommended = hybrid.auto_select_provider()
    print(f"  Provider ที่แนะนำ: {recommended}")
    
    # ดึงสถานะรายละเอียด
    status = hybrid.get_status()
    print(f"  สถานะ OpenAI: {'✅' if status['openai']['available'] else '❌'}")
    print(f"  สถานะ Local AI: {'✅' if status['local']['available'] else '❌'}")
    
    return len(providers) > 0

async def test_hybrid_generation():
    """ทดสอบการสร้างข้อความด้วย Hybrid Client"""
    print("\n🤖 ทดสอบ Hybrid Text Generation...")
    
    hybrid = HybridAIClient()
    
    try:
        prompt = "สรุปสถานการณ์ security log ในระบบ"
        system_prompt = "คุณเป็น Security Analyst ผู้เชี่ยวชาญ"
        
        start_time = time.time()
        response = await hybrid.generate_response(prompt, system_prompt)
        duration = time.time() - start_time
        
        provider_used = hybrid.auto_select_provider()
        
        print(f"  Provider ที่ใช้: {provider_used}")
        print(f"  คำตอบ: {response[:150]}{'...' if len(response) > 150 else ''}")
        print(f"  เวลาที่ใช้: {duration:.2f} วินาที")
        
        return len(response) > 0
        
    except Exception as e:
        print(f"  ❌ เกิดข้อผิดพลาด: {e}")
        return False

def test_token_estimation():
    """ทดสอบการประมาณ tokens"""
    print("\n🔢 ทดสอบการประมาณ Tokens...")
    
    client = LocalAIClient()
    
    test_texts = [
        "Hello world",
        "ข้อความทดสอบภาษาไทย",
        "This is a longer text that should have more tokens than the previous examples."
    ]
    
    for text in test_texts:
        tokens = client.estimate_tokens(text)
        print(f"  '{text[:30]}...': {tokens} tokens")
    
    # ทดสอบการตัดข้อความ
    long_text = "This is a very long text. " * 100
    original_tokens = client.estimate_tokens(long_text)
    truncated = client.truncate_text(long_text, max_tokens=50)
    truncated_tokens = client.estimate_tokens(truncated)
    
    print(f"  ข้อความยาว: {original_tokens} tokens -> ตัดเหลือ: {truncated_tokens} tokens")
    
    return True

async def test_performance_comparison():
    """เปรียบเทียบประสิทธิภาพ Local vs OpenAI"""
    print("\n⚡ เปรียบเทียบประสิทธิภาพ...")
    
    hybrid = HybridAIClient()
    providers = hybrid.get_available_providers()
    
    prompt = "วิเคราะห์ authentication log และบอกสถานการณ์ความปลอดภัย"
    system_prompt = "คุณเป็น Security Analyst"
    
    results = {}
    
    for provider in providers:
        if provider in ['local', 'openai']:
            try:
                print(f"  ทดสอบ {provider}...")
                start_time = time.time()
                
                response = await hybrid.generate_response(prompt, system_prompt, provider)
                duration = time.time() - start_time
                
                results[provider] = {
                    'duration': duration,
                    'response_length': len(response),
                    'success': True
                }
                
                print(f"    ⏱️  เวลา: {duration:.2f}s")
                print(f"    📝 ความยาว: {len(response)} characters")
                
            except Exception as e:
                results[provider] = {
                    'success': False,
                    'error': str(e)
                }
                print(f"    ❌ ล้มเหลว: {e}")
    
    # สรุปผลการเปรียบเทียบ
    if len(results) > 1:
        print(f"\n📊 สรุปการเปรียบเทียบ:")
        fastest = min([r for r in results.values() if r.get('success')], 
                     key=lambda x: x.get('duration', float('inf')), default=None)
        if fastest:
            fastest_provider = [k for k, v in results.items() if v == fastest][0]
            print(f"  🏃 เร็วที่สุด: {fastest_provider} ({fastest['duration']:.2f}s)")
    
    return len([r for r in results.values() if r.get('success')]) > 0

def test_integration_with_ai_assistant():
    """ทดสอบการ integrate กับ AI Assistant service"""
    print("\n🎯 ทดสอบ Integration กับ AI Assistant...")
    
    try:
        from app.services.ai_assistant import ai_assistant
        
        # ตรวจสอบว่า AI Assistant ใช้ hybrid client
        has_hybrid = hasattr(ai_assistant, 'hybrid_client')
        print(f"  AI Assistant มี hybrid client: {'✅' if has_hybrid else '❌'}")
        
        if has_hybrid:
            status = ai_assistant.hybrid_client.get_status()
            print(f"  Provider ปัจจุบัน: {status['current_provider']}")
            print(f"  Provider ที่แนะนำ: {status['recommended_provider']}")
        
        return has_hybrid
        
    except Exception as e:
        print(f"  ❌ เกิดข้อผิดพลาด: {e}")
        return False

async def main():
    """ฟังก์ชันหลักสำหรับทดสอบ"""
    print("🤖 เริ่มทดสอบ Local AI Integration")
    print("=" * 60)
    
    # รายการ test ทั้งหมด
    tests = [
        ("Ollama Connection", test_ollama_connection),
        ("Model Management", test_model_management),
        ("Text Generation", test_text_generation),
        ("Chat Completion", test_chat_completion),
        ("Hybrid AI Client", test_hybrid_ai_client),
        ("Hybrid Generation", test_hybrid_generation),
        ("Token Estimation", test_token_estimation),
        ("Performance Comparison", test_performance_comparison),
        ("AI Assistant Integration", test_integration_with_ai_assistant)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n🧪 {test_name}")
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ ทดสอบ {test_name} ล้มเหลว: {e}")
            results.append((test_name, False))
    
    # สรุปผลลัพธ์
    print("\n" + "=" * 60)
    print("📊 สรุปผลการทดสอบ Local AI:")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:.<45} {status}")
        if result:
            passed += 1
    
    print("=" * 60)
    print(f"ผลลัพธ์รวม: {passed}/{total} ({passed/total*100:.1f}%)")
    
    # ข้อแนะนำ
    print(f"\n📋 คำแนะนำการใช้งาน:")
    
    if passed == 0:
        print("❌ Local AI ไม่พร้อมใช้งาน:")
        print("  1. ตรวจสอบว่า Ollama service กำลังทำงาน")
        print("  2. รัน: docker-compose up ollama")
        print("  3. ดาวน์โหลด model: docker exec -it auth_logs_ollama ollama pull llama3.2:3b")
    
    elif passed >= total * 0.7:
        print("✅ Local AI พร้อมใช้งานส่วนใหญ่:")
        print("  1. ตั้งค่า AI_PROVIDER=local ใน environment")
        print("  2. ใช้ Local AI แทน OpenAI เพื่อประหยัดค่าใช้จ่าย")
        print("  3. Local AI ทำงานแบบ offline และปลอดภัยกว่า")
    
    else:
        print("⚠️  Local AI ใช้งานได้บางส่วน:")
        print("  1. ตรวจสอบการตั้งค่า Ollama")
        print("  2. ลองดาวน์โหลด model ขนาดเล็กกว่า")
        print("  3. ตรวจสอบ memory และ disk space")
    
    print(f"\n💡 ข้อมูลการใช้งาน:")
    print("  - Local AI ฟรี แต่ใช้ resource ของเครื่อง")
    print("  - OpenAI เสียเงิน แต่ได้คุณภาพและความเร็วสูง")
    print("  - ระบบจะเลือก provider ที่ดีที่สุดอัตโนมัติ")
    print("  - สามารถเปลี่ยน AI_PROVIDER ได้ตามต้องการ")
    
    # แสดงคำสั่งที่มีประโยชน์
    print(f"\n🔧 คำสั่งที่มีประโยชน์:")
    print("  # ดู models ที่มี")
    print("  docker exec -it auth_logs_ollama ollama list")
    print("  ")
    print("  # ดาวน์โหลด model ใหม่")
    print("  docker exec -it auth_logs_ollama ollama pull llama3.2:1b")
    print("  ")
    print("  # ตั้งค่าใช้ Local AI")
    print("  export AI_PROVIDER=local")
    print("  ")
    print("  # ตั้งค่าใช้ OpenAI")
    print("  export AI_PROVIDER=openai")

if __name__ == "__main__":
    asyncio.run(main()) 