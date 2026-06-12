import { useQueries } from '@tanstack/react-query';
import type { EmployeesStats, AttendanceStats, InventoryStats, DashboardKpis } from '@/types/dashboard';
import { useEmployees } from '@/hooks/useEmployees';
import { useAttendance } from '@/hooks/useAttendance';
import { useSalaries } from '@/hooks/useSalaries';
import { usePayrollSummary } from '@/hooks/usePayroll';
import { calculateAttendanceMetrics } from '@/lib/attendance-metrics';
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
  const statsRoot = stats as { statistics?: Record<string, unknown> };

  const active = toNumber(
    summary?.activeEmployees ??
      summary?.checkedInCount ??
      summary?.presentCount ??
      summary?.attendedCount ??
      summary?.activeToday ??
      statsRoot.statistics?.activeToday,
  );

  const absent = toNumber(
    summary?.absentCount ??
      summary?.totalAbsent ??
      summary?.absentToday ??
      statsRoot.statistics?.totalAbsent,
  );

  const lateMinutes = toNumber(
    summary?.totalLateMinutes ??
      summary?.lateMinutes ??
      statsRoot.statistics?.totalLateArrivals,
  );

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

export const useDashboard = () => {
  // Fetch aggregated dashboard payload (reduces multiple /stats calls)
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'home'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/dashboard/home');
        return response.data ?? {
          totalEmployees: 0,
          totalDueSalaries: 0,
          totalReceivedSalaries: 0,
          totalLateMinutesToday: 0,
          totalOvertimeMinutesToday: 0,
          activeToday: 0,
          totalAbsentToday: 0,
        };
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return {
          totalEmployees: 0,
          totalDueSalaries: 0,
          totalReceivedSalaries: 0,
          totalLateMinutesToday: 0,
          totalOvertimeMinutesToday: 0,
          activeToday: 0,
          totalAbsentToday: 0,
        };
      }
    },
    staleTime: 60_000,
  });
  
  const dashboard = dashboardQuery.data as {
    totalEmployees?: number;
    attendance?: { count?: number; employees?: unknown[] };
    absence?: { count?: number; employees?: unknown[] };
    totalDueSalaries?: number;
    totalReceivedSalaries?: number;
    lateness?: { totalMinutes?: number };
    overtime?: { totalMinutes?: number };
  } | null;

  const activeToday = attendanceSummary.active || attendanceMetrics.active;
  const totalEmployees = attendanceMetrics.totalEmployees || employeesStats.total || 0;
  const totalAbsentToday = attendanceSummary.absent || attendanceMetrics.absent;
  const totalLateMinutesToday = attendanceSummary.lateMinutes || attendanceMetrics.totalLateMinutes;
  const totalOvertimeMinutesToday = attendanceMetrics.totalOvertimeMinutes;

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
      attendanceQuery.isLoading ||
      payrollSummaryQuery.isLoading,
    isError:
      queries.some((q) => q.isError) ||
      Boolean(employeesQuery.error) ||
      Boolean(salariesQuery.error) ||
      Boolean(attendanceQuery.error) ||
      Boolean(payrollSummaryQuery.error),
  };
};


