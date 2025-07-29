# คู่มือการติดตั้งระบบ Authentication Log Management

## ข้อกำหนดระบบ

### ระบบปฏิบัติการ
- Ubuntu 20.04 LTS หรือใหม่กว่า
- CentOS 8 หรือใหม่กว่า
- macOS 10.15 หรือใหม่กว่า
- Windows 10/11 (สำหรับการพัฒนา)

### ข้อกำหนดฮาร์ดแวร์
- CPU: 2 cores หรือมากกว่า
- RAM: 4GB หรือมากกว่า
- Storage: 50GB หรือมากกว่า
- Network: การเชื่อมต่ออินเทอร์เน็ต

### ข้อกำหนดซอฟต์แวร์
- Python 3.11 หรือใหม่กว่า
- PostgreSQL 15 หรือใหม่กว่า
- Redis 7 หรือใหม่กว่า
- Docker และ Docker Compose (สำหรับการติดตั้งแบบ Container)
- Node.js 18 หรือใหม่กว่า (สำหรับ Frontend)

## การติดตั้ง

### วิธีที่ 1: การติดตั้งแบบ Docker (แนะนำ)

1. **Clone โปรเจค**
```bash
git clone <repository-url>
cd Log-Management
```

2. **ตั้งค่า Environment Variables**
```bash
cp backend/env.example backend/.env
# แก้ไขไฟล์ .env ตามความต้องการ
```

3. **รันระบบด้วย Docker Compose**
```bash
docker-compose up -d
```

4. **ตรวจสอบสถานะ**
```bash
docker-compose ps
```

### วิธีที่ 2: การติดตั้งแบบ Manual

#### 1. ติดตั้ง PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 2. สร้างฐานข้อมูล
```bash
sudo -u postgres psql
CREATE DATABASE auth_logs;
CREATE USER auth_user WITH PASSWORD 'auth_password';
GRANT ALL PRIVILEGES ON DATABASE auth_logs TO auth_user;
\q
```

#### 3. ติดตั้ง Redis
```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# CentOS/RHEL
sudo yum install redis
sudo systemctl start redis
sudo systemctl enable redis
```

#### 4. ติดตั้ง Python Dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 5. ตั้งค่า Environment Variables
```bash
cp env.example .env
# แก้ไขไฟล์ .env ตามความต้องการ
```

#### 6. รัน Backend
```bash
python run.py
```

#### 7. ติดตั้ง Frontend (ถ้าต้องการ)
```bash
cd frontend
npm install
npm start
```

## การตั้งค่า

### 1. การตั้งค่าฐานข้อมูล

แก้ไขไฟล์ `backend/.env`:
```env
DATABASE_URL=postgresql://auth_user:auth_password@localhost/auth_logs
```

### 2. การตั้งค่าความปลอดภัย

สร้าง Secret Keys:
```bash
# สร้าง SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# สร้าง ENCRYPTION_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 3. การตั้งค่า Log Sources

#### Firewall Sources
```json
{
  "name": "Main Firewall",
  "source_type": "FIREWALL",
  "ip_address": "192.168.1.1",
  "port": 22,
  "credentials": {
    "username": "admin",
    "password": "password",
    "firewall_type": "cisco_asa"
  }
}
```

#### Proxy Sources
```json
{
  "name": "Web Proxy",
  "source_type": "PROXY",
  "ip_address": "192.168.1.10",
  "port": 8080,
  "credentials": {
    "username": "proxy_user",
    "password": "proxy_password",
    "proxy_type": "squid"
  }
}
```

#### Active Directory Sources
```json
{
  "name": "Domain Controller",
  "source_type": "AD",
  "ip_address": "192.168.1.100",
  "port": 389,
  "credentials": {
    "username": "admin@domain.com",
    "password": "password",
    "domain": "domain.com",
    "use_ssl": false,
    "collection_type": "windows_events"
  }
}
```

#### Server Sources
```json
{
  "name": "Linux Server",
  "source_type": "SERVER",
  "ip_address": "192.168.1.50",
  "port": 22,
  "credentials": {
    "username": "admin",
    "password": "password",
    "server_type": "linux",
    "log_type": "auth"
  }
}
```

## การใช้งาน

### 1. เข้าสู่ระบบ
- URL: http://localhost:3000
- Username: admin
- Password: admin123

### 2. การจัดการ Log Sources
1. ไปที่หน้า "Sources"
2. คลิก "Add New Source"
3. กรอกข้อมูลตามประเภทของ Source
4. ทดสอบการเชื่อมต่อ
5. บันทึกการตั้งค่า

### 3. การดู Logs
1. ไปที่หน้า "Logs"
2. ใช้ Filters เพื่อกรองข้อมูล
3. ดาวน์โหลดรายงานในรูปแบบ Excel หรือ CSV

### 4. การดู Analytics
1. ไปที่หน้า "Dashboard"
2. ดูสถิติและกราฟต่างๆ
3. ตรวจสอบ Security Alerts

## การบำรุงรักษา

### 1. การสำรองข้อมูล
```bash
# สำรองฐานข้อมูล
pg_dump -h localhost -U auth_user auth_logs > backup_$(date +%Y%m%d).sql

# สำรอง Logs
tar -czf logs_backup_$(date +%Y%m%d).tar.gz logs/
```

### 2. การลบ Logs เก่า
ระบบจะลบ Logs เก่าอัตโนมัติตาม Retention Policy (90 วัน)
หรือสามารถลบด้วยตนเองผ่าน API:
```bash
curl -X DELETE "http://localhost:8000/api/v1/logs/cleanup?days=90" \
  -H "Authorization: Bearer admin-token"
```

### 3. การอัปเดตระบบ
```bash
# อัปเดต Backend
cd backend
git pull
pip install -r requirements.txt

# อัปเดต Frontend
cd frontend
git pull
npm install
npm run build
```

## การแก้ไขปัญหา

### 1. ปัญหาการเชื่อมต่อฐานข้อมูล
```bash
# ตรวจสอบ PostgreSQL
sudo systemctl status postgresql

# ตรวจสอบการเชื่อมต่อ
psql -h localhost -U auth_user -d auth_logs
```

### 2. ปัญหาการเชื่อมต่อ Redis
```bash
# ตรวจสอบ Redis
sudo systemctl status redis

# ทดสอบการเชื่อมต่อ
redis-cli ping
```

### 3. ปัญหาการเก็บ Log
```bash
# ตรวจสอบ Logs
tail -f backend/logs/auth_system.log

# ทดสอบการเชื่อมต่อ Source
curl -X POST "http://localhost:8000/api/v1/sources/{source_id}/test-connection" \
  -H "Authorization: Bearer admin-token"
```

## การปฏิบัติตาม พรบ. คอมพิวเตอร์

### 1. การเก็บข้อมูล
- เก็บ Authentication Log อย่างน้อย 90 วัน
- เข้ารหัสข้อมูลที่สำคัญ
- ตรวจสอบความถูกต้องของข้อมูล

### 2. การส่งมอบข้อมูล
- สามารถส่งออกข้อมูลในรูปแบบ Excel หรือ CSV
- มีระบบ Audit Trail สำหรับการเข้าถึงข้อมูล

### 3. การรักษาความลับ
- เข้ารหัสข้อมูลที่สำคัญ
- จำกัดการเข้าถึงตามสิทธิ์
- บันทึกการเข้าถึงข้อมูล

## การสนับสนุน

หากพบปัญหาหรือต้องการความช่วยเหลือ:
1. ตรวจสอบ Logs ใน `backend/logs/`
2. ดูเอกสารใน `docs/`
3. ส่ง Issue ผ่าน GitHub
4. ติดต่อทีมพัฒนา

## License

MIT License - ดูรายละเอียดในไฟล์ LICENSE 