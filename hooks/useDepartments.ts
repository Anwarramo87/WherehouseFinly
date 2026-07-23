import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/http/api";
import { queryKeys } from "@/lib/query-keys";

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

  const listQuery = useQuery({
    queryKey: queryKeys.departments.all,
    queryFn: async () => {
      const data = await api.get<DepartmentsResponse | Department[]>("/departments");
      // normalize shape
      if (Array.isArray((data as DepartmentsResponse).departments))
        return data as DepartmentsResponse;
      // fallback: if API returns array directly
      return { departments: Array.isArray(data) ? data : [] };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — departments change rarely
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
      router.refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/departments/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
      router.refresh();
    },
  });

  const clearSupervisorMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.patch(`/departments/${id}/supervisor`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
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
