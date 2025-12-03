//! Alert Correlator - Uses shared NDR crates
//! 
//! This service has been migrated to use the shared crate ecosystem.

use dotenv::dotenv;
use std::sync::Arc;

// Shared crates
use ndr_core::{domain::Alert, ports::AlertRepository};
use ndr_telemetry::{init_telemetry, info, error};
use ndr_storage::postgres::create_pool;

mod models;  // Declare models module
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
    
    // Initialize telemetry (replaces tracing_subscriber::fmt::init())
    if let Err(e) = init_telemetry("alert-correlator") {
        eprintln!("Failed to initialize telemetry: {}", e);
        std::process::exit(1);
    }

    info!("Starting Rust Alert Correlator (using shared crates)...");

    // Database using shared pool creation
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    
    let pool = match create_pool(&database_url).await {
        Ok(p) => p,
        Err(e) => {
            error!(error = %e, "Failed to connect to Postgres");
            std::process::exit(1);
        }
    };
    
    let db = DB::new(pool);
    if let Err(e) = db.init_schema().await {
        error!(error = %e, "Failed to initialize DB schema");
        std::process::exit(1);
    }

    // Redis
    let redis_host = std::env::var("REDIS_HOST")
        .unwrap_or_else(|_| "redis".to_string());
    let redis_port = std::env::var("REDIS_PORT")
        .unwrap_or_else(|_| "6379".to_string());
    let redis_url = format!("redis://{}:{}/2", redis_host, redis_port);
    
    let cache = match Cache::new(&redis_url).await {
        Ok(c) => c,
        Err(e) => {
            error!(error = %e, "Failed to connect to Redis");
            std::process::exit(1);
        }
    };

    // Engine
    let engine = Arc::new(CorrelationEngine::new(db, cache));

    info!("Alert correlator initialized successfully");

    // Kafka Consumer
    if let Err(e) = kafka::start_consumer(engine).await {
        error!(error = %e, "Kafka consumer failed");
        std::process::exit(1);
    }
}
