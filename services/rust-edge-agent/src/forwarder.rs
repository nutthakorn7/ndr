use rdkafka::config::ClientConfig;
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::util::Timeout;
use anyhow::{Result, Context};
use flate2::write::GzEncoder;
use flate2::Compression;
use std::io::Write;
use std::time::Duration;
use ndr_telemetry::{info, error};

use crate::buffer::{Buffer, BufferedEvent};
use crate::config::{Config, ForwardingPolicy};
use crate::circuit_breaker::CircuitBreaker;

pub struct Forwarder {
    producer: FutureProducer,
    topic: String,
    policy: ForwardingPolicy,
    circuit_breaker: CircuitBreaker,
}

impl Forwarder {
    pub fn new(config: &Config) -> Result<Self> {
        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", &config.kafka_brokers)
            .set("message.timeout.ms", "5000")
            .set("compression.type", if config.forwarding_policy.compression_enabled { "gzip" } else { "none" })
            .create()
            .context("Failed to create Kafka producer")?;

        Ok(Self {
            producer,
            topic: config.kafka_topic.clone(),
            policy: config.forwarding_policy.clone(),
            circuit_breaker: CircuitBreaker::new(5, 60), // Added circuit_breaker initialization
        })
    }

    pub async fn forward_event(&self, event_data: &str) -> Result<bool> {
        // Apply sampling rate
        if self.should_sample() {
            self.forward(event_data).await?; // Changed to call new `forward` method
            metrics::counter!("edge_agent_events_forwarded_direct").increment(1);
            Ok(true)
        } else {
            metrics::counter!("edge_agent_events_sampled_out").increment(1);
            Ok(false)
        }
    }

    pub async fn forward_buffered(&self, buffer: &Buffer) -> Result<usize> {
        let events = buffer.pop_batch(self.policy.batch_size).await?;
        
        if events.is_empty() {
            return Ok(0);
        }

        let mut forwarded_ids = Vec::new();

        for event in &events {
            match self.forward(&event.event_data).await { // Changed to call new `forward` method
                Ok(_) => {
                    forwarded_ids.push(event.id);
                }
                Err(e) => {
                    error!("Failed to forward buffered event {}: {}", event.id, e);
                    // Stop on first failure to preserve order
                    break;
                }
            }
        }

        // Remove successfully forwarded events
        if !forwarded_ids.is_empty() {
            buffer.remove(&forwarded_ids).await?;
        }

        Ok(forwarded_ids.len())
    }

    pub async fn forward(&self, event: &str) -> Result<()> {
        // Check circuit breaker
        if self.circuit_breaker.is_open().await {
            anyhow::bail!("Circuit breaker is open - Kafka connection unavailable");
        }

        let payload = if self.policy.compression_enabled {
            self.compress(event)?
        } else {
            event.as_bytes().to_vec()
        };

        let record = FutureRecord::to(&self.topic)
            .payload(&payload)
            .key("edge-event"); // Changed key generation

        match self.producer.send(record, std::time::Duration::from_secs(5)).await {
            Ok(_) => {
                self.circuit_breaker.record_success().await;
                metrics::counter!("edge_agent_kafka_success").increment(1);
                Ok(())
            }
            Err((e, _)) => {
                self.circuit_breaker.record_failure().await;
                metrics::counter!("edge_agent_kafka_failures").increment(1);
                anyhow::bail!("Failed to send to Kafka: {:?}", e)
            }
        }
    }

    fn compress(&self, data: &str) -> Result<Vec<u8>> {
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data.as_bytes())?;
        Ok(encoder.finish()?)
    }

    fn should_sample(&self) -> bool {
        if self.policy.sampling_rate >= 1.0 {
            return true;
        }
        if self.policy.sampling_rate <= 0.0 {
            return false;
        }
        
        use rand::Rng;
        let mut rng = rand::thread_rng();
        rng.gen::<f32>() < self.policy.sampling_rate
    }

    pub fn update_policy(&mut self, policy: ForwardingPolicy) {
        self.policy = policy;
        info!("Updated forwarding policy: {:?}", self.policy);
    }
}
