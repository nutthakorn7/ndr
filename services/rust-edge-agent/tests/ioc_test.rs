use rust_edge_agent::detector::{DetectionRule, LocalDetector};
use rust_edge_agent::ioc_store::IocStore;
use serde_json::json;

#[test]
fn test_ioc_matching() {
    let mut detector = LocalDetector::new();
    let ioc_store = IocStore::new();

    // Add a rule that checks for threat_intel_match
    let rule = DetectionRule {
        name: "IOC Match Rule".to_string(),
        severity: "critical".to_string(),
        pattern: "threat_intel_match == true".to_string(),
        enabled: true,
    };
    detector.add_rule(rule);

    // Add an IOC to the store
    ioc_store.add_ioc("192.168.1.200".to_string());

    // Test Case 1: Event with matching IOC
    let event_match = json!({
        "src_ip": "192.168.1.200",
        "dest_port": 80
    });

    let result = detector.analyze(&event_match, &ioc_store);
    assert!(result.is_some());
    let result = result.unwrap();
    // It might match the default "Known Malicious IP" rule which also checks threat_intel_match
    assert!(result.rule_name == "IOC Match Rule" || result.rule_name == "Known Malicious IP");
    assert!(result.matched);

    // Test Case 2: Event without matching IOC
    let event_no_match = json!({
        "src_ip": "10.0.0.1",
        "dest_port": 80
    });

    let result = detector.analyze(&event_no_match, &ioc_store);
    assert!(result.is_none());
}
