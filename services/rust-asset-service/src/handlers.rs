use crate::models::AssetFilter;
use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use uuid::Uuid;

pub async fn health_check() -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "service": "rust-asset-service"
    }))
}

pub async fn list_assets(
    State(state): State<AppState>,
    Query(filter): Query<AssetFilter>,
) -> impl IntoResponse {
    match state.db.get_assets(filter).await {
        Ok(assets) => Json(json!({
            "assets": assets,
            "total": assets.len() // In a real app, we'd want a separate count query for pagination
        }))
        .into_response(),
        Err(e) => {
            tracing::error!("Failed to fetch assets: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch assets").into_response()
        }
    }
}

pub async fn get_asset(State(state): State<AppState>, Path(id): Path<Uuid>) -> impl IntoResponse {
    match state.db.get_asset_by_id(id).await {
        Ok(Some(asset)) => Json(asset).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Asset not found").into_response(),
        Err(e) => {
            tracing::error!("Failed to fetch asset: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch asset").into_response()
        }
    }
}

pub async fn get_stats(State(state): State<AppState>) -> impl IntoResponse {
    match state.db.get_stats().await {
        Ok(stats) => Json::<crate::models::AssetStats>(stats).into_response(),
        Err(e) => {
            tracing::error!("Failed to fetch stats: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch stats").into_response()
        }
    }
}
