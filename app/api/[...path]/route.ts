import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
const reportDebug = (hypothesisId: string, msg: string, data?: Record<string, unknown>) => {
  void fetch("http://127.0.0.1:7777/event", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId: "login-500-error",
      runId: "pre-fix",
      hypothesisId,
      location: "app/api/[...path]/route.ts",
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
};

export async function handler(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;
  
  // Remove /api prefix from the path
  const pathParts = path.split("/").filter(Boolean);

  // path مثال: /api/auth/login
  // نريد apiPath = /auth/login
  // وليس /api/auth/login أو /api/v1/... مضاعفة
  const apiPath = "/" + pathParts.slice(1).join("/"); // Remove first segment 'api'

  // BACKEND_URL في المشروع غالبًا يحتوي /api/v1
  // لذلك لا نُضيف أي /api أو /api/v1 إضافي من apiPath
  // ملاحظة: لا نطبق replace على مسار /auth/* لأن BACKEND_URL عادة يحتوي /api/v1
  // والـ apiPath الناتج هو /auth/login فقط.
  const fullUrl = `${BACKEND_URL}${apiPath}${url.search}`;



  // #region debug-point A:proxy-entry
  reportDebug("A", "Next API proxy forwarding request", {
    method: request.method,
    path,
    apiPath,
    fullUrl,
  });
  // #endregion

  try {
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    
    const cookie = request.headers.get("cookie");
    if (cookie) {
      headers.set("Cookie", cookie);
    }

    const auth = request.headers.get("authorization");
    if (auth) {
      headers.set("Authorization", auth);
    }

    let body = null;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.text();
    }

    const response = await fetch(fullUrl, {
      method: request.method,
      headers,
      body,
      credentials: "include",
    });

    const data = await response.text();

    // #region debug-point B:proxy-response
    reportDebug("B", "Next API proxy received upstream response", {
      method: request.method,
      path,
      fullUrl,
      upstreamStatus: response.status,
      responsePreview: data.slice(0, 300),
    });
    // #endregion

    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
      },
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
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
