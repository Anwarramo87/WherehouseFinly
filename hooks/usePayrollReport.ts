import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import type { PayrollReportResponse } from "@/types/payroll";

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const convertToDecimalString = (value: number | string | { $numberDecimal: string } | undefined): string => {
  if (value === undefined || value === null) {
    return "0"; // Or appropriate default
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'object' && '$numberDecimal' in value) {
    return value.$numberDecimal;
  }
  return "0"; // Fallback
};

export const usePayrollReport = (month: string) => {
  return useQuery<PayrollReportResponse>({
    queryKey: ["payroll", "report", month],
    enabled: MONTH_REGEX.test(month),
    queryFn: async () => {
      const response = await apiClient.get(`/payroll/report/${month}`);
      const payload = response.data;

      return {
        month: payload?.month || month,
        period: {
          startDate: payload?.period?.startDate || `${month}-01`,
          endDate: payload?.period?.endDate || `${month}-31`,
        },
        runsCount: Number(payload?.runsCount || 0),
        latestRun: payload?.latestRun || null,
        totals: {
          totalGrossPay: Number(payload?.totals?.totalGrossPay || 0),
          totalDeductions: Number(payload?.totals?.totalDeductions || 0),
          totalNetPay: Number(payload?.totals?.totalNetPay || 0),
        },
        items: Array.isArray(payload?.items)
          ? payload.items.map((item: unknown) => {
              const record = item as Record<string, unknown>;
              return {
                ...record,
                attendanceBasedSalary: convertToDecimalString(record.attendanceBasedSalary as number | string | { $numberDecimal: string } | undefined),
                hoursWorked: convertToDecimalString(record.hoursWorked as number | string | { $numberDecimal: string } | undefined),
                hourlyRate: convertToDecimalString(record.hourlyRate as number | string | { $numberDecimal: string } | undefined),
                grossPay: convertToDecimalString(record.grossPay as number | string | { $numberDecimal: string } | undefined),
                totalBonuses: convertToDecimalString(record.totalBonuses as number | string | { $numberDecimal: string } | undefined),
                totalDeductions: convertToDecimalString(record.totalDeductions as number | string | { $numberDecimal: string } | undefined),
                netPay: convertToDecimalString(record.netPay as number | string | { $numberDecimal: string } | undefined),
                netPayRounded: convertToDecimalString(record.netPayRounded as number | string | { $numberDecimal: string } | undefined),
                roundingDifference: convertToDecimalString(record.roundingDifference as number | string | { $numberDecimal: string } | undefined),
                earlyLeaveDeduction: convertToDecimalString(record.earlyLeaveDeduction as number | string | { $numberDecimal: string } | undefined),
              };
            })
          : [],
      };
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });
};

export default usePayrollReport;

