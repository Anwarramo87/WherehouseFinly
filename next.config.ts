import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const isProduction = process.env.NODE_ENV === "production";

// CSP is handled by proxy.ts with per-request nonces — see proxy.ts

const securityHeaders = [
  // CSP is now handled by proxy.ts with per-request nonces
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
    minimumCacheTTL: 31536000,
  },

  // تحسينات المترجم
  compiler: {
    removeConsole: isProduction ? { exclude: ["error", "warn"] } : false,
  },

  // silence workspace-root detection warning caused by multiple lockfiles
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  outputFileTracingRoot: require("path").join(__dirname),

  // Modern JavaScript target - removes legacy polyfills
  transpilePackages: [],
  
  // تحسين أداء بيئة التطوير وتقليل استهلاك الـ RAM
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@tanstack/react-query",
      "@tanstack/react-table",
      "@tanstack/react-virtual",
      "react-hot-toast",
      "sonner",
      "xlsx",
    ],
    optimizeServerReact: true,
    // Reduce dev overlay overhead
    webVitalsAttribution: ["CLS", "LCP"],
    // Enable CSS optimization
    optimizeCss: isProduction,
  },

  // تحسينات Webpack لبيئة الإنتاج
  // Note: Turbopack (default in dev) doesn't use this webpack config
  // This only applies to production builds with webpack
  // In Next.js 16+, Turbopack is enabled by default - use turbopack: {} to silence warnings
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

  // Turbopack config to silence warnings in Next.js 16+
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
      // Static asset caching — production only to avoid breaking Next.js dev HMR
      ...(isProduction
        ? [
            {
              source: "/_next/static/:path*",
              locale: false as const,
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
            {
              source: "/((?!_next/static).*)",
              locale: false as const,
              headers: [
                {
                  key: "Cache-Control",
                  value: "no-store, no-cache, must-revalidate, proxy-revalidate",
                },
              ],
            },
          ]
        : []),
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
