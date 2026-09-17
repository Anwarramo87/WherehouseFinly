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
 * Derives the current enabled page keys from the modules array.
 *
 * Uses modules[].pages[].enabled rather than enabledPages because the DB may
 * still hold legacy flat keys (e.g. "employees") from before the catalogue was
 * namespaced (e.g. "hr.employees"). The backend builds the modules view from
 * the catalogue, so page.key is always a valid namespaced key.
 */
function enabledKeysFromModules(entitlements: FactoryEntitlements): Set<string> {
  const set = new Set<string>();
  for (const mod of entitlements.modules) {
    for (const page of mod.pages) {
      if (page.enabled) set.add(page.key);
    }
  }
  return set;
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
      // Always derive from modules[].pages[].enabled — never from enabledPages
      // which may contain legacy flat keys the backend will reject.
      let data = queryClient.getQueryData<FactoryEntitlements>(
        superAdminKeys.entitlements(tenantId ?? "none"),
      );

      if (!data) {
        data = (await apiClient.get(`/admin/tenants/${tenantId}/entitlements`))
          .data as FactoryEntitlements;
      }

      const currentSet = enabledKeysFromModules(data);

      if (input.scope === "module") {
        const mod = data.modules.find((m) => m.key === input.key);
        if (mod) {
          for (const page of mod.pages) {
            if (input.enabled) currentSet.add(page.key);
            else currentSet.delete(page.key);
          }
        }
      } else {
        if (input.enabled) currentSet.add(input.key);
        else currentSet.delete(input.key);
      }

      const response = await apiClient.put(
        `/admin/tenants/${tenantId}/entitlements`,
        { pageKeys: [...currentSet] },
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
      // Prefix-invalidate every ["entitlements", ...] key: a factory change
      // reshapes all its admins' inherited views, whatever user scope they sit
      // under after the per-user key change.
      void queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      toast.success(input.enabled ? "تم التفعيل" : "تم الإيقاف");
    },
    onError: () => {
      toast.error("تعذّر حفظ التغيير");
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-admin entitlements (this admin's own pages within the factory grant).
// ─────────────────────────────────────────────────────────────────────────────

export const superAdminUserKeys = {
  userEntitlements: (tenantId: string, userId: string) =>
    ["super-admin", "user-entitlements", tenantId, userId] as const,
};

/**
 * The catalogue annotated through ONE admin's own grant. A missing per-user row
 * falls back to the whole factory grant, so factories that never per-configure
 * keep working exactly as before.
 */
export function useFactoryUserEntitlements(
  tenantId: string | null,
  userId: string | null,
) {
  return useQuery<FactoryEntitlements>({
    queryKey: superAdminUserKeys.userEntitlements(tenantId ?? "none", userId ?? "none"),
    enabled: Boolean(tenantId && userId),
    queryFn: async () =>
      (
        await apiClient.get(
          `/admin/tenants/${tenantId}/users/${userId}/entitlements`,
        )
      ).data as FactoryEntitlements,
  });
}

/**
 * Toggles one module or one page for ONE admin account — never for their
 * whole factory. Same whole-page-list PUT strategy as the factory-level
 * toggle, so the backend sees one consistent replacement instead of many
 * drifting single-flips.
 */
export function useToggleUserEntitlement(
  tenantId: string | null,
  userId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      scope: "module" | "page";
      key: string;
      enabled: boolean;
    }) => {
      let data = queryClient.getQueryData<FactoryEntitlements>(
        superAdminUserKeys.userEntitlements(tenantId ?? "none", userId ?? "none"),
      );

      if (!data) {
        data = (
          await apiClient.get(
            `/admin/tenants/${tenantId}/users/${userId}/entitlements`,
          )
        ).data as FactoryEntitlements;
      }

      const currentSet = enabledKeysFromModules(data);

      if (input.scope === "module") {
        const mod = data.modules.find((m) => m.key === input.key);
        if (mod) {
          for (const page of mod.pages) {
            if (input.enabled) currentSet.add(page.key);
            else currentSet.delete(page.key);
          }
        }
      } else {
        if (input.enabled) currentSet.add(input.key);
        else currentSet.delete(input.key);
      }

      const response = await apiClient.put(
        `/admin/tenants/${tenantId}/users/${userId}/entitlements`,
        { pageKeys: [...currentSet] },
      );
      return response.data as FactoryEntitlements;
    },
    onSuccess: (_data, input) => {
      if (tenantId && userId) {
        void queryClient.invalidateQueries({
          queryKey: superAdminUserKeys.userEntitlements(tenantId, userId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: superAdminKeys.factories });
      // Same prefix invalidation: the edited admin's own /me view (and any
      // other cached scope) must refetch immediately so the green state shows.
      void queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      toast.success(input.enabled ? "تم التفعيل" : "تم الإيقاف");
    },
    onError: () => {
      toast.error("تعذّر حفظ التغيير");
    },
  });
}
