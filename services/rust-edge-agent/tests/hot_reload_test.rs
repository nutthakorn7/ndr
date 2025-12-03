use rust_edge_agent::detector::{LocalDetector, DetectionRule};
use rust_edge_agent::ioc_store::IocStore;
use serde_json::json;

#[test]
fn test_add_rule() {
    let mut detector = LocalDetector::new();
    let ioc_store = IocStore::new();

    // Initial check
    let event = json!({ "test_val": 100 });
    assert!(detector.analyze(&event, &ioc_store).is_none());

    // Add new rule
    let new_rule = DetectionRule {
        name: "Test Rule".to_string(),
        severity: "critical".to_string(),
        pattern: "test_val == 100".to_string(),
        enabled: true,
    };

    detector.add_rule(new_rule);

    // Verify rule works
    let result = detector.analyze(&event, &ioc_store);
    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.rule_name, "Test Rule");
    assert_eq!(result.severity, "critical");

    // Update rule (disable it)
    let updated_rule = DetectionRule {
        name: "Test Rule".to_string(),
        severity: "critical".to_string(),
        pattern: "test_val == 100".to_string(),
        enabled: false,
    };

    detector.add_rule(updated_rule);

    // Verify rule is disabled
    assert!(detector.analyze(&event, &ioc_store).is_none());
}
