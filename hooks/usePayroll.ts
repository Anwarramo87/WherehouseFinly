import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import axios from "axios";
import apiClient from "@/lib/api-client";
import { CalculatePayrollInput, PayrollRun } from "@/types/payroll";
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

export const usePayrollSummary = (period?: { start?: string; end?: string }) => {
  return useQuery({
    queryKey: ["payroll", "summary", period?.start, period?.end],
    queryFn: async () => {
      const res = await apiClient.get("/payroll/summary", { params: { periodStart: period?.start, periodEnd: period?.end } });
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });
};

export const usePayrollList = (params?: { page?: number; limit?: number; status?: string; approvalStatus?: string }) => {
  return useQuery({
    queryKey: ["payroll", "list", params],
    queryFn: async () => {
      const res = await apiClient.get("/payroll", { params });
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });
};

export const usePayroll = (params?: { page?: number; limit?: number; status?: string; approvalStatus?: string }) => {
  const queryClient = useQueryClient();

  const payrollRunsQuery = useQuery<{ payrollRuns: PayrollRun[]; pagination?: unknown }>({
    queryKey: ["payroll", "runs", params],
    queryFn: async () => {
      const res = await apiClient.get("/payroll", { params });
      return {
        payrollRuns: Array.isArray(res.data?.payrollRuns) ? res.data.payrollRuns : [],
        pagination: res.data?.pagination,
      };
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const calculatePayroll = useMutation({
    mutationFn: async (input: CalculatePayrollInput) => {
      const payload = {
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        gracePeriodMinutes: input.gracePeriodMinutes !== undefined ? Number(input.gracePeriodMinutes) : undefined,
        includeAttendanceDeductions: input.includeAttendanceDeductions ?? true,
        includeTransportationDeductions: input.includeTransportationDeductions ?? true,
      };
      return await apiClient.post("/payroll/calculate", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"], exact: false });
      toast.success("تم احتساب مسير الرواتب بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل احتساب مسير الرواتب"));
    },
  });

  const approvePayroll = useMutation({
    mutationFn: async (runId: string) => {
      return await apiClient.put(`/payroll/${runId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"], exact: false });
      toast.success("تم اعتماد المسير");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل اعتماد المسير"));
    },
  });

  const rejectPayroll = useMutation({
    mutationFn: async ({ runId, reason }: { runId: string; reason: string }) => {
      return await apiClient.put(`/payroll/${runId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"], exact: false });
      toast.success("تم رفض المسير");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل رفض المسير"));
    },
  });

  // Backend currently has no DELETE endpoint for payroll runs.
  const deletePayroll = useMutation({
    mutationFn: async (runId: string) => {
      return await apiClient.delete(`/payroll/${runId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"], exact: false });
      toast.success("تم حذف المسير");
    },
    onError: () => {
      toast.error("الحذف غير مدعوم حالياً في الخادم");
    },
  });

  return {
    ...payrollRunsQuery,
    calculatePayroll,
    approvePayroll,
    rejectPayroll,
    deletePayroll,
  };
};

