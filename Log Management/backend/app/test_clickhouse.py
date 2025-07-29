#!/usr/bin/env python3
"""
Test ClickHouse Integration
ทดสอบการเชื่อมต่อและ operations พื้นฐานกับ ClickHouse
"""
import sys
import os
import asyncio
from datetime import datetime, timedelta
import uuid

# เพิ่ม path สำหรับ import module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.clickhouse import clickhouse_client
from app.core.config import settings

def test_connection():
    """ทดสอบการเชื่อมต่อ ClickHouse"""
    print("🔗 ทดสอบการเชื่อมต่อ ClickHouse...")
    try:
        is_connected = clickhouse_client.test_connection()
        if is_connected:
            print("✅ เชื่อมต่อ ClickHouse สำเร็จ")
            return True
        else:
            print("❌ ไม่สามารถเชื่อมต่อ ClickHouse ได้")
            return False
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
        return False

def test_show_tables():
    """ทดสอบการดู tables ใน ClickHouse"""
    print("\n📋 ทดสอบการดู tables...")
    try:
        result = clickhouse_client.execute_query("SHOW TABLES")
        print("✅ Tables ที่มีอยู่:")
        for row in result.result_rows:
            print(f"  - {row[0]}")
        return True
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
        return False

def test_insert_sample_log():
    """ทดสอบการ insert log ตัวอย่าง"""
    print("\n📝 ทดสอบการ insert log...")
    try:
        sample_log = {
            'id': str(uuid.uuid4()),
            'source_type': 'FIREWALL',
            'source_name': 'Test-Firewall-01',
            'source_ip': '192.168.1.1',
            'user_id': 'testuser01',
            'username': 'testuser',
            'domain': 'test.local',
            'action': 'LOGIN',
            'status': 'SUCCESS',
            'auth_method': 'PASSWORD',
            'client_ip': '10.0.0.100',
            'client_port': 12345,
            'server_ip': '192.168.1.10',
            'server_port': 443,
            'session_id': 'test-session-123',
            'user_agent': 'Mozilla/5.0 Test Browser',
            'timestamp': datetime.now(),
            'created_at': datetime.now(),
            'details': 'Test log entry from Python script',
            'error_message': '',
            'is_encrypted': 0,
            'integrity_hash': 'test-hash-123',
            'retention_date': datetime.now() + timedelta(days=90)
        }
        
        success = clickhouse_client.insert_auth_log(sample_log)
        if success:
            print(f"✅ Insert log สำเร็จ ID: {sample_log['id']}")
            return sample_log['id']
        else:
            print("❌ Insert log ล้มเหลว")
            return None
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
        return None

def test_query_logs():
    """ทดสอบการ query logs"""
    print("\n🔍 ทดสอบการ query logs...")
    try:
        logs = clickhouse_client.get_auth_logs(limit=5)
        print(f"✅ พบ {len(logs)} logs:")
        for log in logs:
            print(f"  - ID: {log.get('id')}, User: {log.get('username')}, Action: {log.get('action')}, Status: {log.get('status')}")
        return True
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
        return False

def test_get_log_by_id(log_id):
    """ทดสอบการดึง log ตาม ID"""
    print(f"\n🔍 ทดสอบการดึง log ตาม ID: {log_id}...")
    try:
        log = clickhouse_client.get_auth_log_by_id(log_id)
        if log:
            print(f"✅ พบ log: {log.get('username')} - {log.get('action')}")
            return True
        else:
            print("❌ ไม่พบ log")
            return False
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
        return False

def test_get_stats():
    """ทดสอบการดึงสถิติ"""
    print("\n📊 ทดสอบการดึงสถิติ...")
    try:
        stats = clickhouse_client.get_auth_log_stats()
        print(f"✅ สถิติ:")
        print(f"  - Total logs: {stats.get('total_logs', 0)}")
        print(f"  - Status stats: {len(stats.get('status_stats', []))}")
        print(f"  - Source stats: {len(stats.get('source_stats', []))}")
        return True
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
        return False

def test_filter_logs():
    """ทดสอบการ filter logs"""
    print("\n🔍 ทดสอบการ filter logs...")
    try:
        # ทดสอบ filter ตาม status
        logs = clickhouse_client.get_auth_logs(status='SUCCESS', limit=3)
        print(f"✅ พบ {len(logs)} logs ที่มี status = SUCCESS")
        
        # ทดสอบ filter ตาม source_type
        logs = clickhouse_client.get_auth_logs(source_type='FIREWALL', limit=3)
        print(f"✅ พบ {len(logs)} logs ที่มี source_type = FIREWALL")
        
        return True
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
        return False

def test_custom_query():
    """ทดสอบ custom query"""
    print("\n🔧 ทดสอบ custom query...")
    try:
        # ทดสอบ query แบบ custom
        query = """
            SELECT source_type, count() as count 
            FROM authentication_logs 
            GROUP BY source_type 
            ORDER BY count DESC
        """
        result = clickhouse_client.execute_query(query)
        print("✅ ผลลัพธ์ custom query:")
        for row in result.result_rows:
            print(f"  - {row[0]}: {row[1]} logs")
        return True
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
        return False

def main():
    """ฟังก์ชันหลักสำหรับทดสอบ"""
    print("🚀 เริ่มทดสอบ ClickHouse Integration")
    print(f"📍 ClickHouse Host: {getattr(settings, 'CLICKHOUSE_HOST', 'clickhouse')}")
    print(f"📍 ClickHouse Port: {getattr(settings, 'CLICKHOUSE_PORT', 8123)}")
    print(f"📍 ClickHouse DB: {getattr(settings, 'CLICKHOUSE_DB', 'auth_logs')}")
    
    # ทดสอบแต่ละขั้นตอน
    tests = [
        ("การเชื่อมต่อ", test_connection),
        ("การดู tables", test_show_tables),
        ("การ query logs", test_query_logs),
        ("การดึงสถิติ", test_get_stats),
        ("การ filter logs", test_filter_logs),
        ("custom query", test_custom_query),
    ]
    
    results = []
    inserted_log_id = None
    
    for test_name, test_func in tests:
        try:
            if test_func == test_insert_sample_log:
                result = test_func()
                if result:
                    inserted_log_id = result
                    results.append((test_name, True))
                else:
                    results.append((test_name, False))
            else:
                result = test_func()
                results.append((test_name, result))
        except Exception as e:
            print(f"❌ ทดสอบ {test_name} ล้มเหลว: {e}")
            results.append((test_name, False))
    
    # ทดสอบ insert และ get by id
    print("\n📝 ทดสอบการ insert และ get by id...")
    inserted_log_id = test_insert_sample_log()
    if inserted_log_id:
        results.append(("การ insert log", True))
        get_result = test_get_log_by_id(inserted_log_id)
        results.append(("การ get log by id", get_result))
    else:
        results.append(("การ insert log", False))
        results.append(("การ get log by id", False))
    
    # สรุปผลลัพธ์
    print("\n📊 สรุปผลการทดสอบ:")
    print("=" * 50)
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:.<30} {status}")
        if result:
            passed += 1
    
    print("=" * 50)
    print(f"ผลลัพธ์รวม: {passed}/{total} ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 ทดสอบผ่านทั้งหมด! ClickHouse พร้อมใช้งาน")
    else:
        print("⚠️  มีการทดสอบบางส่วนที่ล้มเหลว กรุณาตรวจสอบ")
    
    # ปิดการเชื่อมต่อ
    try:
        clickhouse_client.close_connection()
        print("\n🔒 ปิดการเชื่อมต่อ ClickHouse แล้ว")
    except:
        pass

if __name__ == "__main__":
    main() 