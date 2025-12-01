use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Asset {
    pub id: Option<Uuid>,
    pub ip_address: String,
    pub mac_address: Option<String>,
    pub hostname: Option<String>,
    pub os_type: Option<String>,
    pub os_version: Option<String>,
    pub device_type: Option<String>,
    pub criticality: Option<String>,
    pub first_seen: Option<DateTime<Utc>>,
    pub last_seen: Option<DateTime<Utc>>,
    pub tags: Option<Vec<String>>,
    pub metadata: Option<Value>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssetStats {
    pub total: i64,
    pub by_type: Vec<CountStat>,
    pub by_criticality: Vec<CountStat>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CountStat {
    pub name: Option<String>,
    pub count: i64,
}

#[derive(Debug, Deserialize)]
pub struct AssetFilter {
    pub ip_address: Option<String>,
    pub hostname: Option<String>,
    pub criticality: Option<String>,
    pub device_type: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}
