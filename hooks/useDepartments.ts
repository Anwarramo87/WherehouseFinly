import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/http/api';

interface Department {
  id: string;
  name: string;
  manager?: string;
  employeeCount?: number;
  createdAt?: string;
}

interface DepartmentsResponse {
  departments: Department[];
}

export const useDepartments = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const listQuery = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const data = await api.get<DepartmentsResponse | Department[]>('/departments');
      // normalize shape
      if (Array.isArray((data as DepartmentsResponse).departments)) return data as DepartmentsResponse;
      // fallback: if API returns array directly
      return { departments: Array.isArray(data) ? data : [] };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — departments change rarely
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; manager?: string; date?: string }) => {
      // backend DTO accepts only { name }
      return await api.post('/departments', { name: payload.name });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      router.refresh();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, date }: { id: string; name: string; date?: string }) => {
      return await api.put(`/departments/${id}`, { name, ...(date && { date }) });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      router.refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/departments/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      router.refresh();
    },
  });

  return {
    ...listQuery,
    createDepartment: createMutation,
    updateDepartment: updateMutation,
    deleteDepartment: deleteMutation,
  } as const;
};

export default useDepartments;
