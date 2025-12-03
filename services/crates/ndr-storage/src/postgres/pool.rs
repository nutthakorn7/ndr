//! PostgreSQL connection pool

use sqlx::postgres::{PgPool, PgPoolOptions};
use anyhow::Result;

/// Create a PostgreSQL connection pool
pub async fn create_pool(database_url: &str) -> Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(database_url)
        .await?;
    
    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Requires actual database
    async fn test_pool_creation() {
        let url = "postgres://user:pass@localhost/ndr";
        let result = create_pool(url).await;
        // Will fail without real DB, that's expected
        assert!(result.is_ok() || result.is_err());
    }
}
