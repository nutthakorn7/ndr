use crate::models::AlertMeta;
use anyhow::Result;
use serde_json::Value;
use sqlx::{Pool, Postgres, Row};
use uuid::Uuid;

#[derive(Clone)]
pub struct DB {
    pool: Pool<Postgres>,
}

impl DB {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }

    pub async fn init_schema(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS alert_meta (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                correlation_id UUID,
                original_alert_ids TEXT[],
                aggregation_count INT DEFAULT 1,
                first_seen TIMESTAMPTZ DEFAULT NOW(),
                last_seen TIMESTAMPTZ DEFAULT NOW(),
                status TEXT DEFAULT 'new',
                assigned_to TEXT,
                severity_score INT,
                attack_chain JSONB DEFAULT '[]',
                alert_data JSONB,
                notes TEXT[] DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_correlation_id ON alert_meta(correlation_id);
            CREATE INDEX IF NOT EXISTS idx_status ON alert_meta(status);
            CREATE INDEX IF NOT EXISTS idx_severity ON alert_meta(severity_score DESC);
            "#,
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn create_meta_alert(
        &self,
        original_ids: Vec<String>,
        severity_score: i32,
        attack_chain: Value,
        alert_data: Value,
    ) -> Result<Uuid> {
        let rec = sqlx::query(
            r#"
            INSERT INTO alert_meta (
                original_alert_ids, aggregation_count, severity_score,
                attack_chain, alert_data
            )
            VALUES ($1, 1, $2, $3, $4)
            RETURNING id
            "#,
        )
        .bind(original_ids)
        .bind(severity_score)
        .bind(attack_chain)
        .bind(alert_data)
        .fetch_one(&self.pool)
        .await?;

        Ok(rec.get("id"))
    }

    pub async fn update_meta_alert(
        &self,
        meta_id: Uuid,
        new_alert_id: String,
    ) -> Result<(i32, i32)> {
        // Returns (aggregation_count, severity_score)
        // First update count and ids
        let rec = sqlx::query(
            r#"
            UPDATE alert_meta
            SET aggregation_count = aggregation_count + 1,
                last_seen = NOW(),
                original_alert_ids = array_append(original_alert_ids, $1),
                updated_at = NOW()
            WHERE id = $2
            RETURNING aggregation_count, severity_score
            "#,
        )
        .bind(new_alert_id)
        .bind(meta_id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = rec {
            Ok((row.get("aggregation_count"), row.get("severity_score")))
        } else {
            anyhow::bail!("Meta alert not found");
        }
    }

    pub async fn update_severity(&self, meta_id: Uuid, score: i32) -> Result<()> {
        sqlx::query("UPDATE alert_meta SET severity_score = $1 WHERE id = $2")
            .bind(score)
            .bind(meta_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn get_meta_alert(&self, meta_id: Uuid) -> Result<AlertMeta> {
        let alert = sqlx::query_as::<_, AlertMeta>("SELECT * FROM alert_meta WHERE id = $1")
            .bind(meta_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(alert)
    }

    pub async fn find_related_alerts(
        &self,
        source_ip: &str,
        exclude_id: &str,
    ) -> Result<Vec<(Uuid, Value, chrono::DateTime<chrono::Utc>)>> {
        let rows = sqlx::query_as::<_, (Uuid, Value, chrono::DateTime<chrono::Utc>)>(
            r#"
            SELECT id, alert_data, first_seen
            FROM alert_meta
            WHERE alert_data->>'source'->>'ip' = $1
            AND first_seen > NOW() - INTERVAL '1 hour'
            AND id != $2
            ORDER BY first_seen ASC
            "#,
        )
        .bind(source_ip)
        .bind(Uuid::parse_str(exclude_id).unwrap_or_default()) // Handle invalid UUID gracefully
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }
}
