use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Alert {
    pub title: String,
    pub severity: String,
    pub category: String,
    pub description: Option<String>,
    pub source: Option<Source>,
    pub destination: Option<Destination>,
    #[serde(flatten)]
    pub extra: serde_json::Value,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Source {
    pub ip: Option<String>,
    pub port: Option<u16>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Destination {
    pub ip: Option<String>,
    pub port: Option<u16>,
}

#[derive(Debug, Clone)]
pub struct Playbook {
    pub name: String,
    pub trigger: Trigger,
    pub actions: Vec<ActionConfig>,
}

#[derive(Debug, Clone)]
pub enum Trigger {
    Severity(String), // e.g., "critical"
    Category(String), // e.g., "malware"
}

#[derive(Debug, Clone)]
pub struct ActionConfig {
    pub action_type: ActionType,
    pub params: serde_json::Value,
}

#[derive(Debug, Clone)]
pub enum ActionType {
    Webhook,
    Log,
    BlockIP,
}
