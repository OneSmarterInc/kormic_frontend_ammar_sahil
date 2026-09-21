import axios from "axios";
import {
  clearAuth,
  getAccessToken,
  getAuthGeneration,
  setAccessToken,
} from "../lib/tokenStorage.js";

export const BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const client = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 60000,
  withCredentials: true,
});

export const PORTAL = "superuser";
// Separate transport avoids recursive refresh/CSRF interception.
export const cookieTransport = axios.create({ baseURL: `${BASE_URL}/api`, withCredentials: true, timeout: 60000 });
async function csrfToken() {
  const response = await cookieTransport.get('/auth/web/csrf/');
  return response.data.csrfToken;
}
export async function cookiePost(path, data = {}) {
  return cookieTransport.post(path, { ...data, portal: PORTAL }, {
    headers: { 'X-CSRFToken': await csrfToken() },
  });
}
client.interceptors.request.use(async (config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.url?.startsWith('/auth/web/') && config.method === 'post') {
    config.headers['X-CSRFToken'] = await csrfToken();
  }
  return config;
});

// Endpoints that should never trigger a refresh-and-retry on 401 — either
// they run before any token exists, or they're the refresh call itself.
const REFRESH_EXEMPT = [
  "/auth/web/","/auth/login/", "/auth/register/", "/auth/verify-totp/", "/auth/refresh/"];

// Shared in-flight refresh promise so concurrent 401s trigger one refresh call, not many.
let refreshPromise = null;

export function requestRefresh() {
  if (!refreshPromise) {
    const generation = getAuthGeneration();
    refreshPromise = cookiePost('/auth/web/refresh/')
      .then((r) => {
        if (generation !== getAuthGeneration()) throw new Error('Session changed');
        setAccessToken(r.data.access);
        return r.data.access;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

/**
 * The API is inconsistent about error envelopes ({"status":"error",...} vs
 * {"status":"failed",...}). Per the integration guide, HTTP status code is the
 * only reliable signal — this interceptor normalizes every rejection into a
 * single shape so calling code never has to branch on the envelope string.
 */
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const isRefreshExempt = REFRESH_EXEMPT.some((path) => config?.url?.includes(path));

    if (error.response?.status === 401 && !isRefreshExempt && !config._retry) {
      config._retry = true;
      try {
        const access = await requestRefresh();
        config.headers.Authorization = `Bearer ${access}`;
        return client(config);
      } catch {
        clearAuth();
        window.dispatchEvent(new Event("kormic:auth-expired"));
      }
    }

    const normalized = {
      isApiError: true,
      status: error.response?.status ?? null,
      message:
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        "Something went wrong. Please try again.",
      data: error.response?.data ?? null,
      original: error,
    };
    return Promise.reject(normalized);
  }
);

export default client;
