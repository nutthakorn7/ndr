mod config;
mod buffer;
mod forwarder;
mod detector;
mod auth;
mod error;
mod tls;
mod circuit_breaker;

use axum::{
    extract::{State, Json},
    http::StatusCode,
    routing::{get, post},
    Router,
    middleware,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{interval, Duration};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use tower_http::trace::TraceLayer;

use config::Config;
use buffer::Buffer;
use forwarder::Forwarder;
use detector::LocalDetector;
use error::{AppError, Result as AppResult};

#[derive(Clone)]
struct AppState {
    config: Arc<RwLock<Config>>,
    buffer: Arc<Buffer>,
    forwarder: Arc<RwLock<Forwarder>>,
    detector: Arc<RwLock<LocalDetector>>,
    coordinator_client: Arc<reqwest::Client>,
    is_online: Arc<RwLock<bool>>,
}

#[derive(Deserialize, Debug)]
struct IngestRequest {
    #[serde(flatten)]
    event: Value,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    agent_id: String,
    location: String,
    buffered_events: i64,
    is_online: bool,
}

#[derive(Serialize)]
struct MetricsResponse {
    buffered_events: i64,
    buffer_size_mb: f64,
}

#[derive(Serialize)]
struct RegistrationRequest {
    agent_id: String,
    location: String,
    version: String,
    capabilities: Vec<String>,
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

    tracing::info!("Starting Rust Edge Agent...");

    // Load configuration
    let config = Config::from_env()?;
    tracing::info!("Agent ID: {}, Location: {}", config.agent_id, config.location);

    // Initialize buffer
    let buffer = Buffer::new(&config.buffer_db_path, config.max_buffer_size_mb).await?;
    let buffer = Arc::new(buffer);
    tracing::info!("Buffer initialized at {}", config.buffer_db_path);

    // Initialize forwarder
    let forwarder = Forwarder::new(&config)?;
    let forwarder = Arc::new(RwLock::new(forwarder));
    tracing::info!("Kafka forwarder initialized");

    // Initialize detector
    let detector = LocalDetector::new();
    let detector = Arc::new(RwLock::new(detector));

    // HTTP client for coordinator communication
    let coordinator_client = Arc::new(reqwest::Client::new());

    let is_online = Arc::new(RwLock::new(false));

    let state = AppState {
        config: Arc::new(RwLock::new(config.clone())),
        buffer: buffer.clone(),
        forwarder: forwarder.clone(),
        detector,
        coordinator_client: coordinator_client.clone(),
        is_online: is_online.clone(),
    };

    // Register with coordinator
    if let Err(e) = register_with_coordinator(&state).await {
        tracing::warn!("Failed to register with coordinator: {}", e);
    }

    // Start background tasks
    let heartbeat_state = state.clone();
    tokio::spawn(async move {
        heartbeat_task(heartbeat_state).await;
    });

    let forwarder_state = state.clone();
    tokio::spawn(async move {
        buffer_forwarder_task(forwarder_state).await;
    });

    // Initialize Metrics
    let builder = metrics_exporter_prometheus::PrometheusBuilder::new();
    let handle = builder.install_recorder()
        .expect("failed to install Prometheus recorder");

    // Register custom metrics with descriptions
    metrics::describe_counter!("edge_agent_events_ingested", "Total number of events ingested");
    metrics::describe_counter!("edge_agent_events_forwarded", "Total number of events forwarded to Kafka");
    metrics::describe_counter!("edge_agent_events_buffered", "Total number of events buffered locally");
    metrics::describe_counter!("edge_agent_events_dropped", "Total number of events dropped");
    metrics::describe_counter!("edge_agent_auth_success", "Successful API authentications");
    metrics::describe_counter!("edge_agent_auth_failed", "Failed API authentications");
    
    metrics::describe_histogram!("edge_agent_ingest_duration_ms", "Duration of ingest operations in milliseconds");
    metrics::describe_histogram!("edge_agent_forward_duration_ms", "Duration of forward operations in milliseconds");
    metrics::describe_histogram!("edge_agent_buffer_operation_ms", "Duration of buffer operations in milliseconds");
    metrics::describe_histogram!("edge_agent_event_size_bytes", "Size of ingested events in bytes");
    
    metrics::describe_gauge!("edge_agent_buffer_size_bytes", "Current buffer size in bytes");
    metrics::describe_gauge!("edge_agent_buffer_count", "Current number of buffered events");
    metrics::describe_gauge!("edge_agent_is_online", "Agent connection status (1=online, 0=offline)");

    // API key for authentication
    let api_key_hash = Arc::new(config.api_key_hash.clone());
    
    if api_key_hash.is_some() {
        tracing::info!("API key authentication enabled");
    } else {
        tracing::warn!("API key authentication disabled - set API_KEY environment variable to enable");
    }

    // Build application with routes
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/metrics", get(move || std::future::ready(handle.render())))
        .route("/ingest", post(ingest_event))
        .route_layer(middleware::from_fn_with_state(
            api_key_hash.clone(),
            auth::api_key_auth
        ))
        .route("/config", post(update_config))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Run server
    let addr: SocketAddr = format!("0.0.0.0:{}", config.port).parse()?;
    tracing::info!("Edge Agent listening on {}", addr);
    
    // Check if TLS is enabled
    if tls::is_tls_enabled() {
        let cert_path = tls::get_cert_path();
        let key_path = tls::get_key_path();
        
        match tls::load_tls_config(&cert_path, &key_path).await {
            Ok(tls_config) => {
                tracing::info!("Starting Edge Agent with TLS/HTTPS on https://{}", addr);
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

async fn health_check(State(state): State<AppState>) -> AppResult<Json<HealthResponse>> {
    let config = state.config.read().await;
    let buffered_events = state.buffer.count().await
        .map_err(|e| AppError::internal("Failed to get buffer count")
            .with_context(e.to_string()))?;
    let is_online = *state.is_online.read().await;

    Ok(Json(HealthResponse {
        status: "healthy",
        agent_id: config.agent_id.clone(),
        location: config.location.clone(),
        buffered_events,
        is_online,
    }))
}

async fn ingest_event(
    State(state): State<AppState>,
    Json(req): Json<IngestRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let start = std::time::Instant::now();
    let is_online = *state.is_online.read().await;
    
    // Analyze event for priority
    let detector = state.detector.read().await;
    let priority = detector.get_priority(&req.event);
    drop(detector);

    let event_json = serde_json::to_string(&req.event)
        .map_err(|e| AppError::bad_request("Invalid event JSON")
            .with_context(e.to_string()))?;
    
    // Track event size
    metrics::histogram!("edge_agent_event_size_bytes").record(event_json.len() as f64);
    metrics::counter!("edge_agent_events_ingested").increment(1);

    if is_online {
        // Try to forward directly
        let forwarder = state.forwarder.read().await;
        let forward_start = std::time::Instant::now();
        match forwarder.forward(&event_json).await {
            Ok(_) => {
                metrics::histogram!("edge_agent_forward_duration_ms")
                    .record(forward_start.elapsed().as_millis() as f64);
                metrics::counter!("edge_agent_events_forwarded").increment(1);
                metrics::histogram!("edge_agent_ingest_duration_ms")
                    .record(start.elapsed().as_millis() as f64);
                
                return Ok((StatusCode::ACCEPTED, Json(serde_json::json!({
                    "status": "forwarded",
                    "buffered": false,
                }))));
            }
            Err(e) => {
                tracing::warn!("Failed to forward event, will buffer: {}", e);
            }
        }
    }

    // Buffer event (offline or forward failed)
    let buffer_start = std::time::Instant::now();
    state.buffer.push(&event_json, priority).await
        .map_err(|e| AppError::internal("Failed to buffer event")
            .with_context(e.to_string()))?;
    
    metrics::histogram!("edge_agent_buffer_operation_ms")
        .record(buffer_start.elapsed().as_millis() as f64);
    metrics::counter!("edge_agent_events_buffered").increment(1);
    metrics::histogram!("edge_agent_ingest_duration_ms")
        .record(start.elapsed().as_millis() as f64);

    Ok((StatusCode::ACCEPTED, Json(serde_json::json!({
        "status": "buffered",
        "buffered": true,
    }))))
}

async fn update_config(
    State(state): State<AppState>,
    Json(new_config): Json<Value>,
) -> AppResult<StatusCode> {
    tracing::info!("Received configuration update");
    
    // Update forwarding policy if provided
    if let Some(policy) = new_config.get("forwarding_policy") {
        if let Ok(policy) = serde_json::from_value(policy.clone()) {
            let mut forwarder = state.forwarder.write().await;
            forwarder.update_policy(policy);
        }
    }

    // Update detection rules if provided
    if let Some(rules) = new_config.get("detection_rules") {
        if let Ok(rules) = serde_json::from_value(rules.clone()) {
            let mut detector = state.detector.write().await;
            detector.update_rules(rules);
        }
    }

    Ok(StatusCode::OK)
}

async fn register_with_coordinator(state: &AppState) -> anyhow::Result<()> {
    let config = state.config.read().await;
    let url = format!("{}/edge/register", config.coordinator_url);

    let registration = RegistrationRequest {
        agent_id: config.agent_id.clone(),
        location: config.location.clone(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        capabilities: vec![
            "buffering".to_string(),
            "compression".to_string(),
            "local_detection".to_string(),
        ],
    };

    let response = state.coordinator_client
        .post(&url)
        .json(&registration)
        .timeout(Duration::from_secs(10))
        .send()
        .await?;

    if response.status().is_success() {
        tracing::info!("Successfully registered with coordinator");
        *state.is_online.write().await = true;
        Ok(())
    } else {
        anyhow::bail!("Registration failed with status: {}", response.status())
    }
}

async fn heartbeat_task(state: AppState) {
    let config = state.config.read().await;
    let mut interval = interval(Duration::from_secs(config.heartbeat_interval_secs));
    drop(config);

    loop {
        interval.tick().await;

        let config = state.config.read().await;
        let url = format!("{}/edge/agents/{}/heartbeat", config.coordinator_url, config.agent_id);
        drop(config);

        let buffered_count = state.buffer.count().await.unwrap_or(0);
        let buffer_size = state.buffer.size_mb().await.unwrap_or(0.0);

        let metrics = serde_json::json!({
            "buffered_events": buffered_count,
            "buffer_size_mb": buffer_size,
        });

        match state.coordinator_client
            .post(&url)
            .json(&serde_json::json!({
                "status": "online",
                "metrics": metrics
            }))
            .timeout(Duration::from_secs(5))
            .send()
            .await
        {
            Ok(response) if response.status().is_success() => {
                *state.is_online.write().await = true;
                tracing::debug!("Heartbeat sent successfully");
            }
            Ok(response) => {
                tracing::warn!("Heartbeat failed with status: {}", response.status());
                *state.is_online.write().await = false;
            }
            Err(e) => {
                tracing::warn!("Heartbeat error: {}", e);
                *state.is_online.write().await = false;
            }
        }
    }
}

async fn buffer_forwarder_task(state: AppState) {
    let mut interval = interval(Duration::from_secs(5));

    loop {
        interval.tick().await;

        let is_online = *state.is_online.read().await;
        if !is_online {
            continue;
        }

        let buffered_count = match state.buffer.count().await {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Failed to get buffer count: {}", e);
                continue;
            }
        };

        if buffered_count == 0 {
            continue;
        }

       // Background task: Update buffer forwarding
    let forwarder_state = state.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(5)).await;
            
            if *forwarder_state.is_online.read().await {
                if let Ok(count) = forwarder_state.buffer.count().await {
                    if count > 0 {
                        tracing::debug!("Attempting to forward {} buffered events", count);
                        let _ = forward_buffered_events(&forwarder_state).await;
                    }
                }
            }
        }
    });

    // Background task: Update metrics gauges
    let metrics_state = state.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(10)).await;
            
            // Update buffer metrics
            if let Ok(count) = metrics_state.buffer.count().await {
                metrics::gauge!("edge_agent_buffer_count").set(count as f64);
            }
            if let Ok(size_mb) = metrics_state.buffer.size_mb().await {
                metrics::gauge!("edge_agent_buffer_size_bytes").set(size_mb * 1024.0 * 1024.0);
            }
            
            // Update connection status
            let is_online = *metrics_state.is_online.read().await;
            metrics::gauge!("edge_agent_is_online").set(if is_online { 1.0 } else { 0.0 });
        }
    });
        tracing::info!("Forwarding {} buffered events", buffered_count);

        let forwarder = state.forwarder.read().await;
        match forwarder.forward_buffered(&state.buffer).await {
            Ok(count) => {
                if count > 0 {
                    tracing::info!("Successfully forwarded {} buffered events", count);
                }
            }
            Err(e) => {
                tracing::error!("Failed to forward buffered events: {}", e);
                *state.is_online.write().await = false;
            }
        }
    }
}
