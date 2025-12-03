use anyhow::Result;
use async_trait::async_trait;
use ndr_telemetry::{error, info};
use reqwest::Client;
use serde_json::Value;

#[async_trait]
pub trait Exporter {
    async fn send(&self, alert: &Value) -> Result<()>;
}

pub struct SplunkExporter {
    client: Client,
    url: String,
    token: String,
}

impl SplunkExporter {
    pub fn new() -> Self {
        let url = std::env::var("SPLUNK_HEC_URL").unwrap_or_default();
        let token = std::env::var("SPLUNK_HEC_TOKEN").unwrap_or_default();
        Self {
            client: Client::new(),
            url,
            token,
        }
    }
}

#[async_trait]
impl Exporter for SplunkExporter {
    async fn send(&self, alert: &Value) -> Result<()> {
        let payload = serde_json::json!({
            "event": alert,
            "sourcetype": "ndr:alert",
            "source": "ndr"
        });

        let res = self
            .client
            .post(&self.url)
            .header("Authorization", format!("Splunk {}", self.token))
            .json(&payload)
            .send()
            .await?;

        if !res.status().is_success() {
            anyhow::bail!("Splunk export failed: {}", res.status());
        }
        Ok(())
    }
}

pub struct ElasticExporter {
    client: Client,
    url: String,
    api_key: String,
    index: String,
}

impl ElasticExporter {
    pub fn new() -> Self {
        let url = std::env::var("ELASTIC_URL").unwrap_or_default();
        let api_key = std::env::var("ELASTIC_API_KEY").unwrap_or_default();
        let index = std::env::var("ELASTIC_INDEX").unwrap_or_else(|_| "ndr-alerts".to_string());
        Self {
            client: Client::new(),
            url,
            api_key,
            index,
        }
    }
}

#[async_trait]
impl Exporter for ElasticExporter {
    async fn send(&self, alert: &Value) -> Result<()> {
        let url = format!("{}/{}/_doc", self.url, self.index);
        let res = self
            .client
            .post(&url)
            .header("Authorization", format!("ApiKey {}", self.api_key))
            .json(alert)
            .send()
            .await?;

        if !res.status().is_success() {
            anyhow::bail!("Elastic export failed: {}", res.status());
        }
        Ok(())
    }
}

pub struct WebhookExporter {
    client: Client,
    url: String,
}

impl WebhookExporter {
    pub fn new() -> Self {
        let url = std::env::var("WEBHOOK_1_URL").unwrap_or_default();
        Self {
            client: Client::new(),
            url,
        }
    }
}

#[async_trait]
impl Exporter for WebhookExporter {
    async fn send(&self, alert: &Value) -> Result<()> {
        let res = self.client.post(&self.url).json(alert).send().await?;

        if !res.status().is_success() {
            anyhow::bail!("Webhook export failed: {}", res.status());
        }
        Ok(())
    }
}
