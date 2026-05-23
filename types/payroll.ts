export interface PayrollRun {
  id: string;
  runId: string;
  periodStart: string;
  periodEnd: string;
  runDate: string;
  status: string;
  approvalStatus: string;
  totalEmployees: number;
  totalGrossPay: number | string | { $numberDecimal: string };
  totalDeductions: number | string | { $numberDecimal: string };
  totalNetPay: number | string | { $numberDecimal: string };
  notes?: string | null;
}

export interface PayrollItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  department?: string | null;
  hoursWorked: number | string | { $numberDecimal: string };
  hourlyRate: number | string | { $numberDecimal: string };
  grossPay: number | string | { $numberDecimal: string };
  totalDeductions: number | string | { $numberDecimal: string };
  netPay: number | string | { $numberDecimal: string };
  /** صافي الراتب مقرباً لأقرب ألف — القيمة المدفوعة فعلياً للموظف */
  netPayRounded: number | string | { $numberDecimal: string };
  /** فرق التقريب = netPayRounded − netPay */
  roundingDifference: number | string | { $numberDecimal: string };
  netPayWithAdvance?: number | string | { $numberDecimal: string };
  anomalies?: string[];
}

export interface CalculatePayrollInput {
  periodStart: string;
  periodEnd: string;
  gracePeriodMinutes?: number | string;
  // خصومات الدوام (ستُحسب من سجلات الحضور)
  includeAttendanceDeductions?: boolean;
  // خصومات النقل (ستُحسب من تكاليف الحافلات)
  includeTransportationDeductions?: boolean;
}

export interface PayrollReportTotals {
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
}

export interface PayrollReportResponse {
  month: string;
  period: {
    startDate: string;
    endDate: string;
  };
  runsCount: number;
  latestRun: PayrollRun | null;
  totals: PayrollReportTotals;
  items: PayrollItem[];
}

