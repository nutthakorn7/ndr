use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;

use crate::error::{AppError, Result as AppResult};
use crate::AppState;

#[derive(Deserialize, Debug)]
pub struct HeartbeatRequest {
    pub status: Option<String>,
    pub metrics: Option<Value>,
}

#[derive(Serialize)]
pub struct HeartbeatResponse {
    pub message: String,
    pub config_update: Option<Value>,
}

pub async fn update_heartbeat(
    State(state): State<Arc<AppState>>,
    Path(agent_id): Path<String>,
    Json(req): Json<HeartbeatRequest>,
) -> AppResult<Json<HeartbeatResponse>> {
    let status = req.status.unwrap_or_else(|| "online".to_string());

    // Get current config for response
    let current_config = sqlx::query_scalar::<_, Option<Value>>(
        "SELECT config FROM edge_agents WHERE agent_id = $1",
    )
    .bind(&agent_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        AppError::internal("Failed to retrieve agent configuration")
            .with_context(format!("Agent ID: {}, Error: {}", agent_id, e))
    })?
    .flatten();

    // Update heartbeat
    let result = sqlx::query(
        r#"
        UPDATE edge_agents 
        SET last_heartbeat = NOW(), 
            status = $1, 
            last_metrics = $2,
            updated_at = NOW()
        WHERE agent_id = $3
        "#,
    )
    .bind(&status)
    .bind(&req.metrics)
    .bind(&agent_id)
    .execute(&state.db)
    .await
    .map_err(|e| {
        AppError::internal("Failed to update agent heartbeat")
            .with_context(format!("Agent ID: {}, Error: {}", agent_id, e))
    })?;

    if result.rows_affected() == 0 {
        return Err(
            AppError::not_found(format!("Edge agent '{}' not found", agent_id))
                .with_context("Agent must be registered before sending heartbeats"),
        );
    }

    metrics::counter!("edge_coordinator_heartbeats_received").increment(1);
    ndr_telemetry::debug!("Heartbeat received from agent: {}", agent_id);

    Ok(Json(HeartbeatResponse {
        message: "Heartbeat acknowledged".to_string(),
        config_update: current_config,
    }))
}
