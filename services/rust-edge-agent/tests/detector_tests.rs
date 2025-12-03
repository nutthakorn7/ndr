// Unit tests for detector module

use rust_edge_agent::ioc_store::IocStore;
use serde_json::json;

// Re-export for testing
pub use rust_edge_agent::detector::{DetectionResult, DetectionRule, LocalDetector};

#[test]
fn test_detector_creation() {
    let detector = LocalDetector::new();
    // Should have default rules loaded
    // This is a smoke test to ensure it doesn't panic
}

#[test]
fn test_high_volume_traffic_detection() {
    let detector = LocalDetector::new();
    let ioc_store = IocStore::new();

    // Event with high packet rate
    let event = json!({
        "packets_per_second": 15000,
        "source_ip": "10.0.0.1"
    });

    let result = detector.analyze(&event, &ioc_store);
    assert!(result.is_some(), "Should detect high volume traffic");

    let detection = result.unwrap();
    assert_eq!(detection.rule_name, "High Volume Traffic");
    assert_eq!(detection.severity, "medium");
}

#[test]
fn test_no_detection_for_normal_traffic() {
    let detector = LocalDetector::new();
    let ioc_store = IocStore::new();

    // Normal traffic event
    let event = json!({
        "packets_per_second": 500,
        "source_ip": "10.0.0.1"
    });

    let result = detector.analyze(&event, &ioc_store);
    assert!(result.is_none(), "Should not detect normal traffic");
}

#[test]
fn test_port_scan_detection() {
    let detector = LocalDetector::new();
    let ioc_store = IocStore::new();

    // Event indicating port scan
    let event = json!({
        "unique_ports": 150,
        "source_ip": "192.168.1.100"
    });

    let result = detector.analyze(&event, &ioc_store);
    assert!(result.is_some(), "Should detect port scan");

    let detection = result.unwrap();
    assert_eq!(detection.rule_name, "Suspicious Port Scan");
    assert_eq!(detection.severity, "high");
}

#[test]
fn test_threat_intel_match_detection() {
    let detector = LocalDetector::new();
    let ioc_store = IocStore::new();

    // Event with threat intel match
    let event = json!({
        "threat_intel_match": true,
        "source_ip": "1.2.3.4"
    });

    let result = detector.analyze(&event, &ioc_store);
    assert!(result.is_some(), "Should detect threat intel match");

    let detection = result.unwrap();
    assert_eq!(detection.rule_name, "Known Malicious IP");
    assert_eq!(detection.severity, "critical");
}

#[test]
fn test_get_priority_critical() {
    let detector = LocalDetector::new();
    let ioc_store = IocStore::new();

    let event = json!({
        "threat_intel_match": true
    });

    let priority = detector.get_priority(&event, &ioc_store);
    assert_eq!(priority, 100, "Critical events should have priority 100");
}

#[test]
fn test_get_priority_high() {
    let detector = LocalDetector::new();
    let ioc_store = IocStore::new();

    let event = json!({
        "unique_ports": 200
    });

    let priority = detector.get_priority(&event, &ioc_store);
    assert_eq!(priority, 75, "High severity should have priority 75");
}

#[test]
fn test_get_priority_medium() {
    let detector = LocalDetector::new();
    let ioc_store = IocStore::new();

    let event = json!({
        "packets_per_second": 12000
    });

    let priority = detector.get_priority(&event, &ioc_store);
    assert_eq!(priority, 50, "Medium severity should have priority 50");
}

#[test]
fn test_get_priority_normal() {
    let detector = LocalDetector::new();
    let ioc_store = IocStore::new();

    // Event that doesn't match any rules
    let event = json!({
        "packets_per_second": 100,
        "normal": true
    });

    let priority = detector.get_priority(&event, &ioc_store);
    assert_eq!(priority, 0, "Normal events should have priority 0");
}

#[test]
fn test_update_rules() {
    let mut detector = LocalDetector::new();

    // Create custom rules
    let custom_rules = vec![DetectionRule {
        name: "Custom Rule".to_string(),
        severity: "high".to_string(),
        pattern: "test_pattern".to_string(),
        enabled: true,
    }];

    detector.update_rules(custom_rules.clone());

    // Verify rules were updated (this tests that update_rules doesn't panic)
    // Actual verification would require exposing rules or a getter
}

#[test]
fn test_disabled_rule_not_triggered() {
    let mut detector = LocalDetector::new();
    let ioc_store = IocStore::new();

    // Create a disabled rule
    let rules = vec![DetectionRule {
        name: "Disabled Rule".to_string(),
        severity: "critical".to_string(),
        pattern: "test".to_string(),
        enabled: false,
    }];

    detector.update_rules(rules);

    // Even if we had matching data, disabled rule shouldn't trigger
    let event = json!({"test": "data"});
    let result = detector.analyze(&event, &ioc_store);

    // Since all rules are disabled, nothing should match
    assert!(result.is_none());
}

#[test]
fn test_multiple_rule_matches_returns_first() {
    let detector = LocalDetector::new();
    let ioc_store = IocStore::new();

    // Event that could match multiple rules
    let event = json!({
        "packets_per_second": 50000,
        "unique_ports": 200,
        "threat_intel_match": true
    });

    // Should return the first matching rule
    let result = detector.analyze(&event, &ioc_store);
    assert!(result.is_some());
}

#[test]
fn test_priority_levels() {
    let detector = LocalDetector::new();
    let ioc_store = IocStore::new();

    // Test all priority levels
    let test_cases = vec![
        (json!({"threat_intel_match": true}), 100), // critical
        (json!({"unique_ports": 150}), 75),         // high
        (json!({"packets_per_second": 15000}), 50), // medium
        (json!({"normal": "event"}), 0),            // normal
    ];

    for (event, expected_priority) in test_cases {
        let priority = detector.get_priority(&event, &ioc_store);
        assert_eq!(
            priority, expected_priority,
            "Priority mismatch for event: {:?}",
            event
        );
    }
}
