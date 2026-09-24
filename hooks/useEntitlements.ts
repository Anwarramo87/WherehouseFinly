"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { EntitlementsResponse } from "@/lib/entitlements";
import { QUERY_STALE_TIME } from "@/lib/query-cache";
import { useAuthStore } from "@/stores/auth-store";

// Scoped by user id: without it, logging in as a different account reuses
// the previous user's menu until the cache expires — one admin seeing
// another admin's pages.
export const entitlementsQueryKey = (userId?: string | null) =>
  ["entitlements", "me", userId ?? "none"] as const;

/**
 * The modules and pages this factory holds.
 *
 * Cached for longer than most queries: entitlements change when a Super Admin
 * edits them, which is rare, and the backend caches its own read for 30s
 * anyway. A stale menu is cosmetic — the API refuses a disabled page whatever
 * the nav shows.
 */
export function useEntitlements() {
  const userId = useAuthStore((s) => s.user?.id ?? s.user?._id ?? null);
  const authReady =
    useAuthStore((s) => s.status === "authenticated" || Boolean(s.user));
  return useQuery<EntitlementsResponse>({
    queryKey: entitlementsQueryKey(userId),
    enabled: authReady,
    queryFn: async () => {
      const response = await apiClient.get("/entitlements/me");
      return response.data as EntitlementsResponse;
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    // A failure here must not blank the whole menu; isRouteEnabled treats a
    // missing response as "not yet known" and shows everything.
    retry: 1,
  });
}
