import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  refreshing: boolean;
  /** Pull-to-refresh: keeps showing the current data while the new copy loads. */
  refresh: () => void;
  reload: () => void;
}

/**
 * Loads what a screen shows, keyed by `key`: a new key starts over, the same key keeps its data
 * across a refresh. A response for a key the screen has moved on from is dropped.
 */
export function useAsync<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<{ key: string | null; data: T | null; error: unknown }>({
    key: null,
    data: null,
    error: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [nonce, setNonce] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (!key) return undefined;
    const controller = new AbortController();
    loadRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted || (error as Error)?.name === 'AbortError') return;
        setState((s) => ({ key, data: s.key === key ? s.data : null, error }));
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false);
      });
    return () => controller.abort();
  }, [key, nonce]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setNonce((n) => n + 1);
  }, []);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const current = state.key === key ? state : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: Boolean(key) && !current,
    refreshing,
    refresh,
    reload,
  };
}
