import axios from "axios";
import {
  clearAuth,
  getAccessToken,
  getAuthGeneration,
  setAccessToken,
} from "./tokenStorage.js";

export function createPortalClient(portal) {
  const BASE_URL = (import.meta.env?.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

  const client = axios.create({
    baseURL: `${BASE_URL}/api`,
    timeout: 60000,
    withCredentials: true,
  });

  const cookieTransport = axios.create({
    baseURL: `${BASE_URL}/api`,
    withCredentials: true,
    timeout: 60000,
  });

  async function csrfToken() {
    const response = await cookieTransport.get("/auth/web/csrf/");
    return response.data.csrfToken;
  }

  async function cookiePost(path, data = {}) {
    return cookieTransport.post(path, { ...data, portal }, {
      headers: { "X-CSRFToken": await csrfToken() },
    });
  }

  client.interceptors.request.use(async (config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (config.url?.startsWith("/auth/web/") && config.method === "post") {
      config.headers["X-CSRFToken"] = await csrfToken();
    }
    return config;
  });

  const REFRESH_EXEMPT = [
    "/auth/web/",
    "/auth/login/",
    "/auth/register/",
    "/auth/verify-totp/",
    "/auth/refresh/",
    "/auth/forgot-password/",
    "/auth/reset-password/",
  ];

  let refreshPromise = null;

  function requestRefresh() {
    if (!refreshPromise) {
      const generation = getAuthGeneration();
      refreshPromise = cookiePost("/auth/web/refresh/")
        .then((response) => {
          if (generation !== getAuthGeneration()) throw new Error("Session changed");
          setAccessToken(response.data.access);
          return response.data.access;
        })
        .finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
  }

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (axios.isCancel(error)) return Promise.reject(error);

      const config = error.config;
      const isRefreshExempt = REFRESH_EXEMPT.some((path) => config?.url?.includes(path));

      if (error.response?.status === 401 && !isRefreshExempt && !config?._retry) {
        config._retry = true;
        try {
          const access = await requestRefresh();
          config.headers.Authorization = `Bearer ${access}`;
          return client(config);
        } catch {
          clearAuth();
          globalThis.window?.dispatchEvent?.(new Event("kormic:auth-expired"));
        }
      }

      const status = error.response?.status ?? null;
      const rawMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        "Something went wrong. Please try again.";
      const isServerOrNetworkError = status === null || status >= 500;

      return Promise.reject({
        isApiError: true,
        status,
        message: isServerOrNetworkError
          ? "Something went wrong on our end. Please try again in a moment."
          : rawMessage,
        data: error.response?.data ?? null,
        original: error,
      });
    }
  );

  return {
    BASE_URL,
    PORTAL: portal,
    client,
    cookieTransport,
    cookiePost,
    requestRefresh,
  };
}
