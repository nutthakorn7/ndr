use anyhow::{Context, Result};
use axum_server::tls_rustls::RustlsConfig;
use std::path::Path;

/// Load TLS configuration from certificate and key files
pub async fn load_tls_config(cert_path: &str, key_path: &str) -> Result<RustlsConfig> {
    // Verify files exist
    if !Path::new(cert_path).exists() {
        anyhow::bail!("Certificate file not found: {}", cert_path);
    }
    if !Path::new(key_path).exists() {
        anyhow::bail!("Private key file not found: {}", key_path);
    }

    // Load TLS configuration
    let config = RustlsConfig::from_pem_file(cert_path, key_path)
        .await
        .context("Failed to load TLS certificates")?;

    ndr_telemetry::info!("TLS configuration loaded successfully");
    Ok(config)
}

/// Check if TLS is enabled based on environment variables
pub fn is_tls_enabled() -> bool {
    std::env::var("TLS_ENABLED")
        .unwrap_or_else(|_| "false".to_string())
        .parse()
        .unwrap_or(false)
}

/// Get TLS certificate path from environment
pub fn get_cert_path() -> String {
    std::env::var("TLS_CERT_PATH").unwrap_or_else(|_| "/etc/edge-agent/tls/cert.pem".to_string())
}

/// Get TLS key path from environment
pub fn get_key_path() -> String {
    std::env::var("TLS_KEY_PATH").unwrap_or_else(|_| "/etc/edge-agent/tls/key.pem".to_string())
}
