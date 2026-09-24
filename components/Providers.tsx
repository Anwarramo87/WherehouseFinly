"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useState, useEffect, useRef } from "react";
import { Toaster } from "react-hot-toast";
import { createQueryClient, setActiveQueryClient } from "@/lib/query-client-config";
import { PERSISTED_QUERY_CACHE_KEY } from "@/lib/query-cache";
import RealtimeInvalidator from "@/components/RealtimeInvalidator";
import TenantThemeProvider from "@/components/TenantThemeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const [persister] = useState(() =>
    typeof window !== "undefined"
      ? createSyncStoragePersister({
          storage: window.localStorage,
          key: PERSISTED_QUERY_CACHE_KEY,
        })
      : undefined,
  );
  const didPersist = useRef(false);

  useEffect(() => {
    setActiveQueryClient(queryClient);
    return () => setActiveQueryClient(null);
  }, [queryClient]);

  useEffect(() => {
    if (!persister || didPersist.current) return;
    didPersist.current = true;
    const [cleanup] = persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 30, // 30 minutes — بيانات حضور وموظفين تتقادم بسرعة
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          if (query.state.status !== "success" || query.state.data === undefined) return false;
          const key = query.queryKey[0] as string;
          // لا نحفظ البيانات الحسّاسة للوقت — دائماً تحتاج fresh data:
          // - الحضور اليومي والبصمات
          // - خصومات الحضور (الأساس لحساب الراتب المستحق)
          // - المسير/الرواتب المحسوبة
          if (key === "attendance") return false;
          if (key === "attendance-deductions") return false;
          if (key === "payroll") return false;
          return true;
        },
      },
    });
    return cleanup;
  }, [queryClient, persister]);

  // On SSR or before persistence restores, render children immediately
  // This avoids a flash of empty content
  if (!persister) {
    return (
      <QueryClientProvider client={queryClient}>
        <TenantThemeProvider />
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: { fontFamily: "inherit", direction: "rtl" },
            duration: 3000,
          }}
        />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeInvalidator />
      <TenantThemeProvider />
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: { fontFamily: "inherit", direction: "rtl" },
          duration: 3000,
        }}
      />
    </QueryClientProvider>
  );
}
