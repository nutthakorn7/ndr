use axum::{
    extract::{State, Json},
    routing::{get, post},
    Router,
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use linfa::prelude::*;
use linfa_clustering::KMeans;
use ndarray::{Array2, ArrayView1, array};
use rand::prelude::*;
use rand_distr::{Normal, Distribution};

#[derive(Clone)]
struct AppState {
    model: Arc<Mutex<AnomalyModel>>,
}

struct AnomalyModel {
    centroids: Option<Array2<f64>>,
    threshold: f64,
}

impl AnomalyModel {
    fn new() -> Self {
        Self {
            centroids: None,
            threshold: 0.0,
        }
    }

    fn train(&mut self) {
        tracing::info!("Starting model training with K-Means...");
        
        // Generate synthetic "normal" traffic data
        // We simulate 5 features: bytes_sent, bytes_recv, pkts_sent, pkts_recv, duration
        // We'll generate 2 clusters of "normal" behavior.
        // Cluster 1: Small flows (e.g., DNS, HTTP keepalive)
        // Cluster 2: Medium flows (e.g., standard web browsing)
        
        let n_samples = 200;
        let mut data = Vec::with_capacity(n_samples * 5);
        let mut rng = rand::thread_rng();
        
        // Cluster 1: Small flows (log-scaled values around 1.0)
        let normal1 = Normal::new(1.0, 0.2).unwrap();
        for _ in 0..n_samples/2 {
            for _ in 0..5 {
                data.push(normal1.sample(&mut rng));
            }
        }

        // Cluster 2: Medium flows (log-scaled values around 3.0)
        let normal2 = Normal::new(3.0, 0.5).unwrap();
        for _ in 0..n_samples/2 {
            for _ in 0..5 {
                data.push(normal2.sample(&mut rng));
            }
        }

        // Create ndarray
        let dataset_array = Array2::from_shape_vec((n_samples, 5), data).unwrap();
        let dataset = Dataset::from(dataset_array);

        // Train K-Means with 2 clusters
        let model = KMeans::params(2)
            .max_n_iterations(100)
            .tolerance(1e-5)
            .fit(&dataset)
            .expect("KMeans training failed");

        self.centroids = Some(model.centroids().clone());
        
        // Set threshold based on max distance in training set (plus some margin)
        // In a real system, we'd calculate the 99th percentile distance.
        // Here we'll just pick a reasonable heuristic for log-scaled data.
        // If a point is > 2.0 units away from nearest centroid in log-space, it's likely anomalous.
        self.threshold = 2.0; 
        
        tracing::info!("Model trained successfully. Centroids: {:?}", self.centroids.as_ref().unwrap());
    }

    fn predict(&self, features: &[f64]) -> (i32, bool, f64) {
        if self.centroids.is_none() {
            return (0, false, 0.0);
        }

        let centroids = self.centroids.as_ref().unwrap();
        let point = ArrayView1::from(features);

        // Find distance to nearest centroid
        let mut min_dist = f64::MAX;
        for centroid in centroids.outer_iter() {
            let dist = (&point - &centroid).mapv(|x| x.powi(2)).sum().sqrt();
            if dist < min_dist {
                min_dist = dist;
            }
        }

        let is_anomaly = min_dist > self.threshold;
        let prediction = if is_anomaly { -1 } else { 1 };
        
        // Score: Higher distance = higher anomaly score.
        // We return negative distance as "confidence" of normality, or just distance as anomaly score.
        // Let's return distance as the score.
        let score = min_dist;

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
    anomaly_score: f64,
    is_anomaly: bool,
    prediction: i32,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let model = Arc::new(Mutex::new(AnomalyModel::new()));
    
    // Initial training
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
        "model_loaded": model.centroids.is_some()
    }))
}

async fn analyze_flow(
    State(state): State<AppState>,
    Json(flow): Json<FlowData>,
) -> Result<Json<Prediction>, (StatusCode, String)> {
    let model = state.model.lock().unwrap();
    
    if model.centroids.is_none() {
        return Err((StatusCode::SERVICE_UNAVAILABLE, "Model not loaded".to_string()));
    }

    // Preprocessing: Log scaling (log1p)
    // This matches the training data distribution assumption
    let features = vec![
        (flow.bytes_sent as f64).ln_1p(),
        (flow.bytes_received as f64).ln_1p(),
        (flow.packets_sent as f64).ln_1p(),
        (flow.packets_received as f64).ln_1p(),
        flow.duration.ln_1p(),
    ];

    let (prediction, is_anomaly, anomaly_score) = model.predict(&features);

    Ok(Json(Prediction {
        anomaly_score,
        is_anomaly,
        prediction,
    }))
}

async fn train_model(State(state): State<AppState>) -> Json<serde_json::Value> {
    let mut model = state.model.lock().unwrap();
    model.train();
    Json(serde_json::json!({ "status": "Model retrained successfully" }))
}
