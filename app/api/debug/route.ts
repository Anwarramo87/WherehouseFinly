import { NextResponse } from "next/server";
import { resolveApiUrl } from "@/lib/api-url";

export const dynamic = "force-dynamic";

/**
 * Which backend this build talks to — a development aid.
 *
 * It answers 404 in production. It is unauthenticated (the middleware skips
 * everything under /api/), so in production it was an anonymous window onto the
 * deployment's configuration for anyone who guessed the path.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json({
    message: "Debug info",
    env: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      API_URL: process.env.API_URL,
      NODE_ENV: process.env.NODE_ENV,
      resolvedUrl: resolveApiUrl(process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL),
    },
    timestamp: new Date().toISOString(),
  });
}
