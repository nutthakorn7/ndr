/**
 * Retry Utility
 * Provides retry logic with exponential backoff for failed requests
 */

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry = () => true,
    onRetry = () => {}
  } = options;

  let lastError: unknown;
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
 */
export async function retryFetch<T>(fetchFn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  return retryWithBackoff(fetchFn, {
    ...options,
    shouldRetry: (error: unknown, attempt: number) => {
      // Custom retry logic can be passed in
      if (options.shouldRetry) {
        return options.shouldRetry(error, attempt);
      }

      // Default: retry on network errors and 5xx server errors
      const err = error as any; // Type assertion needed for property access
      if (err.name === 'TypeError' && err.message?.includes('fetch')) {
        return true; // Network error
      }

      if (err.status && err.status >= 500) {
        return true; // Server error
      }

      // Don't retry on 4xx client errors (except 429 Too Many Requests)
      if (err.status && err.status >= 400 && err.status < 500) {
        return err.status === 429; // Retry on rate limit
      }

      return true; // Retry by default for unknown errors
    },
    onRetry: (error: unknown, attempt: number, delay: number) => {
      const err = error as any;
      console.warn(
        `Request failed (attempt ${attempt}). Retrying in ${delay}ms...`,
        err.message || err
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
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(fn: T, retryOptions: RetryOptions = {}): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return retryFetch(() => fn(...args), retryOptions);
  };
}

export default {
  retryWithBackoff,
  retryFetch,
  withRetry,
  sleep
};
