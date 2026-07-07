import axios from 'axios';
import { clearAuthAccessToken, clearAuthSession, getAuthAccessToken } from '@/lib/auth-session';
import { resetAuthVerificationCache } from '@/lib/auth-verify';
import { useAuthStore } from '@/stores/auth-store';
import { resolveApiUrl } from '@/lib/api-url';

const isBrowser = typeof window !== 'undefined';
const serverApiUrl = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL);
const BASE_URL = isBrowser ? '/api' : serverApiUrl;
const LOGIN_REDIRECT_COOLDOWN_MS = 1500;
let lastLoginRedirectAt = 0;

const getRequestPathname = (url?: string) => {
  if (!url) return '';

  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return new URL(url).pathname;
    }

    const base = isBrowser
      ? window.location.origin
      : serverApiUrl.startsWith('http')
        ? serverApiUrl
        : resolveApiUrl();

    return new URL(url, base).pathname;
  } catch {
    return url;
  }
};

const AUTH_ENDPOINT_PREFIXES = [
  '/auth/login',
  '/auth/logout',
  '/auth/me',
  '/auth/register',
  '/auth/refresh',
  '/auth/biometric/',
] as const;

const isAuthEndpoint = (pathname: string) => {
  return AUTH_ENDPOINT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
};

let isRefreshing = false;
let refreshSubscribers: Array<(success: boolean) => void> = [];

const onRefreshComplete = (success: boolean) => {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
};

const waitForRefresh = (): Promise<boolean> =>
  new Promise((resolve) => refreshSubscribers.push(resolve));

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 10000, // 10 ثواني timeout
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthAccessToken();
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

const forceLogout = () => {
  clearAuthAccessToken();
  clearAuthSession();
  useAuthStore.getState().clear();
  resetAuthVerificationCache();

  const now = Date.now();
  if (typeof window !== 'undefined' && now - lastLoginRedirectAt > LOGIN_REDIRECT_COOLDOWN_MS && window.location.pathname !== '/login') {
    lastLoginRedirectAt = now;
    window.location.href = '/login';
  }
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
      typeof window !== 'undefined' &&
      !isAuthEndpoint(requestPathname) &&
      !originalConfig?._retry
    ) {
      if (isRefreshing) {
        // انتظر حتى ينتهي الـ refresh الجاري
        const success = await waitForRefresh();
        if (success) {
          originalConfig._retry = true;
          return apiClient(originalConfig);
        }
        forceLogout();
        return Promise.reject(error);
      }

      isRefreshing = true;
      originalConfig._retry = true;

      try {
        await apiClient.post('/auth/refresh', {}, { timeout: 8_000 });
        isRefreshing = false;
        onRefreshComplete(true);
        // أعد تنفيذ الطلب الأصلي بعد نجاح الـ refresh
        return apiClient(originalConfig);
      } catch {
        isRefreshing = false;
        onRefreshComplete(false);
        forceLogout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
