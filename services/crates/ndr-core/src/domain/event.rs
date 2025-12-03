//! Security event domain model

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::Severity;

/// Security event from network monitoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub source_ip: String,
    pub dest_ip: String,
    pub source_port: Option<u16>,
    pub dest_port: Option<u16>,
    pub protocol: Protocol,
    pub event_type: String,
    pub severity: Severity,
    pub payload_size: usize,
    pub metadata: EventMetadata,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum Protocol {
    TCP,
    UDP,
    ICMP,
    HTTP,
    HTTPS,
    DNS,
    SSH,
    Other,
}

impl Protocol {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::TCP => "TCP",
            Self::UDP => "UDP",
            Self::ICMP => "ICMP",
            Self::HTTP => "HTTP",
            Self::HTTPS => "HTTPS",
            Self::DNS => "DNS",
            Self::SSH => "SSH",
            Self::Other => "Other",
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EventMetadata {
    pub raw_data: Option<String>,
    pub geo_location: Option<GeoLocation>,
    pub enrichment: Vec<Enrichment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoLocation {
    pub country: String,
    pub city: Option<String>,
    pub latitude: f64,
    pub longitude: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Enrichment {
    pub source: String,
    pub data: serde_json::Value,
}

impl Event {
    pub fn new(
        source_ip: String,
        dest_ip: String,
        protocol: Protocol,
        event_type: String,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            timestamp: Utc::now(),
            source_ip,
            dest_ip,
            source_port: None,
            dest_port: None,
            protocol,
            event_type,
            severity: Severity::Info,
            payload_size: 0,
            metadata: EventMetadata::default(),
        }
    }
}
