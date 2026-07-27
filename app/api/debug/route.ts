import { NextResponse } from "next/server";
import { resolveApiUrl } from "@/lib/api-url";

export const dynamic = "force-dynamic";

export async function GET() {
  const envVars = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    API_URL: process.env.API_URL,
    NODE_ENV: process.env.NODE_ENV,
    resolvedUrl: resolveApiUrl(process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL),
  };

  return NextResponse.json({
    message: "Debug info",
    env: envVars,
    timestamp: new Date().toISOString(),
  });
}
