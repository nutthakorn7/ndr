//! Models for Alert Correlator
//!
//! This file now re-exports shared domain models from ndr-core
//! and adds service-specific types for correlation metadata.

// Re-export shared domain types
pub use ndr_core::domain::{Alert, Severity};

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use serde_json::Value;

/// Correlation-specific metadata (service-specific, not in ndr-core)
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

/// Database model for alert metadata (correlation-specific)
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

// Helper to convert ndr_core::Alert to our database format if needed
impl AlertMeta {
    pub fn from_alert(alert: &Alert) -> Self {
        Self {
            id: alert.id,
            correlation_id: None,
            original_alert_ids: None,
            aggregation_count: Some(1),
            first_seen: Some(alert.timestamp),
            last_seen: Some(alert.timestamp),
            status: Some(format!("{:?}", alert.status)),
            assigned_to: alert.assigned_to.clone(),
            severity_score: Some(alert.severity as i32),
            attack_chain: None,
            alert_data: serde_json::to_value(alert).ok(),
            notes: None,
            created_at: Some(alert.created_at),
            updated_at: Some(alert.updated_at),
        }
    }
}
