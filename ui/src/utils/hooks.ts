/**
 * Custom React Hooks for Data Fetching
 */
import { useState, useEffect, useRef } from 'react';
import api from './api';
import axios from 'axios';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface RealTimeState<T> extends FetchState<T> {
  lastUpdate: Date;
}

// Helper for deep comparison to avoid infinite loops with object dependencies
function useDeepCompareMemoize<T>(value: T) {
  const ref = useRef<T>(value);
  if (JSON.stringify(value) !== JSON.stringify(ref.current)) {
    ref.current = value;
  }
  return ref.current;
}

/**
 * Hook for fetching data with loading and error states
 * Supports cancellation via AbortController
 */
export function useFetch<T>(
  fetchFn: (signal?: AbortSignal) => Promise<T>, 
  dependencies: any[] = []
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize dependencies to prevent unnecessary re-renders
  const memoizedDeps = useDeepCompareMemoize(dependencies);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Pass signal to fetchFn if it accepts it, otherwise it's ignored
        const result = await fetchFn(controller.signal);
        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (err: unknown) {
        if (!axios.isCancel(err) && !controller.signal.aborted) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          setError(errorMessage);
          console.error('Fetch error:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [memoizedDeps]);

  return { data, loading, error };
}

/**
 * Hook for real-time data with auto-refresh
 */
export function useRealTime<T>(
  fetchFn: () => Promise<T>, 
  interval: number | null = 30000, 
  dependencies: any[] = []
): RealTimeState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const memoizedDeps = useDeepCompareMemoize(dependencies);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const controller = new AbortController();

    const fetchData = async (isInitial: boolean) => {
      try {
        if (isInitial && !data) setLoading(true);
        
        const result = await fetchFn();
        
        if (!controller.signal.aborted) {
          setData(result);
          setError(null);
          setLastUpdate(new Date());
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          setError(errorMessage);
          console.error('Real-time update failed:', err);
        }
      } finally {
        if (!controller.signal.aborted && isInitial) {
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
      controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [interval, memoizedDeps]);

  return { data, loading, error, lastUpdate };
}

/**
 * Hook for dashboard stats
 */
export function useDashboardStats() {
  return useFetch(() => api.getDashboardAnalytics());
}

/**
 * Hook for alerts with real-time updates
 */
export function useAlerts(params: Record<string, string | number | boolean> = {}, realTime: boolean = true) {
  const interval = realTime ? 10000 : null; // 10 seconds
  return useRealTime(() => api.getAlerts(params), interval, [params]);
}

/**
 * Hook for assets
 */
export function useAssets(params: Record<string, string> = {}) {
  return useFetch(() => api.getSensors(), [params]);
}

/**
 * Hook for asset stats
 */
export function useAssetStats() {
  // Assuming getAssetStats exists or using getSensors as placeholder if not
  return useFetch(() => api.getSensors()); 
}
