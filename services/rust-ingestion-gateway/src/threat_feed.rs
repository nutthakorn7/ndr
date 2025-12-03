use serde::{Deserialize, Serialize};
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::ClientConfig;
use std::time::Duration;
use ndr_telemetry::{info, warn, error};
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreatIndicator {
    pub indicator: String,
    pub indicator_type: String, // ip, domain, hash
    pub severity: String,
    pub source: String,
    pub description: Option<String>,
}

pub struct ThreatFeedFetcher {
    client: reqwest::Client,
    producer: FutureProducer,
    topic: String,
    feed_url: String,
}

impl ThreatFeedFetcher {
    pub fn new(kafka_brokers: &str, kafka_topic: &str, feed_url: &str) -> Result<Self> {
        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", kafka_brokers)
            .set("message.timeout.ms", "5000")
            .create()?;

        Ok(Self {
            client: reqwest::Client::new(),
            producer,
            topic: kafka_topic.to_string(),
            feed_url: feed_url.to_string(),
        })
    }

    pub async fn fetch_and_publish(&self) -> Result<usize> {
        info!("Fetching threat feed from {}", self.feed_url);

        // For MVP, if the URL contains "mock", we return static data
        // This avoids needing a real external server for testing
        let indicators = if self.feed_url.contains("mock") {
            vec![
                ThreatIndicator {
                    indicator: "192.168.1.200".to_string(),
                    indicator_type: "ip".to_string(),
                    severity: "high".to_string(),
                    source: "MockFeed".to_string(),
                    description: Some("Known C2 Server".to_string()),
                },
                ThreatIndicator {
                    indicator: "malware.example.com".to_string(),
                    indicator_type: "domain".to_string(),
                    severity: "critical".to_string(),
                    source: "MockFeed".to_string(),
                    description: Some("Ransomware Distribution".to_string()),
                },
            ]
        } else {
            let resp = self.client.get(&self.feed_url).send().await?;
            resp.json::<Vec<ThreatIndicator>>().await?
        };

        let mut count = 0;
        for indicator in indicators {
            let payload = serde_json::to_string(&indicator)?;
            let record = FutureRecord::to(&self.topic)
                .payload(&payload)
                .key(&indicator.indicator);

            match self.producer.send(record, Duration::from_secs(5)).await {
                Ok(_) => count += 1,
                Err((e, _)) => error!("Failed to publish threat indicator: {}", e),
            }
        }

        info!("Published {} threat indicators", count);
        Ok(count)
    }
}
