use axum::{
    routing::{get, post},
    Router,
    Json,
    extract::{State, Path},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::postgres::PgPool;
use sqlx::Row;
use std::env;
use std::net::SocketAddr;
use ndr_telemetry::{init_telemetry, info, error};
use ndr_storage::postgres::create_pool;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Clone)]
struct AppState {
    db: PgPool,
}

#[derive(Deserialize, Debug)]
struct RegisterSensorRequest {
    id: Option<String>,
    name: Option<String>,
    location: Option<String>,
    tenant_id: Option<String>,
    metadata: Option<Value>,
    config: Option<Value>,
}

#[derive(Serialize, Debug)]
struct Sensor {
    id: String,
    name: Option<String>,
    location: Option<String>,
    tenant_id: Option<String>,
    status: Option<String>,
    last_heartbeat: Option<DateTime<Utc>>,
    last_metrics: Option<Value>,
    config: Option<Value>,
    metadata: Option<Value>,
    created_at: Option<DateTime<Utc>>,
    updated_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Debug)]
struct RegisterResponse {
    sensor: Sensor,
}

#[derive(Deserialize, Debug)]
struct HeartbeatRequest {
    status: Option<String>,
    metrics: Option<Value>,
}

#[derive(Serialize, Debug)]
struct HeartbeatResponse {
    sensor: Sensor,
}

#[derive(Serialize, Debug)]
struct ListSensorsResponse {
    sensors: Vec<Sensor>,
}

#[tokio::main]
async fn main() {
    // Initialize telemetry
    if let Err(e) = init_telemetry("sensor-controller") {
        eprintln!("Failed to initialize telemetry: {}", e);
        std::process::exit(1);
    }

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    
    // Create database pool
    let pool = create_pool(&database_url)
        .await
        .expect("Failed to connect to database");

    let state = AppState { db: pool };

    // Build our application with routes matching Node.js API
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/sensors", get(list_sensors))
        .route("/sensors/register", post(register_sensor))
        .route("/sensors/:id/heartbeat", post(heartbeat))
        .with_state(state);

    // Run it
    let port = env::var("PORT").unwrap_or_else(|_| "8084".to_string());
    let addr: SocketAddr = format!("0.0.0.0:{}", port).parse().unwrap();
    info!("Rust Sensor Controller listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "OK"
}

async fn list_sensors(
    State(state): State<AppState>,
) -> Result<Json<ListSensorsResponse>, StatusCode> {
    let sensors = sqlx::query_as!(
        Sensor,
        r#"
        SELECT 
            id, name, location, tenant_id, status, 
            last_heartbeat, last_metrics, config, metadata, 
            created_at, updated_at 
        FROM sensors 
        ORDER BY updated_at DESC
        "#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to list sensors");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(ListSensorsResponse { sensors }))
}

async fn register_sensor(
    State(state): State<AppState>,
    Json(payload): Json<RegisterSensorRequest>,
) -> Result<(StatusCode, Json<RegisterResponse>), StatusCode> {
    let sensor_id = payload.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let now = Utc::now();
    let tenant_id = payload.tenant_id.unwrap_or_else(|| "default".to_string());
    let metadata = payload.metadata.unwrap_or_else(|| serde_json::json!({}));
    let config = payload.config.unwrap_or_else(|| serde_json::json!({}));

    // Upsert sensor
    let sensor = sqlx::query_as!(
        Sensor,
        r#"
        INSERT INTO sensors (id, name, location, tenant_id, metadata, config, status, last_heartbeat, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'registered', $7, $7)
        ON CONFLICT (id) DO UPDATE SET
            name = COALESCE(EXCLUDED.name, sensors.name),
            location = COALESCE(EXCLUDED.location, sensors.location),
            tenant_id = COALESCE(EXCLUDED.tenant_id, sensors.tenant_id),
            metadata = COALESCE(EXCLUDED.metadata, sensors.metadata),
            config = COALESCE(EXCLUDED.config, sensors.config),
            status = 'registered',
            updated_at = EXCLUDED.updated_at
        RETURNING 
            id, name, location, tenant_id, status, 
            last_heartbeat, last_metrics, config, metadata, 
            created_at, updated_at
        "#,
        sensor_id,
        payload.name,
        payload.location,
        tenant_id,
        metadata,
        config,
        now
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to register sensor");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok((StatusCode::CREATED, Json(RegisterResponse { sensor })))
}

async fn heartbeat(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<HeartbeatRequest>,
) -> Result<Json<HeartbeatResponse>, StatusCode> {
    let now = Utc::now();
    let status = payload.status.unwrap_or_else(|| "online".to_string());
    let metrics = payload.metrics.unwrap_or_else(|| serde_json::json!({}));

    let sensor = sqlx::query_as!(
        Sensor,
        r#"
        UPDATE sensors 
        SET last_heartbeat = $2, status = $3, last_metrics = $4, updated_at = $2 
        WHERE id = $1 
        RETURNING 
        id, name, location, tenant_id, status, 
        last_heartbeat, last_metrics, config, metadata, 
        created_at, updated_at
        "#,
        id,
        now,
        status,
        metrics
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to update heartbeat");
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(HeartbeatResponse { sensor }))
}
