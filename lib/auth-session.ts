const USER_KEY = "auth_user_profile";
const ACCESS_TOKEN_KEY = "auth_access_token";
// Aligned with backend JWT_EXPIRE default (15 minutes)
const ACCESS_TOKEN_COOKIE_MAX_AGE = 60 * 15; // 15 minutes

const isBrowser = () => typeof window !== "undefined";

const getCookieValue = (name: string) => {
  if (!isBrowser()) return "";

  const encodedName = encodeURIComponent(name);
  const parts = document.cookie ? document.cookie.split("; ") : [];

  for (const part of parts) {
    if (!part.startsWith(`${encodedName}=`)) continue;
    return decodeURIComponent(part.slice(encodedName.length + 1));
  }

  return "";
};

const writeCookie = (name: string, value: string, maxAgeSeconds: number) => {
  if (!isBrowser()) return;

  const isHttps = window.location.protocol === "https:";
  const secureFlag = isHttps ? "; Secure" : "";
  const encodedName = encodeURIComponent(name);
  const encodedValue = encodeURIComponent(value);

  // Note: HttpOnly cannot be set from JS — token is intentionally NOT HttpOnly here
  // because the backend sets its own HttpOnly session cookie. This dev-only cookie
  // is only written in non-production for Bearer token fallback.
  document.cookie = `${encodedName}=${encodedValue}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Strict${secureFlag}`;
};

const removeCookie = (name: string) => {
  if (!isBrowser()) return;

  const isHttps = window.location.protocol === "https:";
  const secureFlag = isHttps ? "; Secure" : "";
  const encodedName = encodeURIComponent(name);
  document.cookie = `${encodedName}=; Path=/; Max-Age=0; SameSite=Strict${secureFlag}`;
};
// Cookie session is handled by the backend (HttpOnly); only non-sensitive user profile is cached for UI.
export const setAuthSession = (user?: unknown) => {
  if (!isBrowser()) return;
  if (user === undefined || user === null) {
    localStorage.removeItem(USER_KEY);
    return;
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
  if (!isBrowser()) return;
  localStorage.removeItem(USER_KEY);
  removeCookie(ACCESS_TOKEN_KEY);
  
  // مسح كل الـ cache
  try {
    // مسح sessionStorage
    sessionStorage.clear();
    
    // مسح Service Worker cache
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
};

export const setAuthAccessToken = (token?: string | null) => {
  if (!isBrowser()) return;

  // In production, the backend sets HttpOnly cookies directly in the response.
  // The frontend should not write access tokens to cookies.
  // In development, allow writing for testing purposes.
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (!token || !token.trim()) {
    removeCookie(ACCESS_TOKEN_KEY);
    return;
  }
  writeCookie(ACCESS_TOKEN_KEY, token.trim(), ACCESS_TOKEN_COOKIE_MAX_AGE);
};

export const getAuthAccessToken = () => {
  return getCookieValue(ACCESS_TOKEN_KEY);
};

export const clearAuthAccessToken = () => {
  removeCookie(ACCESS_TOKEN_KEY);
};

export const getStoredUser = <T>() => {
  if (!isBrowser()) return null as T | null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw || raw === "undefined" || raw === "null") return null as T | null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null as T | null;
  }
};

