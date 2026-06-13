import { NextRequest, NextResponse } from "next/server";
import { resolveApiUrl } from "@/lib/api-url";

const BACKEND_URL = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL);
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

const buildCorsHeaders = (request: NextRequest) => {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
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

const buildResponseHeaders = (response: Response, request: NextRequest) => {
  const headers = new Headers();

  response.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
    headers.append(key, value);
  });

  const corsHeaders = buildCorsHeaders(request);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return headers;
};

export async function handler(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;
  const pathParts = path.split("/").filter(Boolean);
  const apiPath = "/" + pathParts.slice(1).join("/");
  const fullUrl = `${BACKEND_URL}${apiPath}${url.search}`;

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: buildCorsHeaders(request),
    });
  }

  try {
    const response = await fetch(fullUrl, {
      method: request.method,
      headers: buildUpstreamHeaders(request),
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      redirect: "manual",
      cache: "no-store",
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: buildResponseHeaders(response, request),
    });
  } catch (error) {
    // #region debug-point C:proxy-network-error
    reportDebug("C", "Next API proxy failed before upstream response", {
      method: request.method,
      path,
      fullUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    // #endregion
    return NextResponse.json(
      { error: "Backend unreachable", message: error instanceof Error ? error.message : String(error) },
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

