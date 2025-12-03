use rdkafka::config::ClientConfig;
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::message::OwnedHeaders;
use std::env;
use std::time::Duration;
use anyhow::Result;
use serde::Serialize;
use ndr_telemetry::{info, error};

#[derive(Clone)]
pub struct KafkaService {
    producer: FutureProducer,
    topic: String,
}

impl KafkaService {
    pub fn new() -> Result<Self> {
        let brokers = env::var("KAFKA_BROKERS").unwrap_or_else(|_| "kafka:9092".to_string());
        let topic = "edge-rules".to_string();

        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", &brokers)
            .set("message.timeout.ms", "5000")
            .create()?;

        Ok(Self { producer, topic })
    }

    pub async fn publish_rule_update<T: Serialize>(&self, update: &T) -> Result<()> {
        let payload = serde_json::to_string(update)?;
        
        let record = FutureRecord::to(&self.topic)
            .payload(&payload)
            .key("rule-update")
            .headers(OwnedHeaders::new()
                .insert(rdkafka::message::Header { key: "source", value: Some("edge-coordinator") })
                .insert(rdkafka::message::Header { key: "type", value: Some("rule_update") }));

        match self.producer.send(record, Duration::from_secs(5)).await {
            Ok(_) => {
                info!("Published rule update to {}", self.topic);
                Ok(())
            }
            Err((e, _)) => {
                error!("Failed to publish rule update: {}", e);
                Err(anyhow::anyhow!("Kafka publish error: {}", e))
            }
        }
    }
}
