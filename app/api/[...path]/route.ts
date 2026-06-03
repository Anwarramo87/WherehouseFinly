import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

export async function handler(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;
  
  // Remove /api prefix from the path
  const pathParts = path.split("/").filter(Boolean);
  let apiPath = "/" + pathParts.slice(1).join("/"); // Remove 'api'
  
  // Construct the full backend URL
  // BACKEND_URL already contains /api/v1
  const fullUrl = `${BACKEND_URL}${apiPath}${url.search}`;
  
  console.log("[API Proxy]", request.method, path, "->", fullUrl);

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

    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
      },
    });
  } catch (error) {
    console.error("[API Proxy] Error:", error);
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