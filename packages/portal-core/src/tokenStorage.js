// Browser credentials live only in memory. Refresh tokens are HttpOnly cookies.
let accessToken = "";
let cachedUser = null;
let generation = 0;

function removeLegacyStorage() {
  try {
    for (const key of ["kormic.access_token", "kormic.refresh_token", "kormic.user"]) {
      globalThis.localStorage?.removeItem(key);
    }
  } catch {
    // Storage may be disabled by the browser.
  }
}
removeLegacyStorage();

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => { accessToken = token || ""; };
export const getCachedUser = () => cachedUser;
export const setCachedUser = (user) => { cachedUser = user; };
export const getAuthGeneration = () => generation;
export const clearAuth = () => {
  generation += 1;
  accessToken = "";
  cachedUser = null;
  removeLegacyStorage();
};
