import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/http/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { useFactoryScopeStore } from "@/stores/factory-scope-store";

interface Department {
  id: string;
  name: string;
  manager?: string;
  employeeCount?: number;
  createdAt?: string;
  establishedAt?: string;
}

interface DepartmentsResponse {
  departments: Department[];
}

export const useDepartments = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  // tenantId arrives via /auth/me (now includes tenantId from toPublicAuthUser).
  // It scopes the React Query key per factory so an admin can never be served
  // another factory's cached departments after switching accounts on one browser.
  // The super admin drilling into a factory is additionally keyed by factory scope.
  const authTenantId = useAuthStore((s) => s.user?.tenantId ?? null);
  const factoryId = useFactoryScopeStore((s) => s.factoryId);
  const scopeKey = factoryId ?? authTenantId ?? "no-tenant";

  const listQuery = useQuery({
    queryKey: [...queryKeys.departments.all, scopeKey],
    queryFn: async () => {
      const data = await api.get<DepartmentsResponse | Department[]>("/departments");
      // normalize shape
      if (Array.isArray((data as DepartmentsResponse).departments))
        return data as DepartmentsResponse;
      // fallback: if API returns array directly
      return { departments: Array.isArray(data) ? data : [] };
    },
    staleTime: 30 * 1000, // قائمة الأقسام تتغير مع إضافة المشرفين — كاش قصير فقط
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; manager?: string; date?: string }) => {
      return await api.post("/departments", {
        name: payload.name,
        ...(payload.manager != null && payload.manager !== "" && { manager: payload.manager }),
        ...(payload.date != null && payload.date !== "" && { establishedAt: payload.date }),
      });
    },
    onSuccess: async () => {
      // refetchType: "all" يعيد الجلب حتى للاستعلامات غير النشطة (مغلفة بكاش
      // staleTime طويل)، فلا تبقى قائمة الأقسام قديمة حتى انتهاء staleTime.
      await queryClient.invalidateQueries({
        queryKey: queryKeys.departments.all,
        refetchType: "all",
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.employees.all,
        refetchType: "all",
      });
      router.refresh();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, manager, date }: { id: string; name: string; manager?: string; date?: string }) => {
      return await api.put(`/departments/${id}`, {
        name,
        ...(manager !== undefined && { manager: manager || null }),
        ...(date != null && date !== "" && { establishedAt: date }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.departments.all,
        refetchType: "all",
      });
      router.refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/departments/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.departments.all,
        refetchType: "all",
      });
      router.refresh();
    },
  });

  const clearSupervisorMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.patch(`/departments/${id}/supervisor`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.departments.all,
        refetchType: "all",
      });
      router.refresh();
    },
  });

  return {
    ...listQuery,
    createDepartment: createMutation,
    updateDepartment: updateMutation,
    deleteDepartment: deleteMutation,
    clearSupervisor: clearSupervisorMutation,
  } as const;
};

export default useDepartments;
