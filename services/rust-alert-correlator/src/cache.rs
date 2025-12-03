use anyhow::Result;
use ndr_core::circuit_breaker::CircuitBreaker;
use redis::AsyncCommands;

#[derive(Clone)]
pub struct Cache {
    client: redis::Client,
    circuit_breaker: CircuitBreaker,
}

impl Cache {
    pub async fn new(url: &str) -> Result<Self> {
        let client = redis::Client::open(url)?;
        let circuit_breaker = CircuitBreaker::new("redis", 5, 30);
        Ok(Self {
            client,
            circuit_breaker,
        })
    }

    pub async fn get_duplicate_alert(&self, key: &str) -> Result<Option<String>> {
        if self.circuit_breaker.is_open().await {
            return Ok(None); // Fail open or closed? For cache, maybe just return None (miss)
        }

        let mut conn = match self.client.get_async_connection().await {
            Ok(c) => c,
            Err(e) => {
                self.circuit_breaker.record_failure().await;
                return Err(e.into());
            }
        };

        let redis_key = format!("alert:{}", key);
        match conn.get(redis_key).await {
            Ok(val) => {
                self.circuit_breaker.record_success().await;
                Ok(val)
            }
            Err(e) => {
                self.circuit_breaker.record_failure().await;
                Err(e.into())
            }
        }
    }

    pub async fn set_pending_alert(&self, key: &str, ttl_seconds: u64) -> Result<()> {
        if self.circuit_breaker.is_open().await {
            return Ok(()); // Skip cache write if open
        }

        let mut conn = match self.client.get_async_connection().await {
            Ok(c) => c,
            Err(e) => {
                self.circuit_breaker.record_failure().await;
                return Err(e.into());
            }
        };

        let redis_key = format!("alert:{}", key);
        match conn
            .set_ex::<_, _, ()>(redis_key, "pending", ttl_seconds)
            .await
        {
            Ok(_) => {
                self.circuit_breaker.record_success().await;
                Ok(())
            }
            Err(e) => {
                self.circuit_breaker.record_failure().await;
                Err(e.into())
            }
        }
    }

    pub async fn set_meta_alert(&self, key: &str, meta_id: &str, ttl_seconds: u64) -> Result<()> {
        if self.circuit_breaker.is_open().await {
            return Ok(());
        }

        let mut conn = match self.client.get_async_connection().await {
            Ok(c) => c,
            Err(e) => {
                self.circuit_breaker.record_failure().await;
                return Err(e.into());
            }
        };

        let redis_key = format!("alert:{}", key);
        match conn
            .set_ex::<_, _, ()>(redis_key, meta_id, ttl_seconds)
            .await
        {
            Ok(_) => {
                self.circuit_breaker.record_success().await;
                Ok(())
            }
            Err(e) => {
                self.circuit_breaker.record_failure().await;
                Err(e.into())
            }
        }
    }
}
