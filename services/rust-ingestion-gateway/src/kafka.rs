use anyhow::Result;
use rdkafka::config::ClientConfig;
use rdkafka::message::OwnedHeaders;
use rdkafka::producer::{FutureProducer, FutureRecord};
use std::env;
use std::time::Duration;

#[derive(Clone)]
pub struct KafkaService {
    producer: FutureProducer,
    topic: String,
}

impl KafkaService {
    pub fn new() -> Result<Self> {
        let brokers = env::var("KAFKA_BROKERS").unwrap_or_else(|_| "kafka:9092".to_string());
        let topic = env::var("KAFKA_TOPIC").unwrap_or_else(|_| "raw-logs".to_string());

        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", &brokers)
            .set("message.timeout.ms", "5000")
            .set("queue.buffering.max.messages", "100000") // High throughput buffer
            .set("compression.type", "lz4") // Compress for performance
            .create()?;

        Ok(Self { producer, topic })
    }

    pub async fn send(&self, key: &str, payload: &str) -> Result<()> {
        let record = FutureRecord::to(&self.topic)
            .payload(payload)
            .key(key)
            .headers(
                OwnedHeaders::new()
                    .insert(rdkafka::message::Header {
                        key: "source",
                        value: Some("ingestion-gateway"),
                    })
                    .insert(rdkafka::message::Header {
                        key: "content-type",
                        value: Some("application/json"),
                    }),
            );

        self.producer
            .send(record, Duration::from_secs(0))
            .await
            .map_err(|(e, _)| anyhow::anyhow!("Kafka send error: {}", e))?;

        Ok(())
    }
}
