// ─── منع Next.js من كوشرة أي طلب GET بالكامل ───────────────────────────────
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { resolveApiUrl, DEPLOYED_API_URL, LOCAL_API_URL } from "@/lib/api-url";

// 30s: Neon cold-starts and dead-socket retries inside the pg pool can make a
// first request take 15-20s+ (observed: /representatives/me/profile at 21s).
// A 15s timeout aborted such requests at the proxy with a 502 even though the
// backend answered successfully moments later. 30s matches the backend pool's
// own connectionTimeoutMillis.
const REQUEST_TIMEOUT_MS = Number(process.env.BACKEND_PROXY_TIMEOUT_MS) || 30_000;
// How long to wait for the deployed backend before giving up and trying local.
// Keep this short so the fallback feels instant to the user.
const DEPLOYED_TIMEOUT_MS = Number(process.env.DEPLOYED_BACKEND_TIMEOUT_MS) || 5_000;
// Long-running computation endpoints: a payroll run aggregates attendance for
// every employee-day and can legitimately take minutes. The proxy must wait
// for them instead of aborting with a 502 mid-calculation.
const LONG_RUNNING_PREFIXES = [
  '/payroll',
  '/transportation/calculate-deductions',
  '/imports',
  '/purchasing/invoices',
];
const LONG_RUNNING_TIMEOUT_MS = 180_000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Primary = deployed Railway backend. Fallback = local dev server.
// If NEXT_PUBLIC_API_URL is explicitly set in .env.local it overrides the deployed URL.
const PRIMARY_BACKEND_URL = resolveApiUrl(
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? DEPLOYED_API_URL,
);
const FALLBACK_BACKEND_URL = LOCAL_API_URL;

const HOP_BY_HOP = new Set([
  "accept-encoding",
  "connection",
  "content-encoding",
  "content-length",
  // Undici (Node fetch) throws `NotSupportedError: expect header not
  // supported` when the browser/.NET client sends `Expect: 100-continue` on
  // POSTs with a body. A proxy must consume it, never forward it — every such
  // request otherwise dies here as a 502 before reaching the backend.
  "expect",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const ALLOWED_ORIGINS: Set<string> = new Set(
  (process.env.CORS_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

const isOriginAllowed = (origin: string | null) => {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.size === 0) return true;
  return ALLOWED_ORIGINS.has(origin);
};

const corsHeaders = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": isOriginAllowed(origin) ? origin! : "",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers":
      request.headers.get("access-control-request-headers") ||
      "Content-Type, Authorization, Cookie",
    Vary: "Origin",
  };
};

const upstreamHeaders = (request: NextRequest) => {
  const h = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) h.set(key, value);
  });
  return h;
};

const CACHEABLE = new Set(["/departments", "/roles"]);
const isCacheable = (p: string) =>
  [...CACHEABLE].some((c) => p === c || p.startsWith(`${c}/`) || p.startsWith(`${c}?`));

const responseHeaders = (upstream: Response, request: NextRequest, apiPath: string) => {
  const h = new Headers();

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === "set-cookie") return;
    h.append(key, value);
  });

  // Forward every Set-Cookie individually — forEach() collapses duplicates
  const cookies = upstream.headers.getSetCookie?.() ?? [];
  for (const c of cookies) h.append("set-cookie", c);

  Object.entries(corsHeaders(request)).forEach(([k, v]) => h.set(k, v));

  if (isCacheable(apiPath)) {
    h.set("Cache-Control", "private, max-age=0, s-maxage=60, stale-while-revalidate=120");
  } else {
    h.set("Cache-Control", "no-store, no-cache, must-revalidate");
    h.set("Pragma", "no-cache");
  }

  return h;
};

function cleanSearchParams(sp: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const [k, v] of sp.entries()) {
    const t = v.trim().toLowerCase();
    if (t === "" || t === "undefined" || t === "null") continue;
    out.append(k, v);
  }
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}

async function handler(request: NextRequest) {
  const url = request.nextUrl;
  const parts = url.pathname.split("/").filter(Boolean).slice(1); // strip leading /api
  const apiPath = "/" + (parts[0] === "v1" ? parts.slice(1) : parts).join("/");
  const qs = cleanSearchParams(url.searchParams);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
  }

  const isGetOrHead = request.method === "GET" || request.method === "HEAD";
  const body = isGetOrHead ? undefined : await request.text();
  const headers = upstreamHeaders(request);

  const isLongRunning = LONG_RUNNING_PREFIXES.some(
    (prefix) => apiPath === prefix || apiPath.startsWith(`${prefix}/`),
  );
  const timeoutMs = isLongRunning ? LONG_RUNNING_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
  const fetchWithTimeout = async (targetUrl: string, overrideMs?: number): Promise<Response> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), overrideMs ?? timeoutMs);
    try {
      return await fetch(targetUrl, {
        method: request.method,
        headers,
        body,
        redirect: "manual",
        cache: "no-store",
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  const isUnversionedHealth = apiPath === "/health" || apiPath.startsWith("/health/");

  const buildTargetUrl = (base: string) => {
    let backendOrigin = "";
    try { backendOrigin = new URL(base).origin; } catch { /* ignore */ }
    return (isUnversionedHealth && backendOrigin
      ? backendOrigin + "/v1" + apiPath
      : base + apiPath) + qs;
  };

  const primaryUrl = buildTargetUrl(PRIMARY_BACKEND_URL);
  // Use a short timeout for the deployed backend so fallback to local is fast.
  // Long-running endpoints skip this — they need the full timeout even on Railway.
  const primaryTimeoutMs = isLongRunning ? LONG_RUNNING_TIMEOUT_MS : DEPLOYED_TIMEOUT_MS;

  try {
    const upstream = await fetchWithTimeout(primaryUrl, primaryTimeoutMs);
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders(upstream, request, apiPath),
    });
  } catch (primaryErr) {
    const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    console.warn(`[proxy] primary ${request.method} ${primaryUrl} failed (${primaryMsg}), trying fallback...`);

    // Only fall back to local if primary is the deployed backend (not already local)
    if (PRIMARY_BACKEND_URL === FALLBACK_BACKEND_URL) {
      console.error(`[proxy] ${request.method} ${primaryUrl} failed:`, primaryMsg);
      return NextResponse.json(
        { error: "Backend unreachable", ...(IS_PRODUCTION ? {} : { message: primaryMsg, target: primaryUrl }) },
        { status: 502, headers: corsHeaders(request) },
      );
    }

    const fallbackUrl = buildTargetUrl(FALLBACK_BACKEND_URL);
    try {
      const fallback = await fetchWithTimeout(fallbackUrl);
      console.info(`[proxy] fallback succeeded: ${fallbackUrl}`);
      return new NextResponse(fallback.body, {
        status: fallback.status,
        headers: responseHeaders(fallback, request, apiPath),
      });
    } catch (fallbackErr) {
      const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      console.error(`[proxy] both backends failed. fallback ${fallbackUrl}:`, msg);
      return NextResponse.json(
        { error: "Backend unreachable", ...(IS_PRODUCTION ? {} : { message: msg, target: fallbackUrl }) },
        { status: 502, headers: corsHeaders(request) },
      );
    }
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
