use axum::{
    routing::{get, post},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::{info, error};
use dotenv::dotenv;

mod handlers;
mod db;
mod models;
mod consumer;
mod extractor;

use db::DB;

#[derive(Clone)]
pub struct AppState {
    db: DB,
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    tracing_subscriber::fmt::init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to Postgres");

    let db = DB::new(pool);
    
    // Initialize DB schema
    if let Err(e) = db.init_schema().await {
        error!("Failed to initialize schema: {}", e);
        std::process::exit(1);
    }

    let state = AppState { db: db.clone() };

    // Start Kafka Consumer in background
    let db_clone = db.clone();
    tokio::spawn(async move {
        if let Err(e) = consumer::start_consumer(db_clone).await {
            error!("Kafka consumer failed: {}", e);
        }
    });

    let app = Router::new()
        .route("/health", get(handlers::health_check))
        .route("/assets", get(handlers::list_assets))
        .route("/assets/:id", get(handlers::get_asset))
        .route("/assets/stats/summary", get(handlers::get_stats))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr: SocketAddr = format!("0.0.0.0:{}", port).parse().unwrap();
    
    info!("Asset Service listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
