
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* Preconnect to backend to reduce TTFB on first API call */}
        {backendOrigin && (
          <link rel="preconnect" href={backendOrigin} crossOrigin="anonymous" />
        )}
        {/* Load print styles without blocking initial render */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/print.css" media="print" />
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
