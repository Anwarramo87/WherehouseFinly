"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { CalculatePayrollInput, PayrollRun } from "@/types/payroll";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { getApiErrorMessage as getErrorMessage } from "@/lib/http/error";

export const usePayrollSummary = (period?: { start?: string; end?: string }) => {
  return useQuery({
    queryKey: ["payroll", "summary", period?.start, period?.end],
    queryFn: async () => {
      const res = await apiClient.get("/payroll/summary", {
        params: { periodStart: period?.start, periodEnd: period?.end },
      });
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });
};

export const usePayrollList = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  approvalStatus?: string;
}) => {
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

export const usePayroll = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  approvalStatus?: string;
}) => {
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
        gracePeriodMinutes:
          input.gracePeriodMinutes !== undefined ? Number(input.gracePeriodMinutes) : undefined,
        includeAttendanceDeductions: input.includeAttendanceDeductions ?? true,
        includeTransportationDeductions: input.includeTransportationDeductions ?? true,
      };
      return await apiClient.post("/payroll/calculate", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["payrollInputs"], exact: false });
      toast.success("تم احتساب مسير الرواتب بنجاح وتحديث السجلات");
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
      toast.success("تم اعتماد المسير بنجاح");
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
      toast.success("تم رفض المسير بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل رفض المسير"));
    },
  });

  const deletePayroll = useMutation({
    mutationFn: async (runId: string) => {
      return await apiClient.delete(`/payroll/${runId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"], exact: false });
      toast.success("تم نقل مسير الرواتب إلى سلة المهملات");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل حذف مسير الرواتب من الخادم"));
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
