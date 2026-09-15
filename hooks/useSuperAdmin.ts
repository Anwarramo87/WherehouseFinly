"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import type { EntitlementModule } from "@/lib/entitlements";
import { entitlementsQueryKey } from "@/hooks/useEntitlements";

export interface FactorySummary {
  id: string;
  name: string;
  code: string;
  status: string;
  createdAt: string;
  users: number;
  employees: number;
  enabledPageCount: number;
  totalPageCount: number;
  modules: Array<{ key: string; label: string; state: "all" | "none" | "partial" }>;
  entitlementsUpdatedAt: string | null;
  entitlementsUpdatedBy: string | null;
}

export interface FactoryEntitlements {
  tenantId: string;
  enabledPages: string[];
  modules: EntitlementModule[];
}

export const superAdminKeys = {
  factories: ["super-admin", "factories"] as const,
  entitlements: (tenantId: string) => ["super-admin", "entitlements", tenantId] as const,
};

/** Every factory. Super-admin only — the API refuses anyone else. */
export function useFactories() {
  return useQuery<FactorySummary[]>({
    queryKey: superAdminKeys.factories,
    queryFn: async () => (await apiClient.get("/admin/tenants")).data as FactorySummary[],
  });
}

export function useFactoryEntitlements(tenantId: string | null) {
  return useQuery<FactoryEntitlements>({
    queryKey: superAdminKeys.entitlements(tenantId ?? "none"),
    enabled: Boolean(tenantId),
    queryFn: async () =>
      (await apiClient.get(`/admin/tenants/${tenantId}/entitlements`))
        .data as FactoryEntitlements,
  });
}

/**
 * Toggles a module or a single page for one factory.
 *
 * Both the factory list and that factory's detail are invalidated, and so is
 * the caller's own entitlement cache — a Super Admin editing their way into or
 * out of a module should see their own nav follow, not wait for a stale cache.
 */
export function useToggleEntitlement(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      scope: "module" | "page";
      key: string;
      enabled: boolean;
    }) => {
      const response = await apiClient.put(
        `/admin/tenants/${tenantId}/entitlements/${input.scope}`,
        { key: input.key, enabled: input.enabled },
      );
      return response.data as FactoryEntitlements;
    },
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: superAdminKeys.factories });
      if (tenantId) {
        void queryClient.invalidateQueries({
          queryKey: superAdminKeys.entitlements(tenantId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: entitlementsQueryKey });
      toast.success(input.enabled ? "تم التفعيل" : "تم الإيقاف");
    },
    onError: () => {
      toast.error("تعذّر حفظ التغيير");
    },
  });
}
