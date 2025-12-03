mod config;
mod ioc_store;
use ioc_store::IocStore;

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
use tower_http::trace::TraceLayer;
use ndr_telemetry::{init_telemetry, info, warn, error, debug};

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
    ioc_store: Arc<IocStore>,
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
    // Initialize telemetry
    if let Err(e) = init_telemetry("edge-agent") {
        eprintln!("Failed to initialize telemetry: {}", e);
        std::process::exit(1);
    }

    info!("Starting Rust Edge Agent...");

    // Load configuration
    let config = Config::from_env()?;
    info!("Agent ID: {}, Location: {}", config.agent_id, config.location);

    // Initialize buffer
    let buffer = Buffer::new(&config.buffer_db_path, config.max_buffer_size_mb).await?;
    let buffer = Arc::new(buffer);
    info!("Buffer initialized at {}", config.buffer_db_path);

    // Initialize forwarder
    let forwarder = Forwarder::new(&config)?;
    let forwarder = Arc::new(RwLock::new(forwarder));
    info!("Kafka forwarder initialized");

    // Initialize detector
    let detector = LocalDetector::new();
    let detector = Arc::new(RwLock::new(detector));

    // Initialize IOC store
    let ioc_store = Arc::new(IocStore::new());

    // HTTP client for coordinator communication with timeouts
    let coordinator_client = Arc::new(
        reqwest::Client::builder()
            .timeout(Duration::from_secs(10))        // Overall request timeout
            .connect_timeout(Duration::from_secs(5)) // Connection timeout
            .build()?
    );

    let is_online = Arc::new(RwLock::new(false));

    let state = AppState {
        config: Arc::new(RwLock::new(config.clone())),
        buffer: buffer.clone(),
        forwarder: forwarder.clone(),
        detector,
        ioc_store: ioc_store.clone(),
        coordinator_client: coordinator_client.clone(),
        is_online: is_online.clone(),
    };

    // Register with coordinator
    if let Err(e) = register_with_coordinator(&state).await {
        warn!("Failed to register with coordinator: {}", e);
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

    let metrics_state = state.clone();
    tokio::spawn(async move {
        metrics_updater_task(metrics_state).await;
    });

    let rule_updater_state = state.clone();
    tokio::spawn(async move {
        rule_updater_task(rule_updater_state).await;
    });

    // Initialize Metrics
    let builder = metrics_exporter_prometheus::PrometheusBuilder::new();
    let handle = builder.install_recorder()
        .map_err(|e| anyhow::anyhow!("Failed to install Prometheus recorder: {}", e))?;

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
        info!("API key authentication enabled");
    } else {
        warn!("API key authentication disabled - set API_KEY environment variable to enable");
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
    info!("Edge Agent listening on {}", addr);
    
    // Check if TLS is enabled
    if tls::is_tls_enabled() {
        let cert_path = tls::get_cert_path();
        let key_path = tls::get_key_path();
        
        match tls::load_tls_config(&cert_path, &key_path).await {
            Ok(tls_config) => {
                info!("Starting Edge Agent with TLS/HTTPS on https://{}", addr);
                axum_server::bind_rustls(addr, tls_config)
                    .serve(app.into_make_service())
                    .await?;
            }
            Err(e) => {
                error!("Failed to load TLS config: {}. Falling back to HTTP.", e);
                warn!("Running without TLS - communication is NOT encrypted!");
                let listener = tokio::net::TcpListener::bind(addr).await?;
                axum::serve(listener, app)
                    .with_graceful_shutdown(shutdown_signal())
                    .await?;
            }
        }
    } else {
        warn!("TLS disabled - running HTTP only. Set TLS_ENABLED=true to enable HTTPS.");
        let listener = tokio::net::TcpListener::bind(addr).await?;
        axum::serve(listener, app)
            .with_graceful_shutdown(shutdown_signal())
            .await?;
    }

    info!("Edge Agent stopped gracefully");
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    info!("Signal received, starting graceful shutdown...");
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
    let priority = detector.get_priority(&req.event, &state.ioc_store);
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
                warn!("Failed to forward event, will buffer: {}", e);
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
    info!("Received configuration update");
    
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
        info!("Successfully registered with coordinator");
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
                debug!("Heartbeat sent successfully");
            }
            Ok(response) => {
                warn!("Heartbeat failed with status: {}", response.status());
                *state.is_online.write().await = false;
            }
            Err(e) => {
                warn!("Heartbeat error: {}", e);
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
                error!("Failed to get buffer count: {}", e);
                continue;
            }
        };

        if buffered_count == 0 {
            continue;
        }

        info!("Forwarding {} buffered events", buffered_count);

        if let Err(e) = forward_buffered_events(&state).await {
            error!("Failed to forward buffered events: {}", e);
            *state.is_online.write().await = false;
        }
    }
}

async fn metrics_updater_task(state: AppState) {
    let mut interval = interval(Duration::from_secs(10));

    loop {
        interval.tick().await;
        
        // Update buffer metrics
        if let Ok(count) = state.buffer.count().await {
            metrics::gauge!("edge_agent_buffer_count").set(count as f64);
        }
        if let Ok(size_mb) = state.buffer.size_mb().await {
            metrics::gauge!("edge_agent_buffer_size_bytes").set(size_mb * 1024.0 * 1024.0);
        }
        
        // Update connection status
        let is_online = *state.is_online.read().await;
        metrics::gauge!("edge_agent_is_online").set(if is_online { 1.0 } else { 0.0 });
    }
}

async fn forward_buffered_events(state: &AppState) -> anyhow::Result<()> {
    let forwarder = state.forwarder.read().await;
    let count = forwarder.forward_buffered(&state.buffer).await?;
    if count > 0 {
        info!("Successfully forwarded {} buffered events", count);
    }
    Ok(())
}

#[derive(Deserialize, Debug)]
struct RuleUpdate {
    name: String,
    pattern: String,
    severity: String,
    enabled: bool,
}

async fn rule_updater_task(state: AppState) {
    use rdkafka::consumer::{StreamConsumer, Consumer};
    use rdkafka::config::ClientConfig;
    use rdkafka::message::Message;

    let config = state.config.read().await;
    let brokers = config.kafka_brokers.clone();
    drop(config);

    let consumer: StreamConsumer = match ClientConfig::new()
        .set("group.id", "edge-agent-rule-updater")
        .set("bootstrap.servers", &brokers)
        .set("enable.partition.eof", "false")
        .set("session.timeout.ms", "6000")
        .set("enable.auto.commit", "true")
        .set("socket.timeout.ms", "30000")      // Socket timeout 30s
        .set("request.timeout.ms", "30000")     // Request timeout 30s
        .create()
    {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to create Kafka consumer for rule updates: {}", e);
            return;  // Exit the task gracefully
        }
    };

    if let Err(e) = consumer.subscribe(&["edge-rules"]) {
        error!("Failed to subscribe to edge-rules topic: {}", e);
        return;  // Exit the task gracefully
    }

    info!("Started rule updater task, listening on edge-rules");

    loop {
        match consumer.recv().await {
            Err(e) => warn!("Kafka error: {}", e),
            Ok(m) => {
                if let Some(payload) = m.payload_view::<str>() {
                    match payload {
                        Ok(text) => {
                            if let Ok(rule) = serde_json::from_str::<RuleUpdate>(text) {
                                info!("Received rule update: {}", rule.name);
                                let mut detector = state.detector.write().await;
                                let detection_rule = crate::detector::DetectionRule {
                                    name: rule.name,
                                    pattern: rule.pattern,
                                    severity: rule.severity,
                                    enabled: rule.enabled,
                                };
                                detector.add_rule(detection_rule);
                            } else {
                                warn!("Failed to parse rule update: {}", text);
                            }
                        }
                        Err(e) => warn!("Error while deserializing message payload: {:?}", e),
                    }
                }
            }
        };
    }
}
