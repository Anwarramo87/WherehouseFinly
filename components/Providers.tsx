"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  // نقوم بإنشاء العميل مرة واحدة فقط لتجنب إعادة التحميل غير الضرورية
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
        refetchOnMount: false,
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
