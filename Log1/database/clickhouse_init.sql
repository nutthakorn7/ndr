-- ClickHouse Database Initialization Script
-- สร้าง tables สำหรับระบบ Log Management

-- Authentication Logs Table (MergeTree engine สำหรับ performance)
CREATE TABLE IF NOT EXISTS authentication_logs (
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

-- Firewall Logs Table
CREATE TABLE IF NOT EXISTS firewall_logs (
    id String,
    device_id String,
    device_name String,
    raw_log String,
    original_timestamp DateTime('Asia/Bangkok'),
    received_timestamp DateTime('Asia/Bangkok'),
    log_type String,
    event_type String,
    severity String,
    source_ip String,
    source_port UInt16,
    dest_ip String,
    dest_port UInt16,
    protocol String,
    action String,
    threat_name String,
    threat_category String,
    risk_level String,
    username String,
    user_group String,
    auth_method String,
    application String,
    application_category String,
    url String,
    bytes_sent UInt64,
    bytes_received UInt64,
    packets_sent UInt32,
    packets_received UInt32,
    duration UInt32,
    vpn_tunnel String,
    vpn_user String,
    vpn_realm String,
    policy_id String,
    rule_name String,
    interface_in String,
    interface_out String,
    nat_source_ip String,
    nat_dest_ip String,
    nat_source_port UInt16,
    nat_dest_port UInt16
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(received_timestamp)
ORDER BY (received_timestamp, device_id, log_type)
TTL received_timestamp + INTERVAL 90 DAY DELETE;

-- Log Sources Table (สำหรับเก็บข้อมูล source/device)
CREATE TABLE IF NOT EXISTS log_sources (
    id String,
    name String,
    source_type String,
    ip_address String,
    port UInt16,
    protocol String,
    vendor String,
    model String,
    os_version String,
    is_active UInt8,
    last_collection DateTime('Asia/Bangkok'),
    created_at DateTime('Asia/Bangkok'),
    updated_at DateTime('Asia/Bangkok')
) ENGINE = MergeTree()
ORDER BY (id, source_type);

-- System Events Table (สำหรับ audit log, system events)
CREATE TABLE IF NOT EXISTS system_events (
    id String,
    event_type String,
    user_id String,
    action String,
    resource String,
    details String,
    ip_address String,
    user_agent String,
    timestamp DateTime('Asia/Bangkok'),
    status String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, event_type, user_id)
TTL timestamp + INTERVAL 365 DAY DELETE;

-- Analytics/Aggregated Data Table
CREATE TABLE IF NOT EXISTS log_analytics (
    date Date,
    hour UInt8,
    source_type String,
    event_type String,
    status String,
    count UInt64,
    unique_users UInt64,
    unique_ips UInt64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, hour, source_type, event_type, status);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
    timestamp DateTime('Asia/Bangkok'),
    metric_name String,
    metric_value Float64,
    labels Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, metric_name)
TTL timestamp + INTERVAL 30 DAY DELETE;

-- ดู schema ที่สร้างแล้ว
-- SHOW TABLES;
-- DESCRIBE authentication_logs; 