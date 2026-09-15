import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getRequiredPermissionsForPath,
  hasAnyRequiredPermission,
} from "@/lib/route-access";
import { DEFAULT_API_URL, normalizeApiUrl } from "@/lib/api-url";

const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL, DEFAULT_API_URL);
const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";

// ─── CSP ──────────────────────────────────────────────────────────────
/**
 * The origins the browser may actually talk to.
 *
 * This used to read NEXT_PUBLIC_API_URL directly. That variable is not set in
 * production — `lib/api-url.ts` hard-codes the deployed backend as the
 * fallback — so `apiOrigin` came out empty and the only thing keeping the API
 * and the realtime socket reachable was a blanket `https: wss:`, which allows
 * every host on the internet and makes connect-src decorative. Resolving the
 * backend the same way the app does lets the directive name it and drop the
 * wildcards.
 */
function connectSources(): string[] {
  const sources = new Set<string>(["'self'"]);

  try {
    const origin = new URL(API_URL).origin;
    sources.add(origin);
    sources.add(origin.replace(/^http/, "ws"));
  } catch {
    // A relative API base is same-origin, which 'self' already covers.
  }

  if (IS_DEVELOPMENT) {
    // The dev server, Turbopack HMR and a locally run backend move between
    // ports too often to enumerate.
    sources.add("http:");
    sources.add("https:");
    sources.add("ws:");
    sources.add("wss:");
  }

  return [...sources];
}

/**
 * No nonce, deliberately.
 *
 * A nonce is the only thing that would make script-src meaningful here, and it
 * cannot work: every page in this app is statically prerendered at build time
 * (`next build` marks them ○), so there is no per-request render in which Next
 * could stamp a fresh nonce onto the 17 scripts it emits. Sending one anyway is
 * actively harmful — a browser that sees a nonce ignores 'unsafe-inline'
 * entirely, so every one of those scripts is blocked and the page is blank.
 *
 * Verified against a production build: `next start` + a request for /login
 * returns 17 script tags and not one of them carries a nonce.
 *
 * Script-source hardening therefore has to come from rendering pages
 * dynamically first; until then this policy still constrains where scripts may
 * come from, where the page may connect to, and what may frame it.
 */
function buildCspHeader(): string {
  const scriptSrc = IS_DEVELOPMENT
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    scriptSrc,
    // Tailwind and the inline styles React emits need this; there is no
    // equivalent of strict-dynamic for stylesheets.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    `connect-src ${connectSources().join(" ")}`,
    ...(IS_DEVELOPMENT ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/** Sentinel used by the route map for screens only the overseer may open. */
const SUPERADMIN_ONLY = "__superadmin_only__";

/** Roles the route permission map does not apply to. */
const UNRESTRICTED_ROLES = new Set(["admin", "superadmin"]);

/**
 * A status that says something about the backend, not about this session.
 * Treated as "unknown", never as "signed out".
 */
const isTransientUpstreamFailure = (status: number) =>
  status === 429 || status === 502 || status === 503 || status === 504;

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

function makeNextResponse(request: NextRequest, requestHeaders: Headers) {
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", buildCspHeader());
  return response;
}

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  const pathname = normalizePathname(request.nextUrl.pathname);

  // Skip auth checks for login page, API routes, and static assets
  if (pathname === "/login" || pathname.startsWith("/api/")) {
    return makeNextResponse(request, requestHeaders);
  }

  const isRootRoute = pathname === "/";
  const hasHints = hasSessionHints(request);

  // Skip prefetch requests
  if (isPrefetchRequest(request)) {
    return makeNextResponse(request, requestHeaders);
  }

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

    // A rate-limited or unreachable backend is not a verdict on this session,
    // and turning one into a redirect logs people out whenever the API is
    // briefly slow — which is exactly why the whole check used to be skipped.
    // Serve the page instead: the API is the real enforcement point, the data
    // calls will fail their own way, and the client interceptor handles a
    // genuine 401 from there.
    if (hasHints && isTransientUpstreamFailure(status)) {
      return makeNextResponse(request, requestHeaders);
    }

    return buildRedirectResponse(request, "/login", {
      unauthorized: "true",
      status: String(status),
    });
  }

  const requiredPermissions = getRequiredPermissionsForPath(pathname);

  if (requiredPermissions && requiredPermissions.length > 0) {
    // The overseer's own screens are not reachable by holding a permission —
    // a factory admin counts as "unrestricted" for ordinary pages, so gating
    // these on a permission alone would let one in.
    if (requiredPermissions.includes(SUPERADMIN_ONLY)) {
      if (!session.roles.includes("superadmin")) {
        return buildRedirectResponse(request, "/home", { forbidden: "true" });
      }
      return makeNextResponse(request, requestHeaders);
    }

    const isUnrestricted = session.roles.some((role) => UNRESTRICTED_ROLES.has(role));
    if (!isUnrestricted) {
      const hasRequiredPermission = hasAnyRequiredPermission(
        session.permissions,
        requiredPermissions,
      );
      if (!hasRequiredPermission) {
        return buildRedirectResponse(request, "/home", { forbidden: "true" });
      }
    }
  }

  return makeNextResponse(request, requestHeaders);
}

export const config = {
  matcher: ["/((?!api|backend-api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
