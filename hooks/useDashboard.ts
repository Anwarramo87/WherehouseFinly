import { useQuery } from '@tanstack/react-query';
import type { DashboardKpis, EmployeesStats, AttendanceStats, InventoryStats } from '@/types/dashboard';
import { api } from '@/lib/http/api';
import { toNumber } from '@/lib/number-utils';

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
    queryFn: async () => {
      try {
        const response = await api.get('/dashboard/home') as unknown as { data?: unknown } | unknown;
        // Handle both cases: response directly is the data OR response has data property
        let data: unknown;
        if (response && typeof response === 'object' && 'data' in response) {
          data = response.data;
        } else {
          data = response;
        }
        return data ?? {
          totalEmployees: 0,
          totalDueSalaries: 0,
          totalReceivedSalaries: 0,
          totalLateMinutesToday: 0,
          totalOvertimeMinutesToday: 0,
          activeToday: 0,
          totalAbsentToday: 0,
        };
      } catch {
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
    staleTime: 60_000, // 60 seconds instead of 15
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

  const activeToday = toNumber(dashboard?.attendance?.count);
  const totalEmployees = toNumber(dashboard?.totalEmployees);
  const totalAbsentToday = toNumber(dashboard?.absence?.count);
  const totalLateMinutesToday = toNumber(dashboard?.lateness?.totalMinutes);
  const totalOvertimeMinutesToday = toNumber(dashboard?.overtime?.totalMinutes);
  const totalDueSalaries = toNumber(dashboard?.totalDueSalaries);
  const totalReceivedSalaries = toNumber(dashboard?.totalReceivedSalaries);

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


