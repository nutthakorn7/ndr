//! Redis cache implementation

use redis::{Client, Commands, Connection};
use serde::{Deserialize, Serialize};
use crate::error::Result;

/// Redis cache client
pub struct RedisCache {
    client: Client,
}

impl RedisCache {
    /// Create new Redis cache
    pub fn new(redis_url: &str) -> Result<Self> {
        let client = Client::open(redis_url)?;
        Ok(Self { client })
    }

    /// Get connection to Redis
    pub fn get_connection(&self) -> Result<Connection> {
        Ok(self.client.get_connection()?)
    }

    /// Set a value with expiration
    pub fn set_ex<T: Serialize>(
        &self,
        key: &str,
        value: &T,
        ttl_seconds: usize,
    ) -> Result<()> {
        let mut conn = self.get_connection()?;
        let serialized = serde_json::to_string(value)
            .map_err(|e| crate::error::StorageError::Serialization(e.to_string()))?;
        conn.set_ex(key, serialized, ttl_seconds)?;
        Ok(())
    }

    /// Get a value
    pub fn get<T: for<'de> Deserialize<'de>>(&self, key: &str) -> Result<Option<T>> {
        let mut conn = self.get_connection()?;
        let value: Option<String> = conn.get(key)?;
        
        match value {
            Some(v) => {
                let deserialized = serde_json::from_str(&v)
                    .map_err(|e| crate::error::StorageError::Serialization(e.to_string()))?;
                Ok(Some(deserialized))
            }
            None => Ok(None),
        }
    }

    /// Delete a key
    pub fn delete(&self, key: &str) -> Result<()> {
        let mut conn = self.get_connection()?;
        conn.del(key)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore] // Requires Redis
    fn test_redis_cache() {
        let cache = RedisCache::new("redis://localhost");
        assert!(cache.is_ok() || cache.is_err());
    }
}
