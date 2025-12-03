//! Detection rule domain model

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::Severity;

/// Detection rule for identifying threats
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Detection {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub severity: Severity,
    pub rule_type: RuleType,
    pub enabled: bool,
    pub conditions: Vec<Condition>,
    pub actions: Vec<Action>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub metadata: DetectionMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RuleType {
    Signature,
    Behavioral,
    Statistical,
    MachineLearning,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Condition {
    pub field: String,
    pub operator: Operator,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Operator {
    Equals,
    NotEquals,
    GreaterThan,
    LessThan,
    Contains,
    Regex,
    InList,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Action {
    CreateAlert,
    BlacklistIP,
    NotifyAnalyst,
    RunPlaybook { playbook_id: String },
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DetectionMetadata {
    pub mitre_techniques: Vec<String>,
    pub references: Vec<String>,
    pub tags: Vec<String>,
    pub false_positive_rate: Option<f32>,
}

impl Detection {
    pub fn new(name: String, severity: Severity, rule_type: RuleType) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            name,
            description: String::new(),
            severity,
            rule_type,
            enabled: true,
            conditions: Vec::new(),
            actions: vec![Action::CreateAlert],
            created_at: now,
            updated_at: now,
            metadata: DetectionMetadata::default(),
        }
    }
}
