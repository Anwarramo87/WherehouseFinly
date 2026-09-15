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
 * Uses PUT /entitlements (setPages) rather than the module/page toggle
 * endpoints — computes the new page list on the frontend and sends it whole.
 * This avoids the boolean-coercion 400 that the toggle endpoints produce when
 * the backend ValidationPipe has enableImplicitConversion enabled.
 */
export function useToggleEntitlement(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      scope: "module" | "page";
      key: string;
      enabled: boolean;
    }) => {
      // Read the current entitlements from cache to compute the new page list.
      const current = queryClient.getQueryData<FactoryEntitlements>(
        superAdminKeys.entitlements(tenantId ?? "none"),
      );

      let pageKeys: string[];

      if (current) {
        const currentSet = new Set(current.enabledPages);

        if (input.scope === "module") {
          const module = current.modules.find((m) => m.key === input.key);
          if (module) {
            for (const page of module.pages) {
              if (input.enabled) currentSet.add(page.key);
              else currentSet.delete(page.key);
            }
          }
        } else {
          if (input.enabled) currentSet.add(input.key);
          else currentSet.delete(input.key);
        }

        pageKeys = [...currentSet];
      } else {
        // No cached data — fall back to fetching current state first.
        const fresh = (await apiClient.get(`/admin/tenants/${tenantId}/entitlements`))
          .data as FactoryEntitlements;
        const freshSet = new Set(fresh.enabledPages);

        if (input.scope === "module") {
          const module = fresh.modules.find((m) => m.key === input.key);
          if (module) {
            for (const page of module.pages) {
              if (input.enabled) freshSet.add(page.key);
              else freshSet.delete(page.key);
            }
          }
        } else {
          if (input.enabled) freshSet.add(input.key);
          else freshSet.delete(input.key);
        }

        pageKeys = [...freshSet];
      }

      const response = await apiClient.put(
        `/admin/tenants/${tenantId}/entitlements`,
        { pageKeys },
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
    onError: (error) => {
      const axiosError = error as { response?: { data?: unknown; status?: number } };
      console.error('[useToggleEntitlement] 400 body:', JSON.stringify(axiosError?.response?.data));
      const msg =
        (axiosError as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "تعذّر حفظ التغيير";
      toast.error(msg);
    },
  });
}
