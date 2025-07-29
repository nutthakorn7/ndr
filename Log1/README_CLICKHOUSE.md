# ClickHouse Integration Guide

การเปลี่ยน backend ของระบบ Log Management จาก PostgreSQL/SQLAlchemy ไปใช้ ClickHouse เพื่อรองรับการจัดการ log ปริมาณมหาศาล

## 🔄 การเปลี่ยนแปลง

### 1. Infrastructure Changes
- **เพิ่ม ClickHouse service** ใน `docker-compose.yml`
- **ติดตั้ง clickhouse-connect** library ใน `requirements.txt`
- **เพิ่ม ClickHouse config** ใน `core/config.py`

### 2. Database Schema
- **สร้าง ClickHouse tables** ใน `database/clickhouse_init.sql`
- **ใช้ MergeTree engine** สำหรับ performance สูง
- **Partitioning ตาม month** เพื่อ query ที่เร็วขึ้น
- **TTL policies** สำหรับ automatic retention

### 3. Backend Code Changes
- **สร้าง ClickHouse client** ใน `core/clickhouse.py`
- **เพิ่ม log endpoints ใหม่** ใน `api/logs_clickhouse.py`
- **ใช้ raw SQL queries** แทน ORM

## 🚀 การใช้งาน

### Start ระบบด้วย ClickHouse
```bash
# Build และ start ทุก services รวม ClickHouse
docker-compose up -d

# ตรวจสอบ ClickHouse
docker-compose logs clickhouse
```

### API Endpoints ใหม่ (ClickHouse)
```
# ClickHouse endpoints (prefix: /api/logs-ch)
GET /api/logs-ch/health           # ตรวจสอบ ClickHouse connection
GET /api/logs-ch/stats            # สถิติ log จาก ClickHouse
GET /api/logs-ch/                 # ดึง logs พร้อม filter
POST /api/logs-ch/                # เพิ่ม log ใหม่
GET /api/logs-ch/{log_id}         # ดึง log ตาม ID
GET /api/logs-ch/export/excel     # Export เป็น Excel
GET /api/logs-ch/export/csv       # Export เป็น CSV
DELETE /api/logs-ch/cleanup       # ลบ log เก่า
GET /api/logs-ch/statistics/summary  # สถิติรายละเอียด
```

### API Endpoints เดิม (PostgreSQL)
```
# PostgreSQL endpoints ยังคงใช้งานได้ (prefix: /api/logs)
GET /api/logs/stats
GET /api/logs/
# ... เหมือนเดิม
```

## 🧪 การทดสอบ

### ทดสอบ ClickHouse Integration
```bash
cd backend
python app/test_clickhouse.py
```

### ทดสอบ API ด้วย curl
```bash
# Health check
curl http://localhost/api/logs-ch/health

# ดึง logs
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost/api/logs-ch/?limit=10

# Insert log ใหม่
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"source_type":"FIREWALL","username":"testuser","action":"LOGIN","status":"SUCCESS","client_ip":"10.0.0.1"}' \
     http://localhost/api/logs-ch/

# ดึงสถิติ
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost/api/logs-ch/stats
```

## 📊 ประสิทธิภาพ

### ข้อดีของ ClickHouse
- **เร็วกว่า PostgreSQL** ในการ query log ปริมาณมาก (10-100x)
- **รองรับ log ได้มากกว่า** (หลักพันล้าน records)
- **การบีบอัดดี** ประหยัดพื้นที่จัดเก็บ
- **Auto partitioning** และ TTL
- **Aggregation เร็ว** สำหรับ analytics/dashboard

### การเปรียบเทียบ
| Operation | PostgreSQL | ClickHouse | Improvement |
|-----------|------------|------------|-------------|
| Insert (bulk) | ~10K/sec | ~100K/sec | 10x |
| Query (filter) | ~1-5 sec | ~0.1-0.5 sec | 10x |
| Aggregation | ~5-30 sec | ~0.5-3 sec | 10x |
| Storage | ~100% | ~20-40% | 3x compression |

## 🔧 Configuration

### Environment Variables
```bash
# ClickHouse Settings
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=auth_logs
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
```

### ClickHouse Settings (docker-compose.yml)
```yaml
clickhouse:
  image: clickhouse/clickhouse-server:latest
  ports:
    - "8123:8123"  # HTTP interface
    - "9000:9000"  # Native client interface
  environment:
    - CLICKHOUSE_DB=auth_logs
    - CLICKHOUSE_USER=default
    - CLICKHOUSE_PASSWORD=
  volumes:
    - clickhouse_data:/var/lib/clickhouse
    - ./database/clickhouse_init.sql:/docker-entrypoint-initdb.d/init.sql
```

## 📝 Schema Details

### authentication_logs Table
```sql
CREATE TABLE authentication_logs (
    id String,
    source_type String,
    source_name String,
    source_ip String,
    user_id String,
    username String,
    domain String,
    action String,
    status String,
    auth_method String,
    client_ip String,
    client_port UInt16,
    server_ip String,
    server_port UInt16,
    session_id String,
    user_agent String,
    timestamp DateTime('Asia/Bangkok'),
    created_at DateTime('Asia/Bangkok'),
    details String,
    error_message String,
    is_encrypted UInt8,
    integrity_hash String,
    retention_date DateTime('Asia/Bangkok')
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, source_type, user_id)
TTL retention_date DELETE;
```

### Key Features
- **MergeTree Engine**: Optimized for log data
- **Partitioning**: By month for faster queries
- **Ordering**: By timestamp, source_type, user_id
- **TTL**: Automatic cleanup based on retention_date

## 🔄 Migration Strategy

### Option 1: Dual Backend (Recommended)
- ใช้ทั้ง PostgreSQL และ ClickHouse ควบคู่กัน
- **PostgreSQL**: สำหรับข้อมูล relational (users, config, metadata)
- **ClickHouse**: สำหรับ log data เท่านั้น
- Frontend สามารถเลือกใช้ endpoint ได้ตามต้องการ

### Option 2: Full Migration
- ย้าย log data ทั้งหมดไป ClickHouse
- เก็บเฉพาะ user/config ใน PostgreSQL
- ปรับ frontend ให้ใช้ ClickHouse endpoints

### Option 3: Gradual Migration
- เริ่มส่ง log ใหม่ไป ClickHouse
- ค่อยๆ migrate log เก่าจาก PostgreSQL
- ปิด PostgreSQL endpoints เมื่อพร้อม

## ⚠️ ข้อควรระวัง

### Development vs Production
- **Development**: ใช้ single node ClickHouse ใน Docker
- **Production**: ควรใช้ ClickHouse cluster สำหรับ high availability

### Data Consistency
- ClickHouse ไม่รองรับ transactions แบบ ACID เต็มรูปแบบ
- ไม่เหมาะกับข้อมูลที่ต้อง update/delete บ่อย
- เหมาะกับ append-only data (logs)

### Resource Requirements
- **RAM**: อย่างน้อย 4GB สำหรับ production
- **Disk**: SSD แนะนำสำหรับ performance
- **CPU**: Multi-core ช่วยในการ query

## 🛠️ Troubleshooting

### ตรวจสอบ ClickHouse
```bash
# ดู status ของ ClickHouse container
docker-compose ps clickhouse

# ดู logs
docker-compose logs clickhouse

# เข้าไปใน ClickHouse client
docker-compose exec clickhouse clickhouse-client

# ทดสอบ query
SELECT count() FROM authentication_logs;
SHOW TABLES;
```

### Common Issues
1. **Connection refused**: ตรวจสอบ port 8123 และ network
2. **Permission denied**: ตรวจสอบ volume permissions
3. **Out of memory**: เพิ่ม RAM หรือปรับ ClickHouse settings
4. **Slow queries**: ตรวจสอบ indexing และ partitioning

## 📚 เอกสารเพิ่มเติม

- [ClickHouse Documentation](https://clickhouse.com/docs)
- [clickhouse-connect Python Client](https://clickhouse.com/docs/en/integrations/python)
- [ClickHouse Performance Guide](https://clickhouse.com/docs/en/operations/performance)

## 🔮 Next Steps

1. **Load Testing**: ทดสอบ performance กับ log ปริมาณมาก
2. **Monitoring**: เพิ่ม monitoring สำหรับ ClickHouse
3. **Clustering**: Setup ClickHouse cluster สำหรับ production
4. **Data Migration**: Tools สำหรับ migrate data จาก PostgreSQL
5. **Analytics**: เพิ่ม advanced analytics features 