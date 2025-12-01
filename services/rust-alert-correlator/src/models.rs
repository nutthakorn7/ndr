use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Alert {
    pub id: Option<String>,
    pub rule_id: Option<String>,
    pub title: Option<String>,
    pub severity: Option<String>,
    pub source: Option<Value>,
    pub destination: Option<Value>,
    pub event: Option<Value>,
    pub threat_intel: Option<Value>,
    pub timestamp: Option<String>,
    // Enriched fields
    pub correlation: Option<CorrelationMeta>,
    pub aggregation_count: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CorrelationMeta {
    pub meta_id: Uuid,
    pub aggregation_count: i32,
    pub severity_score: i32,
    pub attack_chain: Vec<ChainEvent>,
    pub status: String,
    pub first_seen: Option<String>,
    pub last_seen: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChainEvent {
    pub id: String,
    pub title: String,
    pub severity: String,
    pub timestamp: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AlertMeta {
    pub id: Uuid,
    pub correlation_id: Option<Uuid>,
    pub original_alert_ids: Option<Vec<String>>,
    pub aggregation_count: Option<i32>,
    pub first_seen: Option<DateTime<Utc>>,
    pub last_seen: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub assigned_to: Option<String>,
    pub severity_score: Option<i32>,
    pub attack_chain: Option<Value>, // JSONB
    pub alert_data: Option<Value>,   // JSONB
    pub notes: Option<Vec<String>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}
