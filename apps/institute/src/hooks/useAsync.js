import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

export function useAsync(fn, deps, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const requestId = useRef(0);
  const controllerRef = useRef(null);

  const run = useCallback(() => {
    controllerRef.current?.abort();
    if (!enabled) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    fn(controller.signal)
      .then((result) => {
        if (id === requestId.current) setData(result);
      })
      .catch((err) => {
        if (axios.isCancel(err)) return;
        if (id === requestId.current) setError(err);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => controllerRef.current?.abort();
  }, [run]);

  return { data, error, loading, refetch: run, setData };
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
