use axum::{
    extract::{State, Json},
    http::StatusCode,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::net::SocketAddr;
use std::sync::Arc;
use ndr_telemetry::{init_telemetry, info, error};
use tower_http::trace::TraceLayer;
use chrono::Utc;

mod kafka;
mod threat_feed;
use kafka::KafkaService;

#[derive(Clone)]
struct AppState {
    kafka: KafkaService,
}

#[derive(Deserialize, Serialize, Debug)]
struct LogEntry {
    #[serde(default = "default_tenant")]
    tenant_id: String,
    #[serde(flatten)]
    extra: std::collections::HashMap<String, Value>,
}

fn default_tenant() -> String {
    "default".to_string()
}

#[derive(Deserialize, Debug)]
struct BatchLogRequest {
    logs: Vec<LogEntry>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize telemetry
    if let Err(e) = init_telemetry("ingestion-gateway") {
        eprintln!("Failed to initialize telemetry: {}", e);
        std::process::exit(1);
    }

    info!("Starting Rust Ingestion Gateway...");

    // Initialize Kafka
    let kafka = match KafkaService::new() {
        Ok(k) => k,
        Err(e) => {
            error!(error = %e, "Failed to initialize Kafka");
            std::process::exit(1);
        }
    };

    let state = Arc::new(AppState { kafka });

    // Initialize Threat Feed Fetcher
    let feed_url = std::env::var("THREAT_FEED_URL").unwrap_or("http://mock-feed/v1/indicators".to_string());
    let kafka_brokers = std::env::var("KAFKA_BROKERS").unwrap_or("kafka:9092".to_string());
    
    match crate::threat_feed::ThreatFeedFetcher::new(&kafka_brokers, "threat-intel", &feed_url) {
        Ok(fetcher) => {
            let fetcher = Arc::new(fetcher);
            tokio::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(300)); // 5 minutes
                loop {
                    interval.tick().await;
                    if let Err(e) = fetcher.fetch_and_publish().await {
                        error!("Threat feed fetch failed: {}", e);
                    }
                }
            });
            info!("Threat feed fetcher started");
        },
        Err(e) => error!("Failed to initialize threat feed fetcher: {}", e),
    }

    // Initialize Metrics
    let builder = metrics_exporter_prometheus::PrometheusBuilder::new();
    let handle = builder.install_recorder()
        .map_err(|e| anyhow::anyhow!("Failed to install Prometheus recorder: {}", e))?;

    // Build our application with routes
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/metrics", get(move || std::future::ready(handle.render())))
        .route("/ingest/logs", post(ingest_log))
        .route("/ingest/logs/batch", post(ingest_batch))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Run it
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr: SocketAddr = format!("0.0.0.0:{}", port)
        .parse()
        .map_err(|e| anyhow::anyhow!("Invalid socket address: {}", e))?;
    
    info!("Listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to bind to {}: {}", addr, e))?;
    
    axum::serve(listener, app)
        .await
        .map_err(|e| anyhow::anyhow!("Server error: {}", e))?;
    
    Ok(())
}

async fn health_check() -> &'static str {
    "OK"
}

async fn ingest_log(
    State(state): State<Arc<AppState>>,
    Json(mut log): Json<LogEntry>,
) -> Result<(StatusCode, Json<Value>), StatusCode> {
    enrich_log(&mut log);
    
    let payload = serde_json::to_string(&log).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    state.kafka.send(&log.tenant_id, &payload).await
        .map_err(|e| {
            error!(error = %e, "Failed to send log");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok((StatusCode::ACCEPTED, Json(serde_json::json!({ "status": "accepted" }))))
}

async fn ingest_batch(
    State(state): State<Arc<AppState>>,
    Json(batch): Json<BatchLogRequest>,
) -> Result<(StatusCode, Json<Value>), StatusCode> {
    if batch.logs.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let count = batch.logs.len();

    for mut log in batch.logs {
        enrich_log(&mut log);
        let payload = serde_json::to_string(&log).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        
        // In a real high-perf scenario, we might want to parallelize this or use send_batch
        // But rdkafka is async and buffers internally, so this is already quite fast.
        if let Err(e) = state.kafka.send(&log.tenant_id, &payload).await {
            error!(error = %e, "Failed to send log in batch");
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    }

    Ok((StatusCode::ACCEPTED, Json(serde_json::json!({ 
        "status": "accepted",
        "count": count 
    }))))
}

fn enrich_log(log: &mut LogEntry) {
    let now = Utc::now().to_rfc3339();
    log.extra.insert("@timestamp".to_string(), Value::String(now.clone()));
    log.extra.insert("ingestion_timestamp".to_string(), Value::String(now));
    log.extra.insert("source_service".to_string(), Value::String("ingestion-gateway".to_string()));
}
