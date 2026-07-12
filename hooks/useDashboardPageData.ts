"use client";

import { useMemo } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import useDepartments from "@/hooks/useDepartments";
import { useEmployees, useResignedEmployees } from "@/hooks/useEmployees";
import { useAdvances } from "@/hooks/useAdvances";
import { usePenalties } from "@/hooks/usePenalties";
import { useBonuses } from "@/hooks/useBonuses";

/**
 * Aggregates all data needed for the dashboard/home page
 */
export function useDashboardPageData() {
  const dashboardResult = useDashboard();
  const { data: departmentsData, isLoading: departmentsLoading } = useDepartments();
  const { data: employeesData, isLoading: employeesLoading } = useEmployees();
  const { data: resignedEmployeesData, isLoading: resignedLoading } = useResignedEmployees();
  const { data: advancesData, isLoading: advancesLoading } = useAdvances();
  const { data: penaltiesData, isLoading: penaltiesLoading } = usePenalties();
  const { data: bonusesData, isLoading: bonusesLoading } = useBonuses();

  const isLoading =
    dashboardResult.isLoading ||
    departmentsLoading ||
    employeesLoading ||
    resignedLoading ||
    advancesLoading ||
    penaltiesLoading ||
    bonusesLoading;

  const employees = useMemo(
    () => (Array.isArray(employeesData) ? employeesData : []),
    [employeesData],
  );

  const resignedEmployees = useMemo(
    () => (Array.isArray(resignedEmployeesData) ? resignedEmployeesData : []),
    [resignedEmployeesData],
  );

  const departments = useMemo(
    () => (Array.isArray(departmentsData) ? departmentsData : []),
    [departmentsData],
  );

  const advances = useMemo(
    () => (Array.isArray(advancesData) ? advancesData : []),
    [advancesData],
  );

  const penalties = useMemo(
    () => (Array.isArray(penaltiesData) ? penaltiesData : []),
    [penaltiesData],
  );

  const bonuses = useMemo(
    () => (Array.isArray(bonusesData) ? bonusesData : []),
    [bonusesData],
  );

  return {
    dashboard: dashboardResult,
    departments,
    employees,
    resignedEmployees,
    advances,
    penalties,
    bonuses,
    isLoading,
  };
}
