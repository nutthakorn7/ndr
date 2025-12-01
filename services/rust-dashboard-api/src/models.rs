use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Debug)]
pub struct EventSearchRequest {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
    pub severity: Option<String>,
    pub event_type: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub q: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EventResponse {
    pub events: Vec<Value>,
    pub total: u64,
    pub limit: u64,
    pub offset: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TrafficStat {
    pub timestamp: String,
    pub bytes: f64,
}
