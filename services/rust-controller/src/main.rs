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

use ndr_core::circuit_breaker::CircuitBreaker;

#[derive(Clone)]
struct AppState {
    db: PgPool,
    circuit_breaker: CircuitBreaker,
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

#[derive(Serialize, Debug, sqlx::FromRow)]
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

    let circuit_breaker = CircuitBreaker::new("postgres", 5, 30);
    let state = AppState { db: pool, circuit_breaker };

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
    if state.circuit_breaker.is_open().await {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }

    let sensors = match sqlx::query_as::<_, Sensor>(
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
    .await {
        Ok(s) => {
            state.circuit_breaker.record_success().await;
            s
        }
        Err(e) => {
            state.circuit_breaker.record_failure().await;
            error!(error = %e, "Failed to list sensors");
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    Ok(Json(ListSensorsResponse { sensors }))
}

async fn register_sensor(
    State(state): State<AppState>,
    Json(payload): Json<RegisterSensorRequest>,
) -> Result<(StatusCode, Json<RegisterResponse>), StatusCode> {
    if state.circuit_breaker.is_open().await {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }

    let sensor_id = payload.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let now = Utc::now();
    let tenant_id = payload.tenant_id.unwrap_or_else(|| "default".to_string());
    let metadata = payload.metadata.unwrap_or_else(|| serde_json::json!({}));
    let config = payload.config.unwrap_or_else(|| serde_json::json!({}));

    // Upsert sensor
    let sensor = match sqlx::query_as::<_, Sensor>(
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
        "#
    )
    .bind(&sensor_id)
    .bind(payload.name)
    .bind(payload.location)
    .bind(&tenant_id)
    .bind(&metadata)
    .bind(&config)
    .bind(&now)
    .fetch_one(&state.db)
    .await {
        Ok(s) => {
            state.circuit_breaker.record_success().await;
            s
        }
        Err(e) => {
            state.circuit_breaker.record_failure().await;
            error!(error = %e, "Failed to register sensor");
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    Ok((StatusCode::CREATED, Json(RegisterResponse { sensor })))
}

async fn heartbeat(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<HeartbeatRequest>,
) -> Result<Json<HeartbeatResponse>, StatusCode> {
    if state.circuit_breaker.is_open().await {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }

    let now = Utc::now();
    let status = payload.status.unwrap_or_else(|| "online".to_string());
    let metrics = payload.metrics.unwrap_or_else(|| serde_json::json!({}));

    let sensor = match sqlx::query_as::<_, Sensor>(
        r#"
        UPDATE sensors 
        SET last_heartbeat = $2, status = $3, last_metrics = $4, updated_at = $2 
        WHERE id = $1 
        RETURNING 
        id, name, location, tenant_id, status, 
        last_heartbeat, last_metrics, config, metadata, 
        created_at, updated_at
        "#
    )
    .bind(&id)
    .bind(&now)
    .bind(&status)
    .bind(&metrics)
    .fetch_optional(&state.db)
    .await {
        Ok(s) => {
            state.circuit_breaker.record_success().await;
            s
        }
        Err(e) => {
            state.circuit_breaker.record_failure().await;
            error!(error = %e, "Failed to update heartbeat");
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    }
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(HeartbeatResponse { sensor }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_health_check() {
        let response = health_check().await;
        assert_eq!(response, "OK");
    }
}
