import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getRequiredRolesForPath,
  hasAnyRequiredRole,
  isProtectedRoute,
} from "@/lib/route-access";
import { DEFAULT_API_URL, normalizeApiUrl } from "@/lib/api-url";

const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL, DEFAULT_API_URL);
const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";
// في dev نعطي وقت كافي للباك المحلي، في production نعطي وقت أطول
const SESSION_CHECK_TIMEOUT_MS = IS_DEVELOPMENT ? 1_500 : 5_000;
// نزيد الـ cache بشكل كبير — المستخدم المسجل ما يحتاج نتحقق منه كل 10 ثواني
const SESSION_SUCCESS_CACHE_TTL_MS = 10 * 60 * 1_000; // 10 دقائق
const SESSION_FAILURE_CACHE_TTL_MS = 3_000;
const SESSION_RATE_LIMIT_CACHE_TTL_MS = 15_000;
const SESSION_CACHE_MAX_ENTRIES = 128;
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
};

type SessionCheckResult =
  | { authorized: true; roles: string[] }
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
  const authCookieParts = AUTH_COOKIE_CANDIDATES
    .map((cookieName) => getCookieValue(cookieHeader, cookieName))
    .filter((value) => value.trim().length > 0);

  const cookieKey = authCookieParts.join("|") || (cookieHeader?.trim() || "");

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

    return cacheAndReturn({ authorized: true, roles: Array.from(roleSet) });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return cacheAndReturn({ authorized: false, status: 504 });
    }

    return cacheAndReturn({ authorized: false, status: 503 });
  } finally {
    clearTimeout(timeout);
  }
};

export async function proxy(request: NextRequest) {
  const pathname = normalizePathname(request.nextUrl.pathname);
  const isRootRoute = pathname === "/";
  const isLoginRoute = pathname === "/login";
  const isProtected = isProtectedRoute(pathname);
  const hasHints = hasSessionHints(request);

  // Avoid blocking route prefetch requests with auth round-trips.
  if (isPrefetchRequest(request)) {
    return NextResponse.next();
  }

  if (!isRootRoute && !isLoginRoute && !isProtected) {
    return NextResponse.next();
  }

  // ===== FAST PATH =====
  // إذا المستخدم عنده session hints وعم يتنقل بين protected routes
  // نتحقق من الـ cache أولاً — إذا موجود نمرره فوراً بدون fetch
  if (isProtected && hasHints) {
    const cacheKey = getSessionCacheKey(request);
    const cachedResult = getCachedSessionResult(cacheKey);

    if (cachedResult?.authorized) {
      // الـ session محفوظة وصالحة — نمرر مباشرة بدون أي fetch
      const requiredRoles = getRequiredRolesForPath(pathname);
      if (requiredRoles && requiredRoles.length > 0) {
        const hasRequiredRole = hasAnyRequiredRole(cachedResult.roles, requiredRoles);
        if (!hasRequiredRole) {
          return buildRedirectResponse(request, "/home", { forbidden: "true" });
        }
      }
      return NextResponse.next();
    }
  }
  // ===== END FAST PATH =====

  if (isRootRoute) {
    if (!hasHints) {
      return buildRedirectResponse(request, "/login");
    }

    const session = await checkSession(request);

    return session.authorized
      ? buildRedirectResponse(request, "/home")
      : buildRedirectResponse(request, "/login");
  }

  if (isLoginRoute) {
    if (!hasHints) {
      return NextResponse.next();
    }

    const session = await checkSession(request);

    return session.authorized
      ? buildRedirectResponse(request, "/home")
      : NextResponse.next();
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
      return NextResponse.next();
    }

    return buildRedirectResponse(request, "/login", {
      unauthorized: "true",
      status: String(status),
    });
  }

  const requiredRoles = getRequiredRolesForPath(pathname);

  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = hasAnyRequiredRole(session.roles, requiredRoles);
    if (!hasRequiredRole) {
      return buildRedirectResponse(request, "/home", { forbidden: "true" });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|backend-api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
