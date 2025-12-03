//! Alert correlation service

use std::time::Duration;
use uuid::Uuid;

use crate::domain::{Alert, Event};
// use crate::error::Result;

/// Service for correlating related alerts and events
pub struct CorrelationService {
    time_window: Duration,
}

impl CorrelationService {
    pub fn new(time_window: Duration) -> Self {
        Self { time_window }
    }

    /// Find related events for an alert
    pub fn find_related_events(&self, alert: &Alert, events: &[Event]) -> Vec<Uuid> {
        events
            .iter()
            .filter(|e| {
                e.source_ip == alert.source.source_ip
                    && (e.timestamp - alert.timestamp).num_seconds().abs()
                        < self.time_window.as_secs() as i64
            })
            .map(|e| e.id)
            .collect()
    }
}

#[derive(Debug, Clone)]
pub struct CorrelatedGroup {
    pub alerts: Vec<Uuid>,
    pub campaign_name: Option<String>,
    pub confidence_score: f32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_correlation_service_creation() {
        let service = CorrelationService::new(Duration::from_secs(300));
        assert_eq!(service.time_window.as_secs(), 300);
    }
}
