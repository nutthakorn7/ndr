use sqlx::{Pool, Postgres, Row};
use crate::models::{Asset, AssetFilter, AssetStats, CountStat};
use anyhow::Result;
use std::sync::Arc;

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
            CREATE TABLE IF NOT EXISTS assets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                ip_address VARCHAR(45) UNIQUE NOT NULL,
                mac_address VARCHAR(17),
                hostname VARCHAR(255),
                os_type VARCHAR(50),
                os_version VARCHAR(50),
                device_type VARCHAR(50),
                criticality VARCHAR(20) DEFAULT 'unknown',
                first_seen TIMESTAMPTZ DEFAULT NOW(),
                last_seen TIMESTAMPTZ DEFAULT NOW(),
                tags TEXT[],
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_assets_ip ON assets(ip_address);
            CREATE INDEX IF NOT EXISTS idx_assets_hostname ON assets(hostname);
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn upsert_asset(&self, asset: Asset) -> Result<Asset> {
        let rec = sqlx::query_as::<_, Asset>(
            r#"
            INSERT INTO assets (ip_address, mac_address, hostname, os_type, os_version, device_type, criticality, first_seen, last_seen, tags, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8, $9)
            ON CONFLICT (ip_address) 
            DO UPDATE SET
                mac_address = COALESCE(EXCLUDED.mac_address, assets.mac_address),
                hostname = COALESCE(EXCLUDED.hostname, assets.hostname),
                os_type = COALESCE(EXCLUDED.os_type, assets.os_type),
                os_version = COALESCE(EXCLUDED.os_version, assets.os_version),
                device_type = COALESCE(EXCLUDED.device_type, assets.device_type),
                last_seen = NOW(),
                tags = EXCLUDED.tags,
                metadata = assets.metadata || EXCLUDED.metadata,
                updated_at = NOW()
            RETURNING *
            "#
        )
        .bind(&asset.ip_address)
        .bind(&asset.mac_address)
        .bind(&asset.hostname)
        .bind(&asset.os_type)
        .bind(&asset.os_version)
        .bind(&asset.device_type)
        .bind(&asset.criticality)
        .bind(&asset.tags)
        .bind(&asset.metadata)
        .fetch_one(&self.pool)
        .await?;

        Ok(rec)
    }

    pub async fn get_assets(&self, filter: AssetFilter) -> Result<Vec<Asset>> {
        let mut query = "SELECT * FROM assets WHERE 1=1".to_string();
        let mut args = sqlx::postgres::PgArguments::default();
        let mut idx = 1;

        if let Some(ip) = filter.ip_address {
            query.push_str(&format!(" AND ip_address = ${}", idx));
            use sqlx::Arguments;
            args.add(ip);
            idx += 1;
        }
        if let Some(host) = filter.hostname {
            query.push_str(&format!(" AND hostname ILIKE ${}", idx));
            use sqlx::Arguments;
            args.add(format!("%{}%", host));
            idx += 1;
        }
        if let Some(crit) = filter.criticality {
            query.push_str(&format!(" AND criticality = ${}", idx));
            use sqlx::Arguments;
            args.add(crit);
            idx += 1;
        }
        if let Some(dt) = filter.device_type {
            query.push_str(&format!(" AND device_type = ${}", idx));
            use sqlx::Arguments;
            args.add(dt);
            idx += 1;
        }

        query.push_str(" ORDER BY last_seen DESC");

        if let Some(limit) = filter.limit {
            query.push_str(&format!(" LIMIT ${}", idx));
            use sqlx::Arguments;
            args.add(limit);
            idx += 1;
        }
        if let Some(offset) = filter.offset {
            query.push_str(&format!(" OFFSET ${}", idx));
            use sqlx::Arguments;
            args.add(offset);
            idx += 1;
        }

        let assets = sqlx::query_as_with::<_, Asset, _>(&query, args)
            .fetch_all(&self.pool)
            .await?;

        Ok(assets)
    }

    pub async fn get_asset_by_id(&self, id: uuid::Uuid) -> Result<Option<Asset>> {
        let asset = sqlx::query_as::<_, Asset>("SELECT * FROM assets WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(asset)
    }

    pub async fn get_stats(&self) -> Result<AssetStats> {
        let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM assets")
            .fetch_one(&self.pool)
            .await?;

        let by_type = sqlx::query_as::<_, CountStat>(
            "SELECT device_type as name, COUNT(*) as count FROM assets WHERE device_type IS NOT NULL GROUP BY device_type"
        )
        .fetch_all(&self.pool)
        .await?;

        let by_criticality = sqlx::query_as::<_, CountStat>(
            "SELECT criticality as name, COUNT(*) as count FROM assets GROUP BY criticality"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(AssetStats {
            total: total.0,
            by_type,
            by_criticality,
        })
    }
}
