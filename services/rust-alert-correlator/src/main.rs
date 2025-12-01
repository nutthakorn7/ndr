use dotenv::dotenv;
use tracing::{info, error};
use std::sync::Arc;
use sqlx::postgres::PgPoolOptions;

mod models;
mod db;
mod cache;
mod engine;
mod kafka;

use db::DB;
use cache::Cache;
use engine::CorrelationEngine;

#[tokio::main]
async fn main() {
    dotenv().ok();
    tracing_subscriber::fmt::init();

    info!("Starting Rust Alert Correlator...");

    // Database
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to Postgres");
    
    let db = DB::new(pool);
    if let Err(e) = db.init_schema().await {
        error!("Failed to initialize DB schema: {}", e);
        std::process::exit(1);
    }

    // Redis
    let redis_host = std::env::var("REDIS_HOST").unwrap_or_else(|_| "redis".to_string());
    let redis_port = std::env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    let redis_url = format!("redis://{}:{}/2", redis_host, redis_port); // DB 2 for alerts
    
    let cache = Cache::new(&redis_url).await.expect("Failed to connect to Redis");

    // Engine
    let engine = Arc::new(CorrelationEngine::new(db, cache));

    // Kafka Consumer
    if let Err(e) = kafka::start_consumer(engine).await {
        error!("Kafka consumer failed: {}", e);
        std::process::exit(1);
    }
}
