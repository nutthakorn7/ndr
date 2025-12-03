use rust_edge_agent::detector::{LocalDetector, DetectionRule};
use serde_json::json;

#[test]
fn test_dynamic_rule_evaluation() {
    let mut detector = LocalDetector::new();

    let rules = vec![
        DetectionRule {
            name: "High Traffic".to_string(),
            severity: "high".to_string(),
            pattern: "packets > 1000".to_string(),
            enabled: true,
        },
        DetectionRule {
            name: "SSH Attack".to_string(),
            severity: "critical".to_string(),
            pattern: "port == 22 && failed_attempts > 5".to_string(),
            enabled: true,
        },
        DetectionRule {
            name: "String Match".to_string(),
            severity: "medium".to_string(),
            pattern: "protocol == \"TCP\"".to_string(),
            enabled: true,
        },
    ];

    detector.update_rules(rules);

    // Test Case 1: High Traffic
    let event1 = json!({
        "packets": 1500,
        "protocol": "UDP"
    });
    let result1 = detector.analyze(&event1);
    assert!(result1.is_some());
    assert_eq!(result1.unwrap().rule_name, "High Traffic");

    // Test Case 2: SSH Attack (No match)
    let event2 = json!({
        "port": 22,
        "failed_attempts": 3
    });
    let result2 = detector.analyze(&event2);
    assert!(result2.is_none());

    // Test Case 3: SSH Attack (Match)
    let event3 = json!({
        "port": 22,
        "failed_attempts": 10
    });
    let result3 = detector.analyze(&event3);
    assert!(result3.is_some());
    assert_eq!(result3.unwrap().rule_name, "SSH Attack");

    // Test Case 4: String Match
    let event4 = json!({
        "protocol": "TCP",
        "packets": 100
    });
    let result4 = detector.analyze(&event4);
    assert!(result4.is_some());
    assert_eq!(result4.unwrap().rule_name, "String Match");
}

#[test]
fn test_missing_fields() {
    let mut detector = LocalDetector::new();
    let rules = vec![
        DetectionRule {
            name: "Field Check".to_string(),
            severity: "low".to_string(),
            pattern: "missing_field > 10".to_string(),
            enabled: true,
        },
    ];
    detector.update_rules(rules);

    let event = json!({ "other_field": 100 });
    let result = detector.analyze(&event);
    assert!(result.is_none()); // Should gracefully fail to match
}
