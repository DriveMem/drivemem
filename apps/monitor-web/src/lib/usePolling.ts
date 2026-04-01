import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePollingOptions<T> {
  fetcher: () => Promise<T>;
  interval?: number;
  enabled?: boolean;
}

interface UsePollingResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refresh: () => void;
  isRefreshing: boolean;
}

/** 通用轮询 hook — 定时拉取数据并支持手动刷新（默认 30s） */
export function usePolling<T>({
  fetcher,
  interval = 30000,
  enabled = true,
}: UsePollingOptions<T>): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  const debounceRef = useRef(false);

  fetcherRef.current = fetcher;

  const doFetch = useCallback(async (isManual = false) => {
    if (isManual) {
      if (debounceRef.current) return;
      debounceRef.current = true;
      setTimeout(() => { debounceRef.current = false; }, 1000);
    }
    setIsRefreshing(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    doFetch();
    const id = setInterval(() => doFetch(), interval);
    return () => clearInterval(id);
  }, [enabled, interval, doFetch]);

  const refresh = useCallback(() => doFetch(true), [doFetch]);

  return { data, loading, error, lastUpdated, refresh, isRefreshing };
}
