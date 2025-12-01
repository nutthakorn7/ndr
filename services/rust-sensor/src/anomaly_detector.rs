use crate::flow_tracker::Flow;
use serde::{Serialize, Deserialize};
use std::net::IpAddr;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub alert_id: String,
    pub timestamp: DateTime<Utc>,
    pub severity: Severity,
    pub rule_name: String,
    pub description: String,
    pub source_ip: String,
    pub dest_ip: Option<String>,
    pub evidence: serde_json::Value,
}

pub struct AnomalyDetector {
    port_scan_threshold: usize,
    large_transfer_mb: u64,
}

impl AnomalyDetector {
    pub fn new(port_scan_threshold: usize, large_transfer_mb: u64) -> Self {
        AnomalyDetector {
            port_scan_threshold,
            large_transfer_mb,
        }
    }

    pub fn check_flow(&self, flow: &Flow) -> Vec<Alert> {
        let mut alerts = Vec::new();

        // Rule 1: Large Data Transfer
        let transfer_mb = flow.byte_count / (1024 * 1024);
        if transfer_mb >= self.large_transfer_mb {
            alerts.push(Alert {
                alert_id: Uuid::new_v4().to_string(),
                timestamp: Utc::now(),
                severity: Severity::Medium,
                rule_name: "Large Data Transfer".to_string(),
                description: format!("Large data transfer detected: {}MB", transfer_mb),
                source_ip: flow.five_tuple.src_ip.to_string(),
                dest_ip: Some(flow.five_tuple.dst_ip.to_string()),
                evidence: serde_json::json!({
                    "bytes": flow.byte_count,
                    "duration_secs": flow.duration().as_secs(),
                    "bytes_per_sec": flow.bytes_per_second() as u64,
                }),
            });
        }

        // Rule 2: Short-lived High Packet Count (possible flood)
        if flow.duration().as_secs() < 1 && flow.packet_count > 100 {
            alerts.push(Alert {
                alert_id: Uuid::new_v4().to_string(),
                timestamp: Utc::now(),
                severity: Severity::Medium,
                rule_name: "Short-lived High Packet Count".to_string(),
                description: format!("{} packets in <1 second", flow.packet_count),
                source_ip: flow.five_tuple.src_ip.to_string(),
                dest_ip: Some(flow.five_tuple.dst_ip.to_string()),
                evidence: serde_json::json!({
                    "packets": flow.packet_count,
                    "duration_ms": flow.duration().as_millis(),
                }),
            });
        }

        // Rule 3: Unusual Ports (basic check)
        let common_ports = [80, 443, 22, 53, 25, 110, 143, 3306, 5432];
        if !common_ports.contains(&flow.five_tuple.dst_port) 
            && flow.five_tuple.dst_port < 1024 {
            alerts.push(Alert {
                alert_id: Uuid::new_v4().to_string(),
                timestamp: Utc::now(),
                severity: Severity::Low,
                rule_name: "Unusual Port".to_string(),
                description: format!("Traffic on uncommon privileged port: {}", flow.five_tuple.dst_port),
                source_ip: flow.five_tuple.src_ip.to_string(),
                dest_ip: Some(flow.five_tuple.dst_ip.to_string()),
                evidence: serde_json::json!({
                    "port": flow.five_tuple.dst_port,
                    "protocol": flow.five_tuple.protocol,
                }),
            });
        }

        alerts
    }
}
