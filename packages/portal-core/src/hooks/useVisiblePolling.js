import { useEffect } from "react";

/** Poll while the page is visible, and catch up as soon as the user returns. */
export function useVisiblePolling(refresh, pollMs, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;

    let active = true;
    let inFlight = false;
    let refreshAfterFlight = false;
    let timer;
    let lastStarted = -Infinity;
    const visible = () => typeof document === "undefined" || !document.hidden;
    const clearTimer = () => { if (timer) clearTimeout(timer); timer = undefined; };
    const schedule = () => {
      clearTimer();
      if (active && visible()) timer = setTimeout(() => run(false), Math.max(1000, pollMs));
    };
    const run = (immediate) => {
      if (!active || !visible()) return;
      if (inFlight) {
        if (immediate) refreshAfterFlight = true;
        return;
      }
      // Visibility and focus often fire together; one fresh request is enough.
      if (immediate && Date.now() - lastStarted < 250) { schedule(); return; }
      clearTimer();
      inFlight = true;
      lastStarted = Date.now();
      let request;
      try { request = refresh(); } catch { request = undefined; }
      Promise.resolve(request).catch(() => {}).finally(() => {
        inFlight = false;
        if (!active) return;
        if (refreshAfterFlight) {
          refreshAfterFlight = false;
          run(true);
        } else {
          schedule();
        }
      });
    };
    const onVisibility = () => {
      if (!visible()) { clearTimer(); refreshAfterFlight = false; }
      else run(true);
    };
    const onFocus = () => { if (visible()) run(true); };

    run(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      clearTimer();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh, pollMs, enabled]);
}
