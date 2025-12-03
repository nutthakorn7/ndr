use redis::AsyncCommands;
use anyhow::Result;

#[derive(Clone)]
pub struct Cache {
    client: redis::Client,
}

impl Cache {
    pub async fn new(url: &str) -> Result<Self> {
        let client = redis::Client::open(url)?;
        Ok(Self { client })
    }

    pub async fn get_duplicate_alert(&self, key: &str) -> Result<Option<String>> {
        let mut conn = self.client.get_async_connection().await?;
        let redis_key = format!("alert:{}", key);
        let value: Option<String> = conn.get(redis_key).await?;
        Ok(value)
    }

    pub async fn set_pending_alert(&self, key: &str, ttl_seconds: u64) -> Result<()> {
        let mut conn = self.client.get_async_connection().await?;
        let redis_key = format!("alert:{}", key);
        conn.set_ex(redis_key, "pending", ttl_seconds).await?;
        Ok(())
    }

    pub async fn set_meta_alert(&self, key: &str, meta_id: &str, ttl_seconds: u64) -> Result<()> {
        let mut conn = self.client.get_async_connection().await?;
        let redis_key = format!("alert:{}", key);
        conn.set_ex(redis_key, meta_id, ttl_seconds).await?;
        Ok(())
    }
}
