use axum::{
    extract::{Request, State},
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::Response,
};
use ndr_telemetry::warn;
use sha2::{Digest, Sha256};
use std::sync::Arc;

/// API key authentication middleware for coordinator
pub async fn api_key_auth(
    State(api_key_hash): State<Arc<Option<String>>>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // If no API key is configured, allow the request
    let Some(expected_hash) = api_key_hash.as_ref() else {
        warn!("No API key configured - authentication disabled");
        return Ok(next.run(request).await);
    };

    // Extract API key from Authorization header
    let api_key = headers
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .or_else(|| {
            // Also support X-API-Key header
            headers.get("X-API-Key").and_then(|v| v.to_str().ok())
        });

    let Some(key) = api_key else {
        warn!("Missing API key in coordinator request");
        metrics::counter!("edge_coordinator_auth_failed").increment(1);
        return Err(StatusCode::UNAUTHORIZED);
    };

    // Hash the provided key and compare
    let mut hasher = Sha256::new();
    hasher.update(key.as_bytes());
    let key_hash = hex::encode(hasher.finalize());

    if key_hash != *expected_hash {
        warn!("Invalid API key provided to coordinator");
        metrics::counter!("edge_coordinator_auth_failed").increment(1);
        return Err(StatusCode::UNAUTHORIZED);
    };

    metrics::counter!("edge_coordinator_auth_success").increment(1);
    Ok(next.run(request).await)
}
