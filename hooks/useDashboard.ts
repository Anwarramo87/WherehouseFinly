import { useQuery } from '@tanstack/react-query';
import type { DashboardKpis, EmployeesStats, AttendanceStats, InventoryStats } from '@/types/dashboard';
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
    queryFn: () =>
      withFallback(
        () => api.get<DashboardKpis>('/dashboard/home'),
        {
          totalEmployees: 0,
          totalDueSalaries: 0,
          totalReceivedSalaries: 0,
          totalLateMinutesToday: 0,
          totalOvertimeMinutesToday: 0,
          activeToday: 0,
          totalAbsentToday: 0,
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
  const totalReceivedSalaries = dashboard?.totalReceivedSalaries ?? 0;

  const kpis: DashboardKpis = {
    ...fallbackKpis,
    totalEmployees: dashboard?.totalEmployees ?? totalEmployees,
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


