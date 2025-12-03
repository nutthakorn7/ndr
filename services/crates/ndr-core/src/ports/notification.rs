//! Notification service port interface

use async_trait::async_trait;

use crate::domain::Alert;
use crate::error::Result;

/// Notification service for sending alerts
#[async_trait]
pub trait NotificationService: Send + Sync {
    /// Send alert notification
    async fn send_alert(&self, alert: &Alert) -> Result<()>;
    
    /// Send alert to specific analyst
    async fn notify_analyst(&self, analyst: &str, alert: &Alert) -> Result<()>;
    
    /// Send bulk notifications
    async fn send_bulk(&self, alerts: &[Alert]) -> Result<()>;
}

/// Notification channels
#[derive(Debug, Clone)]
pub enum NotificationChannel {
    Email,
    Slack,
    PagerDuty,
    Webhook { url: String },
}
