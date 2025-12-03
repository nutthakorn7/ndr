//! Network asset domain model

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Network asset (host, device, service)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset {
    pub id: Uuid,
    pub asset_type: AssetType,
    pub ip_address: String,
    pub mac_address: Option<String>,
    pub hostname: Option<String>,
    pub operating_system: Option<String>,
    pub services: Vec<Service>,
    pub risk_score: u8,
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
    pub metadata: AssetMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AssetType {
    Server,
    Workstation,
    NetworkDevice,
    IoT,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Service {
    pub port: u16,
    pub protocol: String,
    pub service_name: String,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AssetMetadata {
    pub tags: Vec<String>,
    pub owner: Option<String>,
    pub location: Option<String>,
    pub criticality: Criticality,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub enum Criticality {
    Critical,
    High,
    #[default]
    Medium,
    Low,
}

impl Asset {
    pub fn new(ip_address: String, asset_type: AssetType) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            asset_type,
            ip_address,
            mac_address: None,
            hostname: None,
            operating_system: None,
            services: Vec::new(),
            risk_score: 0,
            first_seen: now,
            last_seen: now,
            metadata: AssetMetadata::default(),
        }
    }
    
    pub fn update_last_seen(&mut self) {
        self.last_seen = Utc::now();
    }
}
