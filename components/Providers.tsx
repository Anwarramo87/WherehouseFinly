"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useState, useEffect, useRef } from "react";
import { Toaster } from "react-hot-toast";
import { createQueryClient } from "@/lib/query-client-config";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const [persister] = useState(() =>
    typeof window !== "undefined"
      ? createSyncStoragePersister({ storage: window.localStorage })
      : undefined,
  );
  const didPersist = useRef(false);

  useEffect(() => {
    if (!persister || didPersist.current) return;
    didPersist.current = true;
    const [cleanup] = persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          // Only persist successful queries that have data
          return query.state.status === "success" && query.state.data !== undefined;
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
