mod registration;
mod health_monitor;
mod auth;
mod error;
mod tls;

use axum::{
    extract::{State, Path, Json},
    http::StatusCode,
    routing::{get, post},
    Router,
    middleware,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use tower_http::trace::TraceLayer;

use registration::{register_agent, get_agents, get_agent};
use health_monitor::update_heartbeat;
use error::{AppError, Result as AppResult};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
}

#[derive(Deserialize)]
pub struct ConfigUpdate {
    pub forwarding_policy: Option<Value>,
    pub detection_rules: Option<Value>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting Rust Edge Coordinator...");

    // Database connection
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/security_analytics".to_string());
    
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(50)
        .connect(&database_url)
        .await?;

    tracing::info!("Connected to database");

    // Run migrations
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS edge_agents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agent_id VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255),
            location VARCHAR(255),
            tenant_id VARCHAR(255) DEFAULT 'default',
            status VARCHAR(50) DEFAULT 'registered',
            version VARCHAR(50),
            capabilities JSONB,
            config JSONB,
            last_heartbeat TIMESTAMP,
            last_metrics JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS edge_forwarding_policies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agent_id VARCHAR(255) REFERENCES edge_agents(agent_id),
            name VARCHAR(255),
            filter_rules JSONB,
            sampling_rate FLOAT,
            compression_enabled BOOLEAN,
            priority INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    tracing::info!("Database schema initialized");

    let state = Arc::new(AppState { db: pool });

    // API key for authentication
    let api_key_hash = std::env::var("COORDINATOR_API_KEY")
        .ok()
        .map(|key| {
            use sha2::{Sha256, Digest};
            let mut hasher = Sha256::new();
            hasher.update(key.as_bytes());
            hex::encode(hasher.finalize())
        });
    
    let api_key_hash = Arc::new(api_key_hash);
    
    if api_key_hash.is_some() {
        tracing::info!("Coordinator API key authentication enabled");
    } else {
        tracing::warn!("Coordinator API key authentication disabled - set COORDINATOR_API_KEY to enable");
    }

    // Initialize Metrics
    let builder = metrics_exporter_prometheus::PrometheusBuilder::new();
    let handle = builder.install_recorder()
        .expect("failed to install Prometheus recorder");

    // Build application with routes
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/metrics", get(move || std::future::ready(handle.render())))
        // Protected endpoints - require API key
        .route("/edge/agents/:agent_id/config", post(update_agent_config))
        .route_layer(middleware::from_fn_with_state(
            api_key_hash.clone(),
            auth::api_key_auth
        ))
        // Public endpoints - no auth required (agents need to register/heartbeat)
        .route("/edge/register", post(register_agent))
        .route("/edge/agents", get(get_agents))
        .route("/edge/agents/:agent_id", get(get_agent))
        .route("/edge/agents/:agent_id/heartbeat", post(update_heartbeat))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Run server
    let port = std::env::var("PORT").unwrap_or_else(|_| "8085".to_string());
    let addr: SocketAddr = format!("0.0.0.0:{}", port).parse()?;
    tracing::info!("Edge Coordinator listening on {}", addr);
    
    // Check if TLS is enabled
    if tls::is_tls_enabled() {
        let cert_path = tls::get_cert_path();
        let key_path = tls::get_key_path();
        
        match tls::load_tls_config(&cert_path, &key_path).await {
            Ok(tls_config) => {
                tracing::info!("Starting Edge Coordinator with TLS/HTTPS on https://{}", addr);
                axum_server::bind_rustls(addr, tls_config)
                    .serve(app.into_make_service())
                    .await?;
            }
            Err(e) => {
                tracing::error!("Failed to load TLS config: {}. Falling back to HTTP.", e);
                tracing::warn!("Running without TLS - communication is NOT encrypted!");
                let listener = tokio::net::TcpListener::bind(addr).await?;
                axum::serve(listener, app).await?;
            }
        }
    } else {
        tracing::warn!("TLS disabled - running HTTP only. Set TLS_ENABLED=true to enable HTTPS.");
        let listener = tokio::net::TcpListener::bind(addr).await?;
        axum::serve(listener, app).await?;
    }

    Ok(())
}

async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy",
    })
}

async fn update_agent_config(
    State(state): State<Arc<AppState>>,
    Path(agent_id): Path<String>,
    Json(config): Json<ConfigUpdate>,
) -> AppResult<StatusCode> {
    let config_json = serde_json::to_value(&config)
        .map_err(|e| AppError::bad_request("Invalid configuration format")
            .with_context(e.to_string()))?;

    let result = sqlx::query(
        "UPDATE edge_agents SET config = $1, updated_at = NOW() WHERE agent_id = $2"
    )
    .bind(&config_json)
    .bind(&agent_id)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::internal("Failed to update agent configuration")
        .with_context(format!("Agent: {}, Error: {}", agent_id, e)))?;

    if result.rows_affected() == 0 {
        return Err(AppError::not_found(format!("Edge agent '{}' not found", agent_id))
            .with_context("The agent may have been removed or never registered"));
    }

    tracing::info!("Updated configuration for agent: {}", agent_id);
    Ok(StatusCode::OK)
}
