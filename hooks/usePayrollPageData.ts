"use client";

import { useMemo } from "react";
import useSalaries from "@/hooks/useSalaries";
import { useBonuses } from "@/hooks/useBonuses";
import { useDiscounts } from "@/hooks/useDiscounts";
import { usePenalties } from "@/hooks/usePenalties";
import { usePayrollReport } from "@/hooks/usePayrollReport";
import { useResignedEmployees, useEmployees } from "@/hooks/useEmployees";
import { usePayrollInputs } from "@/hooks/usePayrollInputs";
import { useAttendanceDeductions } from "@/hooks/useAttendanceDeductions";
import { useAttendance } from "@/hooks/useAttendance";
import { useLeaves } from "@/hooks/useLeaves";
import { toNumber } from "@/lib/number-utils";
import {
  calcEarnedSalaryHourly,
  calcLateMinutes,
  STANDARD_WORK_DAYS,
  HOURS_PER_DAY,
} from "@/lib/payroll-calc";
import type { AttendanceDeductionBreakdown } from "@/types/attendance-deduction";
import type { AggregatedPayroll } from "@/types/payroll-aggregated";
import type { Employee } from "@/types/employee";
import type { PayrollItem } from "@/types/payroll";

export function usePayrollPageData(month: string) {
  // ── Period boundaries ──────────────────────────────────────────────────────
  const { periodStart, periodEnd } = useMemo(() => {
    if (!month) return { periodStart: undefined, periodEnd: undefined };
    const [year, m] = month.split("-");
    const startDate = `${year}-${m}-01`;
    const endDay = new Date(Number(year), Number(m), 0).getDate();
    const endDate = `${year}-${m}-${String(endDay).padStart(2, "0")}`;
    return { periodStart: startDate, periodEnd: endDate };
  }, [month]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: salaries = [], isLoading: salariesLoading } = useSalaries();
  const { data: bonuses = [], isLoading: bonusesLoading } = useBonuses({ period: month });
  const { data: discounts = [], isLoading: discountsLoading } = useDiscounts(undefined, month);
  const { data: reportData, isLoading: reportLoading } = usePayrollReport(month);
  const { data: allResignedEmployees = [] } = useResignedEmployees();

  const { data: rawEmployees, isLoading: employeesLoading } = useEmployees({ limit: 500 });
  const employees = useMemo(
    () => (Array.isArray(rawEmployees) ? rawEmployees : []),
    [rawEmployees],
  );

  const { data: penalties = [], isLoading: penaltiesLoading } = usePenalties({
    startDate: periodStart,
    endDate: periodEnd,
  });

  const { data: payrollInputs = [], isLoading: inputsLoading } = usePayrollInputs(
    periodStart,
    periodEnd,
  );

  const { data: deductionsResponse, isLoading: deductionsLoading } = useAttendanceDeductions({
    periodStart: periodStart ?? "",
    periodEnd: periodEnd ?? "",
  });

  const autoDeductions = useMemo<AttendanceDeductionBreakdown[]>(() => {
    if (!deductionsResponse) return [];
    if (Array.isArray(deductionsResponse.data)) return deductionsResponse.data;
    return [];
  }, [deductionsResponse]);

  const { data: monthlyLeaves = [] } = useLeaves({
    startDate: periodStart,
    endDate: periodEnd,
  });

  const { data: monthlyAttendanceData, isLoading: attendanceLoading } = useAttendance({
    period: month,
    limit: 500,
  });

  // ── Derived maps ───────────────────────────────────────────────────────────
  const employeeLeavesMap = useMemo(() => {
    const map = new Map<
      string,
      {
        leaveTypes: string[];
        paidLeaveDays: number;
        sickLeaveDays: number;
        unpaidLeaveDays: number;
        countedDates: Set<string>;
      }
    >();
    if (!periodStart || !periodEnd) return map;

    for (const leave of monthlyLeaves) {
      if (!leave.employeeId || !leave.leaveType) continue;
      if (leave.status && leave.status !== "APPROVED") continue;

      const leaveStart = leave.startDate?.slice(0, 10);
      const leaveEnd = leave.endDate?.slice(0, 10);
      if (!leaveStart || !leaveEnd) continue;

      const effectiveStart = leaveStart < periodStart ? periodStart : leaveStart;
      const effectiveEnd = leaveEnd > periodEnd ? periodEnd : leaveEnd;
      if (effectiveStart > effectiveEnd) continue;

      if (!map.has(leave.employeeId)) {
        map.set(leave.employeeId, {
          leaveTypes: [],
          paidLeaveDays: 0,
          sickLeaveDays: 0,
          unpaidLeaveDays: 0,
          countedDates: new Set(),
        });
      }
      const entry = map.get(leave.employeeId)!;
      if (!entry.leaveTypes.includes(leave.leaveType)) entry.leaveTypes.push(leave.leaveType);

      const cur = new Date(effectiveStart);
      const endD = new Date(effectiveEnd);
      while (cur <= endD) {
        const dateStr = cur.toISOString().slice(0, 10);
        if (!entry.countedDates.has(dateStr)) {
          entry.countedDates.add(dateStr);
          if (leave.leaveType === "SICK") {
            entry.sickLeaveDays++;
          } else if (leave.isPaid) {
            entry.paidLeaveDays++;
          } else {
            entry.unpaidLeaveDays++;
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [monthlyLeaves, periodStart, periodEnd]);

  const localLateMinutesMap = useMemo(() => {
    const map = new Map<string, number>();
    const dailyRecords = monthlyAttendanceData?.dailyRecords || [];
    for (const dr of dailyRecords) {
      if (!dr.checkIn) continue;
      const emp = employees.find((e) => e.employeeId === dr.employeeId);
      const scheduledStart = emp?.scheduledStart || "08:00";
      const gracePeriod =
        emp && typeof (emp as { gracePeriodMinutes?: number }).gracePeriodMinutes === "number"
          ? (emp as { gracePeriodMinutes: number }).gracePeriodMinutes
          : 5;
      const lateMin = calcLateMinutes(dr.checkIn, scheduledStart, gracePeriod);
      if (lateMin > 0) map.set(dr.employeeId, (map.get(dr.employeeId) ?? 0) + lateMin);
    }
    return map;
  }, [monthlyAttendanceData?.dailyRecords, employees]);

  const localPresentDaysMap = useMemo(() => {
    const map = new Map<string, number>();
    const dailyRecords = monthlyAttendanceData?.dailyRecords || [];
    for (const dr of dailyRecords) {
      if (!dr.checkIn) continue;
      map.set(dr.employeeId, (map.get(dr.employeeId) ?? 0) + 1);
    }
    return map;
  }, [monthlyAttendanceData?.dailyRecords]);

  // ── Employee sets ──────────────────────────────────────────────────────────
  const allResignedList = useMemo<Employee[]>(() => {
    return allResignedEmployees.filter(
      (emp) =>
        (emp.status === "resigned" || emp.status === "terminated") &&
        !emp.isSettled &&
        emp.financialSettlementStatus !== "completed",
    );
  }, [allResignedEmployees]);

  const resignedEmployeeIds = useMemo(
    () => new Set(allResignedEmployees.map((emp) => emp.employeeId)),
    [allResignedEmployees],
  );

  // ── Shared per-employee computation (active + resigned) ────────────────────
  type ComputedRow = {
    row: AggregatedPayroll;
    workedMinutes: number;
    workedDays: number;
  };

  const payrollByEmployee = useMemo(() => {
    const map = new Map<string, ComputedRow>();

    const build = (emp: Employee): ComputedRow => {
      const employeeId = emp.employeeId;
      const salaryConfig = salaries.find((s) => s.employeeId === employeeId) ?? null;
      const department = emp.department || salaryConfig?.profession?.trim() || "أقسام عامة";

      let calcGross = 0;
      if (salaryConfig) {
        calcGross =
          toNumber(salaryConfig.baseSalary) +
          (toNumber(salaryConfig.livingAllowance) || 0);
      }
      if (calcGross <= 0) {
        calcGross =
          toNumber((emp as { baseSalary?: number }).baseSalary) ||
          toNumber((emp as { hourlyRate?: number }).hourlyRate) *
            HOURS_PER_DAY *
            STANDARD_WORK_DAYS;
      }

      const manualInput = payrollInputs.find((pi) => pi.employeeId === employeeId);
      const autoInput = autoDeductions.find(
        (d: AttendanceDeductionBreakdown) => d.employeeId === employeeId,
      );
      const hasManualInput = !!manualInput;
      const leaveData = employeeLeavesMap.get(employeeId);

      const autoLateMinutes = autoInput?.delayMinutes ?? localLateMinutesMap.get(employeeId) ?? 0;
      const lateMinutes =
        hasManualInput && (manualInput.lateMinutes ?? 0) > 0
          ? (manualInput.lateMinutes ?? 0)
          : autoLateMinutes;

      const sickLeaveDays = Math.max(
        hasManualInput ? (manualInput.sickLeaveDays ?? 0) : 0,
        leaveData?.sickLeaveDays ?? 0,
      );
      const paidLeaveDays = Math.max(
        hasManualInput
          ? (manualInput.adminLeaveDays ?? 0) + (manualInput.deathLeaveDays ?? 0)
          : 0,
        leaveData?.paidLeaveDays ?? 0,
      );
      const earlyLeaveMinutes =
        manualInput?.earlyLeaveMinutes ?? autoInput?.earlyLeaveMinutes ?? 0;
      const totalOvertimeMinutes =
        hasManualInput && (manualInput.overtimeRegularMinutes ?? 0) > 0
          ? (manualInput.overtimeRegularMinutes ?? 0)
          : (autoInput?.overtimeMinutes ?? 0);
      const totalOvertimeDays =
        hasManualInput && (manualInput.overtimeWeekendDays ?? 0) > 0
          ? (manualInput.overtimeWeekendDays ?? 0)
          : (autoInput?.overtimeWeekendDays ?? 0);

      const insuranceAmount = salaryConfig ? toNumber(salaryConfig.insuranceAmount) : 0;
      const workDaysInPeriod = (emp as { workDaysInPeriod?: number }).workDaysInPeriod ?? STANDARD_WORK_DAYS;
      const hoursPerDayEmp = (emp as { hoursPerDay?: number }).hoursPerDay ?? HOURS_PER_DAY;

      const workedDays = localPresentDaysMap.get(employeeId) ?? 0;
      const workedMinutes =
        autoInput?.workedMinutes ?? workedDays * hoursPerDayEmp * 60;

      const rawEarned = calcGross > 0
        ? calcEarnedSalaryHourly(
            calcGross,
            workDaysInPeriod,
            hoursPerDayEmp,
            workedMinutes,
            autoInput?.sickRemainderMinutes ?? 0,
            sickLeaveDays,
            paidLeaveDays,
            totalOvertimeMinutes,
            lateMinutes,
            earlyLeaveMinutes,
            totalOvertimeDays,
          )
        : 0;
      const earnedSalary = Math.max(0, rawEarned - insuranceAmount);

      const employeeBonuses = bonuses.filter(
        (b) => b.employeeId === employeeId && b.bonusReason !== "زيادة في الراتب",
      );
      const variableEarnings = employeeBonuses.reduce((sum, bonus) => {
        const bonusAmt = toNumber(bonus.bonusAmount);
        const assistAmt = toNumber((bonus as { assistanceAmount?: number }).assistanceAmount);
        return sum + bonusAmt + assistAmt;
      }, 0);

      const employeeAdvances = discounts.filter(
        (d) => d.employeeId === employeeId && d.kind === "advance" && d.date.startsWith(month),
      );
      const employeePenalties = penalties.filter(
        (p) => p.employeeId === employeeId && p.issueDate.startsWith(month),
      );
      const variableDeductions =
        employeeAdvances.reduce((sum, d) => sum + toNumber(d.amount), 0) +
        employeePenalties.reduce((sum, p) => sum + toNumber(p.amount), 0);

      const netPay =
        earnedSalary + variableEarnings - variableDeductions;
      const netPayRounded = Math.ceil(netPay / 1000) * 1000;
      const roundingDifference = netPayRounded - netPay;
      const totalDeductionsAmount = variableDeductions;

      const row: AggregatedPayroll = {
        employeeId,
        employeeName: emp.name,
        department,
        grossPay: calcGross,
        totalDeductions: totalDeductionsAmount,
        netPay,
        netPayRounded,
        roundingDifference,
        anomalies: [],
        attendanceBasedSalary: earnedSalary,
        earnedSalary,
        bonusesTotal: variableEarnings,
        discountsTotal: variableDeductions,
        fixedEarnings: calcGross,
        variableEarnings,
        fixedDeductions: insuranceAmount,
        variableDeductions,
        totalEarlyLeaveMinutes: earlyLeaveMinutes,
        earlyLeaveDeduction: 0,
        busDeduction: 0, // Preview mode — bus deduction unavailable before payroll run
        details: {
          salaryConfig,
          bonuses: employeeBonuses,
          deductions: [...employeeAdvances, ...employeePenalties],
          attendance: null,
        },
      };

      return { row, workedMinutes, workedDays };
    };

    const activeEmployees = employees.filter(
      (e) => e.status === "active" && !resignedEmployeeIds.has(e.employeeId),
    );
    for (const emp of activeEmployees) map.set(emp.employeeId, build(emp));
    for (const emp of allResignedList) map.set(emp.employeeId, build(emp));

    return map;
  }, [
    employees,
    allResignedList,
    salaries,
    bonuses,
    discounts,
    penalties,
    month,
    payrollInputs,
    autoDeductions,
    localLateMinutesMap,
    localPresentDaysMap,
    employeeLeavesMap,
    resignedEmployeeIds,
  ]);

  const resignedPayrollMap = useMemo(() => {
    const map = new Map<
      string,
      {
        earnedSalary: number;
        bonusesTotal: number;
        discountsTotal: number;
        netPayRounded: number;
        workedMinutes: number;
        workedDays: number;
      }
    >();
    const backendPayrollItems = reportData?.items || [];

    for (const emp of allResignedList) {
      const payrollItem = backendPayrollItems.find(
        (item: PayrollItem) => item.employeeId === emp.employeeId,
      );
      if (payrollItem) {
        map.set(emp.employeeId, {
          earnedSalary: toNumber(payrollItem.attendanceBasedSalary),
          bonusesTotal: toNumber(payrollItem.totalBonuses),
          discountsTotal: toNumber(payrollItem.totalDeductions),
          netPayRounded: toNumber(payrollItem.netPayRounded),
          workedMinutes: 0,
          workedDays: 0,
        });
      } else {
        const computed = payrollByEmployee.get(emp.employeeId);
        map.set(emp.employeeId, {
          earnedSalary: computed?.row.earnedSalary ?? 0,
          bonusesTotal: computed?.row.bonusesTotal ?? 0,
          discountsTotal: computed?.row.discountsTotal ?? 0,
          netPayRounded: computed?.row.netPayRounded ?? 0,
          workedMinutes: computed?.workedMinutes ?? 0,
          workedDays: computed?.workedDays ?? 0,
        });
      }
    }
    return map;
  }, [allResignedList, reportData?.items, payrollByEmployee]);

  // ── Preview data (when no backend payroll run yet) ─────────────────────────
  const previewData = useMemo<AggregatedPayroll[]>(() => {
    return employees
      .filter((e) => e.status === "active" && !resignedEmployeeIds.has(e.employeeId))
      .map((emp) => payrollByEmployee.get(emp.employeeId)?.row)
      .filter((r): r is AggregatedPayroll => !!r);
  }, [employees, payrollByEmployee, resignedEmployeeIds]);

  // ── Final payroll rows (backend run if available, else preview) ────────────
  const payrollData = useMemo<AggregatedPayroll[]>(() => {
    const backendPayrollItems = (reportData?.items || []).filter(
      (item: PayrollItem) => !resignedEmployeeIds.has(item.employeeId),
    );

    if (!backendPayrollItems.length) return previewData;

    return backendPayrollItems.map((backendItem: PayrollItem) => {
      const { employeeId, employeeName } = backendItem;
      const salaryConfig = salaries.find((s) => s.employeeId === employeeId) ?? null;
      const department =
        backendItem.department?.trim() || salaryConfig?.profession?.trim() || "أقسام عامة";

      const grossPay = toNumber(backendItem.grossPay);
      const totalBonuses = toNumber(backendItem.totalBonuses);
      const totalDeductions = toNumber(backendItem.totalDeductions);
      const netPay = toNumber(backendItem.netPay);
      const netPayRounded = toNumber(backendItem.netPayRounded);
      const roundingDifference = toNumber(backendItem.roundingDifference);
      const attendanceBasedSalary = toNumber(backendItem.attendanceBasedSalary);
      const earlyLeaveMinutes = Number(backendItem.earlyLeaveMinutes ?? 0);
      const earlyLeaveDeduction = toNumber(backendItem.earlyLeaveDeduction);
      const anomalies: string[] = Array.isArray(backendItem.anomalies) ? backendItem.anomalies : [];
      const fixedDeductions = toNumber(salaryConfig?.insuranceAmount);
      // خصم الباص منفصلاً — الباك إند يحسبه ويُرسله ضمن PayrollItem
      const busDeduction = toNumber((backendItem as { busDeduction?: unknown }).busDeduction ?? 0);

      return {
        employeeId,
        employeeName,
        department,
        grossPay,
        totalDeductions,
        netPay,
        netPayRounded,
        roundingDifference,
        anomalies,
        attendanceBasedSalary,
        earnedSalary: attendanceBasedSalary,
        bonusesTotal: totalBonuses,
        discountsTotal: totalDeductions,
        fixedEarnings: grossPay,
        variableEarnings: totalBonuses,
        fixedDeductions,
        variableDeductions: totalDeductions - fixedDeductions,
        totalEarlyLeaveMinutes: earlyLeaveMinutes,
        earlyLeaveDeduction,
        busDeduction,
        details: { salaryConfig, bonuses: [], deductions: [], attendance: null },
      } satisfies AggregatedPayroll;
    });
  }, [reportData, salaries, previewData, resignedEmployeeIds]);

  const isLoading =
    salariesLoading ||
    bonusesLoading ||
    reportLoading ||
    employeesLoading ||
    inputsLoading ||
    deductionsLoading ||
    attendanceLoading ||
    discountsLoading ||
    penaltiesLoading;

  const hasNoPayrollRun = !reportLoading && (!reportData?.items || reportData.items.length === 0);

  return {
    payrollData,
    allResignedList,
    resignedPayrollMap,
    resignedPendingCount: allResignedList.length,
    isLoading,
    hasNoPayrollRun,
  };
}
