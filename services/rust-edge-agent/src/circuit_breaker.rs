use anyhow::Result;
use tokio_retry::{strategy::ExponentialBackoff, Retry};
use std::time::Duration;

/// Circuit breaker state for Kafka connections
#[derive(Debug, Clone)]
pub struct CircuitBreaker {
    failure_count: std::sync::Arc<tokio::sync::RwLock<u32>>,
    max_failures: u32,
    reset_timeout: Duration,
    last_failure: std::sync::Arc<tokio::sync::RwLock<Option<std::time::Instant>>>,
}

impl CircuitBreaker {
    pub fn new(max_failures: u32, reset_timeout_secs: u64) -> Self {
        Self {
            failure_count: std::sync::Arc::new(tokio::sync::RwLock::new(0)),
            max_failures,
            reset_timeout: Duration::from_secs(reset_timeout_secs),
            last_failure: std::sync::Arc::new(tokio::sync::RwLock::new(None)),
        }
    }

    /// Check if circuit is open (too many failures)
    pub async fn is_open(&self) -> bool {
        let count = *self.failure_count.read().await;
        if count >= self.max_failures {
            // Check if we should reset
            if let Some(last_fail) = *self.last_failure.read().await {
                if last_fail.elapsed() > self.reset_timeout {
                    // Reset circuit breaker
                    *self.failure_count.write().await = 0;
                    *self.last_failure.write().await = None;
                    tracing::info!(\"Circuit breaker reset after timeout\");
                    return false;
                }
            }
            true
        } else {
            false
        }
    }

    /// Record a successful operation
    pub async fn record_success(&self) {
        *self.failure_count.write().await = 0;
        *self.last_failure.write().await = None;
    }

    /// Record a failure
    pub async fn record_failure(&self) {
        let mut count = self.failure_count.write().await;
        *count += 1;
        *self.last_failure.write().await = Some(std::time::Instant::now());
        
        if *count >= self.max_failures {
            tracing::warn!(
                \"Circuit breaker opened after {} failures. Will retry after {:?}\",
                count,
                self.reset_timeout
            );
            metrics::counter!(\"edge_agent_circuit_breaker_opened\").increment(1);
        }
    }

    /// Get current failure count
    pub async fn failure_count(&self) -> u32 {
        *self.failure_count.read().await
    }
}

/// Execute operation with retry and exponential backoff
pub async fn with_retry<F, Fut, T>(
    operation: F,
    max_retries: usize,
) -> Result<T>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<T>>,
{
    let retry_strategy = ExponentialBackoff::from_millis(100)
        .max_delay(Duration::from_secs(10))
        .take(max_retries);

    Retry::spawn(retry_strategy, || async {
        operation().await.map_err(|e| {
            tracing::debug!(\"Retry attempt failed: {}\", e);
            e
        })
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_circuit_breaker_opens() {
        let cb = CircuitBreaker::new(3, 60);
        
        assert!(!cb.is_open().await);
        
        cb.record_failure().await;
        assert!(!cb.is_open().await);
        
        cb.record_failure().await;
        assert!(!cb.is_open().await);
        
        cb.record_failure().await;
        assert!(cb.is_open().await); // Should be open now
    }

    #[tokio::test]
    async fn test_circuit_breaker_resets_on_success() {
        let cb = CircuitBreaker::new(3, 60);
        
        cb.record_failure().await;
        cb.record_failure().await;
        assert_eq!(cb.failure_count().await, 2);
        
        cb.record_success().await;
        assert_eq!(cb.failure_count().await, 0);
        assert!(!cb.is_open().await);
    }
}
