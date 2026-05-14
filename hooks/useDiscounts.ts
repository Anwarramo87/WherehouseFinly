import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import axios from "axios";
import apiClient from "@/lib/api-client";
import type { DiscountInput, DiscountRecord, DiscountKind } from "@/types/discount";
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

export const useDiscounts = (employeeId?: string) => {
  const queryClient = useQueryClient();

  const discountsQuery = useQuery<DiscountRecord[]>({
    queryKey: ["discounts", employeeId || "all"],
    queryFn: async () => {
      const res = await apiClient.get("/discounts", { params: { employeeId } });
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const createDiscount = useMutation({
    mutationFn: async (payload: DiscountInput) => {
      const data = {
        employeeId: payload.employeeId,
        type: payload.type,
        amount: Number(payload.amount),
        date: payload.date,
        notes: payload.notes,
        kind: payload.kind,
      };
      return await apiClient.post("/discounts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      toast.success("تمت إضافة الخصم بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل إضافة الخصم"));
    },
  });

  const deleteDiscount = useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: DiscountKind }) => {
      return await apiClient.delete(`/discounts/${id}`, { params: { kind } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      toast.success("تم حذف الخصم بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل حذف الخصم"));
    },
  });

  return {
    ...discountsQuery,
    createDiscount,
    deleteDiscount,
  };
};
