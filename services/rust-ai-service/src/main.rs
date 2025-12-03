use axum::{
    extract::{Json, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use linfa::prelude::*;
use linfa_clustering::KMeans;
use ndarray::{Array2, ArrayView1};
use ndr_storage::postgres::create_pool;
use ndr_telemetry::{error, info, init_telemetry, warn};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tower_http::trace::TraceLayer;

mod repository;
use repository::{ModelArtifacts, Repository};

#[derive(Clone)]
struct AppState {
    model: Arc<Mutex<AnomalyModel>>,
    repository: Arc<Repository>,
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

    fn load_from_artifacts(&mut self, artifacts: ModelArtifacts) {
        self.centroids = Some(artifacts.centroids);
        self.threshold = artifacts.threshold;
    }

    fn train(&mut self, data: Vec<repository::TrainingData>) -> Result<ModelArtifacts, String> {
        info!("Starting model training with {} records...", data.len());

        if data.is_empty() {
            return Err("No training data available".to_string());
        }

        // Convert to ndarray
        // Features: log1p(bytes_sent), log1p(bytes_recv), log1p(pkts_sent), log1p(pkts_recv), log1p(duration)
        let n_samples = data.len();
        let mut features = Vec::with_capacity(n_samples * 5);

        for d in &data {
            features.push(d.bytes_sent.ln_1p());
            features.push(d.bytes_received.ln_1p());
            features.push(d.packets_sent.ln_1p());
            features.push(d.packets_received.ln_1p());
            features.push(d.duration.ln_1p());
        }

        let dataset_array =
            Array2::from_shape_vec((n_samples, 5), features).map_err(|e| e.to_string())?;
        let dataset = Dataset::from(dataset_array);

        // Train K-Means with 2 clusters (Normal vs Anomalous? Or just clustering normal behavior)
        // For anomaly detection, we usually cluster "normal" data into K clusters.
        let model = KMeans::params(2)
            .max_n_iterations(100)
            .tolerance(1e-5)
            .fit(&dataset)
            .map_err(|e| e.to_string())?;

        let centroids = model.centroids().clone();

        // Calculate threshold (99th percentile distance)
        let mut distances = Vec::new();
        for i in 0..n_samples {
            let point = dataset.records().row(i);
            let mut min_dist = f64::MAX;
            for centroid in centroids.outer_iter() {
                let dist = (&point - &centroid).mapv(|x| x.powi(2)).sum().sqrt();
                if dist < min_dist {
                    min_dist = dist;
                }
            }
            distances.push(min_dist);
        }

        distances.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let threshold_idx = (distances.len() as f64 * 0.99) as usize;
        let threshold = distances[threshold_idx.min(distances.len() - 1)];

        self.centroids = Some(centroids.clone());
        self.threshold = threshold;

        info!("Model trained. Threshold: {}", threshold);

        Ok(ModelArtifacts {
            centroids,
            threshold,
        })
    }

    fn predict(&self, features: &[f64]) -> (i32, bool, f64) {
        if self.centroids.is_none() {
            return (0, false, 0.0);
        }

        let centroids = match self.centroids.as_ref() {
            Some(c) => c,
            None => return (0, false, 0.0),
        };
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
async fn main() -> anyhow::Result<()> {
    // Initialize telemetry
    if let Err(e) = init_telemetry("ai-service") {
        eprintln!("Failed to initialize telemetry: {}", e);
        std::process::exit(1);
    }

    // Connect to database
    let database_url = std::env::var("DATABASE_URL")
        .map_err(|_| anyhow::anyhow!("DATABASE_URL environment variable must be set"))?;
    let pool = create_pool(&database_url).await?;
    let repository = Arc::new(Repository::new(pool));

    let model = Arc::new(Mutex::new(AnomalyModel::new()));

    // Load existing model
    match repository.load_active_model().await {
        Ok(Some(artifacts)) => {
            let mut m = match model.lock() {
                Ok(guard) => guard,
                Err(poisoned) => {
                    error!("Model lock poisoned, recovering");
                    poisoned.into_inner()
                }
            };
            m.load_from_artifacts(artifacts);
            info!("Loaded existing model from database");
        }
        Ok(None) => {
            warn!("No existing model found. Service will need training.");
        }
        Err(e) => {
            error!("Failed to load model: {}", e);
        }
    }

    let state = AppState { model, repository };

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/analyze", post(analyze_flow))
        .route("/train", post(train_model))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8090".into());
    let addr = format!("0.0.0.0:{}", port);

    info!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr.clone())
        .await
        .map_err(|e| anyhow::anyhow!("Failed to bind to {}: {}", addr, e))?;
    axum::serve(listener, app)
        .await
        .map_err(|e| anyhow::anyhow!("Server error: {}", e))?;

    Ok(())
}

async fn health_check(State(state): State<AppState>) -> impl IntoResponse {
    let model = match state.model.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            error!("Model lock poisoned during health check, recovering");
            poisoned.into_inner()
        }
    };
    Json(serde_json::json!({
        "status": "healthy",
        "model_loaded": model.centroids.is_some()
    }))
}

async fn analyze_flow(
    State(state): State<AppState>,
    Json(flow): Json<FlowData>,
) -> Result<Json<Prediction>, (StatusCode, String)> {
    let model = match state.model.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            error!("Model lock poisoned during analyze, recovering");
            poisoned.into_inner()
        }
    };

    if model.centroids.is_none() {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "Model not loaded".to_string(),
        ));
    }

    // Preprocessing: Log scaling (log1p)
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

async fn train_model(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // 1. Fetch data
    let data = state
        .repository
        .fetch_training_data(10000)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("DB Error: {}", e),
            )
        })?;

    if data.len() < 10 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Not enough data to train (need at least 10 records)".to_string(),
        ));
    }

    // 2. Train model
    let artifacts = {
        let mut model = match state.model.lock() {
            Ok(guard) => guard,
            Err(poisoned) => {
                error!("Model lock poisoned during training, recovering");
                poisoned.into_inner()
            }
        };
        model
            .train(data)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?
    };

    // 3. Save model
    let version = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_else(|_| Duration::from_secs(0))
        .as_secs()
        .to_string();
    state
        .repository
        .save_model(&version, &artifacts)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Save Error: {}", e),
            )
        })?;

    Ok(Json(serde_json::json!({
        "status": "Model retrained and saved successfully",
        "version": version,
        "threshold": artifacts.threshold
    })))
}
