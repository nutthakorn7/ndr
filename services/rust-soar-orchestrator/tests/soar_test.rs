use rust_soar_orchestrator::engine::PlaybookEngine;
use rust_soar_orchestrator::models::{Alert, Source};
use serde_json::json;

#[tokio::test]
async fn test_ransomware_playbook_trigger() {
    let engine = PlaybookEngine::new();

    let alert = Alert {
        title: "WannaCry Detected".to_string(),
        severity: "critical".to_string(),
        category: "Ransomware".to_string(),
        description: Some("Ransomware activity detected on host".to_string()),
        source: Some(Source {
            ip: Some("192.168.1.100".to_string()),
            port: None,
        }),
        destination: None,
        extra: json!({}),
    };

    // This should trigger the "Ransomware Response" playbook
    // which executes Log and BlockIP actions.
    // Since actions just log to stdout/telemetry, we verify it runs without error.
    let result = engine.process_alert(alert).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_no_match_playbook() {
    let engine = PlaybookEngine::new();

    let alert = Alert {
        title: "Benign Event".to_string(),
        severity: "low".to_string(),
        category: "Info".to_string(),
        description: None,
        source: None,
        destination: None,
        extra: json!({}),
    };

    // Should not trigger any playbook, but should complete successfully
    let result = engine.process_alert(alert).await;
    assert!(result.is_ok());
}
