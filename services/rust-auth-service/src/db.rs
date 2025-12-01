use sqlx::postgres::PgPool;
use uuid::Uuid;
use anyhow::Result;
use crate::models::{User, ApiKey};
use crate::auth::hash_password;

#[derive(Clone)]
pub struct DB {
    pool: PgPool,
}

impl DB {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn init_schema(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                tenant_id VARCHAR(50) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS api_keys (
                id UUID PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                key_hash VARCHAR(255) NOT NULL,
                permissions TEXT[] NOT NULL,
                tenant_id VARCHAR(50) NOT NULL,
                created_by UUID NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn create_user(&self, email: &str, password: &str, role: &str, tenant_id: &str) -> Result<User> {
        let hash = hash_password(password)?;
        let id = Uuid::new_v4();
        
        let user = sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (id, email, password_hash, role, tenant_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, email, role, tenant_id, created_at
            "#,
            id, email, hash, role, tenant_id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn get_user_by_email(&self, email: &str) -> Result<Option<(User, String)>> {
        let record = sqlx::query!(
            r#"
            SELECT id, email, password_hash, role, tenant_id, created_at
            FROM users WHERE email = $1
            "#,
            email
        )
        .fetch_optional(&self.pool)
        .await?;

        if let Some(r) = record {
            Ok(Some((
                User {
                    id: r.id,
                    email: r.email,
                    role: r.role,
                    tenant_id: r.tenant_id,
                    created_at: r.created_at.unwrap_or_else(chrono::Utc::now),
                },
                r.password_hash
            )))
        } else {
            Ok(None)
        }
    }

    pub async fn create_api_key(&self, name: &str, key_hash: &str, permissions: &[String], tenant_id: &str, created_by: Uuid) -> Result<ApiKey> {
        let id = Uuid::new_v4();
        let api_key = sqlx::query_as!(
            ApiKey,
            r#"
            INSERT INTO api_keys (id, name, key_hash, permissions, tenant_id, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, key_hash, permissions, tenant_id, created_by, created_at
            "#,
            id, name, key_hash, permissions, tenant_id, created_by
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(api_key)
    }

    pub async fn list_api_keys(&self, user_id: Uuid) -> Result<Vec<ApiKey>> {
        let keys = sqlx::query_as!(
            ApiKey,
            "SELECT * FROM api_keys WHERE created_by = $1 ORDER BY created_at DESC",
            user_id
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(keys)
    }

    pub async fn delete_api_key(&self, id: Uuid, user_id: Uuid) -> Result<()> {
        sqlx::query!(
            "DELETE FROM api_keys WHERE id = $1 AND created_by = $2",
            id, user_id
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }
    
    // For validation (internal use)
    pub async fn get_api_key_by_hash(&self, hash: &str) -> Result<Option<ApiKey>> {
        let key = sqlx::query_as!(
            ApiKey,
            "SELECT * FROM api_keys WHERE key_hash = $1",
            hash
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(key)
    }
}
