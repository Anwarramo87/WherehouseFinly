import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";
import axios from "axios";
import { Salary, SalaryInput } from "@/types/salary";
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

/**
 * Hook that provides salaries list + helpers for single salary + mutations.
 *
 * The `updateSalary` mutation sends the CANONICAL field names that match
 * `UpsertSalaryDto` on the backend:
 *   - extraEffortAllowance  (NOT the deprecated `extraEffort`)
 *   - insuranceAmount        (NOT the deprecated `insurances`)
 *   - lumpSumSalary + livingAllowance are now included so the backend can
 *     correctly store the user's intended salary split.
 */
export const useSalaries = () => {
  const queryClient = useQueryClient();

  const salariesQuery = useQuery<Salary[]>({
    queryKey: ["salaries"],
    queryFn: async () => {
      const res = await apiClient.get("/salary");
      const data = res.data?.salaries ?? res.data;
      return Array.isArray(data) ? data : [];
    },
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  /** Convenience hook for a single employee's salary record. */
  const useEmployeeSalary = (employeeId?: string) =>
    useQuery<Salary | null>({
      queryKey: ["salary", employeeId],
      enabled: !!employeeId,
      queryFn: async () => {
        try {
          const res = await apiClient.get(`/salary/${employeeId}`);
          return res.data ?? null;
        } catch (error: unknown) {
          const status = axios.isAxiosError(error) ? error.response?.status : undefined;
          // 404/400 means no salary record yet — return null silently
          if (status === 404 || status === 400) {
            return null;
          }
          throw error;
        }
      },
      retry: false,
      staleTime: QUERY_STALE_TIME.STANDARD,
      gcTime: QUERY_GC_TIME.RELAXED,
    });

  const updateSalary = useMutation({
    mutationFn: async ({ employeeId, data }: { employeeId: string; data: SalaryInput }) => {
      // Build a clean payload that strictly matches UpsertSalaryDto.
      // Use canonical field names; coerce all numeric values safely.
      const payload: Record<string, unknown> = {
        baseSalary: Number(data.baseSalary ?? 0),
      };

      // Optional fields — only include when provided to avoid sending 0 noise
      if (data.profession !== undefined && data.profession !== "") {
        payload.profession = data.profession;
      }
      if ((data.lumpSumSalary ?? 0) > 0) {
        payload.lumpSumSalary = Number(data.lumpSumSalary);
      }
      if ((data.livingAllowance ?? 0) > 0) {
        payload.livingAllowance = Number(data.livingAllowance);
      }
      if ((data.responsibilityAllowance ?? 0) > 0) {
        payload.responsibilityAllowance = Number(data.responsibilityAllowance);
      }
      // Canonical: extraEffortAllowance (NOT extraEffort)
      if ((data.extraEffortAllowance ?? 0) > 0) {
        payload.extraEffortAllowance = Number(data.extraEffortAllowance);
      }
      if ((data.productionIncentive ?? 0) > 0) {
        payload.productionIncentive = Number(data.productionIncentive);
      }
      // Canonical: insuranceAmount (NOT insurances)
      if ((data.insuranceAmount ?? 0) > 0) {
        payload.insuranceAmount = Number(data.insuranceAmount);
      }
      if ((data.transportAllowance ?? 0) > 0) {
        payload.transportAllowance = Number(data.transportAllowance);
      }

      console.log(`📤 [PUT] /salary/${employeeId}`, payload);
      return await apiClient.put(`/salary/${employeeId}`, payload);
    },
    onSuccess: (_data, variables) => {
      // Only runs on HTTP 2xx — TanStack Query guarantees this
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      if (variables?.employeeId) {
        queryClient.invalidateQueries({ queryKey: ["salary", variables.employeeId] });
      }
      toast.success("تم حفظ مكونات الراتب بنجاح ✓");
    },
    onError: (error: unknown) => {
      const msg = getErrorMessage(error, "فشل حفظ الراتب");
      toast.error(msg);
      if (axios.isAxiosError(error)) {
        console.error("❌ Salary Update Error:", error.response?.data);
      } else {
        console.error("❌ Salary Update Error:", error);
      }
    },
  });

  const deleteSalary = useMutation({
    mutationFn: async (employeeId: string) => {
      return await apiClient.delete(`/salary/${employeeId}`);
    },
    onSuccess: (_data, employeeId) => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      if (employeeId) {
        queryClient.invalidateQueries({ queryKey: ["salary", employeeId] });
      }
      toast.success("تم حذف بيانات الراتب");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل حذف الراتب"));
    },
  });

  return {
    ...salariesQuery,
    useEmployeeSalary,
    updateSalary,
    deleteSalary,
  };
};

export default useSalaries;
