import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/http/api';

export const useDepartments = () => {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const data = await api.get<{ departments: { id: string; name: string }[] }>('/departments');
      // normalize shape
      if (Array.isArray((data as any).departments)) return data as any;
      // fallback: if API returns array directly
      return { departments: (data as any) ?? [] };
    },
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; manager?: string; date?: string }) => {
      // backend DTO accepts only { name }
      return await api.post('/departments', { name: payload.name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await api.put(`/departments/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
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
