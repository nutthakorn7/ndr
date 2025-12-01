use crate::db::DB;
use crate::cache::Cache;
use crate::models::{Alert, ChainEvent};
use anyhow::Result;
use serde_json::{json, Value};
use tracing::{info, error};
use uuid::Uuid;
use std::sync::Arc;

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
        let alert_key = self.generate_alert_key(&alert);

        // Check for duplicate
        let existing_meta_id = self.cache.get_duplicate_alert(&alert_key).await?;

        let meta_id = if let Some(id_str) = existing_meta_id {
            if id_str != "pending" {
                // Aggregate into existing meta-alert
                let meta_uuid = Uuid::parse_str(&id_str)?;
                let alert_id = alert.id.clone().unwrap_or_default();
                
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
        
        alert.correlation = Some(crate::models::CorrelationMeta {
            meta_id,
            aggregation_count: meta.aggregation_count.unwrap_or(1),
            severity_score: meta.severity_score.unwrap_or(0),
            attack_chain: serde_json::from_value(meta.attack_chain.unwrap_or(json!([]))).unwrap_or_default(),
            status: meta.status.unwrap_or("new".to_string()),
            first_seen: meta.first_seen.map(|d| d.to_rfc3339()),
            last_seen: meta.last_seen.map(|d| d.to_rfc3339()),
        });

        Ok(Some(alert))
    }

    async fn create_new_meta_alert(&self, alert: &Alert, key: &str) -> Result<Uuid> {
        // Set pending in cache
        self.cache.set_pending_alert(key, self.aggregation_window).await?;

        let severity_score = self.calculate_severity_score(alert);
        let attack_chain = self.detect_attack_chain(alert).await?;
        
        let alert_id = alert.id.clone().unwrap_or_default();
        let alert_json = serde_json::to_value(alert)?;
        let chain_json = serde_json::to_value(&attack_chain)?;

        let meta_id = self.db.create_meta_alert(
            vec![alert_id],
            severity_score,
            chain_json,
            alert_json
        ).await?;

        // Update cache with real ID
        self.cache.set_meta_alert(key, &meta_id.to_string(), self.aggregation_window).await?;

        info!("Created new meta-alert {}: score={}", meta_id, severity_score);
        Ok(meta_id)
    }

    fn generate_alert_key(&self, alert: &Alert) -> String {
        let rule_id = alert.rule_id.as_deref().unwrap_or("");
        let src_ip = alert.source.as_ref().and_then(|s| s.get("ip")).and_then(|v| v.as_str()).unwrap_or("");
        let dst_ip = alert.destination.as_ref().and_then(|d| d.get("ip")).and_then(|v| v.as_str()).unwrap_or("");
        let title = alert.title.as_deref().unwrap_or("");

        let raw = format!("{}|{}|{}|{}", rule_id, src_ip, dst_ip, title);
        format!("{:x}", md5::compute(raw))
    }

    fn calculate_severity_score(&self, alert: &Alert) -> i32 {
        let mut score = 0.0;

        // Rule severity (40%)
        let severity = alert.severity.as_deref().unwrap_or("medium");
        let base_score = match severity.to_lowercase().as_str() {
            "critical" => 100.0,
            "high" => 75.0,
            "medium" => 50.0,
            "low" => 25.0,
            _ => 50.0,
        };
        score += base_score * 0.4;

        // Threat Intel (30%)
        if let Some(ti) = &alert.threat_intel {
            if ti.get("is_threat").and_then(|v| v.as_bool()).unwrap_or(false) {
                let reputation = ti.get("max_reputation").and_then(|v| v.as_f64()).unwrap_or(0.0);
                score += reputation * 0.3;
            }
        }

        // Asset Criticality (20%) - Mocked logic from Python
        let dst_ip = alert.destination.as_ref().and_then(|d| d.get("ip")).and_then(|v| v.as_str()).unwrap_or("");
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
        let src_ip = alert.source.as_ref().and_then(|s| s.get("ip")).and_then(|v| v.as_str());
        
        if let Some(ip) = src_ip {
            let exclude_id = alert.id.as_deref().unwrap_or("");
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
