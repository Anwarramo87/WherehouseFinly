import { useQuery } from '@tanstack/react-query';

import type { EmployeesStats, AttendanceStats, InventoryStats, DashboardKpis } from '@/types/dashboard';
import apiClient from '@/lib/api-client';

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

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
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

  // Extract values from dashboard response with proper null checks
  const activeToday = toNumber(
    (dashboard as { attendance?: { count?: number } })?.attendance?.count ??
    (dashboard as { activeToday?: number })?.activeToday
  );
  const totalEmployees = toNumber(dashboard?.totalEmployees);
  const totalAbsentToday = toNumber(
    (dashboard as { absence?: { count?: number } })?.absence?.count
  );
  const totalLateMinutesToday = toNumber(
    (dashboard as { lateness?: { totalMinutes?: number } })?.lateness?.totalMinutes ??
    (dashboard as { totalLateMinutesToday?: number })?.totalLateMinutesToday
  );
  const totalOvertimeMinutesToday = toNumber(
    (dashboard as { overtime?: { totalMinutes?: number } })?.overtime?.totalMinutes ??
    (dashboard as { totalOvertimeMinutesToday?: number })?.totalOvertimeMinutesToday
  );
  const totalDueSalaries = toNumber(dashboard?.totalDueSalaries);

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
    employeesStats: fallbackEmployeesStats,
    attendanceStats: fallbackAttendanceStats,
    inventoryStats: fallbackInventoryStats,
    kpis,
    isLoading: dashboardQuery.isLoading,
    isError: dashboardQuery.isError,
  };
};



