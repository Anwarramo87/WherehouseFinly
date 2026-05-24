import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import type { PayrollReportResponse } from "@/types/payroll";

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

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
        items: Array.isArray(payload?.items) ? payload.items : [],
      };
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });
};

export default usePayrollReport;

