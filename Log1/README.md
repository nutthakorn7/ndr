# ระบบจัดการ Authentication Log ตาม พรบ. คอมพิวเตอร์

ระบบจัดการ Authentication Log ที่ออกแบบมาเพื่อเก็บและวิเคราะห์ข้อมูลการเข้าสู่ระบบจาก Firewall, Proxy, Active Directory และ Server ตามข้อกำหนดของ พระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550 และที่แก้ไขเพิ่มเติม

## 🎯 คุณสมบัติหลัก

### 📊 การเก็บ Authentication Log
- **Firewall Logs**: รองรับ Cisco ASA, Fortinet, Palo Alto
- **Proxy Logs**: รองรับ Squid, Nginx, Blue Coat
- **Active Directory Logs**: รองรับ Windows Event Logs, LDAP
- **Server Logs**: รองรับ Linux, Windows Server, Web Server, Database

### 🔒 ความปลอดภัยและ Compliance
- **การเข้ารหัสข้อมูล**: ใช้ Fernet encryption สำหรับข้อมูลที่สำคัญ
- **การตรวจสอบความถูกต้อง**: HMAC hash สำหรับ integrity check
- **Retention Policy**: เก็บ Log อย่างน้อย 90 วันตาม พรบ. คอมพิวเตอร์
- **Audit Trail**: บันทึกการเข้าถึงข้อมูลทั้งหมด

### 📈 การวิเคราะห์และรายงาน
- **Real-time Dashboard**: แสดงสถิติและกราฟแบบ Real-time
- **Security Alerts**: แจ้งเตือนเมื่อพบกิจกรรมที่น่าสงสัย
- **Compliance Reports**: รายงานการปฏิบัติตาม พรบ. คอมพิวเตอร์
- **Export Functionality**: ส่งออกข้อมูลเป็น Excel, CSV

### 🔧 การจัดการระบบ
- **Log Sources Management**: จัดการแหล่งข้อมูล Log
- **Automated Collection**: เก็บ Log อัตโนมัติตามกำหนดเวลา
- **Backup & Recovery**: ระบบสำรองและกู้คืนข้อมูล
- **Monitoring & Alerts**: ตรวจสอบสถานะระบบ

## 🏗️ สถาปัตยกรรมระบบ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Collectors    │
                       │                 │
                       │ ┌─────────────┐ │
                       │ │ Firewall    │ │
                       │ │ Proxy       │ │
                       │ │ AD          │ │
                       │ │ Server      │ │
                       │ └─────────────┘ │
                       └─────────────────┘
```

## 🚀 การติดตั้ง

### ข้อกำหนดระบบ
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (แนะนำ)

### การติดตั้งแบบ Docker (แนะนำ)

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

3. **รันระบบ**
```bash
docker-compose up -d
```

4. **ตรวจสอบสถานะ**
```bash
docker-compose ps
```

### การติดตั้งแบบ Manual

ดูรายละเอียดใน [INSTALL.md](INSTALL.md)

## 📖 การใช้งาน

### 1. เข้าสู่ระบบ
- URL: http://localhost:3000
- Username: `admin`
- Password: `admin123`

### 2. การตั้งค่า Log Sources

#### Firewall Source
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

#### Proxy Source
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

#### Active Directory Source
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

### 3. การดูและวิเคราะห์ข้อมูล

- **Dashboard**: ดูสถิติและกราฟแบบ Real-time
- **Logs**: ดูรายการ Authentication Logs พร้อม Filter
- **Analytics**: วิเคราะห์ข้อมูลและดู Security Alerts
- **Reports**: สร้างรายงาน Compliance

### 4. การส่งออกข้อมูล

```bash
# ส่งออกเป็น CSV
curl -X GET "http://localhost:8000/api/v1/logs/export/csv" \
  -H "Authorization: Bearer admin-token"

# ส่งออกเป็น Excel
curl -X GET "http://localhost:8000/api/v1/logs/export/excel" \
  -H "Authorization: Bearer admin-token"
```

## 🔧 API Documentation

### Authentication
```bash
# Login
POST /api/v1/auth/login
{
  "username": "admin",
  "password": "admin123"
}

# Get Current User
GET /api/v1/auth/me
Authorization: Bearer <token>
```

### Logs
```bash
# Get Logs
GET /api/v1/logs?source_type=FIREWALL&limit=100
Authorization: Bearer <token>

# Get Log Statistics
GET /api/v1/logs/statistics/summary?days=30
Authorization: Bearer <token>
```

### Sources
```bash
# Get Sources
GET /api/v1/sources
Authorization: Bearer <token>

# Create Source
POST /api/v1/sources
Authorization: Bearer <token>
{
  "name": "New Source",
  "source_type": "FIREWALL",
  "ip_address": "192.168.1.1"
}
```

### Analytics
```bash
# Get Dashboard Data
GET /api/v1/analytics/dashboard?days=30
Authorization: Bearer <token>

# Get Security Alerts
GET /api/v1/analytics/security-alerts?days=7
Authorization: Bearer <token>
```

## 🧪 การทดสอบ

### ทดสอบระบบ
```bash
cd backend
python test_system.py
```

### ทดสอบ API
```bash
# Health Check
curl http://localhost:8000/health

# Test Authentication
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

## 📊 การปฏิบัติตาม พรบ. คอมพิวเตอร์

### ข้อกำหนดที่ปฏิบัติตาม
1. **การเก็บข้อมูล**: เก็บ Authentication Log อย่างน้อย 90 วัน
2. **การเข้ารหัส**: เข้ารหัสข้อมูลที่สำคัญ
3. **การตรวจสอบ**: ตรวจสอบความถูกต้องของข้อมูล
4. **การส่งมอบ**: สามารถส่งออกข้อมูลได้
5. **การรักษาความลับ**: จำกัดการเข้าถึงตามสิทธิ์

### รายงาน Compliance
- สร้างรายงานการปฏิบัติตาม พรบ. คอมพิวเตอร์
- แสดง Compliance Score
- ตรวจสอบการเก็บข้อมูลตาม Retention Policy

## 🔒 ความปลอดภัย

### การเข้ารหัส
- ใช้ Fernet encryption สำหรับข้อมูลที่สำคัญ
- HMAC hash สำหรับ integrity check
- JWT tokens สำหรับ authentication

### การเข้าถึง
- Role-based access control
- Audit trail สำหรับการเข้าถึงข้อมูล
- Session management

### การตรวจสอบ
- Real-time monitoring
- Security alerts
- Anomaly detection

## 📈 การบำรุงรักษา

### การสำรองข้อมูล
```bash
# สำรองฐานข้อมูล
pg_dump -h localhost -U auth_user auth_logs > backup.sql

# สำรอง Logs
tar -czf logs_backup.tar.gz logs/
```

### การลบข้อมูลเก่า
```bash
# ลบ Logs เก่า (อัตโนมัติ)
curl -X DELETE "http://localhost:8000/api/v1/logs/cleanup?days=90" \
  -H "Authorization: Bearer admin-token"
```

### การอัปเดต
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

## 🐛 การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

1. **การเชื่อมต่อฐานข้อมูล**
```bash
# ตรวจสอบ PostgreSQL
sudo systemctl status postgresql
psql -h localhost -U auth_user -d auth_logs
```

2. **การเชื่อมต่อ Redis**
```bash
# ตรวจสอบ Redis
sudo systemctl status redis
redis-cli ping
```

3. **การเก็บ Log**
```bash
# ตรวจสอบ Logs
tail -f backend/logs/auth_system.log

# ทดสอบการเชื่อมต่อ Source
curl -X POST "http://localhost:8000/api/v1/sources/{source_id}/test-connection" \
  -H "Authorization: Bearer admin-token"
```

## 🤝 การสนับสนุน

### การรายงานปัญหา
1. ตรวจสอบ Logs ใน `backend/logs/`
2. ดูเอกสารใน `docs/`
3. ส่ง Issue ผ่าน GitHub
4. ติดต่อทีมพัฒนา

### การมีส่วนร่วม
1. Fork โปรเจค
2. สร้าง Feature Branch
3. Commit การเปลี่ยนแปลง
4. Push ไปยัง Branch
5. สร้าง Pull Request

## 📄 License

MIT License - ดูรายละเอียดในไฟล์ [LICENSE](LICENSE)

## 🙏 ขอบคุณ

- FastAPI สำหรับ Backend Framework
- React สำหรับ Frontend Framework
- PostgreSQL สำหรับฐานข้อมูล
- Docker สำหรับ Containerization
- พระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550

---

**หมายเหตุ**: ระบบนี้ถูกออกแบบมาเพื่อปฏิบัติตาม พรบ. คอมพิวเตอร์ ของประเทศไทย กรุณาตรวจสอบและปรับแต่งตามความต้องการขององค์กร 