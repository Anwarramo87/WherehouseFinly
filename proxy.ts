import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getRequiredPermissionsForPath,
  hasAnyRequiredPermission,
  isProtectedRoute,
} from "@/lib/route-access";
import { DEFAULT_API_URL, normalizeApiUrl } from "@/lib/api-url";

// ─── CSP nonce helpers ────────────────────────────────────────────────
function buildCspHeader(nonce: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  let apiOrigin = "";
  let apiWsOrigin = "";

  try {
    if (rawApiUrl) {
      apiOrigin = new URL(rawApiUrl).origin;
      const parsed = new URL(apiOrigin);
      parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
      apiWsOrigin = parsed.origin;
    }
  } catch {
    // ignore malformed URL
  }

  const connectSources = ["'self'", apiOrigin, apiWsOrigin].filter(Boolean);
  if (isProduction) {
    connectSources.push("https:", "wss:");
  } else {
    connectSources.push("http:", "https:", "ws:", "wss:");
  }

  const cspDirectives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    isProduction
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
      : `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    `connect-src ${connectSources.join(" ")}`,
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ];

  return cspDirectives.join("; ");
}

const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL, DEFAULT_API_URL);
const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";
// Very short timeout for session checks to not block page loads
const SESSION_CHECK_TIMEOUT_MS = IS_DEVELOPMENT ? 500 : 1_000;
// Longer cache for successful sessions
const SESSION_SUCCESS_CACHE_TTL_MS = 5 * 60 * 1_000; // 5 minutes
const SESSION_FAILURE_CACHE_TTL_MS = 5_000;
const SESSION_RATE_LIMIT_CACHE_TTL_MS = 15_000;
const SESSION_CACHE_MAX_ENTRIES = 512;
const AUTH_COOKIE_CANDIDATES = [
  process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME,
  "warehouse_access_token",
  "auth_access_token",
  "access_token",
  "token",
].filter((value): value is string => Boolean(value && value.trim()));

type AuthMeResponse = {
  role?: string | null;
  roles?: string[] | null;
  permissions?: string[] | null;
};

type SessionCheckResult =
  | { authorized: true; roles: string[]; permissions: string[] }
  | { authorized: false; status?: number };

const sessionCheckCache = new Map<
  string,
  {
    result: SessionCheckResult;
    expiresAt: number;
  }
>();

const now = () => Date.now();

const normalizePathname = (pathname: string) => {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasSessionHints = (request: NextRequest) => {
  const cookieHeader = request.headers.get("cookie") || "";
  const authHeader = request.headers.get("authorization");
  const hasAuthCookie = AUTH_COOKIE_CANDIDATES.some((cookieName) => {
    if (!cookieName) return false;
    const pattern = new RegExp(`(?:^|;\\s*)${escapeRegExp(cookieName)}=`);
    return pattern.test(cookieHeader);
  });

  return Boolean(hasAuthCookie || (authHeader && authHeader.trim().length > 0));
};

const isPrefetchRequest = (request: NextRequest) => {
  const purpose = request.headers.get("purpose")?.toLowerCase();
  const nextRouterPrefetch = request.headers.get("next-router-prefetch");

  return purpose === "prefetch" || nextRouterPrefetch === "1";
};

const getCookieValue = (cookieHeader: string | null, cookieName: string) => {
  if (!cookieHeader || !cookieName) return "";

  const encodedName = encodeURIComponent(cookieName.trim());
  const segments = cookieHeader.split(";");

  for (const segment of segments) {
    const [rawName, ...rawValueParts] = segment.split("=");
    if (!rawName || rawValueParts.length === 0) continue;

    const normalizedName = rawName.trim();
    if (normalizedName !== cookieName && normalizedName !== encodedName) {
      continue;
    }

    const rawValue = rawValueParts.join("=").trim();
    return rawValue;
  }

  return "";
};

const getSessionCacheKey = (request: NextRequest) => {
  const cookieHeader = request.headers.get("cookie");
  const authHeader = request.headers.get("authorization")?.trim() || "";
  const authCookieParts = AUTH_COOKIE_CANDIDATES.map((cookieName) =>
    getCookieValue(cookieHeader, cookieName),
  ).filter((value) => value.trim().length > 0);

  const cookieKey = authCookieParts.join("|") || cookieHeader?.trim() || "";

  if (!cookieKey && !authHeader) {
    return "";
  }

  return `${cookieKey}::${authHeader}`;
};

const getSessionCacheTtl = (result: SessionCheckResult) => {
  if (result.authorized) {
    return SESSION_SUCCESS_CACHE_TTL_MS;
  }

  if (result.status === 429) {
    return SESSION_RATE_LIMIT_CACHE_TTL_MS;
  }

  return SESSION_FAILURE_CACHE_TTL_MS;
};

const pruneSessionCache = () => {
  const currentTime = now();

  for (const [key, entry] of sessionCheckCache.entries()) {
    if (entry.expiresAt <= currentTime) {
      sessionCheckCache.delete(key);
    }
  }

  while (sessionCheckCache.size > SESSION_CACHE_MAX_ENTRIES) {
    const oldestKey = sessionCheckCache.keys().next().value as string | undefined;
    if (!oldestKey) {
      break;
    }
    sessionCheckCache.delete(oldestKey);
  }
};

const getCachedSessionResult = (cacheKey: string): SessionCheckResult | null => {
  if (!cacheKey) return null;

  const cachedEntry = sessionCheckCache.get(cacheKey);
  if (!cachedEntry) return null;

  if (cachedEntry.expiresAt <= now()) {
    sessionCheckCache.delete(cacheKey);
    return null;
  }

  return cachedEntry.result;
};

const setCachedSessionResult = (cacheKey: string, result: SessionCheckResult) => {
  if (!cacheKey) return;

  sessionCheckCache.set(cacheKey, {
    result,
    expiresAt: now() + getSessionCacheTtl(result),
  });
  pruneSessionCache();
};

const toAbsoluteBackendUrl = (request: NextRequest, path: string) => {
  if (/^https?:\/\//i.test(API_URL)) {
    return `${API_URL}${path}`;
  }

  if (API_URL.startsWith("/")) {
    return new URL(`${API_URL}${path}`, request.url).toString();
  }

  return `${DEFAULT_API_URL}${path}`;
};

const buildRedirectResponse = (
  request: NextRequest,
  pathname: string,
  params?: Record<string, string>,
) => {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(url);
};

const checkSession = async (request: NextRequest): Promise<SessionCheckResult> => {
  const cacheKey = getSessionCacheKey(request);
  const cachedResult = getCachedSessionResult(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const cacheAndReturn = (result: SessionCheckResult) => {
    setCachedSessionResult(cacheKey, result);
    return result;
  };

  const headers = new Headers({ accept: "application/json" });
  const cookieHeader = request.headers.get("cookie");
  const authHeader = request.headers.get("authorization");

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  if (authHeader) {
    headers.set("authorization", authHeader);
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), SESSION_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(toAbsoluteBackendUrl(request, "/auth/me"), {
      method: "GET",
      headers,
      cache: "no-store",
      signal: abortController.signal,
    });

    if (!response.ok) {
      return cacheAndReturn({ authorized: false, status: response.status });
    }

    const payload = (await response.json()) as AuthMeResponse;
    const roleSet = new Set<string>();

    if (typeof payload.role === "string" && payload.role.trim()) {
      roleSet.add(payload.role.trim().toLowerCase());
    }

    if (Array.isArray(payload.roles)) {
      for (const role of payload.roles) {
        if (typeof role === "string" && role.trim()) {
          roleSet.add(role.trim().toLowerCase());
        }
      }
    }

    const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];

    return cacheAndReturn({ authorized: true, roles: Array.from(roleSet), permissions });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return cacheAndReturn({ authorized: false, status: 504 });
    }

    return cacheAndReturn({ authorized: false, status: 503 });
  } finally {
    clearTimeout(timeout);
  }
};

function makeNextResponse(request: NextRequest, nonce: string, requestHeaders: Headers) {
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", buildCspHeader(nonce));
  return response;
}

export async function proxy(request: NextRequest) {
  // ─── CSP nonce (per-request) ────────────────────────────────────────
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const pathname = normalizePathname(request.nextUrl.pathname);

  // Skip auth checks for login page, API routes, and static assets
  if (pathname === "/login" || pathname.startsWith("/api/")) {
    return makeNextResponse(request, nonce, requestHeaders);
  }

  const isRootRoute = pathname === "/";
  const isProtected = isProtectedRoute(pathname);
  const hasHints = hasSessionHints(request);

  // Skip prefetch requests
  if (isPrefetchRequest(request)) {
    return makeNextResponse(request, nonce, requestHeaders);
  }

  // ===== SUPER FAST PATH: Skip all auth checks for protected routes with session hints
  if (isProtected && hasHints) {
    return makeNextResponse(request, nonce, requestHeaders);
  }
  // ===== END SUPER FAST PATH =====

  if (isRootRoute) {
    if (!hasHints) {
      return buildRedirectResponse(request, "/login");
    }

    const session = await checkSession(request);

    return session.authorized
      ? buildRedirectResponse(request, "/home")
      : buildRedirectResponse(request, "/login");
  }

  if (!hasHints) {
    return buildRedirectResponse(request, "/login", {
      unauthorized: "true",
      status: "401",
    });
  }

  const session = await checkSession(request);

  if (!session.authorized) {
    const status = session.status || 401;
    const isTransientUpstreamFailure = status === 429 || status === 503 || status === 504;

    if (IS_DEVELOPMENT && hasHints && isTransientUpstreamFailure) {
      return makeNextResponse(request, nonce, requestHeaders);
    }

    return buildRedirectResponse(request, "/login", {
      unauthorized: "true",
      status: String(status),
    });
  }

  const requiredPermissions = getRequiredPermissionsForPath(pathname);

  if (requiredPermissions && requiredPermissions.length > 0) {
    // Admin role has unrestricted access
    const isAdmin = session.roles.includes("admin");
    if (!isAdmin) {
      const hasRequiredPermission = hasAnyRequiredPermission(
        session.permissions,
        requiredPermissions,
      );
      if (!hasRequiredPermission) {
        return buildRedirectResponse(request, "/home", { forbidden: "true" });
      }
    }
  }

  return makeNextResponse(request, nonce, requestHeaders);
}

export const config = {
  matcher: ["/((?!api|backend-api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
