"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { EntitlementsResponse } from "@/lib/entitlements";
import { QUERY_STALE_TIME } from "@/lib/query-cache";

export const entitlementsQueryKey = ["entitlements", "me"] as const;

/**
 * The modules and pages this factory holds.
 *
 * Cached for longer than most queries: entitlements change when a Super Admin
 * edits them, which is rare, and the backend caches its own read for 30s
 * anyway. A stale menu is cosmetic — the API refuses a disabled page whatever
 * the nav shows.
 */
export function useEntitlements() {
  return useQuery<EntitlementsResponse>({
    queryKey: entitlementsQueryKey,
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
