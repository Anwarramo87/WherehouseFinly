"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { createQueryClient } from "@/lib/query-client-config";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
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
