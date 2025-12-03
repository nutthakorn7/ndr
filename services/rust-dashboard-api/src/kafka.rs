use anyhow::Result;
use ndr_telemetry::{error, info, warn};
use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::message::Message;
use std::env;
use tokio::sync::broadcast;

pub struct KafkaConsumer {
    consumer: StreamConsumer,
    tx: broadcast::Sender<String>,
}

impl KafkaConsumer {
    pub fn new(tx: broadcast::Sender<String>) -> Result<Self> {
        let brokers = env::var("KAFKA_BROKERS").unwrap_or_else(|_| "kafka:9092".to_string());
        let group_id = env::var("KAFKA_GROUP_ID").unwrap_or_else(|_| "dashboard-api".to_string());

        let consumer: StreamConsumer = ClientConfig::new()
            .set("bootstrap.servers", &brokers)
            .set("group.id", &group_id)
            .set("enable.partition.eof", "false")
            .set("session.timeout.ms", "6000")
            .set("enable.auto.commit", "true")
            .create()?;

        consumer.subscribe(&["security-events", "security-alerts"])?;

        Ok(Self { consumer, tx })
    }

    pub async fn run(&self) {
        info!("Starting Kafka consumer loop...");
        loop {
            match self.consumer.recv().await {
                Ok(m) => {
                    if let Some(payload) = m.payload_view::<str>() {
                        match payload {
                            Ok(text) => {
                                // Broadcast message to all connected WebSocket clients
                                if let Err(e) = self.tx.send(text.to_string()) {
                                    // This happens if no receivers are connected, which is fine
                                    // warn!("Failed to broadcast message: {}", e);
                                }
                            }
                            Err(e) => error!("Error reading payload: {:?}", e),
                        }
                    }
                }
                Err(e) => error!("Kafka error: {}", e),
            }
        }
    }
}
