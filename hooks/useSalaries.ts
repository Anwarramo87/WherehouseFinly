import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";
import axios from "axios";
import { Salary, SalaryInput } from "@/types/salary";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { queryKeys } from "@/lib/query-keys";
import { getApiErrorMessage as getErrorMessage } from "@/lib/http/error";
import { toNumber } from "@/lib/number-utils";

const normalizeSalary = (raw: Record<string, unknown>): Salary => {
  const baseSalary = toNumber(raw.baseSalary);
  const livingAllowance = raw.livingAllowance !== undefined ? toNumber(raw.livingAllowance) : 0;

  const calculatedMonthlySalary = baseSalary + livingAllowance;

  return {
    id: String(raw.id ?? ""),
    employeeId: String(raw.employeeId ?? ""),
    profession: raw.profession ? String(raw.profession) : undefined,
    baseSalary,
    lumpSumSalary: raw.lumpSumSalary !== undefined ? toNumber(raw.lumpSumSalary) : undefined,
    livingAllowance: raw.livingAllowance !== undefined ? toNumber(raw.livingAllowance) : undefined,
    responsibilityAllowance: toNumber(raw.responsibilityAllowance),
    extraEffortAllowance:
      raw.extraEffortAllowance !== undefined ? toNumber(raw.extraEffortAllowance) : undefined,
    productionIncentive: toNumber(raw.productionIncentive),
    transportAllowance: toNumber(raw.transportAllowance),
    insuranceAmount: raw.insuranceAmount !== undefined ? toNumber(raw.insuranceAmount) : undefined,
    roundingDifference:
      raw.roundingDifference !== undefined ? toNumber(raw.roundingDifference) : undefined,
    monthlySalary:
      raw.monthlySalary !== undefined ? toNumber(raw.monthlySalary) : calculatedMonthlySalary,
  } as Salary;
};

export const useEmployeeSalary = (employeeId?: string) =>
  useQuery<Salary | null>({
    queryKey: queryKeys.salaries.detail(employeeId || ""),
    enabled: !!employeeId,
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/salary/${employeeId}`);
        const raw = res.data;
        console.log("useEmployeeSalary raw data:", raw);
        const normalized = raw ? normalizeSalary(raw as Record<string, unknown>) : null;
        console.log("useEmployeeSalary normalized data:", normalized);
        return normalized;
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
  const router = useRouter();

  const salariesQuery = useQuery<Salary[]>({
    queryKey: queryKeys.salaries.all,
    queryFn: async () => {
      const res = await apiClient.get("/salary");
      console.log("useSalaries api response:", res);
      const data = res.data?.salaries ?? res.data;
      console.log("useSalaries data:", data);
      const rawArray = Array.isArray(data) ? data : [];
      const normalized = rawArray.map((raw) => normalizeSalary(raw as Record<string, unknown>));
      console.log("useSalaries normalized:", normalized);
      return normalized;
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const updateSalary = useMutation({
    mutationFn: async ({ employeeId, data }: { employeeId: string; data: SalaryInput }) => {
      // Always send every canonical field (including 0) so edits that set a
      // value to 0 are persisted and the DB mirror stays consistent.
      const payload: Record<string, unknown> = {
        baseSalary: Number(data.baseSalary ?? 0),
        lumpSumSalary: Number(data.lumpSumSalary ?? 0),
        livingAllowance: Number(data.livingAllowance ?? 0),
        transportAllowance: Number(data.transportAllowance ?? 0),
        insuranceAmount: Number(data.insuranceAmount ?? 0),
        responsibilityAllowance: Number(data.responsibilityAllowance ?? 0),
        extraEffortAllowance: Number(data.extraEffortAllowance ?? 0),
        productionIncentive: Number(data.productionIncentive ?? 0),
      };

      if (data.profession !== undefined && data.profession !== "") {
        payload.profession = data.profession;
      }

      return await apiClient.put(`/salary/${employeeId}`, payload);
    },
    onSuccess: async (_data, variables) => {
      // Only runs on HTTP 2xx — TanStack Query guarantees this
      await queryClient.invalidateQueries({ queryKey: queryKeys.salaries.all });
      await queryClient.refetchQueries({ queryKey: queryKeys.salaries.all });
      if (variables?.employeeId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.salaries.detail(variables.employeeId),
        });
      }
      router.refresh();
      toast.success("تم حفظ مكونات الراتب بنجاح \u2713");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل حفظ الراتب"));
    },
  });

  const deleteSalary = useMutation({
    mutationFn: async (employeeId: string) => {
      return await apiClient.delete(`/salary/${employeeId}`);
    },
    onSuccess: async (_data, employeeId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.salaries.all });
      if (employeeId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.salaries.detail(employeeId) });
      }
      router.refresh();
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
