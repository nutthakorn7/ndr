pub use serde::{Deserialize, Serialize};
pub use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionRule {
    pub name: String,
    pub severity: String,
    pub pattern: String,
    pub enabled: bool,
}

pub struct LocalDetector {
    rules: Vec<DetectionRule>,
}

impl LocalDetector {
    pub fn new() -> Self {
        Self {
            rules: Self::default_rules(),
        }
    }

    fn default_rules() -> Vec<DetectionRule> {
        vec![
            DetectionRule {
                name: "High Volume Traffic".to_string(),
                severity: "medium".to_string(),
                pattern: "packets_per_second > 10000".to_string(),
                enabled: true,
            },
            DetectionRule {
                name: "Suspicious Port Scan".to_string(),
                severity: "high".to_string(),
                pattern: "unique_ports > 100".to_string(),
                enabled: true,
            },
            DetectionRule {
                name: "Known Malicious IP".to_string(),
                severity: "critical".to_string(),
                pattern: "threat_intel_match = true".to_string(),
                enabled: true,
            },
        ]
    }

    pub fn analyze(&self, event: &Value) -> Option<DetectionResult> {
        // Simple pattern matching for now
        // In a real implementation, this would use a proper rule engine

        for rule in &self.rules {
            if !rule.enabled {
                continue;
            }

            if self.matches_rule(event, rule) {
                return Some(DetectionResult {
                    rule_name: rule.name.clone(),
                    severity: rule.severity.clone(),
                    matched: true,
                });
            }
        }

        None
    }

    fn matches_rule(&self, event: &Value, rule: &DetectionRule) -> bool {
        // Simplified rule matching
        // Real implementation would parse and evaluate the pattern properly
        
        match rule.name.as_str() {
            "High Volume Traffic" => {
                if let Some(pps) = event.get("packets_per_second").and_then(|v| v.as_u64()) {
                    return pps > 10000;
                }
            }
            "Suspicious Port Scan" => {
                if let Some(ports) = event.get("unique_ports").and_then(|v| v.as_u64()) {
                    return ports > 100;
                }
            }
            "Known Malicious IP" => {
                if let Some(threat) = event.get("threat_intel_match").and_then(|v| v.as_bool()) {
                    return threat;
                }
            }
            _ => {}
        }

        false
    }

    pub fn update_rules(&mut self, rules: Vec<DetectionRule>) {
        self.rules = rules;
        ndr_telemetry::info!("Updated {} detection rules", self.rules.len());
    }

    pub fn get_priority(&self, event: &Value) -> i32 {
        if let Some(result) = self.analyze(event) {
            match result.severity.as_str() {
                "critical" => 100,
                "high" => 75,
                "medium" => 50,
                "low" => 25,
                _ => 0,
            }
        } else {
            0
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionResult {
    pub rule_name: String,
    pub severity: String,
    pub matched: bool,
}
