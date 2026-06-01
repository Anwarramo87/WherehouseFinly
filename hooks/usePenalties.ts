import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import axios from "axios";
import apiClient from "@/lib/api-client";
import type { Penalty } from "@/types/penalty";
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

export const usePenalties = (params?: { employeeId?: string; startDate?: string; endDate?: string; enabled?: boolean }) => {
  const queryClient = useQueryClient();

  const penaltiesQuery = useQuery<Penalty[]>({
    queryKey: ["penalties", params?.employeeId || "all", params?.startDate || "no-start", params?.endDate || "no-end"],
    queryFn: async () => {
      const res = await apiClient.get("/penalties", {
        params: {
          employeeId: params?.employeeId,
          startDate: params?.startDate,
          endDate: params?.endDate,
        },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: params?.enabled ?? true,
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const createPenalty = useMutation({
    mutationFn: async (payload: Omit<Penalty, "id">) => {
      const data = {
        employeeId: payload.employeeId,
        category: payload.category,
        amount: Number(payload.amount || 0),
        reason: payload.reason,
        issueDate: payload.issueDate,
      };
      return await apiClient.post("/penalties", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["penalties"], exact: false });
      toast.success("تمت إضافة العقوبة بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل إضافة العقوبة"));
    },
  });

  const updatePenalty = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Penalty, "id">> }) => {
      const payload = {
        category: data.category,
        amount: data.amount !== undefined ? Number(data.amount) : undefined,
        reason: data.reason,
        issueDate: data.issueDate,
      };
      return await apiClient.put(`/penalties/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["penalties"], exact: false });
      toast.success("تم تحديث العقوبة");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل تحديث العقوبة"));
    },
  });

  return {
    ...penaltiesQuery,
    createPenalty,
    updatePenalty,
  };
};
