import axios from "axios";
import { clearAuthAccessToken, clearAuthSession, getAuthAccessToken } from "@/lib/auth-session";
import { resetAuthVerificationCache } from "@/lib/auth-verify";
import { useAuthStore } from "@/stores/auth-store";
import { resolveApiUrl } from "@/lib/api-url";

const isBrowser = typeof window !== "undefined";
const serverApiUrl = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL);
const BASE_URL = isBrowser ? "/api" : serverApiUrl;
const LOGIN_REDIRECT_COOLDOWN_MS = 1500;
let lastLoginRedirectAt = 0;

const getRequestPathname = (url?: string) => {
  if (!url) return "";

  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return new URL(url).pathname;
    }

    const base = isBrowser
      ? window.location.origin
      : serverApiUrl.startsWith("http")
        ? serverApiUrl
        : resolveApiUrl();

    return new URL(url, base).pathname;
  } catch {
    return url;
  }
};

// NOTE: /auth/me is intentionally NOT in this list — a 401 there must go
// through the refresh flow (otherwise an expired access token with a valid
// refresh cookie would be treated as logged out).
const AUTH_ENDPOINT_PREFIXES = [
  "/auth/login",
  "/auth/logout",
  "/auth/register",
  "/auth/refresh",
  "/auth/biometric/",
] as const;

const isAuthEndpoint = (pathname: string) => {
  return AUTH_ENDPOINT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
};

// Single-flight refresh: the response interceptor AND the SessionRefresh loop
// share one promise so two concurrent /auth/refresh calls can never race on the
// single-use rotating refresh token (a race that previously caused logouts).
let refreshInFlight: Promise<boolean> | null = null;

export const performTokenRefresh = (): Promise<boolean> => {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = apiClient
    .post("/auth/refresh", {}, { timeout: 8_000 })
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
};

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Remove undefined / null / "undefined" values from query params and body so
// axios never serializes them as the literal string "undefined" (which makes
// the backend reject the request with a 400 validation error).
const isEmptyParam = (value: unknown): boolean =>
  value === undefined ||
  (typeof value === "string" && value.trim().toLowerCase() === "undefined");

apiClient.interceptors.request.use((config) => {
  const token = getAuthAccessToken();
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  const method = (config.method || "get").toUpperCase();
  if (method === "GET") {
    // Allow browser/proxy caching for GET — React Query handles freshness via staleTime
    if (config.headers) {
      delete (config.headers as Record<string, unknown>).Pragma;
      delete (config.headers as Record<string, unknown>).Expires;
      delete (config.headers as Record<string, unknown>)["Cache-Control"];
    }
  } else {
    if (config.headers) {
      (config.headers as Record<string, unknown>)["Cache-Control"] =
        "no-cache, no-store, must-revalidate";
      (config.headers as Record<string, unknown>).Pragma = "no-cache";
      (config.headers as Record<string, unknown>).Expires = "0";
    }
  }

  if (config.params && typeof config.params === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config.params)) {
      if (!isEmptyParam(value)) cleaned[key] = value;
    }
    config.params = cleaned;
  }

  if (
    config.data &&
    typeof config.data === "object" &&
    !(config.data instanceof FormData) &&
    !Array.isArray(config.data)
  ) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config.data)) {
      if (!isEmptyParam(value)) cleaned[key] = value;
    }
    config.data = cleaned;
  }

  return config;
});

const forceLogout = () => {
  clearAuthAccessToken();
  clearAuthSession();
  useAuthStore.getState().clear();
  resetAuthVerificationCache();

  const now = Date.now();
  if (
    typeof window !== "undefined" &&
    now - lastLoginRedirectAt > LOGIN_REDIRECT_COOLDOWN_MS &&
    window.location.pathname !== "/login"
  ) {
    lastLoginRedirectAt = now;
    window.location.href = "/login";
  }
};

/** Returns true only when the refresh itself got a definitive 401/403 from the server */
const isDefinitiveAuthFailure = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 401 || status === 403;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const requestPathname = getRequestPathname(error?.config?.url);
    const originalConfig = error?.config;

    // فقط عند 401 وخارج نقاط المصادقة وبدون retry سابق
    if (
      status === 401 &&
      typeof window !== "undefined" &&
      !isAuthEndpoint(requestPathname) &&
      !originalConfig?._retry
    ) {
      // Single-flight refresh: كل الـ 401s تنتظر نفس الـ refresh
      let refreshSucceeded = false;
      try {
        refreshSucceeded = await performTokenRefresh();
      } catch (refreshError) {
        // Only force logout when the refresh endpoint itself returned 401/403.
        // Network errors, 500s, timeouts, etc. should NOT log the user out.
        if (isDefinitiveAuthFailure(refreshError)) {
          forceLogout();
        }
        return Promise.reject(error);
      }

      if (refreshSucceeded) {
        originalConfig._retry = true;
        return apiClient(originalConfig);
      }

      // performTokenRefresh returned false (caught internally) — only logout
      // if the original request was NOT a mutation (GET requests failing after
      // a failed refresh are safe to logout on; mutations should just show an error).
      const isReadRequest = (originalConfig?.method ?? "get").toLowerCase() === "get";
      if (isReadRequest) {
        forceLogout();
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
