import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";
import axios from "axios";
import { Salary, SalaryInput } from "@/types/salary";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { getApiErrorMessage as getErrorMessage } from "@/lib/http/error";
import { toNumber } from "@/lib/number-utils";

const normalizeSalary = (raw: Record<string, unknown>): Salary => {
  return {
    id: String(raw.id ?? ""),
    employeeId: String(raw.employeeId ?? ""),
    profession: raw.profession ? String(raw.profession) : undefined,
    baseSalary: toNumber(raw.baseSalary),
    lumpSumSalary: raw.lumpSumSalary !== undefined ? toNumber(raw.lumpSumSalary) : undefined,
    livingAllowance: raw.livingAllowance !== undefined ? toNumber(raw.livingAllowance) : undefined,
    responsibilityAllowance: toNumber(raw.responsibilityAllowance),
    extraEffortAllowance: raw.extraEffortAllowance !== undefined ? toNumber(raw.extraEffortAllowance) : undefined,
    productionIncentive: toNumber(raw.productionIncentive),
    transportAllowance: toNumber(raw.transportAllowance),
    insuranceAmount: raw.insuranceAmount !== undefined ? toNumber(raw.insuranceAmount) : undefined,
    roundingDifference: raw.roundingDifference !== undefined ? toNumber(raw.roundingDifference) : undefined,
    monthlySalary: raw.monthlySalary !== undefined ? toNumber(raw.monthlySalary) : undefined,
  } as Salary;
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
      const rawArray = Array.isArray(data) ? data : [];
      return rawArray.map((raw) => normalizeSalary(raw as Record<string, unknown>));
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
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
          const raw = res.data;
          return raw ? normalizeSalary(raw as Record<string, unknown>) : null;
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
      staleTime: QUERY_STALE_TIME.RELAXED,
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
      toast.error(getErrorMessage(error, "فشل حفظ الراتب"));
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
      toast.success("تم نقل بيانات الراتب إلى سلة المهملات");
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
