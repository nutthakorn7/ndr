use axum::{
    extract::{State, Json, Query},
    http::StatusCode,
};
use std::sync::Arc;
use serde_json::{json, Value};
use ndr_telemetry::error;  // Add ndr_telemetry
use crate::state::AppState;
use crate::models::*;

pub async fn health_check() -> &'static str {
    "OK"
}

pub async fn get_dashboard_analytics(
    State(_state): State<Arc<AppState>>,
) -> Json<Value> {
    // Mock for initial migration - replace with real OpenSearch aggregation later
    Json(json!({
        "summary": {
            "total_events": 15420,
            "open_alerts": 23,
            "critical_alerts": 5,
            "assets_count": 156
        },
        "trends": {
            "events_over_time": []
        },
        "top_sources": []
    }))
}

pub async fn get_traffic_stats(
    State(_state): State<Arc<AppState>>,
) -> Json<Vec<TrafficStat>> {
    // Mock for initial migration
    Json(vec![])
}

pub async fn search_events(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<EventSearchRequest>,
) -> Result<Json<EventResponse>, StatusCode> {
    // In a real implementation, we would build the OpenSearch query here
    // For now, returning empty to verify connectivity
    Ok(Json(EventResponse {
        events: vec![],
        total: 0,
        limit: payload.limit.unwrap_or(100),
        offset: payload.offset.unwrap_or(0),
    }))
}

pub async fn get_alerts(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, StatusCode> {
    let alerts = sqlx::query!("SELECT id, title, severity, status, timestamp, description FROM alerts ORDER BY timestamp DESC LIMIT 50")
        .fetch_all(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch alerts");  // Use ndr_telemetry
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let alerts_json: Vec<Value> = alerts.into_iter().map(|row| {
        json!({
            "id": row.id,
            "title": row.title,
            "severity": row.severity,
            "status": row.status,
            "timestamp": row.timestamp.map(|t| t.to_rfc3339()),
            "description": row.description
        })
    }).collect();

    Ok(Json(json!({
        "alerts": alerts_json,
        "total": alerts_json.len(),
        "limit": 50,
        "offset": 0
    })))
}

// Proxy Handlers
pub async fn proxy_sensors(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, StatusCode> {
    let url = format!("{}/sensors", std::env::var("SENSOR_CONTROLLER_URL").unwrap_or("http://sensor-controller:8084".to_string()));
    let resp = state.http_client.get(&url).send().await.map_err(|_| StatusCode::BAD_GATEWAY)?;
    let json: Value = resp.json().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(json))
}

pub async fn proxy_ai_chat(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, StatusCode> {
    let url = format!("{}/ai/chat", std::env::var("AI_SERVICE_URL").unwrap_or("http://ai-service:8090".to_string()));
    let resp = state.http_client.post(&url).json(&payload).send().await.map_err(|_| StatusCode::BAD_GATEWAY)?;
    let json: Value = resp.json().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(json))
}
