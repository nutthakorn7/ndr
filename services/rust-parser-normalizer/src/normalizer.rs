use serde_json::{json, Value};
use chrono::{DateTime, Utc};

pub struct LogNormalizer;

impl LogNormalizer {
    pub fn new() -> Self {
        Self
    }

    pub fn normalize(&self, mut parsed_log: Value) -> Value {
        let mut normalized = json!({
            "@timestamp": self.normalize_timestamp(&parsed_log),
            "event": self.normalize_event(&parsed_log),
            "source": parsed_log.get("source").unwrap_or(&json!({})).clone(),
            "destination": parsed_log.get("destination").unwrap_or(&json!({})).clone(),
            "network": parsed_log.get("network").unwrap_or(&json!({})).clone(),
            "user": parsed_log.get("user").unwrap_or(&json!({})).clone(),
            "process": parsed_log.get("process").unwrap_or(&json!({})).clone(),
            "file": parsed_log.get("file").unwrap_or(&json!({})).clone(),
            "dns": parsed_log.get("dns").unwrap_or(&json!({})).clone(),
            "sensor": parsed_log.get("sensor").unwrap_or(&json!({})).clone(),
            "suricata": parsed_log.get("suricata").unwrap_or(&json!({})).clone(),
            "zeek": parsed_log.get("zeek").unwrap_or(&json!({})).clone(),
            "tenant_id": parsed_log.get("tenant_id").unwrap_or(&json!("default")).clone(),
        });

        self.map_fields(&parsed_log, &mut normalized);
        
        if parsed_log.get("log_type").and_then(|s| s.as_str()) == Some("zeek") {
            self.apply_zeek_mappings(&parsed_log, &mut normalized);
        }
        
        if parsed_log.get("log_type").and_then(|s| s.as_str()) == Some("suricata") {
            self.apply_suricata_mappings(&parsed_log, &mut normalized);
        }

        // Add normalized timestamp
        if let Some(obj) = normalized.as_object_mut() {
            obj.insert("normalized_timestamp".to_string(), json!(Utc::now().to_rfc3339()));
            obj.insert("original".to_string(), parsed_log);
        }

        normalized
    }

    fn normalize_timestamp(&self, log: &Value) -> String {
        if let Some(ts) = log.get("@timestamp").and_then(|v| v.as_str()) {
            return ts.to_string();
        }
        if let Some(ts) = log.get("timestamp").and_then(|v| v.as_str()) {
            // Try to parse if needed, or just return
            return ts.to_string();
        }
        Utc::now().to_rfc3339()
    }

    fn normalize_event(&self, log: &Value) -> Value {
        let mut event = json!({
            "type": log.get("event_type").or(log.get("event").and_then(|e| e.get("type"))).unwrap_or(&json!("unknown")),
            "category": "other", // Default
            "severity": log.get("severity").unwrap_or(&json!("medium")),
        });

        // Simple categorization logic
        let type_str = event["type"].as_str().unwrap_or("").to_lowercase();
        if type_str.contains("connection") || type_str.contains("network") || type_str.contains("dns") {
            event["category"] = json!("network");
        } else if type_str.contains("process") {
            event["category"] = json!("process");
        } else if type_str.contains("file") {
            event["category"] = json!("file");
        }

        event
    }

    fn map_fields(&self, source: &Value, target: &mut Value) {
        // Basic mapping
        if let Some(src_ip) = source.get("src_ip").or(source.get("clientip")) {
            self.set_nested(target, "source.ip", src_ip.clone());
        }
        if let Some(dst_ip) = source.get("dst_ip") {
            self.set_nested(target, "destination.ip", dst_ip.clone());
        }
        if let Some(src_port) = source.get("src_port") {
            self.set_nested(target, "source.port", src_port.clone());
        }
        if let Some(dst_port) = source.get("dst_port") {
            self.set_nested(target, "destination.port", dst_port.clone());
        }
        if let Some(proto) = source.get("protocol") {
            self.set_nested(target, "network.protocol", proto.clone());
        }
        if let Some(bytes) = source.get("bytes") {
            self.set_nested(target, "network.bytes", bytes.clone());
        }
    }

    fn apply_zeek_mappings(&self, source: &Value, target: &mut Value) {
        let zeek = source.get("zeek").unwrap_or(source);
        
        if let Some(orig_h) = zeek.get("id.orig_h") {
            self.set_nested(target, "source.ip", orig_h.clone());
        }
        if let Some(resp_h) = zeek.get("id.resp_h") {
            self.set_nested(target, "destination.ip", resp_h.clone());
        }
        if let Some(orig_p) = zeek.get("id.orig_p") {
            self.set_nested(target, "source.port", orig_p.clone());
        }
        if let Some(resp_p) = zeek.get("id.resp_p") {
            self.set_nested(target, "destination.port", resp_p.clone());
        }
    }

    fn apply_suricata_mappings(&self, source: &Value, target: &mut Value) {
        let eve = source.get("suricata").unwrap_or(source);

        if let Some(src_ip) = eve.get("src_ip") {
            self.set_nested(target, "source.ip", src_ip.clone());
        }
        if let Some(dest_ip) = eve.get("dest_ip") {
            self.set_nested(target, "destination.ip", dest_ip.clone());
        }
        
        if let Some(alert) = eve.get("alert") {
            self.set_nested(target, "event.kind", json!("signal"));
            self.set_nested(target, "event.category", json!("network"));
            self.set_nested(target, "event.type", json!("alert"));
            if let Some(sig) = alert.get("signature") {
                self.set_nested(target, "rule.name", sig.clone());
            }
        }
    }

    fn set_nested(&self, obj: &mut Value, path: &str, value: Value) {
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = obj;
        
        for (i, part) in parts.iter().enumerate() {
            if i == parts.len() - 1 {
                if let Some(o) = current.as_object_mut() {
                    o.insert(part.to_string(), value);
                }
                break;
            }
            
            if !current.get(*part).is_some() {
                if let Some(o) = current.as_object_mut() {
                    o.insert(part.to_string(), json!({}));
                }
            }
            if let Some(next) = current.get_mut(*part) {
                current = next;
            } else {
                return; // Failed to traverse path
            }
        }
    }
}
