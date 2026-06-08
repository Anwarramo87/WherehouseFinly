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
  '/auth/biometric/',
] as const;

const isAuthEndpoint = (pathname: string) => {
  return AUTH_ENDPOINT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
};

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 10000, // 10 ثواني timeout
  headers: {
    'Content-Type': 'application/json',
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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestPathname = getRequestPathname(error?.config?.url);

    if (status === 401 && typeof window !== 'undefined' && !isAuthEndpoint(requestPathname)) {
      clearAuthAccessToken();
      clearAuthSession();
      useAuthStore.getState().clear();
      resetAuthVerificationCache();

      const now = Date.now();
      const canRedirect = now - lastLoginRedirectAt > LOGIN_REDIRECT_COOLDOWN_MS;

      if (canRedirect && window.location.pathname !== '/login') {
        lastLoginRedirectAt = now;
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
