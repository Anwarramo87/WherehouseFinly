import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import {
  AttendanceDeductionInput,
  AttendanceDeductionResponse,
  AttendanceDeductionBreakdown,
} from "@/types/attendance-deduction";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";

/**
 * Hook لحساب خصومات الدوام (غياب + تأخير)
 * يحسب الخصومات بناءً على سجلات الحضور في فترة زمنية محددة
 */
export const useAttendanceDeductions = (input: AttendanceDeductionInput) => {
  return useQuery<AttendanceDeductionResponse>({
    queryKey: ["attendance-deductions", input.periodStart, input.periodEnd, input.gracePeriodMinutes, input.employeeId],
    queryFn: async () => {
      const res = await apiClient.post("/attendance/calculate-deductions", {
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        gracePeriodMinutes: input.gracePeriodMinutes,
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
 * دالة مساعدة لاستخراج معلومات خصم موظف معين
 */
export const getEmployeeDeduction = (
  breakdowns: AttendanceDeductionBreakdown[],
  employeeId: string
): AttendanceDeductionBreakdown | undefined => {
  return breakdowns.find((item) => item.employeeId === employeeId);
};

/**
 * دالة مساعدة لحساب إجمالي الخصومات
 */
export const calculateTotalDeductions = (
  breakdowns: AttendanceDeductionBreakdown[]
): number => {
  return breakdowns.reduce((sum, item) => sum + item.totalAttendanceDeduction, 0);
};

export default useAttendanceDeductions;
