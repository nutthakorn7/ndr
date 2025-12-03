/**
 * Custom React Hooks for Data Fetching
 */
import { useState, useEffect } from 'react';
import api from './api';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface RealTimeState<T> extends FetchState<T> {
  lastUpdate: Date;
}

/**
 * Hook for fetching data with loading and error states
 */
export function useFetch<T>(fetchFn: () => Promise<T>, dependencies: React.DependencyList = []): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchFn();
        if (!cancelled) {
          setData(result);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          setError(errorMessage);
          console.error('Fetch error:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, dependencies);

  return { data, loading, error };
}

/**
 * Hook for real-time data with auto-refresh
 */
export function useRealTime<T>(fetchFn: () => Promise<T>, interval: number | null = 30000, dependencies: React.DependencyList = []): RealTimeState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    let cancelled = false;
    let timer: NodeJS.Timeout | null = null;

    const fetchData = async (isInitial: boolean) => {
      try {
        if (isInitial && !data) setLoading(true);
        
        const result = await fetchFn();
        
        if (!cancelled) {
          setData(result);
          setError(null);
          setLastUpdate(new Date());
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          setError(errorMessage);
          console.error('Real-time update failed:', err);
        }
      } finally {
        if (!cancelled && isInitial) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchData(true);

    // Setup interval
    if (interval) {
      timer = setInterval(() => fetchData(false), interval);
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [interval, ...dependencies]);

  return { data, loading, error, lastUpdate };
}

/**
 * Hook for dashboard stats
 */
export function useDashboardStats() {
  return useFetch(() => api.getDashboardStats());
}

/**
 * Hook for alerts with real-time updates
 */
export function useAlerts(params: Record<string, string | number | boolean> = {}, realTime: boolean = true) {
  const interval = realTime ? 10000 : null; // 10 seconds
  // We need to pass dependencies that are stable. JSON.stringify is a common hack.
  return useRealTime(() => api.getAlerts(params), interval, [JSON.stringify(params)]);
}

/**
 * Hook for assets
 */
export function useAssets(params: Record<string, string> = {}) {
  return useFetch(() => api.getAssets(params), [JSON.stringify(params)]);
}

/**
 * Hook for asset stats
 */
export function useAssetStats() {
  return useFetch(() => api.getAssetStats());
}
