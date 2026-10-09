import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { getAuthGeneration, getCachedUser } from '@kormic/portal-core/tokenStorage.js';
import { cacheEpoch, readPageCache, writePageCache } from '@kormic/portal-core/pageCache.js';

/**
 * Runs `fn` whenever `deps` change, tracking loading/data/error state.
 * `enabled` lets callers skip the call (e.g. no student_id yet) without
 * juggling conditional hooks. `fn` receives an AbortSignal as its only
 * argument — pass it through to the underlying API call (as `{ signal }` in
 * the axios config) so a superseded request (rapid tab/filter switches,
 * unmount mid-flight) is actually cancelled instead of just having its
 * result discarded.
 */
export function useAsync(fn, deps, { enabled = true, cacheKey = null } = {}) {
  const key = cacheKey && getCachedUser() ? JSON.stringify([getAuthGeneration(), getCachedUser(), cacheKey, deps]) : null;
  const [data, updateData] = useState(() => enabled && key ? readPageCache(key) : null);
  const dataRef = useRef(data);
  const setData = useCallback(value => {
    const next = typeof value === 'function' ? value(dataRef.current) : value;
    dataRef.current = next;
    updateData(next);
    if (key) writePageCache(key, next);
  }, [key]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled && !data);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const controllerRef = useRef(null);

  const run = useCallback((force = true) => {
    controllerRef.current?.abort();
    const id = ++requestId.current;
    if (!enabled) {
      setLoading(false);
      return;
    }
    const cached = key ? readPageCache(key) : null;
    if (force === false && cached) {
      dataRef.current = cached; updateData(cached); setLoading(false); setError(null);
      return;
    }
    const epoch = cacheEpoch();
    const generation = getAuthGeneration();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(!dataRef.current);
    setRefreshing(true);
    setError(null);
    fn(controller.signal)
      .then((result) => {
        if (id === requestId.current && generation === getAuthGeneration() && !controller.signal.aborted) {
          dataRef.current = result; updateData(result);
          if (key) writePageCache(key, result, epoch);
        }
      })
      .catch((err) => {
        if (axios.isCancel(err)) return;
        if (id === requestId.current) setError(err);
      })
      .finally(() => {
        if (id === requestId.current) { setLoading(false); setRefreshing(false); }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, key]);

  useEffect(() => {
    dataRef.current = key ? readPageCache(key) : null;
    updateData(dataRef.current);
    run(false);
    return () => controllerRef.current?.abort();
  }, [run]);

  return { data, error, loading, refreshing, refetch: run, setData };
}

/**
 * Fetches a protected binary endpoint (profile picture, LinkedIn screenshot) as a blob and
 * exposes it as an object URL — these all require the `Authorization` header, so a plain
 * `<img src="...">` can't be used directly. Revokes the previous URL on refetch/unmount.
 */
export function useBlobUrl(fetchFn, deps, { enabled = true } = {}) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  const objectUrlRef = useRef(null);

  const run = useCallback(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    fetchFn()
      .then((blob) => {
        if (id !== requestId.current) return;
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = blob ? URL.createObjectURL(blob) : null;
        setUrl(objectUrlRef.current);
      })
      .catch((err) => {
        if (id === requestId.current) setError(err);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  return { url, loading, error };
}

/** For POST/PUT-style actions triggered by user events, not on mount. */
export function useAction(fn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        return result;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fn]
  );

  return { execute, loading, error, setError };
}
