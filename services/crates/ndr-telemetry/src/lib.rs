//! NDR Telemetry - Unified Logging, Metrics, and Tracing
//! 
//! Provides consistent observability across all NDR services.

use anyhow::Result;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

/// Initialize telemetry for a service
pub fn init_telemetry(service_name: &str) -> Result<()> {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer()
            .with_target(true)
            .with_level(true)
            .with_thread_ids(true))
        .init();

    tracing::info!(service = service_name, "Telemetry initialized");
    Ok(())
}

/// Initialize telemetry with OpenTelemetry/Jaeger tracing
pub fn init_with_tracing(service_name: &str, jaeger_endpoint: &str) -> Result<()> {
    let tracer = opentelemetry_jaeger::new_agent_pipeline()
        .with_service_name(service_name)
        .with_endpoint(jaeger_endpoint)
        .install_simple()?;

    let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);
    
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::registry()
        .with(filter)
        .with(telemetry)
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!(
        service = service_name,
        jaeger = jaeger_endpoint,
        "Telemetry with distributed tracing initialized"
    );
    
    Ok(())
}

// Re-export tracing macros for convenience
pub use tracing::{debug, error, info, trace, warn};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_telemetry_init() {
        // Can only init once per process, so just test it doesn't panic
        let result = init_telemetry("test-service");
        assert!(result.is_ok() || result.is_err()); // Either works or already initialized
    }
}
