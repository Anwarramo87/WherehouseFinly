
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import WebVitalsLoader from "@/components/WebVitalsLoader";

// ─── derive backend origin for preconnect ─────────────────────────────────
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
let backendOrigin = "";
try {
  if (apiUrl) backendOrigin = new URL(apiUrl).origin;
} catch {
  // ignore malformed URL
}

export const metadata: Metadata = {
  title: "نظام إدارة المصنع",
  description: "نظام متكامل لإدارة الموظفين والرواتب والمخزون",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "نظام إدارة المصنع",
  },
  icons: {
    icon: '/icon-512.svg',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0070f3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* Theme color for address bar */}
        <meta name="theme-color" content="#0070f3" />
        {/* Preconnect to backend to reduce TTFB on first API call */}
        {backendOrigin && (
          <>
            <link rel="preconnect" href={backendOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={backendOrigin} />
          </>
        )}
      </head>
      <body className="bg-[#f8fafc] text-slate-800 antialiased">
        <Providers>
          <WebVitalsLoader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
