import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { Advance, AdvanceInput } from "@/types/advance";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { getApiErrorMessage as getErrorMessage } from "@/lib/http/error";

export const useAdvances = (employeeId?: string, period?: string, enabled = true) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const currentPeriod = new Date().toISOString().slice(0, 7);
  const isPastPeriod = period ? period < currentPeriod : false;

  const advancesQuery = useQuery<Advance[]>({
    queryKey: ["advances", employeeId || "all", period || "current"],
    queryFn: async () => {
      const res = await apiClient.get("/advances", { params: { employeeId, period } });
      console.log('Advances API response:', res.data);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled,
    staleTime: isPastPeriod ? 10 * 60_000 : QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const createAdvance = useMutation({
    mutationFn: async (payload: AdvanceInput) => {
      const data = {
        employeeId: payload.employeeId,
        advanceType: payload.advanceType || "salary",
        totalAmount: Number(payload.totalAmount),
        installmentAmount: Number(payload.installmentAmount || 0),
        notes: payload.notes,
      };
      return await apiClient.post("/advances", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["advances"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      router.refresh();
      toast.success("تمت إضافة السلفة بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل إضافة السلفة"));
    },
  });

  const updateAdvance = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AdvanceInput> }) => {
      const payload = {
        remainingAmount: data.remainingAmount !== undefined ? Number(data.remainingAmount) : undefined,
        installmentAmount: data.installmentAmount !== undefined ? Number(data.installmentAmount) : undefined,
        notes: data.notes,
      };
      return await apiClient.put(`/advances/${id}`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["advances"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      router.refresh();
      toast.success("تم تحديث السلفة");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل تحديث السلفة"));
    },
  });

  const deleteAdvance = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/advances/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["advances"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      router.refresh();
      toast.success("تم نقل السلفة إلى سلة المهملات");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل حذف السلفة"));
    },
  });

  return {
    ...advancesQuery,
    createAdvance,
    updateAdvance,
    deleteAdvance,
  };
};

