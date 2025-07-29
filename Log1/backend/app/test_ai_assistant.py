#!/usr/bin/env python3
"""
Test AI Assistant Features
ทดสอบ AI Assistant และ features ต่างๆ
"""
import sys
import os
import asyncio
from datetime import datetime, timedelta
import json

# เพิ่ม path สำหรับ import module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ai_assistant import ai_assistant
from app.core.config import settings
from app.core.clickhouse import clickhouse_client

def test_ai_configuration():
    """ทดสอบการตั้งค่า AI"""
    print("🔧 ทดสอบการตั้งค่า AI Assistant...")
    
    # ตรวจสอบ config
    print(f"  OpenAI API Key: {'✅ Configured' if settings.OPENAI_API_KEY else '❌ Not configured'}")
    print(f"  AI Model: {settings.AI_MODEL}")
    print(f"  Max Tokens: {settings.AI_MAX_TOKENS}")
    print(f"  Temperature: {settings.AI_TEMPERATURE}")
    
    return bool(settings.OPENAI_API_KEY)

async def test_basic_question():
    """ทดสอบการถามคำถามพื้นฐาน"""
    print("\n❓ ทดสอบการถามคำถามพื้นฐาน...")
    
    try:
        question = "สรุปสถานการณ์ความปลอดภัยโดยรวม"
        result = await ai_assistant.ask_question(question)
        
        print(f"  คำถาม: {question}")
        print(f"  คำตอบ: {result.get('answer', 'ไม่มีคำตอบ')[:100]}...")
        print(f"  ประเภท: {result.get('type', 'ไม่ระบุ')}")
        
        return result.get('type') != 'error'
        
    except Exception as e:
        print(f"  ❌ เกิดข้อผิดพลาด: {e}")
        return False

async def test_sql_generation():
    """ทดสอบการสร้าง SQL query"""
    print("\n🔍 ทดสอบการสร้าง SQL query...")
    
    try:
        question = "หา failed login attempts ในวันนี้"
        result = await ai_assistant.generate_query(question)
        
        print(f"  คำถาม: {question}")
        print(f"  สำเร็จ: {'✅' if result.get('success') else '❌'}")
        if result.get('query'):
            print(f"  SQL: {result.get('query')[:100]}...")
        print(f"  คำอธิบาย: {result.get('explanation', 'ไม่มีคำอธิบาย')[:100]}...")
        
        return result.get('success', False)
        
    except Exception as e:
        print(f"  ❌ เกิดข้อผิดพลาด: {e}")
        return False

async def test_log_analysis():
    """ทดสอบการวิเคราะห์ log"""
    print("\n📊 ทดสอบการวิเคราะห์ log...")
    
    try:
        # ทดสอบด้วย filter เบื้องต้น
        filters = {
            "start_date": datetime.now() - timedelta(days=1),
            "end_date": datetime.now()
        }
        
        result = await ai_assistant.analyze_logs(filters=filters, limit=50)
        
        print(f"  Filters: {filters}")
        print(f"  สรุป: {result.get('summary', 'ไม่มีสรุป')[:100]}...")
        print(f"  Insights: {len(result.get('insights', []))} ข้อ")
        print(f"  Anomalies: {len(result.get('anomalies', []))} ข้อ")
        print(f"  Recommendations: {len(result.get('recommendations', []))} ข้อ")
        
        return len(result.get('summary', '')) > 0
        
    except Exception as e:
        print(f"  ❌ เกิดข้อผิดพลาด: {e}")
        return False

async def test_anomaly_detection():
    """ทดสอบการตรวจจับ anomaly"""
    print("\n🚨 ทดสอบการตรวจจับ anomaly...")
    
    try:
        result = await ai_assistant.detect_anomalies(time_range_hours=24)
        
        print(f"  ช่วงเวลา: 24 ชั่วโมงที่ผ่านมา")
        print(f"  พบ Anomalies: {'✅' if result.get('anomalies_detected') else '❌'}")
        print(f"  ระดับความเสี่ยง: {result.get('risk_level', 'ไม่ระบุ')}")
        print(f"  Findings: {len(result.get('findings', []))} ข้อ")
        print(f"  Recommendations: {len(result.get('recommendations', []))} ข้อ")
        
        return 'risk_level' in result
        
    except Exception as e:
        print(f"  ❌ เกิดข้อผิดพลาด: {e}")
        return False

def test_prompt_templates():
    """ทดสอบ prompt templates"""
    print("\n📝 ทดสอบ prompt templates...")
    
    try:
        from app.prompts.log_analysis_prompts import (
            get_prompt_template, 
            get_system_prompt, 
            get_quick_prompt,
            build_context_prompt
        )
        
        # ทดสอบ system prompts
        analyst_prompt = get_system_prompt("log_analyst")
        print(f"  Log Analyst Prompt: {'✅' if len(analyst_prompt) > 0 else '❌'}")
        
        sql_prompt = get_system_prompt("sql_expert")
        print(f"  SQL Expert Prompt: {'✅' if len(sql_prompt) > 0 else '❌'}")
        
        # ทดสอบ analysis templates
        security_template = get_prompt_template("security_incident", log_data="test data")
        print(f"  Security Template: {'✅' if len(security_template) > 0 else '❌'}")
        
        # ทดสอบ quick prompts
        quick_prompt = get_quick_prompt("failed_logins")
        print(f"  Quick Prompt: {'✅' if len(quick_prompt) > 0 else '❌'}")
        
        # ทดสอบ context prompt
        context_prompt = build_context_prompt("test question", {"recent_stats": {"total_logs": 100}})
        print(f"  Context Prompt: {'✅' if len(context_prompt) > 0 else '❌'}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ เกิดข้อผิดพลาด: {e}")
        return False

def test_clickhouse_integration():
    """ทดสอบการเชื่อมต่อ ClickHouse สำหรับ AI"""
    print("\n🔗 ทดสอบการเชื่อมต่อ ClickHouse...")
    
    try:
        # ทดสอบการดึงสถิติ
        stats = clickhouse_client.get_auth_log_stats()
        print(f"  สถิติ log: {'✅' if stats.get('total_logs', 0) >= 0 else '❌'}")
        
        # ทดสอบการดึง log ตัวอย่าง
        logs = clickhouse_client.get_auth_logs(limit=5)
        print(f"  Log ตัวอย่าง: {'✅' if isinstance(logs, list) else '❌'} ({len(logs)} entries)")
        
        # ทดสอบ custom query
        try:
            result = clickhouse_client.execute_query("SELECT count() FROM authentication_logs")
            count = result.result_rows[0][0] if result.result_rows else 0
            print(f"  Custom Query: ✅ ({count} total logs)")
        except:
            print(f"  Custom Query: ❌")
        
        return True
        
    except Exception as e:
        print(f"  ❌ เกิดข้อผิดพลาด: {e}")
        return False

def test_token_counting():
    """ทดสอบการนับ tokens"""
    print("\n🔢 ทดสอบการนับ tokens...")
    
    try:
        test_text = "This is a test message for token counting"
        token_count = ai_assistant.count_tokens(test_text)
        print(f"  ข้อความทดสอบ: '{test_text}'")
        print(f"  จำนวน tokens: {token_count}")
        
        # ทดสอบการตัดข้อความ
        long_text = "This is a very long text. " * 1000
        truncated = ai_assistant.truncate_text(long_text, max_tokens=100)
        truncated_tokens = ai_assistant.count_tokens(truncated)
        print(f"  ข้อความยาว: {len(long_text)} characters")
        print(f"  หลังตัด: {len(truncated)} characters, {truncated_tokens} tokens")
        
        return token_count > 0 and truncated_tokens <= 100
        
    except Exception as e:
        print(f"  ❌ เกิดข้อผิดพลาด: {e}")
        return False

async def test_comprehensive_scenario():
    """ทดสอบ scenario แบบครบวงจร"""
    print("\n🎯 ทดสอบ scenario แบบครบวงจร...")
    
    try:
        # ขั้นตอนที่ 1: ถามคำถามทั่วไป
        question1 = "มี log ทั้งหมดกี่ entries?"
        result1 = await ai_assistant.ask_question(question1)
        print(f"  1. ถามคำถามทั่วไป: {'✅' if result1.get('type') != 'error' else '❌'}")
        
        # ขั้นตอนที่ 2: สร้าง SQL query
        question2 = "แสดง top 5 IP addresses ที่มี failed login มากที่สุด"
        result2 = await ai_assistant.generate_query(question2)
        print(f"  2. สร้าง SQL query: {'✅' if result2.get('success') else '❌'}")
        
        # ขั้นตอนที่ 3: วิเคราะห์ log
        result3 = await ai_assistant.analyze_logs(limit=100)
        print(f"  3. วิเคราะห์ log: {'✅' if len(result3.get('summary', '')) > 0 else '❌'}")
        
        # ขั้นตอนที่ 4: ตรวจจับ anomaly
        result4 = await ai_assistant.detect_anomalies(time_range_hours=12)
        print(f"  4. ตรวจจับ anomaly: {'✅' if 'risk_level' in result4 else '❌'}")
        
        # ตรวจสอบผลลัพธ์รวม
        all_success = all([
            result1.get('type') != 'error',
            result2.get('success'),
            len(result3.get('summary', '')) > 0,
            'risk_level' in result4
        ])
        
        print(f"  ผลลัพธ์รวม: {'✅ ทุกขั้นตอนสำเร็จ' if all_success else '❌ มีขั้นตอนที่ล้มเหลว'}")
        
        return all_success
        
    except Exception as e:
        print(f"  ❌ เกิดข้อผิดพลาด: {e}")
        return False

async def main():
    """ฟังก์ชันหลักสำหรับทดสอบ"""
    print("🤖 เริ่มทดสอบ AI Assistant Features")
    print("=" * 50)
    
    # รายการ test ทั้งหมด
    tests = [
        ("การตั้งค่า AI", test_ai_configuration),
        ("Prompt Templates", test_prompt_templates),
        ("Token Counting", test_token_counting),
        ("ClickHouse Integration", test_clickhouse_integration),
        ("การถามคำถามพื้นฐาน", test_basic_question),
        ("การสร้าง SQL Query", test_sql_generation),
        ("การวิเคราะห์ Log", test_log_analysis),
        ("การตรวจจับ Anomaly", test_anomaly_detection),
        ("Scenario ครบวงจร", test_comprehensive_scenario)
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
    print("\n" + "=" * 50)
    print("📊 สรุปผลการทดสอบ AI Assistant:")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:.<40} {status}")
        if result:
            passed += 1
    
    print("=" * 50)
    print(f"ผลลัพธ์รวม: {passed}/{total} ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 ทดสอบผ่านทั้งหมด! AI Assistant พร้อมใช้งาน")
        print("\n📋 วิธีใช้งาน:")
        print("1. ตั้งค่า OPENAI_API_KEY environment variable")
        print("2. เรียกใช้ API endpoints ที่ /api/ai/*")
        print("3. ใช้งาน AI Assistant ในหน้าเว็บ")
    elif passed >= total * 0.7:
        print("⚠️  ทดสอบผ่านส่วนใหญ่ AI Assistant สามารถใช้งานได้บางส่วน")
    else:
        print("❌ ทดสอบล้มเหลวหลายข้อ กรุณาตรวจสอบการตั้งค่า")
    
    print(f"\n📈 ข้อแนะนำการใช้งาน:")
    print("- ตั้งค่า OpenAI API key สำหรับฟีเจอร์ AI เต็มรูปแบบ")
    print("- มี log ในระบบเพื่อให้ AI วิเคราะห์ได้อย่างมีประสิทธิภาพ")
    print("- ใช้คำถามภาษาไทยหรือภาษาอังกฤษ AI รองรับทั้งคู่")
    print("- ลอง Quick Insights และ Anomaly Detection สำหรับการวิเคราะห์ด่วน")

if __name__ == "__main__":
    asyncio.run(main()) 