use sqlx::PgPool;
use ndr_storage::Result;
use ndr_telemetry::{info, error};
use serde::{Serialize, Deserialize};
use sqlx::Row;
use ndarray::Array2;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelArtifacts {
    pub centroids: Array2<f64>,
    pub threshold: f64,
}

#[derive(Debug)]
pub struct TrainingData {
    pub bytes_sent: f64,
    pub bytes_received: f64,
    pub packets_sent: f64,
    pub packets_received: f64,
    pub duration: f64,
}

pub struct Repository {
    pool: PgPool,
}

impl Repository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn fetch_training_data(&self, limit: i64) -> Result<Vec<TrainingData>> {
        info!("Fetching last {} flow records for training...", limit);
        
        let rows = sqlx::query(
            r#"
            SELECT bytes_sent, bytes_received, packets_sent, packets_received, duration
            FROM network_flows
            ORDER BY timestamp DESC
            LIMIT $1
            "#
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| {
            error!("Failed to fetch training data: {}", e);
            ndr_storage::StorageError::Database(e.to_string())
        })?;

        let data = rows.into_iter().map(|row| {
            TrainingData {
                bytes_sent: row.get::<i64, _>("bytes_sent") as f64,
                bytes_received: row.get::<i64, _>("bytes_received") as f64,
                packets_sent: row.get::<i64, _>("packets_sent") as f64,
                packets_received: row.get::<i64, _>("packets_received") as f64,
                duration: row.get::<f32, _>("duration") as f64,
            }
        }).collect();

        Ok(data)
    }

    pub async fn save_model(&self, version: &str, artifacts: &ModelArtifacts) -> Result<()> {
        info!("Saving model version {} to database...", version);
        
        let artifacts_json = serde_json::to_value(artifacts).map_err(|e| {
            error!("Failed to serialize artifacts: {}", e);
            ndr_storage::StorageError::Serialization(e.to_string())
        })?;
        
        // Deactivate previous models
        sqlx::query("UPDATE ai_models SET is_active = false WHERE model_type = 'kmeans_anomaly'")
            .execute(&self.pool)
            .await
            .map_err(|e| ndr_storage::StorageError::Database(e.to_string()))?;

        // Insert new model
        sqlx::query(
            r#"
            INSERT INTO ai_models (model_type, version, artifacts, is_active)
            VALUES ('kmeans_anomaly', $1, $2, true)
            "#
        )
        .bind(version)
        .bind(artifacts_json)
        .execute(&self.pool)
        .await
        .map_err(|e| {
            error!("Failed to save model: {}", e);
            ndr_storage::StorageError::Database(e.to_string())
        })?;

        info!("Model saved successfully.");
        Ok(())
    }

    pub async fn load_active_model(&self) -> Result<Option<ModelArtifacts>> {
        info!("Loading active model from database...");
        
        let row = sqlx::query(
            r#"
            SELECT artifacts FROM ai_models 
            WHERE model_type = 'kmeans_anomaly' AND is_active = true 
            ORDER BY created_at DESC 
            LIMIT 1
            "#
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| {
            error!("Failed to load model: {}", e);
            ndr_storage::StorageError::Database(e.to_string())
        })?;

        if let Some(row) = row {
            let artifacts_json: serde_json::Value = row.get("artifacts");
            let artifacts: ModelArtifacts = serde_json::from_value(artifacts_json).map_err(|e| {
                error!("Failed to deserialize model artifacts: {}", e);
                ndr_storage::StorageError::Serialization(e.to_string())
            })?;
            
            info!("Model loaded successfully.");
            Ok(Some(artifacts))
        } else {
            info!("No active model found.");
            Ok(None)
        }
    }
}
