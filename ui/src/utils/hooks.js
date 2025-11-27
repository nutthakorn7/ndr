/**
 * Custom React Hooks for Data Fetching
 */
import { useState, useEffect } from 'react';
import api from './api';

/**
 * Hook for fetching data with loading and error states
 */
export function useFetch(fetchFn, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
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
export function useRealTime(fetchFn, interval = 30000, dependencies = []) {
  const { data, loading, error } = useFetch(fetchFn, dependencies);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (!interval) return;

    const timer = setInterval(async () => {
      try {
        const result = await fetchFn();
        setLastUpdate(new Date());
        // Trigger re-render
      } catch (err) {
        console.error('Real-time update failed:', err);
      }
    }, interval);

    return () => clearInterval(timer);
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
export function useAlerts(params = {}, realTime = true) {
  const interval = realTime ? 10000 : null; // 10 seconds
  return useRealTime(() => api.getAlerts(params), interval, [JSON.stringify(params)]);
}

/**
 * Hook for assets
 */
export function useAssets(params = {}) {
  return useFetch(() => api.getAssets(params), [JSON.stringify(params)]);
}

/**
 * Hook for asset stats
 */
export function useAssetStats() {
  return useFetch(() => api.getAssetStats());
}
