use axum::{
    routing::{get, post},
    Router,
    http::Method,
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use std::net::SocketAddr;
use std::sync::Arc;
use ndr_telemetry::{init_telemetry, info, error};
use ndr_storage::postgres::create_pool;

mod handlers;
mod db;
mod models;
mod consumer;
mod extractor;

use db::DB;

#[derive(Clone)]
pub struct AppState {
    pub db: DB,
}

#[tokio::main]
async fn main() {
    // Initialize telemetry
    if let Err(e) = init_telemetry("asset-service") {
        eprintln!("Failed to initialize telemetry: {}", e);
        std::process::exit(1);
    }

    info!("Starting Rust Asset Service...");

    // Database Connection using shared pool
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = match create_pool(&database_url).await {
        Ok(p) => p,
        Err(e) => {
            error!(error = %e, "Failed to connect to database");
            std::process::exit(1);
        }
    };

    let db = DB::new(pool.clone());
    
    // Initialize DB Schema
    if let Err(e) = db.init_schema().await {
        error!(error = %e, "Failed to initialize database schema");
        // Continue anyway, maybe it's already initialized
    }

    let state = Arc::new(AppState { db });

    // Spawn Kafka consumer
    let consumer_db = DB::new(pool);
    tokio::spawn(async move {
        if let Err(e) = consumer::start_consumer(consumer_db).await {
            error!(error = %e, "Kafka consumer failed");
        }
    });

    // CORS
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_origin(Any)
        .allow_headers(Any);

    // Routes
    let app = Router::new()
        .route("/health", get(handlers::health_check))
        .route("/assets", get(handlers::list_assets))
        .route("/assets/:id", get(handlers::get_asset))
        .route("/assets/stats/summary", get(handlers::get_stats))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    // Run
    let port = std::env::var("PORT").unwrap_or_else(|_| "8088".to_string());
    let addr: SocketAddr = format!("0.0.0.0:{}", port).parse().unwrap();
    
    info!("Listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
