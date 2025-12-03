use evalexpr::*;
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
                pattern: "threat_intel_match == true".to_string(),
                enabled: true,
            },
        ]
    }

    pub fn analyze(
        &self,
        event: &Value,
        ioc_store: &crate::ioc_store::IocStore,
    ) -> Option<DetectionResult> {
        for rule in &self.rules {
            if !rule.enabled {
                continue;
            }

            if self.matches_rule(event, rule, ioc_store) {
                return Some(DetectionResult {
                    rule_name: rule.name.clone(),
                    severity: rule.severity.clone(),
                    matched: true,
                });
            }
        }

        None
    }

    fn matches_rule(
        &self,
        event: &Value,
        rule: &DetectionRule,
        ioc_store: &crate::ioc_store::IocStore,
    ) -> bool {
        let mut context = HashMapContext::new();

        let mut threat_match = event
            .get("threat_intel_match")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        // Flatten event into context (shallow flatten for now)
        if let Some(obj) = event.as_object() {
            for (k, v) in obj {
                match v {
                    Value::Number(n) => {
                        if let Some(i) = n.as_i64() {
                            context.set_value(k.clone(), evalexpr::Value::Int(i)).ok();
                        } else if let Some(f) = n.as_f64() {
                            context.set_value(k.clone(), evalexpr::Value::Float(f)).ok();
                        }
                    }
                    Value::String(s) => {
                        context
                            .set_value(k.clone(), evalexpr::Value::String(s.clone()))
                            .ok();
                        // Check IOC
                        if ioc_store.contains(s) {
                            threat_match = true;
                        }
                    }
                    Value::Bool(b) => {
                        context
                            .set_value(k.clone(), evalexpr::Value::Boolean(*b))
                            .ok();
                    }
                    _ => {} // Ignore arrays/objects for simple rules for now
                }
            }
        }

        // Inject threat_intel_match
        context
            .set_value(
                "threat_intel_match".to_string(),
                evalexpr::Value::Boolean(threat_match),
            )
            .ok();

        match eval_boolean_with_context(&rule.pattern, &context) {
            Ok(result) => result,
            Err(e) => {
                // Only log if it's not a "variable not found" error, which just means the rule doesn't apply
                if !e.to_string().contains("Variable identifier not found") {
                    ndr_telemetry::warn!("Failed to evaluate rule '{}': {}", rule.name, e);
                }
                false
            }
        }
    }

    pub fn update_rules(&mut self, rules: Vec<DetectionRule>) {
        self.rules = rules;
        ndr_telemetry::info!("Updated {} detection rules", self.rules.len());
    }

    pub fn add_rule(&mut self, rule: DetectionRule) {
        let rule_name = rule.name.clone();
        self.rules.retain(|r| r.name != rule.name);
        self.rules.push(rule);
        ndr_telemetry::info!("Added/Updated rule: {}", rule_name);
    }

    pub fn get_priority(&self, event: &Value, ioc_store: &crate::ioc_store::IocStore) -> i32 {
        if let Some(result) = self.analyze(event, ioc_store) {
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
