mod scanner;
mod watcher;

use chrono::Utc;
use ndr_telemetry::{error, info, init_telemetry, warn};
use rdkafka::config::ClientConfig;
use rdkafka::producer::{FutureProducer, FutureRecord};
use scanner::Scanner;
use serde_json::json;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    // Initialize telemetry
    if let Err(e) = init_telemetry("yara-scanner") {
        eprintln!("Failed to initialize telemetry: {}", e);
        std::process::exit(1);
    }

    info!("Starting YARA Scanner Service...");

    let rules_path = std::env::var("RULES_PATH").unwrap_or_else(|_| "/app/rules".to_string());
    let watch_dir =
        std::env::var("WATCH_DIR").unwrap_or_else(|_| "/data/extracted_files".to_string());
    let kafka_brokers =
        std::env::var("KAFKA_BROKERS").unwrap_or_else(|_| "localhost:9092".to_string());

    // Initialize Scanner
    let scanner = Arc::new(Scanner::new(&rules_path)?);

    // Initialize Kafka Producer
    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", &kafka_brokers)
        .set("message.timeout.ms", "5000")
        .create()
        .expect("Producer creation failed");

    // Channel for file events
    let (tx, mut rx) = mpsc::channel(100);

    // Start Watcher
    watcher::start_watcher(watch_dir.clone(), tx).await?;

    // Initial scan of existing files
    info!("Scanning existing files in {}", watch_dir);
    for entry in walkdir::WalkDir::new(&watch_dir) {
        match entry {
            Ok(entry) => {
                if entry.file_type().is_file() {
                    process_file(entry.path(), &scanner, &producer).await;
                }
            }
            Err(e) => warn!("Error walking directory: {}", e),
        }
    }

    // Process new files
    info!("Waiting for new files...");
    while let Some(path_str) = rx.recv().await {
        let path = std::path::Path::new(&path_str);
        process_file(path, &scanner, &producer).await;
    }

    Ok(())
}

async fn process_file(path: &std::path::Path, scanner: &Scanner, producer: &FutureProducer) {
    match scanner.scan_file(path) {
        Ok(Some(result)) => {
            info!(
                "Malware detected in {}: {:?}",
                result.file_path,
                result.matches.iter().map(|m| &m.rule).collect::<Vec<_>>()
            );

            // Construct Alert
            let alert = json!({
                "timestamp": Utc::now().to_rfc3339(),
                "title": format!("Malware Detected: {}", result.matches[0].rule),
                "description": format!("YARA scan detected {} malware signature(s)", result.matches.len()),
                "severity": get_max_severity(&result.matches),
                "category": "malware",
                "mitre_attack": "T1204",
                "file": {
                    "path": result.file_path,
                    "size": result.file_size,
                    "hash": {
                        "sha256": result.file_hash
                    }
                },
                "yara": {
                    "matches": result.matches,
                    "match_count": result.matches.len()
                }
            });

            // Publish to Kafka
            let _ = producer
                .send(
                    FutureRecord::to("security-alerts")
                        .payload(&alert.to_string())
                        .key("default"),
                    Duration::from_secs(0),
                )
                .await;
        }
        Ok(None) => {
            // Clean file
        }
        Err(e) => error!("Error scanning file {}: {}", path.display(), e),
    }
}

fn get_max_severity(matches: &[scanner::Match]) -> String {
    let severity_order = |s: &str| match s {
        "critical" => 4,
        "high" => 3,
        "medium" => 2,
        "low" => 1,
        _ => 0,
    };

    let mut max_severity = "low";
    for m in matches {
        if let Some(severity) = m.meta.get("severity").and_then(|v| v.as_str()) {
            if severity_order(severity) > severity_order(max_severity) {
                max_severity = severity;
            }
        }
    }
    max_severity.to_string()
}
