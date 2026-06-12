"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, useEffect } from "react";
import { createQueryClient } from "@/lib/query-client-config";
import dynamic from "next/dynamic";

// Dynamic import to prevent hydration mismatch
const Toaster = dynamic(() => import("react-hot-toast").then((mod) => mod.Toaster), {
  ssr: false,
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && isMounted && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
      {isMounted && (
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
      )}
    </QueryClientProvider>
  );
}
