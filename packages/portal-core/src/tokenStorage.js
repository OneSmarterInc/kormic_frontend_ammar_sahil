// Access credentials live in memory; refresh credentials are scoped to this tab.
let accessToken = "";
let cachedUser = null;
let generation = 0;
const refreshKey = (portal) => `kormic.refresh.${portal}`;

export const getRefreshToken = (portal) => {
  try { return globalThis.sessionStorage?.getItem(refreshKey(portal)) || ""; }
  catch { return ""; }
};
export const setRefreshToken = (portal, token) => {
  if (!token) return;
  globalThis.sessionStorage?.setItem(refreshKey(portal), token);
};

export function clearLegacyAuthStorage() {
  try {
    for (const key of ["kormic.access_token", "kormic.refresh_token", "kormic.user"]) {
      globalThis.localStorage?.removeItem(key);
    }
  } catch {
    // Storage may be disabled by the browser.
  }
}
clearLegacyAuthStorage();

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => { accessToken = token || ""; };
export const getCachedUser = () => cachedUser;
export const setCachedUser = (user) => { cachedUser = user; };
export const getAuthGeneration = () => generation;
export const clearAuth = () => {
  generation += 1;
  accessToken = "";
  cachedUser = null;
  try {
    for (const portal of ["student", "university", "institute", "superuser"]) {
      globalThis.sessionStorage?.removeItem(refreshKey(portal));
    }
  } catch { /* Storage may be unavailable. */ }
  clearLegacyAuthStorage();
};
