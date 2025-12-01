use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::message::Message;
use std::time::Duration;
use tracing::{info, error, warn};
use dotenv::dotenv;

mod parser;
mod normalizer;
mod models;

use parser::LogParser;
use normalizer::LogNormalizer;

#[tokio::main]
async fn main() {
    dotenv().ok();
    tracing_subscriber::fmt::init();

    info!("Starting Rust Parser Normalizer...");

    let brokers = std::env::var("KAFKA_BROKERS").unwrap_or_else(|_| "localhost:9092".to_string());
    let group_id = "rust-parser-normalizer-group";
    let zeek_topic = std::env::var("ZEEK_TOPIC").unwrap_or_else(|_| "zeek-logs".to_string());
    let suricata_topic = std::env::var("SURICATA_TOPIC").unwrap_or_else(|_| "suricata-logs".to_string());

    let consumer: StreamConsumer = ClientConfig::new()
        .set("group.id", group_id)
        .set("bootstrap.servers", &brokers)
        .set("enable.partition.eof", "false")
        .set("session.timeout.ms", "6000")
        .set("enable.auto.commit", "true")
        .create()
        .expect("Consumer creation failed");

    consumer
        .subscribe(&["raw-logs", &zeek_topic, &suricata_topic])
        .expect("Can't subscribe to specified topics");

    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", &brokers)
        .set("message.timeout.ms", "5000")
        .create()
        .expect("Producer creation failed");

    let parser = LogParser::new();
    let normalizer = LogNormalizer::new();

    info!("Subscribed to topics. Waiting for messages...");

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

                let topic = m.topic();
                
                // Process message
                match serde_json::from_str::<serde_json::Value>(payload) {
                    Ok(raw_log) => {
                        let parsed = parser.parse(raw_log);
                        let normalized = normalizer.normalize(parsed);

                        let output_json = serde_json::to_string(&normalized).unwrap();
                        
                        let _ = producer
                            .send(
                                FutureRecord::to("normalized-logs")
                                    .payload(&output_json)
                                    .key("default"), // Ideally tenant_id
                                Duration::from_secs(0),
                            )
                            .await;
                    }
                    Err(e) => {
                        error!("Failed to parse JSON from Kafka: {}", e);
                    }
                }
            }
        };
    }
}
