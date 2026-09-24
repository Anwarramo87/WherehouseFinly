"use client";
/**
 * WMS Layout — Setup Guard
 *
 * Every page under /wms/* passes through here.
 * If the WMS setup has NOT been completed, we redirect to /wms/setup.
 * The /wms/setup page itself is excluded from the redirect to avoid loops.
 *
 * Uses a lightweight endpoint: if it fails (network error, 401), we allow
 * through to avoid breaking WMS for users on a slow connection.
 */
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWmsSetupCompleted } from "@/hooks/useRepresentatives";

export default function WmsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isSetupPage = pathname === "/wms/setup";

  const { data, isLoading, isError } = useWmsSetupCompleted();

  useEffect(() => {
    // Don't redirect on the setup page itself or while loading
    if (isSetupPage || isLoading || isError) return;
    // If setup is explicitly NOT completed, redirect
    if (data && data.isCompleted === false) {
      router.replace("/wms/setup");
    }
  }, [data, isLoading, isError, isSetupPage, router]);

  // While loading, render children immediately (avoids flicker)
  // The redirect happens asynchronously if needed
  return <>{children}</>;
}
