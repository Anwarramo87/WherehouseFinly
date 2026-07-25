"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import SessionRefresh from "@/components/SessionRefresh";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import axios from "axios";

const Sidebar = dynamic(() => import("@/components/Sidebar"), {
  loading: () => <aside className="hidden w-72 shrink-0 lg:block" aria-hidden="true" />,
  ssr: false,
});

const NotificationBell = dynamic(() => import("@/components/NotificationBell"), {
  ssr: false,
});

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const setStatus = useAuthStore((state) => state.setStatus);
  const clear = useAuthStore((state) => state.clear);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const authChecked = useRef(false);

  useEffect(() => {
    if (authChecked.current) return;
    if (user?.permissions) {
      setStatus("authenticated");
      authChecked.current = true;
      return;
    }
    authChecked.current = true;
    apiClient.get('/auth/me').then((res) => {
      const data = res.data as Record<string, unknown>;
      if (data && data.permissions) {
        setUser({
          ...(user ?? {}),
          ...(data as { id?: string; username?: string; role?: string; permissions?: string[]; roles?: string[] }),
        });
        setStatus("authenticated");
      }
    }).catch((err: unknown) => {
      if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
        clear();
        router.replace('/login');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCollapse = useCallback(() => setIsCollapsed((v: boolean) => !v), []);

  const openMobile = useCallback(() => setIsMobileOpen(true), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  return (
    <div className="flex min-h-screen h-screen overflow-clip print:block print:h-auto print:min-h-0 print:overflow-visible" dir="rtl">
      <SessionRefresh />
      {/* ── Desktop Sidebar ── */}
      <div
        className={`hidden lg:block shrink-0 h-screen transition-all duration-300 print:hidden ${
          isCollapsed ? "w-20" : "w-72"
        }`}
      >
        <Suspense fallback={<aside className="hidden w-72 shrink-0 lg:block" aria-hidden="true" />}>
          <Sidebar
            isCollapsed={isCollapsed}
            toggleCollapse={toggleCollapse}
          />
        </Suspense>
      </div>

      {/* ── Mobile overlay ── */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Sidebar ── */}
      <div
        className={`lg:hidden fixed top-0 right-0 h-full w-72 z-50 transition-transform duration-300 ${
          isMobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <Suspense fallback={null}>
          <Sidebar onClose={closeMobile} />
        </Suspense>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 overflow-y-auto relative print:overflow-visible print:h-auto print:block" suppressHydrationWarning>
        {/* Floating notifications bell (top-left in RTL) */}
        <div className="fixed top-3 left-3 z-40 flex items-center gap-2 print:hidden">
          <Suspense fallback={null}>
            <NotificationBell />
          </Suspense>
          {/* Mobile menu button */}
          <button
            onClick={openMobile}
            className="lg:hidden p-2.5 bg-[#263544] text-[#C89355] rounded-xl border border-[#C89355]/30 shadow-lg"
            aria-label="فتح القائمة"
          >
            <Menu size={22} />
          </button>
        </div>

        {children}
      </main>
    </div>
  );
}
