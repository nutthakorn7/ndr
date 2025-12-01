use axum::{
    routing::{get, post, delete},
    Router,
    http::{Method, StatusCode},
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use std::net::SocketAddr;
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use sqlx::postgres::PgPoolOptions;

mod handlers;
mod models;
mod auth;
mod db;

use db::DB;

#[derive(Clone)]
pub struct AppState {
    pub db: DB,
    pub jwt_secret: String,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting Rust Auth Service...");

    // Database Connection
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(50)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    let db = DB::new(pool);
    
    // Initialize DB Schema
    if let Err(e) = db.init_schema().await {
        tracing::error!("Failed to initialize database schema: {}", e);
        // Continue anyway, maybe it's already initialized
    }

    // Create default admin
    if let (Ok(email), Ok(password)) = (std::env::var("ADMIN_EMAIL"), std::env::var("ADMIN_PASSWORD")) {
        if let Err(e) = db.create_user(&email, &password, "Admin", "default").await {
            tracing::warn!("Failed to create default admin (might exist): {}", e);
        } else {
            tracing::info!("Default admin created: {}", email);
        }
    }

    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "ndr-super-secret-key".to_string());

    let state = Arc::new(AppState {
        db,
        jwt_secret,
    });

    // CORS
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
        .allow_origin(Any)
        .allow_headers(Any);

    // Routes
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/auth/register", post(handlers::register))
        .route("/auth/login", post(handlers::login))
        .route("/auth/refresh", post(handlers::refresh))
        .route("/auth/verify", post(handlers::verify))
        .route("/auth/api-keys", post(handlers::create_api_key).get(handlers::list_api_keys))
        .route("/auth/api-keys/:id", delete(handlers::revoke_api_key))
        .route("/auth/validate-api-key", post(handlers::validate_api_key))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    // Run
    let port = std::env::var("PORT").unwrap_or_else(|_| "8087".to_string());
    let addr: SocketAddr = format!("0.0.0.0:{}", port).parse().unwrap();
    
    tracing::info!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "OK"
}
