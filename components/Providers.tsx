"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";

export default function Providers({ children }: { children: React.ReactNode }) {
  // نقوم بإنشاء العميل مرة واحدة فقط لتجنب إعادة التحميل غير الضرورية
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME.STANDARD,
        gcTime: QUERY_GC_TIME.STANDARD,
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
        refetchOnMount: true,
        retry: 1,
        networkMode: 'offlineFirst',
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* هنا نزرع مكتبة الإشعارات لتعمل في كل صفحات الموقع */}
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            fontFamily: 'inherit',
            direction: 'rtl',
          }
        }} 
      />
    </QueryClientProvider>
  );
}
