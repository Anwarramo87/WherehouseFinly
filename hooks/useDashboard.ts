import { useQuery } from '@tanstack/react-query';
import type { EmployeesStats, AttendanceStats, InventoryStats, DashboardKpis } from '@/types/dashboard';
import { api } from '@/lib/http/api';

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
  totalReceivedSalaries: 0,
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
          totalReceivedSalaries: 0,
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
    totalReceivedSalaries?: number;
    lateness?: { totalMinutes?: number };
    overtime?: { totalMinutes?: number };
  } | null;

  const activeToday = dashboard?.attendance?.count ?? 0;
  const totalEmployees = dashboard?.totalEmployees ?? 0;
  const totalAbsentToday = dashboard?.absence?.count ?? 0;
  const totalLateMinutesToday = dashboard?.lateness?.totalMinutes ?? 0;
  const totalOvertimeMinutesToday = dashboard?.overtime?.totalMinutes ?? 0;
  const totalDueSalaries = dashboard?.totalDueSalaries ?? 0;
  const totalReceivedSalaries = dashboard?.totalReceivedSalaries ?? 0;

  // Compatibility shims for existing consumers
  const employeesStats: EmployeesStats = {
    ...fallbackEmployeesStats,
    total: totalEmployees,
  };

  const attendanceStats: AttendanceStats = {
    ...fallbackAttendanceStats,
    summary: {
      activeEmployees: activeToday,
      absentCount: totalAbsentToday,
      totalLateMinutes: totalLateMinutesToday,
    },
  } as AttendanceStats;

  const inventoryStats: InventoryStats = fallbackInventoryStats;

  const kpis: DashboardKpis = {
    ...fallbackKpis,
    totalEmployees,
    activeToday,
    totalAbsentToday,
    totalDueSalaries,
    totalReceivedSalaries,
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


