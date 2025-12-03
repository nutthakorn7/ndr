use axum::{
    routing::{get, post},
    Router,
    http::{Method, StatusCode},
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use std::net::SocketAddr;
use std::sync::Arc;
use sqlx::postgres::PgPoolOptions;
use opensearch::OpenSearch;
use opensearch::http::transport::Transport;
use dotenv::dotenv;
use ndr_telemetry::{init_telemetry, info, error};

mod handlers;
mod models;
mod state;

use state::AppState;

#[tokio::main]
async fn main() {
    tracing::info!("Starting Rust Dashboard API...");

    // Database Connection
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(50)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // OpenSearch Connection
    let opensearch_url = std::env::var("OPENSEARCH_URL").unwrap_or_else(|_| "http://opensearch:9200".to_string());
    let transport = Transport::single_node(&opensearch_url).expect("Failed to create OpenSearch transport");
    let os_client = OpenSearch::new(transport);

    let state = Arc::new(AppState {
        db: pool,
        opensearch: os_client,
        http_client: reqwest::Client::new(),
    });

    // CORS
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allow_origin(Any)
        .allow_headers(Any);

    // Routes
    let app = Router::new()
        .route("/health", get(handlers::health_check))
        .route("/analytics/dashboard", get(handlers::get_dashboard_analytics))
        .route("/stats/traffic", get(handlers::get_traffic_stats))
        .route("/events", post(handlers::search_events))
        .route("/alerts", get(handlers::get_alerts))
        .route("/sensors", get(handlers::proxy_sensors))
        .route("/ai/chat", post(handlers::proxy_ai_chat))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    // Run
    let port = std::env::var("PORT").unwrap_or_else(|_| "8081".to_string());
    let addr: SocketAddr = format!("0.0.0.0:{}", port).parse().unwrap();
    
    tracing::info!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
