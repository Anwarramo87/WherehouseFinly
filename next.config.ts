import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { resolveApiUrl } from "./lib/api-url";

const isProduction = process.env.NODE_ENV === "production";
const upstreamApiBase = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL);
const apiUrl = upstreamApiBase;
const apiOrigin = (() => {
  if (!apiUrl) return "";
  try {
    return new URL(apiUrl).origin;
  } catch {
    return "";
  }
})();

const apiWsOrigin = (() => {
  if (!apiOrigin) return "";
  try {
    const parsed = new URL(apiOrigin);
    parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
    return parsed.origin;
  } catch {
    return "";
  }
})();

const connectSources = ["'self'", apiOrigin, apiWsOrigin].filter(Boolean);
if (isProduction) {
  connectSources.push("https:", "wss:");
} else {
  connectSources.push("http:", "https:", "ws:", "wss:");
}

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  isProduction
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  `connect-src ${connectSources.join(" ")}`,
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
];

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspDirectives.join("; "),
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
];

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Performance optimizations
  compress: true,
  // تسريع compile time — يقلل الـ tree-shaking لمكتبات كبيرة في dev
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@tanstack/react-query",
      "@tanstack/react-table",
    ],
    // Optimize server actions and other features
    optimizeServerReact: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/telemetry/web-vitals",
        destination: "/api/telemetry/web-vitals",
      },
      {
        source: "/api/v1/:path*",
        destination: `${upstreamApiBase}/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${upstreamApiBase}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
          // Cache static assets
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
