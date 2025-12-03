use anyhow::Result;
use tokio_retry::{strategy::ExponentialBackoff, Retry};
use std::time::Duration;
use ndr_telemetry::{info, warn, debug};

/// Circuit breaker state for external connections
#[derive(Debug, Clone)]
pub struct CircuitBreaker {
    failure_count: std::sync::Arc<tokio::sync::RwLock<u32>>,
    max_failures: u32,
    reset_timeout: Duration,
    last_failure: std::sync::Arc<tokio::sync::RwLock<Option<std::time::Instant>>>,
    name: String,
}

impl CircuitBreaker {
    pub fn new(name: &str, max_failures: u32, reset_timeout_secs: u64) -> Self {
        Self {
            failure_count: std::sync::Arc::new(tokio::sync::RwLock::new(0)),
            max_failures,
            reset_timeout: Duration::from_secs(reset_timeout_secs),
            last_failure: std::sync::Arc::new(tokio::sync::RwLock::new(None)),
            name: name.to_string(),
        }
    }

    /// Check if circuit is open (too many failures)
    pub async fn is_open(&self) -> bool {
        let count = *self.failure_count.read().await;
        if count < self.max_failures {
            return false;
        }

        // Check if we should reset
        let last_fail = *self.last_failure.read().await;
        if let Some(last_fail) = last_fail {
            if last_fail.elapsed() > self.reset_timeout {
                // Reset circuit breaker
                let mut count_guard = self.failure_count.write().await;
                let mut last_fail_guard = self.last_failure.write().await;
                
                *count_guard = 0;
                *last_fail_guard = None;
                info!(name = %self.name, "Circuit breaker reset after timeout");
                return false;
            }
        }
        true
    }

    /// Record a successful operation
    pub async fn record_success(&self) {
        // Only acquire write lock if we need to reset (optimization)
        let should_reset = *self.failure_count.read().await > 0;
        if should_reset {
            let mut count_guard = self.failure_count.write().await;
            let mut last_fail_guard = self.last_failure.write().await;
            
            *count_guard = 0;
            *last_fail_guard = None;
            debug!(name = %self.name, "Circuit breaker failure count reset");
        }
    }

    /// Record a failure
    pub async fn record_failure(&self) {
        let mut count_guard = self.failure_count.write().await;
        *count_guard += 1;
        let current_count = *count_guard;
        
        // We hold failure_count lock while acquiring last_failure lock.
        // This is consistent with other methods (failure_count -> last_failure).
        *self.last_failure.write().await = Some(std::time::Instant::now());
        
        if current_count >= self.max_failures {
            warn!(
                name = %self.name,
                failures = %current_count,
                reset_after = ?self.reset_timeout,
                "Circuit breaker opened"
            );
            metrics::increment_counter!("circuit_breaker_opened", "name" => self.name.clone());
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
            debug!("Retry attempt failed: {}", e);
            e
        })
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_circuit_breaker_initial_state() {
        let cb = CircuitBreaker::new("test", 3, 10);
        assert!(!cb.is_open().await);
        assert_eq!(cb.failure_count().await, 0);
    }

    #[tokio::test]
    async fn test_circuit_breaker_opens_after_failures() {
        let cb = CircuitBreaker::new("test", 2, 10);
        
        cb.record_failure().await;
        assert!(!cb.is_open().await);
        
        cb.record_failure().await;
        assert!(cb.is_open().await);
    }

    #[tokio::test]
    async fn test_circuit_breaker_resets_after_success() {
        let cb = CircuitBreaker::new("test", 3, 10);
        
        cb.record_failure().await;
        cb.record_failure().await;
        assert_eq!(cb.failure_count().await, 2);
        
        cb.record_success().await;
        assert_eq!(cb.failure_count().await, 0);
        assert!(!cb.is_open().await);
    }

    #[tokio::test]
    async fn test_circuit_breaker_timeout_reset() {
        // Use small timeout for test
        let cb = CircuitBreaker::new("test", 1, 1); // 1 second timeout
        
        cb.record_failure().await;
        assert!(cb.is_open().await);
        
        // Wait for timeout (1.1s)
        tokio::time::sleep(Duration::from_millis(1100)).await;
        
        // Should be closed (reset) now
        assert!(!cb.is_open().await);
        assert_eq!(cb.failure_count().await, 0);
    }
}
