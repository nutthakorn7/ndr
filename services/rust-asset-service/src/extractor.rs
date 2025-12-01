use crate::models::Asset;
use serde_json::{json, Value};

pub struct AssetExtractor;

impl AssetExtractor {
    pub fn extract_from_log(log: &Value) -> Vec<Asset> {
        let mut assets = Vec::new();

        // Extract source asset
        if let Some(src_ip) = log.get("source").and_then(|s| s.get("ip")).and_then(|v| v.as_str()) {
            let mut asset = Asset {
                id: None,
                ip_address: src_ip.to_string(),
                mac_address: log.get("source").and_then(|s| s.get("mac")).and_then(|v| v.as_str()).map(|s| s.to_string()),
                hostname: None,
                os_type: None,
                os_version: None,
                device_type: Self::infer_device_type(log.get("source").and_then(|s| s.get("port")).and_then(|v| v.as_u64())),
                criticality: Some(Self::infer_criticality(src_ip)),
                first_seen: None,
                last_seen: None,
                tags: Some(Self::extract_tags(log, "source")),
                metadata: Some(json!({
                    "ports_seen": log.get("source").and_then(|s| s.get("port")).map(|p| vec![p]),
                    "protocols_seen": log.get("network").and_then(|n| n.get("application")).map(|a| vec![a]),
                    "last_event_type": log.get("event").and_then(|e| e.get("type"))
                })),
                created_at: None,
                updated_at: None,
            };
            
            // Extract OS from User Agent if available (simplified)
            if let Some(ua) = log.get("http").and_then(|h| h.get("user_agent")).and_then(|v| v.as_str()) {
                let ua_lower = ua.to_lowercase();
                if ua_lower.contains("windows") { asset.os_type = Some("Windows".to_string()); }
                else if ua_lower.contains("mac") { asset.os_type = Some("macOS".to_string()); }
                else if ua_lower.contains("linux") { asset.os_type = Some("Linux".to_string()); }
                else if ua_lower.contains("android") { asset.os_type = Some("Android".to_string()); }
                else if ua_lower.contains("ios") || ua_lower.contains("iphone") { asset.os_type = Some("iOS".to_string()); }
            }

            assets.push(asset);
        }

        // Extract destination asset
        if let Some(dst_ip) = log.get("destination").and_then(|d| d.get("ip")).and_then(|v| v.as_str()) {
            let mut asset = Asset {
                id: None,
                ip_address: dst_ip.to_string(),
                mac_address: log.get("destination").and_then(|d| d.get("mac")).and_then(|v| v.as_str()).map(|s| s.to_string()),
                hostname: None,
                os_type: None,
                os_version: None,
                device_type: Self::infer_device_type(log.get("destination").and_then(|d| d.get("port")).and_then(|v| v.as_u64())),
                criticality: Some(Self::infer_criticality(dst_ip)),
                first_seen: None,
                last_seen: None,
                tags: Some(Self::extract_tags(log, "destination")),
                metadata: Some(json!({
                    "ports_seen": log.get("destination").and_then(|d| d.get("port")).map(|p| vec![p]),
                    "protocols_seen": log.get("network").and_then(|n| n.get("application")).map(|a| vec![a]),
                    "last_event_type": log.get("event").and_then(|e| e.get("type"))
                })),
                created_at: None,
                updated_at: None,
            };

            // Extract hostname from DNS
            if let Some(query) = log.get("dns").and_then(|d| d.get("question")).and_then(|q| q.get("name")).and_then(|v| v.as_str()) {
                asset.hostname = Some(query.to_string());
            }

            // Extract hostname from TLS SNI
            if let Some(sni) = log.get("tls").and_then(|t| t.get("server_name")).and_then(|v| v.as_str()) {
                asset.hostname = Some(sni.to_string());
            }

            assets.push(asset);
        }

        assets
    }

    fn infer_device_type(port: Option<u64>) -> Option<String> {
        match port {
            Some(p) => {
                let server_ports = vec![80, 443, 22, 21, 25, 110, 143, 3306, 5432, 27017, 6379, 9200];
                if server_ports.contains(&p) {
                    Some("server".to_string())
                } else if p > 49152 {
                    Some("endpoint".to_string())
                } else {
                    None
                }
            },
            None => None
        }
    }

    fn infer_criticality(ip: &str) -> String {
        if ip.starts_with("10.0.0.") || ip.starts_with("172.16.") {
            "high".to_string()
        } else if ip.starts_with("192.168.") {
            "medium".to_string()
        } else {
            "unknown".to_string()
        }
    }

    fn extract_tags(log: &Value, _direction: &str) -> Vec<String> {
        let mut tags = Vec::new();
        
        if let Some(cat) = log.get("event").and_then(|e| e.get("category")).and_then(|v| v.as_str()) {
            tags.push(format!("traffic:{}", cat));
        }
        if let Some(app) = log.get("network").and_then(|n| n.get("application")).and_then(|v| v.as_str()) {
            tags.push(format!("protocol:{}", app));
        }
        
        // Provider tags
        if let Some(provider) = log.get("event").and_then(|e| e.get("provider")).and_then(|v| v.as_str()) {
             tags.push(format!("source:{}", provider));
        }

        tags
    }
}
