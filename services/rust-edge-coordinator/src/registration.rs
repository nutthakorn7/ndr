use axum::{extract::{State, Json}, http::StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use chrono::{DateTime, Utc};
use std::sync::Arc;

use crate::AppState;
use crate::error::{AppError, Result as AppResult};

#[derive(Deserialize, Debug)]
pub struct RegistrationRequest {
    pub agent_id: String,
    pub location: Option<String>,
    pub version: Option<String>,
    pub capabilities: Option<Vec<String>>,
}

#[derive(Serialize, Debug, sqlx::FromRow)]
pub struct EdgeAgent {
    pub id: uuid::Uuid,
    pub agent_id: String,
    pub name: Option<String>,
    pub location: Option<String>,
    pub tenant_id: String,
    pub status: String,
    pub version: Option<String>,
    pub capabilities: Option<Value>,
    pub config: Option<Value>,
    pub last_heartbeat: Option<DateTime<Utc>>,
    pub last_metrics: Option<Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Serialize)]
pub struct RegistrationResponse {
    pub agent: EdgeAgent,
    pub message: String,
}

#[derive(Serialize)]
pub struct AgentsListResponse {
    pub agents: Vec<EdgeAgent>,
    pub total: i64,
}

pub async fn register_agent(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RegistrationRequest>,
) -> AppResult<(StatusCode, Json<RegistrationResponse>)> {
    let capabilities_json = req.capabilities
        .map(|c| serde_json::to_value(c).ok())
        .flatten()
        .unwrap_or(Value::Null);

    // Upsert agent
    let agent = sqlx::query_as::<_, EdgeAgent>(
        r#"
        INSERT INTO edge_agents (agent_id, location, version, capabilities, status, last_heartbeat, updated_at)
        VALUES ($1, $2, $3, $4, 'registered', NOW(), NOW())
        ON CONFLICT (agent_id) DO UPDATE SET
            location = COALESCE(EXCLUDED.location, edge_agents.location),
            version = COALESCE(EXCLUDED.version, edge_agents.version),
            capabilities = COALESCE(EXCLUDED.capabilities, edge_agents.capabilities),
            status = 'registered',
            last_heartbeat = NOW(),
            updated_at = NOW()
        RETURNING *
        "#,
    )
    .bind(&req.agent_id)
    .bind(&req.location)
    .bind(&req.version)
    .bind(&capabilities_json)
    .fetch_one(&state.db)
    .await
    .map_err(|e| AppError::internal("Failed to register edge agent")
        .with_context(format!("Agent ID: {}, Error: {}", req.agent_id, e)))?;

    metrics::counter!("edge_coordinator_agents_registered").increment(1);
    tracing::info!("Agent registered: {} at {}", req.agent_id, req.location.as_deref().unwrap_or("unknown"));

    Ok((
        StatusCode::CREATED,
        Json(RegistrationResponse {
            agent,
            message: "Agent registered successfully".to_string(),
        }),
    ))
}

pub async fn get_agents(
    State(state): State<Arc<AppState>>,
) -> AppResult<Json<AgentsListResponse>> {
    let agents = sqlx::query_as::<_, EdgeAgent>(
        "SELECT * FROM edge_agents ORDER BY updated_at DESC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::internal("Failed to retrieve agent list")
        .with_context(e.to_string()))?;

    let total = agents.len() as i64;

    Ok(Json(AgentsListResponse { agents, total }))
}

pub async fn get_agent(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(agent_id): axum::extract::Path<String>,
) -> AppResult<Json<EdgeAgent>> {
    let agent = sqlx::query_as::<_, EdgeAgent>(
        "SELECT * FROM edge_agents WHERE agent_id = $1"
    )
    .bind(&agent_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::internal("Database query failed")
        .with_context(format!("Agent ID: {}, Error: {}", agent_id, e)))?
    .ok_or_else(|| AppError::not_found(format!("Edge agent '{}' not found", agent_id))
        .with_context("The agent may have been removed"))?;

    Ok(Json(agent))
}
