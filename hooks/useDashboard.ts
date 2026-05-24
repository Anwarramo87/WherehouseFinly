import { useQuery } from '@tanstack/react-query';
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
  // Fetch aggregated dashboard payload (reduces multiple /stats calls)
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'home'],
    queryFn: () =>
      withFallback(
        () => api.get<any>('/dashboard/home'),
        {
          totalEmployees: 0,
          attendance: { count: 0, employees: [] },
          absence: { count: 0, employees: [] },
          totalDueSalaries: 0,
          lateness: { totalMinutes: 0, count: 0, employees: [] },
          overtime: { totalMinutes: 0, count: 0, employees: [] },
          reportDate: getLocalDateString(),
        },
      ),
    staleTime: 60_000,
  });
  const dashboard = dashboardQuery.data as {
    totalEmployees?: number;
    attendance?: { count?: number; employees?: unknown[] };
    absence?: { count?: number; employees?: unknown[] };
    totalDueSalaries?: number;
    lateness?: { totalMinutes?: number };
    overtime?: { totalMinutes?: number };
  } | null;

  // Derive attendance summary from aggregated payload (simpler and resilient)
  const attendanceSummary = {
    active: dashboard?.attendance?.count ?? 0,
    absent: dashboard?.absence?.count ?? 0,
    lateMinutes: dashboard?.lateness?.totalMinutes ?? 0,
  };

  // Compatibility shims for existing consumers
  const employeesStats: EmployeesStats = {
    ...fallbackEmployeesStats,
    total: dashboard?.totalEmployees ?? fallbackEmployeesStats.total,
  };

  const attendanceStats: AttendanceStats = {
    ...fallbackAttendanceStats,
    summary: {
      activeEmployees: attendanceSummary.active,
      absentCount: attendanceSummary.absent,
      totalLateMinutes: attendanceSummary.lateMinutes,
    },
  } as AttendanceStats;

  const inventoryStats: InventoryStats = fallbackInventoryStats;

  const activeToday = attendanceSummary.active;
  const totalEmployees = employeesStats.total || 0;
  const totalAbsentToday = attendanceSummary.absent;
  const totalLateMinutesToday = attendanceSummary.lateMinutes;
  const totalOvertimeMinutesToday = dashboard?.overtime?.totalMinutes ?? 0;

  const totalDueSalaries = dashboard?.totalDueSalaries ?? 0;

  const kpis: DashboardKpis = {
    ...fallbackKpis,
    totalEmployees: dashboard?.totalEmployees ?? totalEmployees,
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
    isLoading: dashboardQuery.isLoading,
    isError: Boolean(dashboardQuery.error),
  };
};


