//! Threat scoring service

use crate::domain::{Alert, Event, Severity};

/// Service for calculating threat scores
pub struct ThreatScoringService;

impl ThreatScoringService {
    pub fn new() -> Self {
        Self
    }

    /// Calculate threat score for an alert
    pub fn score_alert(&self, alert: &Alert) -> u8 {
        let mut score = match alert.severity {
            Severity::Critical => 90,
            Severity::High => 70,
            Severity::Medium => 50,
            Severity::Low => 30,
            Severity::Info => 10,
        };

        // Boost score for MITRE ATT&CK techniques
        if !alert.metadata.mitre_tactics.is_empty() {
            score = (score + 10).min(100);
        }

        // Boost score for multiple affected assets
        if alert.metadata.affected_assets.len() > 1 {
            score = (score + 5 * alert.metadata.affected_assets.len() as u8).min(100);
        }

        score
    }

    /// Calculate risk score for an event
    pub fn score_event(&self, event: &Event) -> u8 {
        match event.severity {
            Severity::Critical => 95,
            Severity::High => 75,
            Severity::Medium => 55,
            Severity::Low => 35,
            Severity::Info => 15,
        }
    }
}

impl Default for ThreatScoringService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{AlertMetadata, EventSource};

    #[test]
    fn test_alert_scoring() {
        let service = ThreatScoringService::new();

        let source = EventSource {
            source_ip: "192.168.1.100".to_string(),
            dest_ip: None,
            protocol: None,
            event_type: "test".to_string(),
        };

        let alert = Alert::new(Severity::High, "Test".to_string(), source);
        let score = service.score_alert(&alert);

        assert_eq!(score, 70);
    }

    #[test]
    fn test_alert_scoring_with_mitre() {
        let service = ThreatScoringService::new();

        let source = EventSource {
            source_ip: "192.168.1.100".to_string(),
            dest_ip: None,
            protocol: None,
            event_type: "test".to_string(),
        };

        let mut alert = Alert::new(Severity::High, "Test".to_string(), source);
        alert.metadata.mitre_tactics = vec!["T1078".to_string()];

        let score = service.score_alert(&alert);
        assert_eq!(score, 80); // 70 + 10 for MITRE
    }
}
