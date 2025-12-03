use async_trait::async_trait;
use crate::models::Alert;
use ndr_telemetry::{info, error, warn};
use serde_json::Value;

#[async_trait]
pub trait Action {
    async fn execute(&self, alert: &Alert) -> anyhow::Result<()>;
}

pub struct WebhookAction {
    url: String,
}

impl WebhookAction {
    pub fn new(params: Value) -> Self {
        let url = params.get("url")
            .and_then(|v| v.as_str())
            .unwrap_or("http://localhost")
            .to_string();
        Self { url }
    }
}

#[async_trait]
impl Action for WebhookAction {
    async fn execute(&self, alert: &Alert) -> anyhow::Result<()> {
        info!("Executing Webhook Action to {}", self.url);
        let client = reqwest::Client::new();
        let res = client.post(&self.url)
            .json(alert)
            .send()
            .await?;
        
        if !res.status().is_success() {
            anyhow::bail!("Webhook failed with status: {}", res.status());
        }
        Ok(())
    }
}

pub struct LogAction {
    level: String,
}

impl LogAction {
    pub fn new(params: Value) -> Self {
        let level = params.get("level")
            .and_then(|v| v.as_str())
            .unwrap_or("info")
            .to_string();
        Self { level }
    }
}

#[async_trait]
impl Action for LogAction {
    async fn execute(&self, alert: &Alert) -> anyhow::Result<()> {
        let msg = format!("SOAR Action Log: Alert '{}' (Severity: {})", alert.title, alert.severity);
        match self.level.as_str() {
            "error" => error!("{}", msg),
            "warn" => warn!("{}", msg),
            _ => info!("{}", msg),
        }
        Ok(())
    }
}
