// ─── منع Next.js من كوشرة أي طلب GET بالكامل ───────────────────────────────
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { resolveApiUrl } from "@/lib/api-url";

const DEPLOYED_BACKEND_URL = "https://werehouse-production-4cba.up.railway.app/api/v1";
const REQUEST_TIMEOUT_MS = 15_000;

// Resolved once at module load — stable for the lifetime of the server process.
// NEXT_PUBLIC_API_URL is set in .env.local → http://localhost:5003/api/v1
const PRIMARY_BACKEND_URL = resolveApiUrl(
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL,
);

const HOP_BY_HOP = new Set([
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

  const fetchWithTimeout = async (targetUrl: string): Promise<Response> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
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

  // ── Simple strategy: always use PRIMARY_BACKEND_URL (set in .env.local).
  // No fallback switching — mixing backends causes 401s because each has its
  // own JWT secret and Redis refresh-token store.
  // If you want to use the deployed backend, change NEXT_PUBLIC_API_URL in .env.local.
  const targetUrl = PRIMARY_BACKEND_URL + apiPath + qs;

  try {
    const upstream = await fetchWithTimeout(targetUrl);
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders(upstream, request, apiPath),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[proxy] ${request.method} ${targetUrl} failed:`, msg);
    return NextResponse.json(
      { error: "Backend unreachable", message: msg, target: targetUrl },
      { status: 502, headers: corsHeaders(request) },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
