import hashlib
import hmac
import base64
import json
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from typing import Dict, Any, Optional
import os

class EncryptionManager:
    """Manager สำหรับการเข้ารหัสและตรวจสอบความถูกต้องของข้อมูล"""
    
    def __init__(self, encryption_key: str):
        self.encryption_key = encryption_key
        self.fernet = self._create_fernet()
    
    def _create_fernet(self) -> Fernet:
        """สร้าง Fernet instance สำหรับการเข้ารหัส"""
        try:
            # ใช้ key ที่มีอยู่แล้ว
            if len(self.encryption_key) == 44:  # Fernet key length
                key = base64.urlsafe_b64decode(self.encryption_key)
            else:
                # สร้าง key ใหม่จาก password
                salt = b'auth_log_system_salt'  # ควรใช้ salt ที่ปลอดภัยกว่า
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=salt,
                    iterations=100000,
                )
                key = base64.urlsafe_b64encode(kdf.derive(self.encryption_key.encode()))
            
            return Fernet(key)
        except Exception as e:
            raise ValueError(f"ไม่สามารถสร้าง Fernet instance: {str(e)}")
    
    def encrypt_data(self, data: Dict[str, Any]) -> str:
        """เข้ารหัสข้อมูล"""
        try:
            # แปลงข้อมูลเป็น JSON string
            json_data = json.dumps(data, ensure_ascii=False, default=str)
            
            # เข้ารหัส
            encrypted_data = self.fernet.encrypt(json_data.encode('utf-8'))
            
            # แปลงเป็น base64 string
            return base64.urlsafe_b64encode(encrypted_data).decode('utf-8')
            
        except Exception as e:
            raise ValueError(f"ไม่สามารถเข้ารหัสข้อมูล: {str(e)}")
    
    def decrypt_data(self, encrypted_data: str) -> Dict[str, Any]:
        """ถอดรหัสข้อมูล"""
        try:
            # แปลงจาก base64 string
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode('utf-8'))
            
            # ถอดรหัส
            decrypted_data = self.fernet.decrypt(encrypted_bytes)
            
            # แปลงกลับเป็น JSON
            return json.loads(decrypted_data.decode('utf-8'))
            
        except Exception as e:
            raise ValueError(f"ไม่สามารถถอดรหัสข้อมูล: {str(e)}")
    
    def generate_hash(self, data: Dict[str, Any]) -> str:
        """สร้าง Hash สำหรับตรวจสอบความถูกต้องของข้อมูล"""
        try:
            # แปลงข้อมูลเป็น JSON string
            json_data = json.dumps(data, ensure_ascii=False, default=str, sort_keys=True)
            
            # สร้าง HMAC hash
            hash_obj = hmac.new(
                self.encryption_key.encode('utf-8'),
                json_data.encode('utf-8'),
                hashlib.sha256
            )
            
            return hash_obj.hexdigest()
            
        except Exception as e:
            raise ValueError(f"ไม่สามารถสร้าง Hash: {str(e)}")
    
    def verify_hash(self, data: Dict[str, Any], expected_hash: str) -> bool:
        """ตรวจสอบความถูกต้องของ Hash"""
        try:
            actual_hash = self.generate_hash(data)
            return hmac.compare_digest(actual_hash, expected_hash)
            
        except Exception as e:
            raise ValueError(f"ไม่สามารถตรวจสอบ Hash: {str(e)}")
    
    def encrypt_file(self, file_path: str, output_path: Optional[str] = None) -> str:
        """เข้ารหัสไฟล์"""
        try:
            if output_path is None:
                output_path = file_path + '.encrypted'
            
            with open(file_path, 'rb') as f:
                data = f.read()
            
            encrypted_data = self.fernet.encrypt(data)
            
            with open(output_path, 'wb') as f:
                f.write(encrypted_data)
            
            return output_path
            
        except Exception as e:
            raise ValueError(f"ไม่สามารถเข้ารหัสไฟล์: {str(e)}")
    
    def decrypt_file(self, encrypted_file_path: str, output_path: Optional[str] = None) -> str:
        """ถอดรหัสไฟล์"""
        try:
            if output_path is None:
                output_path = encrypted_file_path.replace('.encrypted', '.decrypted')
            
            with open(encrypted_file_path, 'rb') as f:
                encrypted_data = f.read()
            
            decrypted_data = self.fernet.decrypt(encrypted_data)
            
            with open(output_path, 'wb') as f:
                f.write(decrypted_data)
            
            return output_path
            
        except Exception as e:
            raise ValueError(f"ไม่สามารถถอดรหัสไฟล์: {str(e)}")
    
    def generate_secure_key(self) -> str:
        """สร้าง Encryption Key ใหม่"""
        try:
            key = Fernet.generate_key()
            return base64.urlsafe_b64encode(key).decode('utf-8')
            
        except Exception as e:
            raise ValueError(f"ไม่สามารถสร้าง Encryption Key: {str(e)}")
    
    def encrypt_password(self, password: str) -> str:
        """เข้ารหัสรหัสผ่าน"""
        try:
            # ใช้ bcrypt หรือ Argon2 ใน production
            # ในที่นี้จะใช้ Fernet สำหรับตัวอย่าง
            return self.encrypt_data({"password": password})
            
        except Exception as e:
            raise ValueError(f"ไม่สามารถเข้ารหัสรหัสผ่าน: {str(e)}")
    
    def verify_password(self, password: str, encrypted_password: str) -> bool:
        """ตรวจสอบรหัสผ่าน"""
        try:
            decrypted_data = self.decrypt_data(encrypted_password)
            return password == decrypted_data.get("password", "")
            
        except Exception as e:
            raise ValueError(f"ไม่สามารถตรวจสอบรหัสผ่าน: {str(e)}")
    
    def create_backup_key(self) -> str:
        """สร้าง Backup Key สำหรับการกู้คืนข้อมูล"""
        try:
            # สร้าง key ใหม่สำหรับ backup
            backup_key = Fernet.generate_key()
            
            # เข้ารหัส backup key ด้วย master key
            encrypted_backup_key = self.fernet.encrypt(backup_key)
            
            return base64.urlsafe_b64encode(encrypted_backup_key).decode('utf-8')
            
        except Exception as e:
            raise ValueError(f"ไม่สามารถสร้าง Backup Key: {str(e)}")
    
    def encrypt_sensitive_field(self, field_name: str, field_value: str) -> str:
        """เข้ารหัสข้อมูลที่สำคัญ"""
        try:
            # เพิ่ม field name เพื่อป้องกันการสับสน
            data = {
                "field_name": field_name,
                "field_value": field_value,
                "timestamp": str(int(time.time()))
            }
            
            return self.encrypt_data(data)
            
        except Exception as e:
            raise ValueError(f"ไม่สามารถเข้ารหัสข้อมูลที่สำคัญ: {str(e)}")
    
    def decrypt_sensitive_field(self, encrypted_field: str) -> tuple:
        """ถอดรหัสข้อมูลที่สำคัญ"""
        try:
            data = self.decrypt_data(encrypted_field)
            
            return (
                data.get("field_name", ""),
                data.get("field_value", ""),
                data.get("timestamp", "")
            )
            
        except Exception as e:
            raise ValueError(f"ไม่สามารถถอดรหัสข้อมูลที่สำคัญ: {str(e)}")
    
    def create_data_integrity_check(self, data: Dict[str, Any]) -> Dict[str, str]:
        """สร้างการตรวจสอบความถูกต้องของข้อมูล"""
        try:
            # สร้าง hash สำหรับข้อมูล
            data_hash = self.generate_hash(data)
            
            # สร้าง timestamp
            timestamp = str(int(time.time()))
            
            # สร้าง signature
            signature_data = f"{data_hash}:{timestamp}"
            signature = hmac.new(
                self.encryption_key.encode('utf-8'),
                signature_data.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            return {
                "hash": data_hash,
                "timestamp": timestamp,
                "signature": signature
            }
            
        except Exception as e:
            raise ValueError(f"ไม่สามารถสร้างการตรวจสอบความถูกต้อง: {str(e)}")
    
    def verify_data_integrity(self, data: Dict[str, Any], integrity_info: Dict[str, str]) -> bool:
        """ตรวจสอบความถูกต้องของข้อมูล"""
        try:
            # ตรวจสอบ hash
            expected_hash = integrity_info.get("hash", "")
            if not self.verify_hash(data, expected_hash):
                return False
            
            # ตรวจสอบ signature
            timestamp = integrity_info.get("timestamp", "")
            expected_signature = integrity_info.get("signature", "")
            
            signature_data = f"{expected_hash}:{timestamp}"
            actual_signature = hmac.new(
                self.encryption_key.encode('utf-8'),
                signature_data.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(actual_signature, expected_signature)
            
        except Exception as e:
            raise ValueError(f"ไม่สามารถตรวจสอบความถูกต้องของข้อมูล: {str(e)}")

# Import time module ที่จำเป็น
import time 