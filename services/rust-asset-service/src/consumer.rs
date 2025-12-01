use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::message::Message;
use tracing::{info, warn, error, debug};
use crate::db::DB;
use crate::extractor::AssetExtractor;
use anyhow::Result;

pub async fn start_consumer(db: DB) -> Result<()> {
    let brokers = std::env::var("KAFKA_BROKERS").unwrap_or_else(|_| "localhost:9092".to_string());
    let group_id = "rust-asset-service-group";

    let consumer: StreamConsumer = ClientConfig::new()
        .set("group.id", group_id)
        .set("bootstrap.servers", &brokers)
        .set("enable.partition.eof", "false")
        .set("session.timeout.ms", "6000")
        .set("enable.auto.commit", "true")
        .create()
        .expect("Consumer creation failed");

    consumer
        .subscribe(&["normalized-logs"])
        .expect("Can't subscribe to normalized-logs");

    info!("Asset Service Consumer started. Listening on 'normalized-logs'...");

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

                match serde_json::from_str::<serde_json::Value>(payload) {
                    Ok(log) => {
                        let assets = AssetExtractor::extract_from_log(&log);
                        for asset in assets {
                            if let Err(e) = db.upsert_asset(asset.clone()).await {
                                error!("Failed to upsert asset {}: {}", asset.ip_address, e);
                            } else {
                                debug!("Upserted asset: {}", asset.ip_address);
                            }
                        }
                    }
                    Err(e) => {
                        error!("Failed to parse JSON log: {}", e);
                    }
                }
            }
        };
    }
}
