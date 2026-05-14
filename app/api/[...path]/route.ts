import { NextRequest, NextResponse } from "next/server";
import { resolveApiUrl } from "@/lib/api-url";

// Get the backend API URL from environment
const BACKEND_API_URL = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL);

/**
 * Proxy all API requests to the backend
 * Handles both local (http://localhost:5001/api) and remote (Railway) backends
 */
export async function handler(request: NextRequest) {
  try {
    // Extract the path segments after /api
    const { pathname, search } = request.nextUrl;
    const pathSegments = pathname.split("/").filter(Boolean);
    
    // Remove 'api' from the start and rejoin
    const apiPath = "/" + pathSegments.slice(1).join("/");
    
    // Construct the full backend URL
    const backendUrl = new URL(BACKEND_API_URL);
    backendUrl.pathname = apiPath;
    backendUrl.search = search;

    // Prepare headers
    const headers = new Headers(request.headers);
    
    // Remove hop-by-hop headers
    headers.delete("host");
    headers.delete("connection");
    headers.delete("keep-alive");
    headers.delete("transfer-encoding");
    headers.delete("upgrade");

    // Forward cookies
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }

    // Prepare request body for non-GET requests
    let body: BodyInit | null = null;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.arrayBuffer();
    }

    // Make the request to the backend
    const backendResponse = await fetch(backendUrl.toString(), {
      method: request.method,
      headers,
      body,
      credentials: "include",
    });

    // Prepare response headers
    const responseHeaders = new Headers(backendResponse.headers);
    
    // Handle CORS
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Return the response
    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("API proxy error:", error);
    return NextResponse.json(
      { 
        error: "Failed to proxy request to backend",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 502 }
    );
  }
}

// Handle all HTTP methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
