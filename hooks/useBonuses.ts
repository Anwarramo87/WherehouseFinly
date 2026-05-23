import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import axios from "axios";
import apiClient from "@/lib/api-client";
import { Bonus, BonusInput } from "@/types/bonus";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";

type ApiErrorBody = {
  message?: string;
  error?: { message?: string };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const message = error.response?.data?.error?.message ?? error.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export const useBonuses = (params?: { employeeId?: string; period?: string }) => {
  const queryClient = useQueryClient();

  const bonusesQuery = useQuery<Bonus[]>({
    queryKey: ["bonuses", params?.employeeId || "all", params?.period || "all-periods"],
    queryFn: async () => {
      const res = await apiClient.get("/bonuses", {
        params: {
          employeeId: params?.employeeId,
          period: params?.period,
        },
      });
      return res.data?.rewards ?? res.data ?? [];
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const createBonus = useMutation({
    mutationFn: async (payload: BonusInput) => {
      const data = {
        employeeId: payload.employeeId,
        bonusAmount: Number(payload.bonusAmount || 0),
        bonusReason: payload.bonusReason,
        assistanceAmount: Number(payload.assistanceAmount || 0),
        period: payload.period,
      };
      return await apiClient.post("/bonuses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bonuses"], exact: false });
      toast.success("تمت إضافة المكافأة بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل إضافة المكافأة"));
    },
  });

  const updateBonus = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BonusInput> }) => {
      const payload = {
        bonusAmount: data.bonusAmount !== undefined ? Number(data.bonusAmount) : undefined,
        bonusReason: data.bonusReason,
        assistanceAmount: data.assistanceAmount !== undefined ? Number(data.assistanceAmount) : undefined,
        period: data.period,
      };
      return await apiClient.put(`/bonuses/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bonuses"], exact: false });
      toast.success("تم تحديث المكافأة");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل تحديث المكافأة"));
    },
  });

  const deleteBonus = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/bonuses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bonuses"], exact: false });
      toast.success("تم حذف المكافأة");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل حذف المكافأة"));
    },
  });

  return {
    ...bonusesQuery,
    createBonus,
    updateBonus,
    deleteBonus,
  };
};

