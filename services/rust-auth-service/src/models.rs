use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub role: String,
    pub tenant_id: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct UserRow {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub role: String,
    pub tenant_id: String,
    pub created_at: DateTime<Utc>,
}

impl From<UserRow> for User {
    fn from(row: UserRow) -> Self {
        Self {
            id: row.id,
            email: row.email,
            role: row.role,
            tenant_id: row.tenant_id,
            created_at: row.created_at,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct ApiKey {
    pub id: Uuid,
    pub name: String,
    #[serde(skip)]
    pub key_hash: String,
    pub permissions: Vec<String>,
    pub tenant_id: String,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub role: Option<String>,
    pub tenant_id: Option<String>,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: User,
}

#[derive(Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    pub permissions: Option<Vec<String>>,
    pub tenant_id: Option<String>,
}

#[derive(Serialize)]
pub struct ApiKeyResponse {
    pub id: Uuid,
    pub name: String,
    pub key: String, // Only returned on creation
    pub permissions: Vec<String>,
    pub created_at: DateTime<Utc>,
}
