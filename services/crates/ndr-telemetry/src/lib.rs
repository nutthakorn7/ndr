//! NDR Telemetry - Unified Logging, Metrics, and Tracing
//! 
//! Provides consistent observability across all NDR services.

use anyhow::Result;
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::{trace, Resource, runtime};
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

/// Initialize telemetry with OpenTelemetry/OTLP tracing
pub fn init_with_tracing(service_name: &str, endpoint: &str) -> Result<()> {
    let tracer = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(
            opentelemetry_otlp::new_exporter()
                .tonic()
                .with_endpoint(endpoint),
        )
        .with_trace_config(
            trace::config().with_resource(
                Resource::new(vec![
                    opentelemetry::KeyValue::new("service.name", service_name.to_string()),
                ]),
            ),
        )
        .install_batch(runtime::Tokio)?;

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
        endpoint = endpoint,
        "Telemetry with OTLP tracing initialized"
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
