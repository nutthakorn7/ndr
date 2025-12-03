//! Alert DTOs

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use ndr_core::domain::{Alert, AlertStatus, Severity};

/// Alert DTO for API responses
#[derive(Debug, Serialize, Deserialize)]
pub struct AlertDto {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub severity: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub assigned_to: Option<String>,
}

impl From<Alert> for AlertDto {
    fn from(alert: Alert) -> Self {
        Self {
            id: alert.id,
            timestamp: alert.timestamp,
            severity: alert.severity.as_str().to_string(),
            title: alert.title,
            description: alert.description,
            status: format!("{:?}", alert.status),
            assigned_to: alert.assigned_to,
        }
    }
}

/// Request to create an alert
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAlertRequest {
    pub severity: String,
    pub title: String,
    pub description: Option<String>,
    pub source_ip: String,
    pub dest_ip: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use ndr_core::domain::EventSource;

    #[test]
    fn test_alert_dto_conversion() {
        let source = EventSource {
            source_ip: "192.168.1.100".to_string(),
            dest_ip: None,
            protocol: None,
            event_type: "test".to_string(),
        };

        let alert = Alert::new(Severity::High, "Test".to_string(), source);
        let dto: AlertDto = alert.into();

        assert_eq!(dto.severity, "high");
        assert_eq!(dto.title, "Test");
    }
}
