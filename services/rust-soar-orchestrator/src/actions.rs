use crate::models::Alert;
use async_trait::async_trait;
use ndr_telemetry::{error, info, warn};
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
        let url = params
            .get("url")
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
        let res = client.post(&self.url).json(alert).send().await?;

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
        let level = params
            .get("level")
            .and_then(|v| v.as_str())
            .unwrap_or("info")
            .to_string();
        Self { level }
    }
}

#[async_trait]
impl Action for LogAction {
    async fn execute(&self, alert: &Alert) -> anyhow::Result<()> {
        let msg = format!(
            "SOAR Action Log: Alert '{}' (Severity: {})",
            alert.title, alert.severity
        );
        match self.level.as_str() {
            "error" => error!("{}", msg),
            "warn" => warn!("{}", msg),
            _ => info!("{}", msg),
        }
        Ok(())
    }
}

pub struct BlockIPAction {
    params: Value,
}

impl BlockIPAction {
    pub fn new(params: Value) -> Self {
        Self { params }
    }
}

#[async_trait]
impl Action for BlockIPAction {
    async fn execute(&self, alert: &Alert) -> anyhow::Result<()> {
        let ip_to_block = if let Some(source) = &alert.source {
            source.ip.clone()
        } else {
            None
        };

        if let Some(ip) = ip_to_block {
            ndr_telemetry::info!("Executing BlockIP Action: Blocking IP {}", ip);
            // In a real implementation, this would call the firewall API or edge-agent config
            // For now, we simulate it
            Ok(())
        } else {
            ndr_telemetry::warn!(
                "BlockIP Action failed: No source IP in alert '{}'",
                alert.title
            );
            Ok(())
        }
    }
}
