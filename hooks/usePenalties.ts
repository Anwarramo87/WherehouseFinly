import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import type { Penalty } from "@/types/penalty";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { getApiErrorMessage } from "@/lib/http/error";

export const getErrorMessage = getApiErrorMessage;

export type PenaltyRecord = Penalty & { id: string };

export const usePenalties = (params?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  period?: string;
}) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const currentPeriod = new Date().toISOString().slice(0, 7);
  const isPastPeriod = params?.period ? params.period < currentPeriod : false;

  const penaltiesQuery = useQuery<PenaltyRecord[]>({
    queryKey: [
      "penalties",
      params?.employeeId || "all",
      params?.period || "current",
      params?.startDate || "all-start",
      params?.endDate || "all-end",
    ],
    queryFn: async () => {
      const res = await apiClient.get("/penalties", {
        params: {
          employeeId: params?.employeeId,
          startDate: params?.startDate,
          endDate: params?.endDate,
          period: params?.period,
        },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: isPastPeriod ? 10 * 60_000 : QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const toPenaltyAmountNumber = (value: Penalty["amount"]) => {
    if (value && typeof value === "object" && "$numberDecimal" in value) {
      return Number(value.$numberDecimal || 0);
    }
    if (typeof value === "string") {
      const normalized = value.replace(/,/g, "").trim();
      return Number(normalized || 0);
    }
    return Number(value || 0);
  };

  const createPenalty = useMutation({
    mutationFn: async (payload: Omit<Penalty, "id">) => {
      const data = {
        employeeId: payload.employeeId,
        category: payload.category,
        amount: toPenaltyAmountNumber(payload.amount),
        reason: payload.reason,
        issueDate: payload.issueDate,
      };
      return await apiClient.post("/penalties", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["penalties"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      router.refresh();
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
        amount: data.amount !== undefined ? toPenaltyAmountNumber(data.amount) : undefined,
        reason: data.reason,
        issueDate: data.issueDate,
      };
      return await apiClient.put(`/penalties/${id}`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["penalties"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      router.refresh();
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
