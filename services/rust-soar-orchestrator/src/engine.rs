use crate::models::{Alert, Playbook, Trigger, ActionType, ActionConfig};
use crate::actions::{Action, WebhookAction, LogAction};
use ndr_telemetry::{info, warn};
use std::sync::Arc;
use serde_json::json;

pub struct PlaybookEngine {
    playbooks: Vec<Playbook>,
}

impl PlaybookEngine {
    pub fn new() -> Self {
        // In a real app, load from DB or YAML. Hardcoding for MVP.
        let playbooks = vec![
            Playbook {
                name: "Critical Malware Response".to_string(),
                trigger: Trigger::Severity("critical".to_string()),
                actions: vec![
                    ActionConfig {
                        action_type: ActionType::Log,
                        params: json!({ "level": "error" }),
                    },
                    ActionConfig {
                        action_type: ActionType::Webhook,
                        params: json!({ 
                            "url": std::env::var("WEBHOOK_URL").unwrap_or("http://localhost:9000/webhook".to_string()) 
                        }),
                    },
                ],
            },
        ];

        Self { playbooks }
    }

    pub async fn process_alert(&self, alert: Alert) -> anyhow::Result<()> {
        for playbook in &self.playbooks {
            if self.matches(&alert, &playbook.trigger) {
                info!("Triggering playbook '{}' for alert '{}'", playbook.name, alert.title);
                self.execute_playbook(playbook, &alert).await?;
            }
        }
        Ok(())
    }

    fn matches(&self, alert: &Alert, trigger: &Trigger) -> bool {
        match trigger {
            Trigger::Severity(level) => alert.severity.to_lowercase() == level.to_lowercase(),
            Trigger::Category(cat) => alert.category.to_lowercase() == cat.to_lowercase(),
        }
    }

    async fn execute_playbook(&self, playbook: &Playbook, alert: &Alert) -> anyhow::Result<()> {
        for action_config in &playbook.actions {
            let action: Box<dyn Action + Send + Sync> = match action_config.action_type {
                ActionType::Webhook => Box::new(WebhookAction::new(action_config.params.clone())),
                ActionType::Log => Box::new(LogAction::new(action_config.params.clone())),
            };

            if let Err(e) = action.execute(alert).await {
                warn!("Action failed in playbook '{}': {}", playbook.name, e);
            }
        }
        Ok(())
    }
}
