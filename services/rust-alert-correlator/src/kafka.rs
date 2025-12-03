use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::message::Message;
use ndr_telemetry::{info, warn, error, debug};  // Use ndr_telemetry
use ndr_core::domain::Alert;  // Use shared Alert type
use crate::engine::CorrelationEngine;
use std::sync::Arc;
use std::time::Duration;
use anyhow::Result;

pub async fn start_consumer(engine: Arc<CorrelationEngine>) -> Result<()> {
    let brokers = std::env::var("KAFKA_BROKERS").unwrap_or_else(|_| "localhost:9092".to_string());
    let group_id = "rust-alert-correlator-group";

    let consumer: StreamConsumer = ClientConfig::new()
        .set("group.id", group_id)
        .set("bootstrap.servers", &brokers)
        .set("enable.partition.eof", "false")
        .set("session.timeout.ms", "6000")
        .set("enable.auto.commit", "true")
        .create()
        .map_err(|e| anyhow::anyhow!("Failed to create Kafka consumer: {}", e))?;

    consumer
        .subscribe(&["alerts", "security-alerts"])
        .map_err(|e| anyhow::anyhow!("Failed to subscribe to alerts topic: {}", e))?

    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", &brokers)
        .set("message.timeout.ms", "5000")
        .create()
        .map_err(|e| anyhow::anyhow!("Failed to create Kafka producer: {}", e))?

    info!("Alert Correlator Consumer started. Listening on 'alerts'...");

    loop {
        match consumer.recv().await {
            Err(e) => warn!("Kafka error: {}", e),
            Ok(m) => {
                let payload = match m.payload_view::<str>() {
                    None => "",
                    Some(Ok(s)) => s,
                    Some(Err(e)) => {
                        warn!("Error while deserializing message payload: {:?}", e);
                        ""
                    }
                };

                if payload.is_empty() {
                    continue;
                }

                match serde_json::from_str::<Alert>(payload) {
                    Ok(alert) => {
                        match engine.process_alert(alert).await {
                            Ok(Some(enriched_alert)) => {
                                let output_json = match serde_json::to_string(&enriched_alert) {
                                    Ok(json) => json,
                                    Err(e) => {
                                        error!("Failed to serialize enriched alert: {}", e);
                                        continue;
                                    }
                                };
                                
                                // Send to correlated-alerts
                                let _ = producer
                                    .send(
                                        FutureRecord::to("correlated-alerts")
                                            .payload(&output_json)
                                            .key("default"),
                                        Duration::from_secs(0),
                                    )
                                    .await;
                                    
                                debug!("Published correlated alert");
                            }
                            Ok(None) => {
                                // Duplicate or filtered
                            }
                            Err(e) => {
                                error!("Error processing alert: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        error!("Failed to parse JSON alert: {}", e);
                    }
                }
            }
        };
    }
}
