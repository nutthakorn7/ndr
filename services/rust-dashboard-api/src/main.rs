use axum::{
    http::Method,
    routing::{get, post},
    Router,
};
use ndr_storage::postgres::create_pool;
use ndr_telemetry::{error, info, init_telemetry};
use opensearch::http::transport::Transport;
use opensearch::OpenSearch;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

mod handlers;
mod kafka;
mod models;
mod state;

use kafka::KafkaConsumer;
use state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize telemetry
    if let Err(e) = init_telemetry("dashboard-api") {
        eprintln!("Failed to initialize telemetry: {}", e);
        std::process::exit(1);
    }

    info!("Starting Rust Dashboard API...");

    // Database Connection using shared pool
    let database_url = std::env::var("DATABASE_URL")
        .map_err(|_| anyhow::anyhow!("DATABASE_URL environment variable must be set"))?;
    let pool = match create_pool(&database_url).await {
        Ok(p) => p,
        Err(e) => {
            error!(error = %e, "Failed to connect to database");
            std::process::exit(1);
        }
    };

    // OpenSearch Connection
    let opensearch_url =
        std::env::var("OPENSEARCH_URL").unwrap_or_else(|_| "http://opensearch:9200".to_string());
    let transport = Transport::single_node(&opensearch_url)
        .map_err(|e| anyhow::anyhow!("Failed to create OpenSearch transport: {}", e))?;
    let os_client = OpenSearch::new(transport);

    // Broadcast channel for real-time events
    let (tx, _rx) = broadcast::channel(100);

    // Initialize Kafka Consumer
    // We spawn it in a background task
    let kafka_tx = tx.clone();
    tokio::spawn(async move {
        match KafkaConsumer::new(kafka_tx) {
            Ok(consumer) => consumer.run().await,
            Err(e) => error!("Failed to initialize Kafka consumer: {}", e),
        }
    });

    let state = Arc::new(AppState {
        db: pool,
        opensearch: os_client,
        http_client: reqwest::Client::new(),
        tx,
    });

    // CORS
    let cors = CorsLayer::new()
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_origin(Any)
        .allow_headers(Any);

    // Routes
    let app = Router::new()
        .route("/health", get(handlers::health_check))
        .route(
            "/analytics/dashboard",
            get(handlers::get_dashboard_analytics),
        )
        .route("/stats/traffic", get(handlers::get_traffic_stats))
        .route("/events", post(handlers::search_events))
        .route("/alerts", get(handlers::get_alerts))
        .route("/sensors", get(handlers::proxy_sensors))
        .route("/ai/chat", post(handlers::proxy_ai_chat))
        .route("/ws", get(handlers::ws_handler))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    // Run server
    let port = std::env::var("PORT").unwrap_or_else(|_| "8083".to_string());
    let addr: SocketAddr = format!("0.0.0.0:{}", port)
        .parse()
        .map_err(|e| anyhow::anyhow!("Invalid socket address: {}", e))?;

    info!("Dashboard API listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to bind to {}: {}", addr, e))?;

    axum::serve(listener, app)
        .await
        .map_err(|e| anyhow::anyhow!("Server error: {}", e))?;

    Ok(())
}
