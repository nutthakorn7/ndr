use axum::{
    routing::{get, get_service},
    Router,
    http::{Method, StatusCode},
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tower_http::services::ServeDir;
use std::net::SocketAddr;
use std::sync::Arc;
use ndr_telemetry::{init_telemetry, info, error};

mod capture;
mod api;

#[derive(Clone)]
pub struct AppState {
    pub pcap_dir: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv::dotenv().ok();
    
    // Initialize telemetry
    if let Err(e) = init_telemetry("pcap-service") {
        eprintln!("Failed to initialize telemetry: {}", e);
        std::process::exit(1);
    }

    info!("Starting Rust PCAP Service...");

    let pcap_dir = std::env::var("PCAP_DIR").unwrap_or_else(|_| "/data/pcap".to_string());
    let interface = std::env::var("CAPTURE_INTERFACE").unwrap_or_else(|_| "eth0".to_string());
    
    // Ensure PCAP directory exists
    std::fs::create_dir_all(&pcap_dir)?;

    // Start Capture Thread
    let capture_dir = pcap_dir.clone();
    std::thread::spawn(move || {
        if let Err(e) = capture::start_capture(&interface, &capture_dir) {
            error!("Capture thread failed: {}", e);
        }
    });

    let state = Arc::new(AppState {
        pcap_dir: pcap_dir.clone(),
    });

    // CORS
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_origin(Any)
        .allow_headers(Any);

    // Routes
    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/api/pcaps", get(api::list_pcaps))
        .nest_service("/files", ServeDir::new(&pcap_dir))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    // Run
    let port = std::env::var("PORT").unwrap_or_else(|_| "8088".to_string());
    let addr: SocketAddr = format!("0.0.0.0:{}", port).parse()?;
    
    info!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
