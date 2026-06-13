
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import WebVitalsLoader from "@/components/WebVitalsLoader";

export const metadata: Metadata = {
  title: "نظام إدارة المصنع",
  description: "نظام متكامل لإدارة الموظفين والرواتب والمخزون",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-[#f8fafc] text-slate-800 antialiased">
        <Providers>
          <WebVitalsLoader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
