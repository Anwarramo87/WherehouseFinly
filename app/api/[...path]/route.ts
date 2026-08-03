// ─── منع Next.js من كوشرة أي طلب GET بالكامل ───────────────────────────────
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { resolveApiUrl } from "@/lib/api-url";

// Resolve at request time so env vars are always fresh
const getBackendUrl = () => resolveApiUrl(process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL);
const DEPLOYED_BACKEND_URL = "https://werehouse-production-4cba.up.railway.app/api/v1";
const LOCAL_BACKEND_TIMEOUT_MS = 6000; // 6s timeout for local backend TCP connect
const DEPLOYED_BACKEND_TIMEOUT_MS = 15000; // 15s for deployed backend
const HOP_BY_HOP_HEADERS = new Set([
  "accept-encoding",
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

// Track if local backend was recently reachable (avoid repeated timeouts)
let localBackendLastCheck = 0;
let localBackendReachable = true;
const LOCAL_CHECK_INTERVAL_MS = 30_000; // re-probe local every 30s if it was down

const ALLOWED_ORIGINS: Set<string> = new Set(
  (process.env.CORS_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.size === 0) return true; // dev: no restriction configured
  return ALLOWED_ORIGINS.has(origin);
};

const buildCorsHeaders = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  const allowedOrigin = isOriginAllowed(origin) ? origin! : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers":
      request.headers.get("access-control-request-headers") || "Content-Type, Authorization, Cookie",
    Vary: "Origin",
  };
};

const buildUpstreamHeaders = (request: NextRequest) => {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
    headers.set(key, value);
  });

  return headers;
};

// Low-volatility endpoints that can benefit from short-lived caching
const CACHEABLE_PATHS = new Set([
  "/departments",
  "/roles",
]);

const isCacheablePath = (apiPath: string): boolean => {
  // Check if the path starts with any cacheable prefix
  for (const path of CACHEABLE_PATHS) {
    if (apiPath === path || apiPath.startsWith(`${path}?`) || apiPath.startsWith(`${path}/`)) {
      return true;
    }
  }
  return false;
};

const buildResponseHeaders = (response: Response, request: NextRequest, apiPath: string) => {
  const headers = new Headers();

  response.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
    headers.append(key, value);
  });

  const corsHeaders = buildCorsHeaders(request);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // ─── Selective caching for low-volatility endpoints ───────────────────────
  if (isCacheablePath(apiPath)) {
    // Short-lived cache: private (browser only), stale-while-revalidate for better UX
    headers.set("Cache-Control", "private, max-age=0, s-maxage=60, stale-while-revalidate=120");
  } else {
    // Default: no caching for volatile data (attendance, payroll, inventory, etc.)
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    headers.set("Pragma", "no-cache");
  }
  // ─────────────────────────────────────────────────────────────────────────

  return headers;
};

// reportDebug is referenced in older versions of this proxy file.
// If it isn't available in the current codebase, keep compilation working.
const reportDebug: undefined | ((...args: unknown[]) => void) = undefined;

// Remove undefined/null/empty query params so the backend never receives the
// literal string "undefined" (which would trigger a 400 validation error).
function cleanSearchParams(searchParams: URLSearchParams): string {
  const cleaned = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed.toLowerCase() === "undefined" || trimmed.toLowerCase() === "null") {
      continue;
    }
    cleaned.append(key, value);
  }
  const qs = cleaned.toString();
  return qs ? `?${qs}` : "";
}

async function handler(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;
  const pathParts = path.split("/").filter(Boolean);
  // Strip /api prefix, and also /v1 since backend URL already includes /api/v1
  const rest = pathParts.slice(1);
  const apiPath = "/" + (rest[0] === "v1" ? rest.slice(1) : rest).join("/");
  const cleanedSearch = cleanSearchParams(url.searchParams);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: buildCorsHeaders(request),
    });
  }

  try {
    const primaryUrl = getBackendUrl();
    const isGetOrHead = request.method === "GET" || request.method === "HEAD";
    const body = isGetOrHead ? undefined : await request.text();
    let response: Response;
    const headers = buildUpstreamHeaders(request);

    const now = Date.now();
    // Skip local entirely if: primary IS deployed, or local was recently unreachable
    const useDeployed =
      primaryUrl === DEPLOYED_BACKEND_URL || !localBackendReachable;

    const fetchWithTimeout = async (
      url: string,
      timeoutMs: number,
    ): Promise<Response> => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, {
          method: request.method,
          headers,
          body,
          redirect: "manual",
          cache: "no-store",
          signal: controller.signal,
        });
      } finally {
        clearTimeout(id);
      }
    };

    if (useDeployed) {
      // Skip local entirely — known unreachable or already pointing to deployed
      response = await fetchWithTimeout(
        DEPLOYED_BACKEND_URL + apiPath + cleanedSearch,
        DEPLOYED_BACKEND_TIMEOUT_MS,
      );
      // Re-probe local backend periodically (only if primary is local, not deployed)
      if (primaryUrl !== DEPLOYED_BACKEND_URL && now - localBackendLastCheck > LOCAL_CHECK_INTERVAL_MS) {
        localBackendLastCheck = now;
        fetchWithTimeout(primaryUrl, LOCAL_BACKEND_TIMEOUT_MS)
          .then(() => {
            localBackendReachable = true;
          })
          .catch(() => {
            localBackendReachable = false;
          });
      }
    } else {
      // Try local first with short timeout
      try {
        response = await fetchWithTimeout(
          primaryUrl + apiPath + cleanedSearch,
          LOCAL_BACKEND_TIMEOUT_MS,
        );
        localBackendReachable = true;
        localBackendLastCheck = now;
      } catch {
        // Local failed — try deployed fallback
        localBackendReachable = false;
        localBackendLastCheck = now;
        response = await fetchWithTimeout(
          DEPLOYED_BACKEND_URL + apiPath + cleanedSearch,
          DEPLOYED_BACKEND_TIMEOUT_MS,
        );
      }
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers: buildResponseHeaders(response, request, apiPath),
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : '';
    console.error("[proxy] fetch failed:", errMsg, "\nStack:", errStack);
    // #region debug-point C:proxy-network-error
    reportDebug?.("C", "Next API proxy failed before upstream response", {
      method: request.method,
      path,
      error: errMsg,
    });
    // #endregion
    return NextResponse.json(
      { error: "Backend unreachable", message: errMsg },
      {
        status: 502,
        headers: buildCorsHeaders(request),
      },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;


