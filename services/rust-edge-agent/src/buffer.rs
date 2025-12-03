use sqlx::{sqlite::SqlitePool, Row};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use anyhow::Result;
use std::sync::Arc;
use ndr_telemetry::warn;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BufferedEvent {
    pub id: i64,
    pub event_data: String,
    pub created_at: DateTime<Utc>,
    pub priority: i32,
}

#[derive(Clone)]
pub struct Buffer {
    pool: Arc<SqlitePool>,
    max_size_mb: u64,
}

impl Buffer {
    pub async fn new(db_path: &str, max_size_mb: u64) -> Result<Self> {
        // Create parent directory if it doesn't exist
        if let Some(parent) = std::path::Path::new(db_path).parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        let pool = SqlitePool::connect(&format!("sqlite://{}", db_path)).await?;

        // Create table if not exists
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS buffered_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_data TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                priority INTEGER DEFAULT 0
            )
            "#,
        )
        .execute(&pool)
        .await?;

        // Create index for efficient retrieval
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_priority_created ON buffered_events(priority DESC, created_at ASC)")
            .execute(&pool)
            .await?;

        Ok(Self { 
            pool: Arc::new(pool), 
            max_size_mb 
        })
    }

    pub async fn push(&self, event_data: &str, priority: i32) -> Result<()> {
        // Check buffer size before inserting
        self.cleanup_if_full().await?;

        sqlx::query("INSERT INTO buffered_events (event_data, priority) VALUES (?, ?)")
            .bind(event_data)
            .bind(priority)
            .execute(&self.pool)
            .await?;

        metrics::counter!("edge_agent_events_buffered").increment(1);
        Ok(())
    }

    pub async fn pop_batch(&self, batch_size: usize) -> Result<Vec<BufferedEvent>> {
        let rows = sqlx::query(
            "SELECT id, event_data, created_at, priority FROM buffered_events ORDER BY priority DESC, created_at ASC LIMIT ?"
        )
        .bind(batch_size as i64)
        .fetch_all(&self.pool)
        .await?;

        let events: Vec<BufferedEvent> = rows
            .into_iter()
            .map(|row| BufferedEvent {
                id: row.get("id"),
                event_data: row.get("event_data"),
                created_at: row.get("created_at"),
                priority: row.get("priority"),
            })
            .collect();

        Ok(events)
    }

    pub async fn remove(&self, ids: &[i64]) -> Result<()> {
        if ids.is_empty() {
            return Ok(());
        }

        let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let query = format!("DELETE FROM buffered_events WHERE id IN ({})", placeholders);

        let mut q = sqlx::query(&query);
        for id in ids {
            q = q.bind(id);
        }
        q.execute(&self.pool).await?;

        metrics::counter!("edge_agent_events_forwarded").increment(ids.len() as u64);
        Ok(())
    }

    pub async fn count(&self) -> Result<i64> {
        let row = sqlx::query("SELECT COUNT(*) as count FROM buffered_events")
            .fetch_one(&self.pool)
            .await?;
        Ok(row.get("count"))
    }

    pub async fn size_mb(&self) -> Result<f64> {
        let row = sqlx::query("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")
            .fetch_one(&self.pool)
            .await?;
        let size_bytes: i64 = row.get("size");
        Ok(size_bytes as f64 / 1024.0 / 1024.0)
    }

    async fn cleanup_if_full(&self) -> Result<()> {
        let current_size = self.size_mb().await?;
        
        if current_size > self.max_size_mb as f64 {
            warn!(
                "Buffer size ({:.2} MB) exceeds limit ({} MB), removing oldest events",
                current_size,
                self.max_size_mb
            );

            // Remove oldest 10% of events
            sqlx::query(
                "DELETE FROM buffered_events WHERE id IN (
                    SELECT id FROM buffered_events ORDER BY created_at ASC LIMIT (
                        SELECT COUNT(*) / 10 FROM buffered_events
                    )
                )"
            )
            .execute(&self.pool)
            .await?;

            metrics::counter!("edge_agent_events_dropped").increment(1);
        }

        Ok(())
    }
}
