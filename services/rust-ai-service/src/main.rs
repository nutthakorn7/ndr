use axum::{
    extract::{State, Json},
    routing::{get, post},
    Router,
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use rand::prelude::*;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
struct AppState {
    model: Arc<Mutex<DummyModel>>,
}

struct DummyModel {
    is_loaded: bool,
    // Simple cluster centers for our dummy model
    // The Python code generated data around +2 and -2.
    centers: Vec<Vec<f64>>,
    threshold: f64,
}

impl DummyModel {
    fn new() -> Self {
        Self {
            is_loaded: false,
            centers: vec![],
            threshold: 0.0,
        }
    }

    fn train(&mut self) {
        // Simulate training by setting up the clusters as per the Python script's logic
        // Python: X_train = np.r_[X_train + 2, X_train - 2]
        // So we have centers roughly at +2.0 and -2.0 for all 5 dimensions.
        self.centers = vec![
            vec![2.0; 5],
            vec![-2.0; 5],
        ];
        // Define a threshold. In Python IsolationForest, it's complex, but here we can just say
        // if distance > X, it's an anomaly.
        // 0.3 * randn means spread is small. 
        // Distance from 2.0 for a point at 2.0 is 0.
        // Let's pick a reasonable threshold.
        self.threshold = 1.5; 
        self.is_loaded = true;
        tracing::info!("Dummy model trained and saved (in-memory).");
    }

    fn predict(&self, features: &[f64]) -> (i32, bool, f64) {
        if !self.is_loaded {
            return (0, false, 0.0); // Should be handled by caller
        }

        // Calculate distance to nearest center
        let mut min_dist = f64::MAX;
        for center in &self.centers {
            let dist: f64 = features.iter().zip(center.iter())
                .map(|(a, b)| (a - b).powi(2))
                .sum::<f64>()
                .sqrt();
            if dist < min_dist {
                min_dist = dist;
            }
        }

        // Python IsolationForest: -1 for anomaly, 1 for normal.
        // Decision function: lower = more anomalous.
        // Here, higher distance = more anomalous.
        // Let's map distance to a score.
        // If dist > threshold -> Anomaly (-1)
        
        let is_anomaly = min_dist > self.threshold;
        let prediction = if is_anomaly { -1 } else { 1 };
        
        // Confidence/Score: In Python, decision_function returns a score.
        // We can just return -min_dist as a proxy for "score" (lower = more anomalous).
        let score = -min_dist;

        (prediction, is_anomaly, score)
    }
}

#[derive(Deserialize)]
struct FlowData {
    bytes_sent: i64,
    bytes_received: i64,
    packets_sent: i64,
    packets_received: i64,
    duration: f64,
}

#[derive(Serialize)]
struct Prediction {
    anomaly_score: i32,
    is_anomaly: bool,
    confidence: f64,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let model = Arc::new(Mutex::new(DummyModel::new()));
    
    // Initial "training"
    {
        let mut m = model.lock().unwrap();
        m.train();
    }

    let state = AppState { model };

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/analyze", post(analyze_flow))
        .route("/train", post(train_model))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8090".into());
    let addr = format!("0.0.0.0:{}", port);
    
    tracing::info!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check(State(state): State<AppState>) -> impl IntoResponse {
    let model = state.model.lock().unwrap();
    Json(serde_json::json!({
        "status": "healthy",
        "model_loaded": model.is_loaded
    }))
}

async fn analyze_flow(
    State(state): State<AppState>,
    Json(flow): Json<FlowData>,
) -> Result<Json<Prediction>, (StatusCode, String)> {
    let model = state.model.lock().unwrap();
    
    if !model.is_loaded {
        return Err((StatusCode::SERVICE_UNAVAILABLE, "Model not loaded".to_string()));
    }

    // Normalize/Preprocess features if needed. 
    // The Python script didn't seem to do explicit scaling on the input, 
    // but the training data was small (around +/- 2).
    // Real flow data might be huge (bytes ~ 1000s).
    // The Python script was a dummy, so it likely expected inputs to be in that small range 
    // OR it was just completely broken for real data.
    // Given the task is to migrate "essentials", and this is a "dummy" model,
    // we will assume the input features need to be scaled or we just use them as is 
    // if the user's test data matches the dummy training data.
    // For robustness, let's log if values are huge.
    
    let features = vec![
        flow.bytes_sent as f64,
        flow.bytes_received as f64,
        flow.packets_sent as f64,
        flow.packets_received as f64,
        flow.duration,
    ];

    // Simple log scaling to bring real network data (0-10000+) closer to our dummy model range (0-5)
    // This makes the dummy model slightly more usable for "real-ish" inputs.
    // log10(1 + x)
    let scaled_features: Vec<f64> = features.iter().map(|x| (x + 1.0).log10()).collect();

    let (anomaly_score, is_anomaly, confidence) = model.predict(&scaled_features);

    Ok(Json(Prediction {
        anomaly_score,
        is_anomaly,
        confidence,
    }))
}

async fn train_model(State(state): State<AppState>) -> Json<serde_json::Value> {
    let mut model = state.model.lock().unwrap();
    model.train();
    Json(serde_json::json!({ "status": "Model retrained successfully" }))
}
