import { useQueries } from '@tanstack/react-query';
import type { EmployeesStats, AttendanceStats, InventoryStats, DashboardKpis } from '@/types/dashboard';
import { useEmployees } from '@/hooks/useEmployees';
import { useSalaries } from '@/hooks/useSalaries';
import { usePayrollSummary } from '@/hooks/usePayroll';
import { api } from '@/lib/http/api';
import { queryKeys } from '@/lib/query-keys';

const fallbackEmployeesStats: EmployeesStats = {
  total: 0,
  active: 0,
  byDepartment: {},
};

const fallbackAttendanceStats: AttendanceStats = {
  statistics: {
    totalLateArrivals: 0,
  },
  topLateEmployees: [],
};

const fallbackInventoryStats: InventoryStats = {
  totalQuantity: 0,
  totalProducts: 0,
};

const fallbackKpis: DashboardKpis = {
  totalEmployees: 0,
  activeToday: 0,
  totalAbsentToday: 0,
  totalDueSalaries: 0,
  totalLateMinutesToday: 0,
  totalOvertimeMinutesToday: 0,
};

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const extractAttendanceCounts = (stats: AttendanceStats | undefined) => {
  if (!stats || typeof stats !== 'object') {
    return { active: 0, absent: 0, lateMinutes: 0 };
  }

  const summary = (stats as { summary?: Record<string, unknown> }).summary;

  const active = toNumber(summary?.activeEmployees ?? 0);
  const absent = toNumber(summary?.absentCount ?? 0);
  const lateMinutes = toNumber(summary?.totalLateMinutes ?? 0);

  return { active, absent, lateMinutes };
};

const extractPayrollTotal = (summary: unknown) => {
  if (!summary || typeof summary !== 'object') return null;

  const record = summary as Record<string, unknown>;
  const totals = (record.totals as Record<string, unknown>) || {};

  const candidates: unknown[] = [
    totals.totalNetPay,
    totals.totalNetPayRounded,
    totals.totalNetPayWithAdvance,
    record.totalNetPay,
    record.totalNetPayRounded,
    record.totalNetPayWithAdvance,
    record.netPayRounded,
    record.netPayWithAdvance,
    record.payrolliteam,
  ];

  for (const candidate of candidates) {
    const value = toNumber(candidate);
    if (value > 0) return value;
  }

  return null;
};

const withFallback = async <T>(fetcher: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    const result = await fetcher();
    return result ?? fallback;
  } catch {
    return fallback;
  }
};

export const useDashboard = (opts?: { startDate?: string; endDate?: string }) => {
  const today = getLocalDateString();
  const employeesQuery = useEmployees();
  const salariesQuery = useSalaries();
  const payrollSummaryQuery = usePayrollSummary();

  const queries = useQueries({
    queries: [
      {
        queryKey: queryKeys.employees.stats(),
        queryFn: () => withFallback(() => api.get<EmployeesStats>('/employees/stats'), fallbackEmployeesStats),
      },
      {
        queryKey: queryKeys.attendance.stats(opts?.startDate, opts?.endDate),
        queryFn: () => {
          const hasDateRange = Boolean(opts?.startDate && opts?.endDate);
          const startDate = opts?.startDate ?? today;
          const endDate = opts?.endDate ?? today;
          return withFallback(
            () =>
              api.get<AttendanceStats>('/attendance/stats', {
                params: hasDateRange ? { startDate, endDate } : { startDate, endDate },
              }),
            fallbackAttendanceStats,
          );
        },
      },
      {
        queryKey: queryKeys.inventory.stats(),
        queryFn: () => withFallback(() => api.get<InventoryStats>('/inventory/stats'), fallbackInventoryStats),
      },
    ],
  });

  const employees = Array.isArray(employeesQuery.data) ? employeesQuery.data : [];
  const salaries = Array.isArray(salariesQuery.data) ? salariesQuery.data : [];

  const [employeesStatsQ, attendanceStatsQ, inventoryStatsQ] = queries;
  const employeesStats = employeesStatsQ?.data ?? fallbackEmployeesStats;
  const attendanceStats = attendanceStatsQ?.data ?? fallbackAttendanceStats;
  const inventoryStats = inventoryStatsQ?.data ?? fallbackInventoryStats;

  const attendanceSummary = extractAttendanceCounts(attendanceStats);

  const activeToday = attendanceSummary.active;
  const totalEmployees = employeesStats.total || 0;
  const totalAbsentToday = attendanceSummary.absent;
  const totalLateMinutesToday = attendanceSummary.lateMinutes;
  const totalOvertimeMinutesToday = 0;

  const salaryByEmployee = new Map(salaries.map((salary) => [salary.employeeId, salary]));

  const calculatedDueSalaries = employees.reduce((sum, employee) => {
    if (!employee?.employeeId || employee.status === 'terminated') return sum;

    const salary = salaryByEmployee.get(employee.employeeId);
    const baseSalary = salary ? toNumber(salary.baseSalary) : toNumber(employee.hourlyRate);
    const responsibilityAllowance = salary ? toNumber(salary.responsibilityAllowance) : 0;
    const productionIncentive = salary ? toNumber(salary.productionIncentive) : 0;
    const transportAllowance = salary ? toNumber(salary.transportAllowance) : 0;

    return sum + baseSalary + responsibilityAllowance + productionIncentive + transportAllowance;
  }, 0);

  const payrollSummaryTotal = extractPayrollTotal(payrollSummaryQuery.data);
  const totalDueSalaries = payrollSummaryTotal ?? calculatedDueSalaries;

  const kpis: DashboardKpis = {
    ...fallbackKpis,
    totalEmployees,
    activeToday,
    totalAbsentToday,
    totalDueSalaries,
    totalLateMinutesToday,
    totalOvertimeMinutesToday,
  };

  return {
    employeesStats,
    attendanceStats,
    inventoryStats,
    kpis,
    isLoading:
      queries.some((q) => q.isLoading) ||
      employeesQuery.isLoading ||
      salariesQuery.isLoading ||
      payrollSummaryQuery.isLoading,
    isError:
      queries.some((q) => q.isError) ||
      Boolean(employeesQuery.error) ||
      Boolean(salariesQuery.error) ||
      Boolean(payrollSummaryQuery.error),
  };
};


