"""
Log API Endpoints with ClickHouse Backend
แทนที่ SQLAlchemy ORM ด้วย ClickHouse สำหรับ log operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import pandas as pd
import json
import uuid
import os

from ..core.clickhouse import clickhouse_client
from ..utils.encryption import EncryptionManager
from ..utils.log_manager import LogManager
from ..core.config import settings
from .auth import get_current_user

router = APIRouter()

# Global objects
encryption_manager = EncryptionManager(settings.ENCRYPTION_KEY)
log_manager = LogManager()

@router.get("/stats")
async def get_log_stats(
    current_user: Dict = Depends(get_current_user)
):
    """ดึงสถิติของ logs จาก ClickHouse"""
    try:
        stats = clickhouse_client.get_auth_log_stats()
        return stats
        
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการดึงสถิติ Log: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.get("/")
async def get_logs(
    source_type: str = None,
    username: str = None,
    ip_address: str = None,
    status: str = None,
    start_date: str = None,
    end_date: str = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: Dict = Depends(get_current_user)
):
    """ดึงรายการ logs ตามเงื่อนไขที่กำหนดจาก ClickHouse"""
    try:
        # แปลง string date เป็น datetime
        start_datetime = None
        end_datetime = None
        if start_date:
            start_datetime = datetime.fromisoformat(start_date)
        if end_date:
            end_datetime = datetime.fromisoformat(end_date)
        
        # คำนวณ offset
        offset = (page - 1) * limit
        
        # ดึงข้อมูลจาก ClickHouse
        logs = clickhouse_client.get_auth_logs(
            source_type=source_type,
            username=username,
            ip_address=ip_address,
            status=status,
            start_date=start_datetime,
            end_date=end_datetime,
            limit=limit,
            offset=offset
        )
        
        # นับจำนวนทั้งหมด (สำหรับ pagination)
        # สร้าง query เพื่อนับ total records
        conditions = []
        params = {}
        
        if source_type:
            conditions.append("source_type = %(source_type)s")
            params['source_type'] = source_type
        if username:
            conditions.append("username ILIKE %(username)s")
            params['username'] = f"%{username}%"
        if ip_address:
            conditions.append("client_ip ILIKE %(ip_address)s")
            params['ip_address'] = f"%{ip_address}%"
        if status:
            conditions.append("status = %(status)s")
            params['status'] = status
        if start_datetime:
            conditions.append("timestamp >= %(start_date)s")
            params['start_date'] = start_datetime
        if end_datetime:
            conditions.append("timestamp <= %(end_date)s")
            params['end_date'] = end_datetime
        
        where_clause = ""
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)
        
        count_query = f"SELECT count() FROM authentication_logs {where_clause}"
        count_result = clickhouse_client.execute_query(count_query, params)
        total = count_result.result_rows[0][0] if count_result.result_rows else 0
        
        # แปลงข้อมูลให้เหมาะกับ response format
        formatted_logs = []
        for log in logs:
            formatted_log = {
                'id': log.get('id'),
                'timestamp': log.get('timestamp').isoformat() if log.get('timestamp') else None,
                'source_type': log.get('source_type'),
                'source_name': log.get('source_name'),
                'source_ip': log.get('source_ip'),
                'user_id': log.get('user_id'),
                'username': log.get('username'),
                'action': log.get('action'),
                'status': log.get('status'),
                'client_ip': log.get('client_ip'),
                'details': log.get('details')
            }
            formatted_logs.append(formatted_log)
        
        return {
            'total': total,
            'page': page,
            'limit': limit,
            'logs': formatted_logs
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการดึงข้อมูล Log: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.post("/")
async def create_log(
    log_data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """สร้าง log ใหม่ใน ClickHouse"""
    try:
        # เพิ่ม timestamp และ id ถ้าไม่มี
        if 'id' not in log_data:
            log_data['id'] = str(uuid.uuid4())
        if 'timestamp' not in log_data:
            log_data['timestamp'] = datetime.now()
        if 'created_at' not in log_data:
            log_data['created_at'] = datetime.now()
        
        # Insert ลง ClickHouse
        success = clickhouse_client.insert_auth_log(log_data)
        
        if success:
            return {"message": "สร้าง log สำเร็จ", "id": log_data['id']}
        else:
            raise HTTPException(status_code=500, detail="ไม่สามารถสร้าง log ได้")
            
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการสร้าง Log: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.get("/{log_id}")
async def get_log_by_id(
    log_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """ดึง Authentication Log ตาม ID จาก ClickHouse"""
    try:
        log = clickhouse_client.get_auth_log_by_id(log_id)
        
        if not log:
            raise HTTPException(status_code=404, detail="ไม่พบ Log ที่ระบุ")
        
        # แปลงเป็น response format
        log_data = {
            "id": log.get('id'),
            "source_type": log.get('source_type'),
            "source_name": log.get('source_name'),
            "source_ip": log.get('source_ip'),
            "user_id": log.get('user_id'),
            "username": log.get('username'),
            "domain": log.get('domain'),
            "action": log.get('action'),
            "status": log.get('status'),
            "auth_method": log.get('auth_method'),
            "client_ip": log.get('client_ip'),
            "client_port": log.get('client_port'),
            "server_ip": log.get('server_ip'),
            "server_port": log.get('server_port'),
            "session_id": log.get('session_id'),
            "user_agent": log.get('user_agent'),
            "timestamp": log.get('timestamp').isoformat() if log.get('timestamp') else None,
            "created_at": log.get('created_at').isoformat() if log.get('created_at') else None,
            "is_encrypted": log.get('is_encrypted'),
            "integrity_hash": log.get('integrity_hash'),
            "retention_date": log.get('retention_date').isoformat() if log.get('retention_date') else None
        }
        
        # ถอดรหัส details ถ้าจำเป็น
        details = log.get('details', '')
        if details and log.get('is_encrypted'):
            try:
                decrypted_details = encryption_manager.decrypt_data(details)
                log_data["details"] = decrypted_details
            except Exception as e:
                log_data["details"] = {"error": "ไม่สามารถถอดรหัสข้อมูลได้"}
        else:
            log_data["details"] = details
        
        # บันทึก log การเข้าถึงข้อมูล
        log_manager.log_data_access_event(
            user_id=current_user["username"],
            data_type="authentication_log",
            action="READ",
            ip_address="127.0.0.1"
        )
        
        return log_data
        
    except HTTPException:
        raise
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการดึง Log ID {log_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์")

@router.get("/export/excel")
async def export_logs_excel(
    current_user: Dict = Depends(get_current_user),
    source_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    background_tasks: BackgroundTasks = None
):
    """ส่งออก Logs เป็นไฟล์ Excel จาก ClickHouse"""
    try:
        # ดึงข้อมูลจาก ClickHouse
        logs = clickhouse_client.get_auth_logs(
            source_type=source_type,
            start_date=start_date,
            end_date=end_date,
            limit=100000  # จำกัดจำนวนสำหรับ export
        )
        
        # แปลงเป็น DataFrame
        data = []
        for log in logs:
            row = {
                "ID": log.get('id'),
                "Source Type": log.get('source_type'),
                "Source Name": log.get('source_name'),
                "Source IP": log.get('source_ip'),
                "User ID": log.get('user_id'),
                "Username": log.get('username'),
                "Domain": log.get('domain'),
                "Action": log.get('action'),
                "Status": log.get('status'),
                "Auth Method": log.get('auth_method'),
                "Client IP": log.get('client_ip'),
                "Client Port": log.get('client_port'),
                "Server IP": log.get('server_ip'),
                "Server Port": log.get('server_port'),
                "Session ID": log.get('session_id'),
                "User Agent": log.get('user_agent'),
                "Timestamp": log.get('timestamp'),
                "Created At": log.get('created_at'),
                "Is Encrypted": log.get('is_encrypted'),
                "Details": log.get('details', '')
            }
            data.append(row)
        
        # สร้าง DataFrame
        df = pd.DataFrame(data)
        
        # สร้างไฟล์ Excel
        filename = f"auth_logs_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        filepath = f"exports/{filename}"
        
        # สร้างโฟลเดอร์ exports ถ้ายังไม่มี
        os.makedirs("exports", exist_ok=True)
        
        # บันทึกไฟล์ Excel
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Authentication Logs', index=False)
            
            # จัดรูปแบบ
            worksheet = writer.sheets['Authentication Logs']
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_letter].width = adjusted_width
        
        # บันทึก log การส่งออกข้อมูล
        log_manager.log_data_access_event(
            user_id=current_user["username"],
            data_type="authentication_logs",
            action="EXPORT_EXCEL",
            ip_address="127.0.0.1"
        )
        
        return {
            "message": "ส่งออกข้อมูลสำเร็จ",
            "filename": filename,
            "filepath": filepath,
            "total_records": len(data)
        }
        
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการส่งออก Excel: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดในการส่งออกข้อมูล")

@router.get("/export/csv")
async def export_logs_csv(
    current_user: Dict = Depends(get_current_user),
    source_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None)
):
    """ส่งออก Logs เป็นไฟล์ CSV จาก ClickHouse"""
    try:
        # ดึงข้อมูลจาก ClickHouse
        logs = clickhouse_client.get_auth_logs(
            source_type=source_type,
            start_date=start_date,
            end_date=end_date,
            limit=100000  # จำกัดจำนวนสำหรับ export
        )
        
        # แปลงเป็น DataFrame
        data = []
        for log in logs:
            row = {
                "ID": log.get('id'),
                "Source Type": log.get('source_type'),
                "Source Name": log.get('source_name'),
                "Source IP": log.get('source_ip'),
                "User ID": log.get('user_id'),
                "Username": log.get('username'),
                "Domain": log.get('domain'),
                "Action": log.get('action'),
                "Status": log.get('status'),
                "Auth Method": log.get('auth_method'),
                "Client IP": log.get('client_ip'),
                "Client Port": log.get('client_port'),
                "Server IP": log.get('server_ip'),
                "Server Port": log.get('server_port'),
                "Session ID": log.get('session_id'),
                "User Agent": log.get('user_agent'),
                "Timestamp": log.get('timestamp'),
                "Created At": log.get('created_at'),
                "Is Encrypted": log.get('is_encrypted'),
                "Details": log.get('details', '')
            }
            data.append(row)
        
        # สร้าง DataFrame
        df = pd.DataFrame(data)
        
        # สร้างไฟล์ CSV
        filename = f"auth_logs_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        filepath = f"exports/{filename}"
        
        # สร้างโฟลเดอร์ exports ถ้ายังไม่มี
        os.makedirs("exports", exist_ok=True)
        
        # บันทึกไฟล์ CSV
        df.to_csv(filepath, index=False, encoding='utf-8-sig')
        
        # บันทึก log การส่งออกข้อมูล
        log_manager.log_data_access_event(
            user_id=current_user["username"],
            data_type="authentication_logs",
            action="EXPORT_CSV",
            ip_address="127.0.0.1"
        )
        
        return {
            "message": "ส่งออกข้อมูลสำเร็จ",
            "filename": filename,
            "filepath": filepath,
            "total_records": len(data)
        }
        
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการส่งออก CSV: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดในการส่งออกข้อมูล")

@router.delete("/cleanup")
async def cleanup_old_logs(
    current_user: Dict = Depends(get_current_user),
    days: int = Query(90, ge=1, description="จำนวนวันที่ต้องการเก็บ Log")
):
    """ลบ Logs เก่าตาม Retention Policy จาก ClickHouse"""
    try:
        # คำนวณวันที่ที่จะลบ
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # นับจำนวน records ที่จะลบ
        count_query = "SELECT count() FROM authentication_logs WHERE retention_date <= %(cutoff_date)s"
        count_result = clickhouse_client.execute_query(count_query, {'cutoff_date': cutoff_date})
        count = count_result.result_rows[0][0] if count_result.result_rows else 0
        
        # ลบ records เก่า (ใน ClickHouse ใช้ ALTER TABLE ... DELETE)
        delete_query = "ALTER TABLE authentication_logs DELETE WHERE retention_date <= %(cutoff_date)s"
        clickhouse_client.execute_query(delete_query, {'cutoff_date': cutoff_date})
        
        # บันทึก log การลบข้อมูล
        log_manager.log_retention_event(
            action="DELETE_OLD_LOGS",
            records_affected=count,
            details={"cutoff_date": cutoff_date.isoformat(), "days": days}
        )
        
        return {
            "message": "ลบ Logs เก่าสำเร็จ",
            "deleted_records": count,
            "cutoff_date": cutoff_date.isoformat(),
            "retention_days": days
        }
        
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการลบ Logs เก่า: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดในการลบข้อมูล")

@router.get("/statistics/summary")
async def get_log_statistics(
    current_user: Dict = Depends(get_current_user),
    days: int = Query(30, ge=1, le=365)
):
    """ดึงสถิติสรุปของ Logs จาก ClickHouse"""
    try:
        # คำนวณวันที่เริ่มต้น
        start_date = datetime.now() - timedelta(days=days)
        
        # สถิติตาม Source Type
        source_query = """
            SELECT source_type, count() as count 
            FROM authentication_logs 
            WHERE timestamp >= %(start_date)s 
            GROUP BY source_type
        """
        source_result = clickhouse_client.execute_query(source_query, {'start_date': start_date})
        source_stats = [
            {"source_type": row[0], "count": row[1]} 
            for row in source_result.result_rows
        ]
        
        # สถิติตาม Status
        status_query = """
            SELECT status, count() as count 
            FROM authentication_logs 
            WHERE timestamp >= %(start_date)s 
            GROUP BY status
        """
        status_result = clickhouse_client.execute_query(status_query, {'start_date': start_date})
        status_stats = [
            {"status": row[0], "count": row[1]} 
            for row in status_result.result_rows
        ]
        
        # สถิติตาม Action
        action_query = """
            SELECT action, count() as count 
            FROM authentication_logs 
            WHERE timestamp >= %(start_date)s 
            GROUP BY action
        """
        action_result = clickhouse_client.execute_query(action_query, {'start_date': start_date})
        action_stats = [
            {"action": row[0], "count": row[1]} 
            for row in action_result.result_rows
        ]
        
        # สถิติรายวัน
        daily_query = """
            SELECT toDate(timestamp) as date, count() as count 
            FROM authentication_logs 
            WHERE timestamp >= %(start_date)s 
            GROUP BY toDate(timestamp) 
            ORDER BY date
        """
        daily_result = clickhouse_client.execute_query(daily_query, {'start_date': start_date})
        daily_stats = [
            {"date": row[0].isoformat(), "count": row[1]} 
            for row in daily_result.result_rows
        ]
        
        # สถิติ Top Users
        top_users_query = """
            SELECT user_id, count() as count 
            FROM authentication_logs 
            WHERE timestamp >= %(start_date)s 
            GROUP BY user_id 
            ORDER BY count DESC 
            LIMIT 10
        """
        top_users_result = clickhouse_client.execute_query(top_users_query, {'start_date': start_date})
        top_users = [
            {"user_id": row[0], "count": row[1]} 
            for row in top_users_result.result_rows
        ]
        
        # สถิติ Top IP Addresses
        top_ips_query = """
            SELECT client_ip, count() as count 
            FROM authentication_logs 
            WHERE timestamp >= %(start_date)s 
            GROUP BY client_ip 
            ORDER BY count DESC 
            LIMIT 10
        """
        top_ips_result = clickhouse_client.execute_query(top_ips_query, {'start_date': start_date})
        top_ips = [
            {"ip_address": row[0], "count": row[1]} 
            for row in top_ips_result.result_rows
        ]
        
        return {
            "period_days": days,
            "start_date": start_date.isoformat(),
            "end_date": datetime.now().isoformat(),
            "source_type_statistics": source_stats,
            "status_statistics": status_stats,
            "action_statistics": action_stats,
            "daily_statistics": daily_stats,
            "top_users": top_users,
            "top_ip_addresses": top_ips
        }
        
    except Exception as e:
        log_manager.log_error(f"เกิดข้อผิดพลาดในการดึงสถิติ: {str(e)}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดในการดึงสถิติ")

@router.get("/health")
async def health_check():
    """ตรวจสอบสถานะการเชื่อมต่อ ClickHouse"""
    try:
        is_healthy = clickhouse_client.test_connection()
        if is_healthy:
            return {"status": "healthy", "clickhouse": "connected"}
        else:
            return {"status": "unhealthy", "clickhouse": "disconnected"}
    except Exception as e:
        return {"status": "error", "message": str(e)} 