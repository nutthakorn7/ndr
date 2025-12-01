/**
 * Retry Utility
 * Provides retry logic with exponential backoff for failed requests
 */

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum number of retry attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {number} options.backoffFactor - Multiplier for delay (default: 2)
 * @param {Function} options.shouldRetry - Function to determine if retry should happen (default: always retry)
 * @param {Function} options.onRetry - Callback called before each retry
 * @returns {Promise} - Result of successful function call
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry = () => true,
    onRetry = () => {}
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts
      if (attempt === maxAttempts) {
        break;
      }

      // Check if we should retry this error
      if (!shouldRetry(error, attempt)) {
        break;
      }

      // Call retry callback
      onRetry(error, attempt, delay);

      // Wait before retrying
      await sleep(delay);

      // Increase delay with exponential backoff
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  // All retries failed
  throw lastError;
}

/**
 * Retry specifically for fetch requests
 * @param {Function} fetchFn - Async fetch function
 * @param {Object} options - Retry options (same as retryWithBackoff)
 * @returns {Promise} - Result of successful fetch
 */
export async function retryFetch(fetchFn, options = {}) {
  return retryWithBackoff(fetchFn, {
    ...options,
    shouldRetry: (error, attempt) => {
      // Custom retry logic can be passed in
      if (options.shouldRetry) {
        return options.shouldRetry(error, attempt);
      }

      // Default: retry on network errors and 5xx server errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return true; // Network error
      }

      if (error.status && error.status >= 500) {
        return true; // Server error
      }

      // Don't retry on 4xx client errors (except 429 Too Many Requests)
      if (error.status && error.status >= 400 && error.status < 500) {
        return error.status === 429; // Retry on rate limit
      }

      return true; // Retry by default for unknown errors
    },
    onRetry: (error, attempt, delay) => {
      console.warn(
        `Request failed (attempt ${attempt}). Retrying in ${delay}ms...`,
        error.message || error
      );
      
      // Call custom onRetry if provided
      if (options.onRetry) {
        options.onRetry(error, attempt, delay);
      }
    }
  });
}

/**
 * Create a retry wrapper for a function
 * @param {Function} fn - Function to wrap
 * @param {Object} retryOptions - Retry options
 * @returns {Function} - Wrapped function with retry logic
 */
export function withRetry(fn, retryOptions = {}) {
  return async (...args) => {
    return retryFetch(() => fn(...args), retryOptions);
  };
}

export default {
  retryWithBackoff,
  retryFetch,
  withRetry,
  sleep
};
