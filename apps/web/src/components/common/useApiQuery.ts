import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../../lib/api';

export interface ApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Shared data-fetching hook for CampusFlow pages.
 * Tracks loading, data, and error explicitly, cancels stale requests on
 * unmount/refetch, and clears stale data before re-fetching.
 */
export function useApiQuery<T>(endpoint: string): ApiQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(getApiUrl(endpoint), { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const json = await res.json();
      if (controller.signal.aborted) return;
      setData((json?.data ?? null) as T | null);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : 'Unable to reach server.';
      setError(message);
      setData(null);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [endpoint]);

  useEffect(() => {
    void execute();
    return () => {
      abortRef.current?.abort();
    };
  }, [execute]);

  return {
    data,
    loading,
    error,
    refetch: () => {
      void execute();
    },
  };
}
