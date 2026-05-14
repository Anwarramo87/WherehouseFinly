import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import axios from "axios";
import apiClient from "@/lib/api-client";
import type { PenaltyInput, PenaltyRecord } from "@/types/penalty";
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

export const usePenalties = (params?: { employeeId?: string; startDate?: string; endDate?: string }) => {
  const queryClient = useQueryClient();

  const penaltiesQuery = useQuery<PenaltyRecord[]>({
    queryKey: [
      "penalties",
      params?.employeeId || "all",
      params?.startDate || "all-start",
      params?.endDate || "all-end",
    ],
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
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const createPenalty = useMutation({
    mutationFn: async (payload: PenaltyInput) => {
      const data = {
        employeeId: payload.employeeId,
        category: payload.category,
        amount: Number(payload.amount),
        reason: payload.reason,
        issueDate: payload.issueDate,
      };
      return await apiClient.post("/penalties", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["penalties"], exact: false });
      toast.success("تمت إضافة الخصم بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل إضافة الخصم"));
    },
  });

  const deletePenalty = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/penalties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["penalties"], exact: false });
      toast.success("تم حذف الخصم بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل حذف الخصم"));
    },
  });

  return {
    ...penaltiesQuery,
    createPenalty,
    deletePenalty,
  };
};
