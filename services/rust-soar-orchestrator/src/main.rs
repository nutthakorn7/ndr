mod engine;
mod actions;
mod models;

use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::message::Message;
use ndr_telemetry::{init_telemetry, info, warn, error};
use std::sync::Arc;
use crate::engine::PlaybookEngine;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv::dotenv().ok();
    
    // Initialize telemetry
    if let Err(e) = init_telemetry("soar-orchestrator") {
        eprintln!("Failed to initialize telemetry: {}", e);
        std::process::exit(1);
    }

    info!("Starting Rust SOAR Orchestrator...");

    let brokers = std::env::var("KAFKA_BROKERS").unwrap_or_else(|_| "localhost:9092".to_string());
    let group_id = "rust-soar-group";

    // Initialize Engine
    let engine = Arc::new(PlaybookEngine::new());

    // Kafka Consumer
    let consumer: StreamConsumer = ClientConfig::new()
        .set("group.id", group_id)
        .set("bootstrap.servers", &brokers)
        .set("enable.partition.eof", "false")
        .set("session.timeout.ms", "6000")
        .set("enable.auto.commit", "true")
        .create()
        .expect("Consumer creation failed");

    consumer
        .subscribe(&["correlated-alerts", "security-alerts"])
        .expect("Can't subscribe to alerts");

    info!("SOAR Orchestrator listening for alerts...");

    loop {
        match consumer.recv().await {
            Err(e) => warn!("Kafka error: {}", e),
            Ok(m) => {
                let payload = match m.payload_view::<str>() {
                    None => "",
                    Some(Ok(s)) => s,
                    Some(Err(e)) => {
                        warn!("Error while deserializing message payload: {:?}", e);
                        ""
                    }
                };

                if payload.is_empty() {
                    continue;
                }

                match serde_json::from_str::<models::Alert>(payload) {
                    Ok(alert) => {
                        let engine_clone = engine.clone();
                        tokio::spawn(async move {
                            if let Err(e) = engine_clone.process_alert(alert).await {
                                error!("Error processing alert: {}", e);
                            }
                        });
                    }
                    Err(e) => {
                        error!("Failed to parse JSON alert: {}", e);
                    }
                }
            }
        };
    }
}
