"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { createQueryClient } from "@/lib/query-client-config";

export default function Providers({ children }: { children: React.ReactNode }) {
  // نقوم بإنشاء العميل مرة واحدة فقط لتجنب إعادة التحميل غير الضرورية
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query DevTools - فقط في development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
      {/* هنا نزرع مكتبة الإشعارات لتعمل في كل صفحات الموقع */}
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            fontFamily: 'inherit',
            direction: 'rtl',
          },
          duration: 3000,
        }} 
      />
    </QueryClientProvider>
  );
}
