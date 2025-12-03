//! Alert repository port interface

use async_trait::async_trait;
use uuid::Uuid;

use crate::domain::{Alert, AlertStatus, Severity};
use crate::error::Result;

/// Repository interface for alert persistence
#[async_trait]
pub trait AlertRepository: Send + Sync {
    /// Create a new alert
    async fn create(&self, alert: Alert) -> Result<Alert>;
    
    /// Find alert by ID
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Alert>>;
    
    /// Find recent alerts with optional filters
    async fn find_recent(
        &self,
        limit: usize,
        severity: Option<Severity>,
        status: Option<AlertStatus>,
    ) -> Result<Vec<Alert>>;
    
    /// Update alert
    async fn update(&self, alert: Alert) -> Result<Alert>;
    
    /// Count alerts by severity
    async fn count_by_severity(&self) -> Result<std::collections::HashMap<Severity, u64>>;
    
    /// Find alerts assigned to analyst
    async fn find_by_analyst(&self, analyst: &str) -> Result<Vec<Alert>>;
}
