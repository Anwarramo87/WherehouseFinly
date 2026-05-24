import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import {
  TransportationDeductionInput,
  TransportationDeductionResponse,
  TransportationDeductionBreakdown,
} from "@/types/transportation-deduction";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";

/**
 * Hook لحساب خصومات النقل من تكاليف الحافلات
 * يجلب تكاليف النقل الشهرية لكل موظف بناءً على اشتراكهم في الحافلة
 */
export const useTransportationDeduction = (input: TransportationDeductionInput) => {
  return useQuery<TransportationDeductionResponse>({
    queryKey: ["transportation-deductions", input.periodStart, input.periodEnd, input.employeeId],
    queryFn: async () => {
      const res = await apiClient.post("/transportation/calculate-deductions", {
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        employeeId: input.employeeId,
      });
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
    enabled: !!input.periodStart && !!input.periodEnd,
  });
};

/**
 * دالة مساعدة لاستخراج معلومات خصم النقل لموظف معين
 */
export const getEmployeeTransportationCost = (
  breakdowns: TransportationDeductionBreakdown[],
  employeeId: string
): number => {
  const item = breakdowns.find((item) => item.employeeId === employeeId);
  return item?.transportCost ?? 0;
};

/**
 * دالة مساعدة لحساب إجمالي خصومات النقل
 */
export const calculateTotalTransportationDeductions = (
  breakdowns: TransportationDeductionBreakdown[]
): number => {
  return breakdowns.reduce((sum, item) => sum + item.transportCost, 0);
};

export default useTransportationDeduction;
