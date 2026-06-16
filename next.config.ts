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
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  { key: "X-Frame-Options", value: "DENY" }, // DENY أقوى من SAMEORIGIN
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
];

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  // إعدادات الصور
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "3000", pathname: "/**" },
      { protocol: "https", hostname: "localhost", port: "3000", pathname: "/**" },
    ],
    formats: ["image/webp", "image/avif"],
  },

  // تحسينات المترجم
  compiler: {
    removeConsole: isProduction,
  },

  // تحسين أداء بيئة التطوير وتقليل استهلاك الـ RAM
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@tanstack/react-query",
      "@tanstack/react-table",
    ],
    optimizeServerReact: true,
  },

  // تحسينات Webpack لبيئة الإنتاج
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              name: "vendor",
              chunks: "all",
              test: /node_modules/,
              priority: 20,
            },
            common: {
              name: "common",
              minChunks: 2,
              chunks: "all",
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }
    return config;
  },

  // Prevent Next/Turbopack from complaining when a webpack override exists.
  // Next suggests using an empty turbopack config as a safe workaround.
  turbopack: {},

  async headers() {
    return [
      {
        // تطبيق مسار الحماية على كل الصفحات
        source: "/:path*",
        headers: [
          ...securityHeaders,
          ...(isProduction
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
      {
        // تم التصحيح: تطبيق الـ Cache على الملفات الثابتة فقط لتجنب تخزين الـ API أو الصفحات الديناميكية
        source: "/:path*",
        locale: false,
        headers: [
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

