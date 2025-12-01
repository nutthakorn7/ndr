use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::message::Message;
use tracing::{info, error, warn};
use dotenv::dotenv;
use std::sync::Arc;

mod exporters;
use exporters::{Exporter, SplunkExporter, WebhookExporter, ElasticExporter};

#[tokio::main]
async fn main() {
    dotenv().ok();
    tracing_subscriber::fmt::init();

    info!("Starting Rust SIEM Exporter...");

    let brokers = std::env::var("KAFKA_BROKERS").unwrap_or_else(|_| "localhost:9092".to_string());
    let group_id = "rust-siem-exporter-group";

    // Initialize Exporters
    let mut exporters: Vec<Box<dyn Exporter + Send + Sync>> = Vec::new();

    if std::env::var("SPLUNK_ENABLED").unwrap_or_default() == "true" {
        exporters.push(Box::new(SplunkExporter::new()));
        info!("Splunk Exporter enabled");
    }

    if std::env::var("ELASTIC_ENABLED").unwrap_or_default() == "true" {
        exporters.push(Box::new(ElasticExporter::new()));
        info!("Elastic Exporter enabled");
    }
    
    // Webhook support (simplified for now)
    if std::env::var("WEBHOOK_1_ENABLED").unwrap_or_default() == "true" {
        exporters.push(Box::new(WebhookExporter::new()));
        info!("Webhook Exporter enabled");
    }

    let exporters = Arc::new(exporters);

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
        .expect("Can't subscribe to specified topics");

    info!("Subscribed to topics. Waiting for alerts...");

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

                match serde_json::from_str::<serde_json::Value>(payload) {
                    Ok(alert) => {
                        let exporters_clone = exporters.clone();
                        let alert_clone = alert.clone();
                        
                        // Spawn a task to export to all destinations concurrently
                        tokio::spawn(async move {
                            for exporter in exporters_clone.iter() {
                                if let Err(e) = exporter.send(&alert_clone).await {
                                    error!("Export failed: {}", e);
                                }
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
