//! Alert domain model

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::Severity;
use crate::error::{CoreError, Result};

/// Security alert entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub severity: Severity,
    pub title: String,
    pub description: String,
    pub source: EventSource,
    pub status: AlertStatus,
    pub assigned_to: Option<String>,
    pub metadata: AlertMetadata,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventSource {
    pub source_ip: String,
    pub dest_ip: Option<String>,
    pub protocol: Option<String>,
    pub event_type: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum AlertStatus {
    Open,
    Investigating { analyst: String },
    Resolved { resolution: String },
    FalsePositive,
    Closed,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AlertMetadata {
    pub tags: Vec<String>,
    pub mitre_tactics: Vec<String>,
    pub affected_assets: Vec<String>,
    pub related_alerts: Vec<Uuid>,
}

impl Alert {
    /// Create a new alert
    pub fn new(severity: Severity, title: String, source: EventSource) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            timestamp: now,
            severity,
            title,
            description: String::new(),
            source,
            status: AlertStatus::Open,
            assigned_to: None,
            metadata: AlertMetadata::default(),
            created_at: now,
            updated_at: now,
        }
    }
    
    /// Assign alert to an analyst
    pub fn assign(&mut self, analyst: String) -> Result<()> {
        match self.status {
            AlertStatus::Closed | AlertStatus::Resolved { .. } => {
                Err(CoreError::invalid_state("Cannot assign closed alert"))
            }
            _ => {
                self.status = AlertStatus::Investigating { 
                    analyst: analyst.clone() 
                };
                self.assigned_to = Some(analyst);
                self.updated_at = Utc::now();
                Ok(())
            }
        }
    }
    
    /// Resolve the alert
    pub fn resolve(&mut self, resolution: String) -> Result<()> {
        if self.status == AlertStatus::Closed {
            return Err(CoreError::invalid_state("Alert is already closed"));
        }
        
        self.status = AlertStatus::Resolved { resolution };
        self.updated_at = Utc::now();
        Ok(())
    }
    
    /// Close the alert
    pub fn close(&mut self) -> Result<()> {
        self.status = AlertStatus::Closed;
        self.updated_at = Utc::now();
        Ok(())
    }
    
    /// Check if alert is still active
    pub fn is_active(&self) -> bool {
        !matches!(
            self.status,
            AlertStatus::Closed | AlertStatus::Resolved { .. } | AlertStatus::FalsePositive
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_alert_creation() {
        let source = EventSource {
            source_ip: "192.168.1.100".to_string(),
            dest_ip: Some("10.0.0.1".to_string()),
            protocol: Some("TCP".to_string()),
            event_type: "intrusion_attempt".to_string(),
        };
        
        let alert = Alert::new(
            Severity::High,
            "Suspicious network activity detected".to_string(),
            source,
        );
        
        assert_eq!(alert.severity, Severity::High);
        assert_eq!(alert.status, AlertStatus::Open);
        assert!(alert.is_active());
    }
    
    #[test]
    fn test_alert_assignment() {
        let source = EventSource {
            source_ip: "192.168.1.100".to_string(),
            dest_ip: None,
            protocol: None,
            event_type: "test".to_string(),
        };
        
        let mut alert = Alert::new(Severity::Medium, "Test".to_string(), source);
        
        assert!(alert.assign("analyst@example.com".to_string()).is_ok());
        assert_eq!(alert.assigned_to, Some("analyst@example.com".to_string()));
        assert!(alert.is_active());
    }
    
    #[test]
    fn test_cannot_assign_closed_alert() {
        let source = EventSource {
            source_ip: "192.168.1.100".to_string(),
            dest_ip: None,
            protocol: None,
            event_type: "test".to_string(),
        };
        
        let mut alert = Alert::new(Severity::Low, "Test".to_string(), source);
        alert.close().unwrap();
        
        assert!(alert.assign("analyst@example.com".to_string()).is_err());
    }
}
