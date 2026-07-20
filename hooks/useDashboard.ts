import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState, useEffect } from "react";

import type { DashboardKpis } from "@/types/dashboard";
import apiClient from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

// Max time to show skeleton — after this show zeros rather than spinning forever
const SKELETON_TIMEOUT_MS = 4_000;

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
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export interface DashboardPresentEmployee {
  name: string;
  department: string | null;
  checkIn: string;
}

export interface DashboardAbsentEmployee {
  employeeId: string;
  name: string;
  department: string | null;
  scheduledStart: string | null;
}

export interface DashboardLateEmployee {
  employeeId: string;
  name: string;
  scheduledStart: string;
  checkIn: string;
  minutesLate: number;
}

export interface DashboardOvertimeEmployee {
  employeeId: string;
  name: string;
  department: string | null;
  scheduledEnd: string;
  actualCheckOut: string;
  overtimeMinutes: number;
  overtimePay: number;
}

export const useDashboard = () => {
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard.home(),
    queryFn: async () => {
      const response = await apiClient.get("/dashboard/home");
      return response.data ?? null;
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    retry: 1,
  });

  // Hard cap on skeleton time — if backend is slow, show zeros after timeout
  // rather than leaving the page stuck in skeleton state indefinitely
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (dashboardQuery.isLoading) {
      const t = setTimeout(() => setTimedOut(true), SKELETON_TIMEOUT_MS);
      return () => {
        clearTimeout(t);
        setTimedOut(false);
      };
    }
  }, [dashboardQuery.isLoading]);

  const dashboard = dashboardQuery.data as {
    totalEmployees?: number;
    attendance?: { count?: number; employees?: DashboardPresentEmployee[] };
    absence?: { count?: number; employees?: DashboardAbsentEmployee[] };
    totalDueSalaries?: number;
    totalReceivedSalaries?: number;
    lateness?: { totalMinutes?: number; count?: number; employees?: DashboardLateEmployee[] };
    overtime?: { totalMinutes?: number; count?: number; employees?: DashboardOvertimeEmployee[] };
    reportDate?: string;
  } | null;

  const activeToday = toNumber(dashboard?.attendance?.count);
  const totalEmployees = toNumber(dashboard?.totalEmployees);
  const totalAbsentToday = toNumber(dashboard?.absence?.count);
  const totalLateMinutesToday = toNumber(dashboard?.lateness?.totalMinutes);
  const totalOvertimeMinutesToday = toNumber(dashboard?.overtime?.totalMinutes);
  const totalDueSalaries = toNumber(dashboard?.totalDueSalaries);
  const totalReceivedSalaries = toNumber(dashboard?.totalReceivedSalaries);

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
    kpis,
    isLoading: dashboardQuery.isLoading && !timedOut,
    isError: dashboardQuery.isError,
    presentEmployees: dashboard?.attendance?.employees ?? [],
    absentEmployees: dashboard?.absence?.employees ?? [],
    lateEmployees: dashboard?.lateness?.employees ?? [],
    overtimeEmployees: dashboard?.overtime?.employees ?? [],
  };
};
