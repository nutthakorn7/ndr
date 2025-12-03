use crate::db::DB;
use crate::cache::Cache;
use crate::models::ChainEvent;
use ndr_core::domain::Alert;
use anyhow::Result;
use ndr_telemetry::info;
use uuid::Uuid;

pub struct CorrelationEngine {
    db: DB,
    cache: Cache,
    aggregation_window: usize,
}

impl CorrelationEngine {
    pub fn new(db: DB, cache: Cache) -> Self {
        let aggregation_window = std::env::var("AGGREGATION_WINDOW")
            .unwrap_or_else(|_| "300".to_string())
            .parse()
            .unwrap_or(300);

        Self {
            db,
            cache,
            aggregation_window,
        }
    }

    pub async fn process_alert(&self, mut alert: Alert) -> Result<Option<Alert>> {
        let alert_key = Self::generate_alert_key(&alert);

        // Check for duplicate
        let existing_meta_id = self.cache.get_duplicate_alert(&alert_key).await?;

        let meta_id = if let Some(id_str) = existing_meta_id {
            if id_str != "pending" {
                // Aggregate into existing meta-alert
                let meta_uuid = Uuid::parse_str(&id_str)?;
                let alert_id = alert.id.to_string();  // id is Uuid
                
                let (count, score) = self.db.update_meta_alert(meta_uuid, alert_id).await?;
                
                // Recalculate severity if needed (simplified here)
                // In a real implementation, we might want to re-evaluate the score based on the new count
                
                info!("Aggregated duplicate alert into {}: count={}", meta_uuid, count);
                meta_uuid
            } else {
                // It's pending, meaning another instance is processing the first one.
                // We could wait or just drop it. For now, let's treat it as a new one if it's just "pending" for too long?
                // Or actually, if it's pending, we should probably wait. But for simplicity, let's create a new one.
                // Re-implementing Python logic: if pending, it returns None in Python? No, it sets pending.
                // Let's just create a new one to be safe.
                self.create_new_meta_alert(&alert, &alert_key).await?
            }
        } else {
            // New alert
            self.create_new_meta_alert(&alert, &alert_key).await?
        };

        // Enrich alert with meta info
        let meta = self.db.get_meta_alert(meta_id).await?;
        
        // Note: ndr_core::Alert doesn't have .correlation field
        // We return the alert as-is, correlation data is stored in DB
        // If needed, create a wrapper type for enriched alerts
        
        Ok(Some(alert))
    }

    async fn create_new_meta_alert(&self, alert: &Alert, key: &str) -> Result<Uuid> {
        // Set pending in cache
        self.cache.set_pending_alert(key, self.aggregation_window as u64).await?;

        let severity_score = Self::calculate_severity_score(alert);
        let attack_chain = self.detect_attack_chain(alert).await?;
        
        let alert_id = alert.id.to_string(); // id is now Uuid, convert to String
        let alert_json = serde_json::to_value(alert)?;
        let chain_json = serde_json::to_value(&attack_chain)?;

        let meta_id = self.db.create_meta_alert(
            vec![alert_id],
            severity_score,
            chain_json,
            alert_json
        ).await?;

        // Update cache with real ID
        self.cache.set_meta_alert(key, &meta_id.to_string(), self.aggregation_window as u64).await?;

        info!("Created new meta-alert {}: score={}", meta_id, severity_score);
        Ok(meta_id)
    }

    pub(crate) fn generate_alert_key(alert: &Alert) -> String {
        let rule_id = alert.rule_name();
        let src_ip = alert.source_ip().unwrap_or("");
        let dst_ip = alert.dest_ip().unwrap_or("");
        let title = &alert.description;

        let raw = format!("{}|{}|{}|{}", rule_id, src_ip, dst_ip, title);
        // Use md-5 crate
        use md5::{Md5, Digest};
        let hash = Md5::digest(raw.as_bytes());
        format!("{:x}", hash)
    }

    pub(crate) fn calculate_severity_score(alert: &Alert) -> i32 {
        let mut score = 0.0;

        // Rule severity (40%)
        let base_score = match alert.severity {
            ndr_core::domain::Severity::Critical => 100.0,
            ndr_core::domain::Severity::High => 75.0,
            ndr_core::domain::Severity::Medium => 50.0,
            ndr_core::domain::Severity::Low => 25.0,
            ndr_core::domain::Severity::Info => 10.0,
        };
        score += base_score * 0.4;

        // Threat Intel (30%) - Simplified, ndr_core doesn't have threat_intel field
        // Would need to extend or query separately
        score += 0.0;

        // Asset Criticality (20%) - Based on dest_ip
        let dst_ip = alert.dest_ip().unwrap_or("");
        if dst_ip.starts_with("10.0.0.") {
            score += 100.0 * 0.2;
        } else if dst_ip.starts_with("192.168.") {
            score += 50.0 * 0.2;
        }

        // Frequency (10%) - Initial is 1
        score += 10.0 * 0.1;

        score as i32
    }

    async fn detect_attack_chain(&self, alert: &Alert) -> Result<Vec<ChainEvent>> {
        let src_ip = alert.source_ip();
        
        if let Some(ip) = src_ip {
            let exclude_id = &alert.id.to_string();
            let related = self.db.find_related_alerts(ip, exclude_id).await?;
            
            let mut chain = Vec::new();
            for (id, data, ts) in related {
                chain.push(ChainEvent {
                    id: id.to_string(),
                    title: data.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    severity: data.get("severity").and_then(|v| v.as_str()).unwrap_or("medium").to_string(),
                    timestamp: Some(ts.to_rfc3339()),
                });
            }
            Ok(chain)
        } else {
            Ok(Vec::new())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ndr_core::domain::{Alert, Severity, EventSource};

    #[test]
    fn test_severity_calculation() {
        let source = EventSource {
            source_ip: "1.2.3.4".to_string(),
            dest_ip: None,
            protocol: None,
            event_type: "test".to_string(),
        };

        let alert = Alert::new(
            Severity::High,
            "Test Alert".to_string(),
            source,
        );
        
        let score = CorrelationEngine::calculate_severity_score(&alert);
        // High = 75 * 0.4 = 30
        // Freq = 10 * 0.1 = 1
        // Total = 31
        assert_eq!(score, 31);
    }

    #[test]
    fn test_severity_calculation_critical_asset() {
        let source = EventSource {
            source_ip: "1.2.3.4".to_string(),
            dest_ip: Some("10.0.0.5".to_string()),
            protocol: None,
            event_type: "test".to_string(),
        };

        let alert = Alert::new(
            Severity::Critical,
            "Test Alert".to_string(),
            source,
        );
        
        let score = CorrelationEngine::calculate_severity_score(&alert);
        // Critical = 100 * 0.4 = 40
        // Asset (10.0.0.x) = 100 * 0.2 = 20
        // Freq = 10 * 0.1 = 1
        // Total = 61
        assert_eq!(score, 61);
    }

    #[test]
    fn test_alert_key_generation() {
        let source = EventSource {
            source_ip: "1.2.3.4".to_string(),
            dest_ip: Some("5.6.7.8".to_string()),
            protocol: None,
            event_type: "test".to_string(),
        };

        let alert = Alert::new(
            Severity::High,
            "Test Alert".to_string(),
            source,
        );

        let key1 = CorrelationEngine::generate_alert_key(&alert);
        let key2 = CorrelationEngine::generate_alert_key(&alert);
        
        assert_eq!(key1, key2);
        assert!(!key1.is_empty());
    }
}
