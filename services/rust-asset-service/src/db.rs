use crate::models::{Asset, AssetFilter};
use anyhow::Result;
use sqlx::{Pool, Postgres};

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
                ip VARCHAR(45) NOT NULL UNIQUE,
                hostname VARCHAR(255),
                mac_address VARCHAR(17),
                os VARCHAR(100),
                first_seen TIMESTAMPTZ DEFAULT NOW(),
                last_seen TIMESTAMPTZ DEFAULT NOW(),
                criticality VARCHAR(20) DEFAULT 'low',
                device_type VARCHAR(50) DEFAULT 'unknown',
                tags TEXT[] DEFAULT '{}'
            );
            CREATE INDEX IF NOT EXISTS idx_assets_ip ON assets(ip);
            CREATE INDEX IF NOT EXISTS idx_assets_hostname ON assets(hostname);
            "#,
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn upsert_asset(&self, asset: &Asset) -> Result<Asset> {
        let row = sqlx::query_as!(
            Asset,
            r#"
            INSERT INTO assets (ip, hostname, mac_address, os, criticality, device_type, tags, last_seen)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (ip) DO UPDATE SET
                hostname = COALESCE(EXCLUDED.hostname, assets.hostname),
                mac_address = COALESCE(EXCLUDED.mac_address, assets.mac_address),
                os = COALESCE(EXCLUDED.os, assets.os),
                last_seen = NOW()
            RETURNING *
            "#,
            asset.ip,
            asset.hostname,
            asset.mac_address,
            asset.os,
            asset.criticality,
            asset.device_type,
            asset.tags.as_deref()
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(row)
    }

    pub async fn get_assets(&self, filter: AssetFilter) -> Result<Vec<Asset>> {
        let mut query = "SELECT * FROM assets WHERE 1=1".to_string();
        let mut args = sqlx::postgres::PgArguments::default();
        let mut idx = 1;

        if let Some(ip) = filter.ip_address {
            query.push_str(&format!(" AND ip = ${}", idx));
            idx += 1;
            use sqlx::Arguments;
            let _ = args.add(ip);
        }
        if let Some(host) = filter.hostname {
            query.push_str(&format!(" AND hostname ILIKE ${}", idx));
            idx += 1;
            use sqlx::Arguments;
            let _ = args.add(format!("%{}%", host));
        }
        if let Some(crit) = filter.criticality {
            query.push_str(&format!(" AND criticality = ${}", idx));
            idx += 1;
            use sqlx::Arguments;
            let _ = args.add(crit);
        }
        if let Some(dt) = filter.device_type {
            query.push_str(&format!(" AND device_type = ${}", idx));
            idx += 1;
            use sqlx::Arguments;
            let _ = args.add(dt);
        }

        query.push_str(" ORDER BY last_seen DESC");

        if let Some(limit) = filter.limit {
            query.push_str(&format!(" LIMIT ${}", idx));
            idx += 1;
            use sqlx::Arguments;
            let _ = args.add(limit);
        }
        if let Some(offset) = filter.offset {
            query.push_str(&format!(" OFFSET ${}", idx));
            use sqlx::Arguments;
            let _ = args.add(offset);
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
            "SELECT criticality as name, COUNT(*) as count FROM assets GROUP BY criticality",
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
