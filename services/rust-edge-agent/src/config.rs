use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub agent_id: String,
    pub location: String,
    pub coordinator_url: String,
    pub kafka_brokers: String,
    pub kafka_topic: String,
    pub buffer_db_path: String,
    pub max_buffer_size_mb: u64,
    pub port: u16,
    pub heartbeat_interval_secs: u64,
    pub api_key_hash: Option<String>,
    pub forwarding_policy: ForwardingPolicy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForwardingPolicy {
    pub compression_enabled: bool,
    pub sampling_rate: f32,
    pub severity_threshold: String,
    pub batch_size: usize,
    pub batch_timeout_secs: u64,
}

impl Default for ForwardingPolicy {
    fn default() -> Self {
        Self {
            compression_enabled: true,
            sampling_rate: 1.0,
            severity_threshold: "low".to_string(),
            batch_size: 100,
            batch_timeout_secs: 5,
        }
    }
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let hostname = hostname::get()
            .ok()
            .and_then(|h| h.into_string().ok())
            .unwrap_or_else(|| "unknown".to_string());

        // Hash API key if provided
        let api_key_hash = std::env::var("API_KEY").ok().map(|key| {
            use sha2::{Digest, Sha256};
            let mut hasher = Sha256::new();
            hasher.update(key.as_bytes());
            hex::encode(hasher.finalize())
        });

        Ok(Config {
            agent_id: env::var("EDGE_AGENT_ID")
                .unwrap_or_else(|_| format!("edge-agent-{}", hostname)),
            location: env::var("EDGE_LOCATION").unwrap_or_else(|_| "unknown".to_string()),
            coordinator_url: env::var("COORDINATOR_URL")
                .unwrap_or_else(|_| "http://localhost:8085".to_string()),
            kafka_brokers: env::var("KAFKA_BROKERS")
                .unwrap_or_else(|_| "localhost:9092".to_string()),
            kafka_topic: env::var("KAFKA_TOPIC").unwrap_or_else(|_| "edge-events".to_string()),
            buffer_db_path: env::var("BUFFER_DB_PATH")
                .unwrap_or_else(|_| "/var/lib/edge-agent/buffer.db".to_string()),
            max_buffer_size_mb: env::var("MAX_BUFFER_SIZE_MB")
                .unwrap_or_else(|_| "1024".to_string())
                .parse()
                .unwrap_or(1024),
            port: env::var("PORT")
                .unwrap_or_else(|_| "8086".to_string())
                .parse()
                .unwrap_or(8086),
            heartbeat_interval_secs: env::var("HEARTBEAT_INTERVAL_SECS")
                .unwrap_or_else(|_| "30".to_string())
                .parse()
                .unwrap_or(30),
            api_key_hash,
            forwarding_policy: ForwardingPolicy::default(),
        })
    }
}
