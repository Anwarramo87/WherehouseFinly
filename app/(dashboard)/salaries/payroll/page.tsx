"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Download,
  FileSpreadsheet,
  Wallet,
  Receipt,
  HandCoins,
  ChevronLeft,
  Search,
  Info,
  Play,
  UserMinus,
  ExternalLink,
  Calculator,
} from "lucide-react";
import useSalaries from "@/hooks/useSalaries";
import { useBonuses } from "@/hooks/useBonuses";
import { useDiscounts, DiscountRecord } from "@/hooks/useDiscounts";
import { usePenalties, PenaltyRecord } from "@/hooks/usePenalties";
import { usePayrollReport } from "@/hooks/usePayrollReport";
import { usePayroll } from "@/hooks/usePayroll";
import { useResignedEmployees, useEmployees } from "@/hooks/useEmployees";
import { usePayrollInputs } from "@/hooks/usePayrollInputs";
import { useAttendanceDeductions } from "@/hooks/useAttendanceDeductions";
import { useAttendance } from "@/hooks/useAttendance";
import { useLeaves } from "@/hooks/useLeaves";
import type { AttendanceDeductionBreakdown } from "@/types/attendance-deduction";
import { toast } from "react-hot-toast";
import { MonthPeriodSelector } from "@/components/MonthPeriodSelector";

import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual";
import PayrollRow from "@/components/PayrollRow";

import type { Salary } from "@/types/salary";
import type { Bonus } from "@/types/bonus";
import type { PayrollItem } from "@/types/payroll";
import type { Employee } from "@/types/employee";

// Lazy load heavy components
const RunPayrollModal = dynamic(() => import("@/components/RunPayrollModal"), {
  loading: () => <div className="text-center py-4">جاري التحميل...</div>,
  ssr: false,
});

const PayslipModal = dynamic(() => import("@/components/PayslipModal"), {
  ssr: false,
});

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

/**
 * One row in the payroll table.
 *
 * Financial totals (grossPay … roundingDifference) are ALWAYS sourced from the
 * backend payrollItem record.  The `fixedEarnings / variableEarnings /
 * fixedDeductions / variableDeductions` fields are display-only subtotals used
 * inside the payslip modal — they never override the server-authoritative figures.
 */
interface AggregatedPayroll {
  employeeId: string;
  employeeName: string;
  /** From employee.department in the backend — NOT from salaryConfig.profession */
  department: string;

  // ✅ Server-authoritative figures — sourced from payrollItem
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  netPayRounded: number;
  roundingDifference: number;
  anomalies: string[];

  // 💰 Earned salary based on actual work days (hoursWorked × hourlyRate) — from attendance
  bonusesTotal: number;

  // ✂️ Total deductions from the discounts/advances page (advances + penalties + other)
  discountsTotal: number;

  // 📋 Visual-only subtotals for the payslip modal
  fixedEarnings: number;
  variableEarnings: number;
  fixedDeductions: number;
  variableDeductions: number;

  // 💰 Earned salary based on actual work days (hoursWorked × hourlyRate) — from attendance
  earnedSalary: number;

  // ✂️ Early leave / missing minutes deduction (from backend payroll run)
  totalEarlyLeaveMinutes: number;
  earlyLeaveDeduction: number;

  details: {
    salaryConfig: Salary | null;
    bonuses: Bonus[];
    deductions: (DiscountRecord | PenaltyRecord)[];
    attendance: null;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely converts any backend numeric representation to a JS number.
 * Handles: plain number | numeric string | Prisma $numberDecimal object.
 */
const toNumber = (value: unknown): number => {
  if (
    value != null &&
    typeof value === "object" &&
    "$numberDecimal" in (value as Record<string, unknown>)
  ) {
    return Number((value as { $numberDecimal: string }).$numberDecimal || 0);
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getLocalMonth = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

/**
 * حساب الراتب المستحق من ساعات العمل الفعلية ومعدل الساعة
 * نفس المنطق المستخدم في صفحة TimeTable
 */
// const calcEarnedSalaryFromHours = (
//   hoursWorked: number,
//   hourlyRate: number
// ): number => {
//   return hoursWorked * hourlyRate;
// };

const STANDARD_WORK_DAYS = 26;
const HOURS_PER_DAY = 8;

/**
 * حساب الراتب المستحق — نفس الصيغة المستخدمة في صفحة TimeTable بالضبط
 * الصيغة:
 *   (grossSalary / STANDARD_WORK_DAYS) * paidDays
 *   + إضافي عادي (دقائق × 1.5×)
 *   + إضافي جمعة (أيام × dailyRate × 1.5×)
 *   - خصم التأخير (دقائق × 1.5×)
 *   - خصم الخروج المبكر (دقائق × 1.0×)
 */
const calcEarnedSalary = (
  grossSalary: number,
  presentDays: number,
  paidLeaveDays: number,
  lateMinutes: number,
  earlyLeaveMinutes = 0,
  overtimeMinutes = 0,
  overtimeWeekendDays = 0,
): number => {
  if (grossSalary <= 0) return 0;
  const paidDays = Math.min(presentDays + paidLeaveDays, STANDARD_WORK_DAYS);
  const dailyRate = grossSalary / STANDARD_WORK_DAYS;
  const minuteRate = dailyRate / (HOURS_PER_DAY * 60);
  const salaryFromDays = dailyRate * paidDays;
  const lateDeduction = lateMinutes * minuteRate * 1.5;
  const earlyLeaveDeduction = earlyLeaveMinutes * minuteRate;
  const overtimePay = overtimeMinutes * minuteRate * 1.5;
  const weekendOvertimePay = dailyRate * overtimeWeekendDays * 1.5;
  return Math.max(
    0,
    salaryFromDays - lateDeduction - earlyLeaveDeduction + overtimePay + weekendOvertimePay,
  );
};

const calcLateMinutes = (checkIn: string, scheduledStart: string, gracePeriod = 5): number => {
  if (!checkIn) return 0;
  const toMins = (t: string) => {
    const s = t.slice(0, 5);
    const [h, m] = s.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };
  const ci = toMins(checkIn);
  const sc = toMins(scheduledStart || "08:00");
  if (ci === null || sc === null) return 0;
  const diff = ci - sc - gracePeriod;
  return diff > 0 ? diff : 0;
};

// ─── Virtualized Payroll Table Wrapper (opts out of React Compiler) ────────────
// TanStack Virtual's `useVirtualizer` returns functions that cannot be memoized,
// so we isolate it in a "use no memo" component to keep the rest of the page compiled.
function PayrollVirtualTable({
  allRows,
  onSelectPayslip,
}: {
  allRows: Array<AggregatedPayroll>; // Removed union with isHeader type
  onSelectPayslip: (item: AggregatedPayroll) => void;
}) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (_index: number) => {
      // Removed conditional sizing for header rows
      return 96; // Assuming uniform row height
    },
    overscan: 5,
  });

  const parentRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
      dir="rtl"
    >
      <div
        ref={parentRef}
        className="w-full overflow-x-auto custom-scrollbar relative z-10"
        style={{ height: "75vh", minHeight: "500px" }}
      >
        <div
          className="flex w-full min-w-212.5 bg-slate-100 border-b border-slate-200 sticky top-0 z-20 shadow-sm"
        >
          {/* Employee (الموظف) */}
          <div className="w-[15%] justify-center px-4 py-4 font-bold text-xs text-slate-700 flex items-center">
            الموظف
          </div>
          {/* Earned Salary (الراتب المستحق) */}
          <div className="w-[15%] justify-center px-4 py-4 font-bold text-xs text-slate-700 border-r border-slate-200 flex items-center">
            الراتب المستحق
          </div>
          {/* Bonuses (المكافآت) */}
          <div className="w-[14%] justify-center px-4 py-4 font-bold text-xs text-slate-700 border-r border-slate-200 flex items-center">
            المكافآت
          </div>
          {/* Discounts (الخصومات) */}
          <div className="w-[14%] justify-center px-4 py-4 font-bold text-xs text-slate-700 border-r border-slate-200 flex items-center">
            الخصومات
          </div>
          {/* Total (المجموع) */}
          <div className="w-[15%] justify-center px-4 py-4 font-bold text-xs text-slate-700 border-r border-slate-200 flex items-center">
            المجموع
          </div>
          {/* Difference (الفرق) */}
          <div className="w-[10%] justify-center px-4 py-4 font-bold text-xs text-slate-700 bg-amber-50/50 border-r border-slate-200 flex items-center">
            الفرق
          </div>
          {/* Net Pay (الراتب المقبوض) */}
          <div className="w-[17%] justify-center px-4 py-4 font-bold text-xs text-amber-700 bg-amber-50/50 border-r border-amber-200/50 flex items-center">
            الراتب المقبوض
          </div>
        </div>

        <div style={{ position: "relative", height: `${rowVirtualizer.getTotalSize()}px` }}>
            {rowVirtualizer.getVirtualItems().map((virtualItem: VirtualItem) => {
              const row = allRows[virtualItem.index];
              // Removed isHeaderRow check and header row rendering logic
              return (
                <PayrollRow
                  key={virtualItem.index}
                  item={row}
                  onSelectPayslip={() => onSelectPayslip(row as AggregatedPayroll)}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                />
              );
            })}
          </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(searchParams.get("period") || getLocalMonth());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayslip, setSelectedPayslip] = useState<AggregatedPayroll | null>(null);
  const [isPayrollModalOpen, setPayrollModalOpen] = useState(false);
  // Hydration guard — prevents server/client mismatch on loading state
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  const { calculatePayroll } = usePayroll();

  // ── Fetch supporting data (for payslip modal display only) ───────────────────
  const { data: salaries = [], isLoading: salariesLoading } = useSalaries();
  const { data: bonuses = [], isLoading: bonusesLoading } = useBonuses({ period: month });
  const { data: discounts = [], isLoading: discountsLoading } = useDiscounts(undefined, month);
  const { data: reportData, isLoading: reportLoading } = usePayrollReport(month);
  const { data: allResignedEmployees = [] } = useResignedEmployees();

  // --- Attendance Hooks for Earned Salary Calculation ---
  // Fetch ALL employees (no status filter) to ensure we can properly filter locally
  const { data: rawEmployees, isLoading: employeesLoading } = useEmployees({ limit: 500 });
  const employees = useMemo(
    () => (Array.isArray(rawEmployees) ? rawEmployees : []),
    [rawEmployees],
  );

  const { periodStart, periodEnd } = useMemo(() => {
    if (!month) return { periodStart: undefined, periodEnd: undefined };
    const [year, m] = month.split("-");
    const startDate = `${year}-${m}-01`;
    const endDay = new Date(Number(year), Number(m), 0).getDate();
    const endDate = `${year}-${m}-${String(endDay).padStart(2, "0")}`;
    return { periodStart: startDate, periodEnd: endDate };
  }, [month]);

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

  // ── Leaves data (same as TimeTable) ──
  const { data: monthlyLeaves = [] } = useLeaves({
    startDate: periodStart,
    endDate: periodEnd,
  });

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

  const { data: monthlyAttendanceData, isLoading: attendanceLoading } = useAttendance({
    period: month,
    limit: 500,
  });

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
      if (lateMin > 0) {
        map.set(dr.employeeId, (map.get(dr.employeeId) ?? 0) + lateMin);
      }
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
  // ── All resigned/terminated employees for the payroll page ──
  // Only show employees with pending financial settlement
  const allResignedList = useMemo<Employee[]>(() => {
    return allResignedEmployees.filter(
      (emp) =>
        (emp.status === "resigned" || emp.status === "terminated") &&
        !emp.isSettled &&
        emp.financialSettlementStatus !== "completed",
    );
  }, [allResignedEmployees]);

  // Set of ALL resigned/terminated employee IDs — used to exclude them from the active payroll table
  const resignedEmployeeIds = useMemo(() => {
    return new Set(allResignedEmployees.map((emp) => emp.employeeId));
  }, [allResignedEmployees]);

  const resignedPendingCount = allResignedList.length;

  // ── Calculate full net pay for resigned employees (same logic as previewData) ──
  const resignedPayrollMap = useMemo(() => {
    const map = new Map<string, { earnedSalary: number; bonusesTotal: number; discountsTotal: number; netPayRounded: number }>();
    for (const emp of allResignedList) {
      const employeeId = emp.employeeId;
      const salaryConfig = salaries.find((s) => s.employeeId === employeeId) ?? null;

      let calcGross = 0;
      if (salaryConfig) {
        calcGross =
          toNumber(salaryConfig.baseSalary) +
          toNumber(salaryConfig.lumpSumSalary) +
          toNumber(salaryConfig.livingAllowance) +
          toNumber(salaryConfig.responsibilityAllowance) +
          toNumber(salaryConfig.extraEffortAllowance) +
          toNumber(salaryConfig.productionIncentive) +
          toNumber(salaryConfig.transportAllowance);
      }
      if (calcGross <= 0) {
        calcGross =
          toNumber((emp as { baseSalary?: number }).baseSalary) ||
          toNumber((emp as { hourlyRate?: number }).hourlyRate) * HOURS_PER_DAY * STANDARD_WORK_DAYS;
      }

      // Prorated present days based on termination date
      let presentDays = localPresentDaysMap.get(employeeId) ?? 0;
      if (emp.terminationDate && presentDays === 0) {
        const termDate = new Date(emp.terminationDate);
        const periodStartDate = new Date(termDate.getFullYear(), termDate.getMonth(), 1);
        presentDays = Math.max(1, Math.ceil((termDate.getTime() - periodStartDate.getTime()) / 86400000) + 1);
      }

      const manualInput = payrollInputs.find((pi) => pi.employeeId === employeeId);
      const autoInput = autoDeductions.find((d: AttendanceDeductionBreakdown) => d.employeeId === employeeId);
      const hasManualInput = !!manualInput;
      const leaveData = employeeLeavesMap.get(employeeId);

      const autoLateMinutes = autoInput?.delayMinutes ?? localLateMinutesMap.get(employeeId) ?? 0;
      const lateMinutes = hasManualInput && (manualInput.lateMinutes ?? 0) > 0 ? (manualInput.lateMinutes ?? 0) : autoLateMinutes;

      const sickLeaveDays = Math.max(hasManualInput ? (manualInput.sickLeaveDays ?? 0) : 0, leaveData?.sickLeaveDays ?? 0);
      const paidLeaveDays = Math.max(hasManualInput ? (manualInput.adminLeaveDays ?? 0) + (manualInput.deathLeaveDays ?? 0) : 0, leaveData?.paidLeaveDays ?? 0);
      const effectivePaidLeaveDays = paidLeaveDays + sickLeaveDays * 0.5;

      const earlyLeaveMinutes = manualInput?.earlyLeaveMinutes ?? autoInput?.earlyLeaveMinutes ?? 0;
      const totalOvertimeMinutes = hasManualInput && (manualInput.overtimeRegularMinutes ?? 0) > 0 ? (manualInput.overtimeRegularMinutes ?? 0) : (autoInput?.overtimeMinutes ?? 0);
      const totalOvertimeDays = hasManualInput && (manualInput.overtimeWeekendDays ?? 0) > 0 ? (manualInput.overtimeWeekendDays ?? 0) : (autoInput?.overtimeWeekendDays ?? 0);

      const insuranceAmount = salaryConfig ? toNumber(salaryConfig.insuranceAmount) : 0;
      const rawEarned = calcEarnedSalary(calcGross, presentDays, effectivePaidLeaveDays, lateMinutes, earlyLeaveMinutes, totalOvertimeMinutes, totalOvertimeDays);
      const earnedSalary = Math.max(0, rawEarned - insuranceAmount);

      const empBonuses = bonuses.filter((b) => b.employeeId === employeeId);
      const bonusesTotal = empBonuses.reduce((sum, b) => sum + toNumber(b.bonusAmount) + toNumber((b as { assistanceAmount?: number }).assistanceAmount), 0);

      const empAdvances = discounts.filter((d) => d.employeeId === employeeId && d.kind === "advance" && d.date.startsWith(month));
      const empPenalties = penalties.filter((p) => p.employeeId === employeeId && p.issueDate.startsWith(month));
      const discountsTotal = empAdvances.reduce((sum, d) => sum + toNumber(d.amount), 0) + empPenalties.reduce((sum, p) => sum + toNumber(p.amount), 0);

      const dailyRate = calcGross / STANDARD_WORK_DAYS;
      const earlyLeaveDed = earlyLeaveMinutes * (dailyRate / (HOURS_PER_DAY * 60));
      const netPay = earnedSalary + bonusesTotal - discountsTotal - earlyLeaveDed;
      const netPayRounded = Math.ceil(netPay / 1000) * 1000;

      map.set(employeeId, { earnedSalary, bonusesTotal, discountsTotal, netPayRounded });
    }
    return map;
  }, [allResignedList, salaries, bonuses, discounts, penalties, month, payrollInputs, autoDeductions, localLateMinutesMap, localPresentDaysMap, employeeLeavesMap]);

  // ── Build payroll rows ───────────────────────────────────────────────────────
  /**
   * Each row is driven by a payrollItem returned from GET /api/payroll/report/:month.
   * If no payroll run exists, we'll generate preview data from active employees.
   */
  const previewData = useMemo<AggregatedPayroll[]>(() => {
    // Generate preview data from active employees when no report exists
    // Dual-safeguard: (1) status must be 'active', (2) not in resigned/terminated set
    return employees
      .filter((e) => e.status === "active" && !resignedEmployeeIds.has(e.employeeId))
      .map((emp) => {
        const employeeId = emp.employeeId;
        const employeeName = emp.name;

        const salaryConfig = salaries.find((s) => s.employeeId === employeeId) ?? null;
        const department = emp.department || salaryConfig?.profession?.trim() || "أقسام عامة";

        // Calculate gross salary
        let calcGross = 0;
        if (salaryConfig) {
          calcGross =
            toNumber(salaryConfig.baseSalary) +
            toNumber(salaryConfig.lumpSumSalary) +
            toNumber(salaryConfig.livingAllowance) +
            toNumber(salaryConfig.responsibilityAllowance) +
            toNumber(salaryConfig.extraEffortAllowance) +
            toNumber(salaryConfig.productionIncentive) +
            toNumber(salaryConfig.transportAllowance);
        }
        if (calcGross <= 0) {
          calcGross =
            toNumber((emp as { baseSalary?: number }).baseSalary) ||
            toNumber((emp as { hourlyRate?: number }).hourlyRate) *
              HOURS_PER_DAY *
              STANDARD_WORK_DAYS;
        }

        // Calculate earned salary — same logic as TimeTable
        let earnedSalary = 0;
        const manualInput = payrollInputs.find((pi) => pi.employeeId === employeeId);
        const autoInput = autoDeductions.find(
          (d: AttendanceDeductionBreakdown) => d.employeeId === employeeId,
        );
        const hasManualInput = !!manualInput;
        const leaveData = employeeLeavesMap.get(employeeId);

        // Late minutes
        const autoLateMinutes = autoInput?.delayMinutes ?? localLateMinutesMap.get(employeeId) ?? 0;
        const lateMinutes =
          hasManualInput && (manualInput.lateMinutes ?? 0) > 0
            ? (manualInput.lateMinutes ?? 0)
            : autoLateMinutes;

        // Present days
        let actualWorkDays: number;
        if (hasManualInput && manualInput.absenceDays !== undefined) {
          actualWorkDays = Math.max(0, STANDARD_WORK_DAYS - manualInput.absenceDays);
        } else {
          const backendPresent = autoInput?.presentDays ?? 0;
          const localPresent = localPresentDaysMap.get(employeeId) ?? 0;
          actualWorkDays = Math.max(backendPresent, localPresent);
        }

        // Paid leave days (100% + 50% sick)
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
        const effectivePaidLeaveDays = paidLeaveDays + sickLeaveDays * 0.5;

        // Early leave minutes
        const earlyLeaveMinutes =
          manualInput?.earlyLeaveMinutes ?? autoInput?.earlyLeaveMinutes ?? 0;

        // Overtime
        const totalOvertimeMinutes =
          hasManualInput && (manualInput.overtimeRegularMinutes ?? 0) > 0
            ? (manualInput.overtimeRegularMinutes ?? 0)
            : (autoInput?.overtimeMinutes ?? 0);
        const totalOvertimeDays =
          hasManualInput && (manualInput.overtimeWeekendDays ?? 0) > 0
            ? (manualInput.overtimeWeekendDays ?? 0)
            : (autoInput?.overtimeWeekendDays ?? 0);

        // Insurance deduction
        const insuranceAmount = salaryConfig ? toNumber(salaryConfig.insuranceAmount) : 0;

        // Raw earned salary (before insurance)
        const rawEarned = calcEarnedSalary(
          calcGross,
          actualWorkDays,
          effectivePaidLeaveDays,
          lateMinutes,
          earlyLeaveMinutes,
          totalOvertimeMinutes,
          totalOvertimeDays,
        );
        earnedSalary = Math.max(0, rawEarned - insuranceAmount);

        // Bonuses - filter by employee, exclude permanent salary raises (already in baseSalary)
        const employeeBonuses = bonuses.filter(
          (b) => b.employeeId === employeeId && b.bonusReason !== "زيادة في الراتب"
        );
        const variableEarnings = employeeBonuses.reduce((sum, bonus) => {
          const bonusAmt = toNumber(bonus.bonusAmount);
          const assistAmt = toNumber((bonus as { assistanceAmount?: number }).assistanceAmount);
          return sum + bonusAmt + assistAmt;
        }, 0);

        // Deductions — only advances (kind='advance') from discounts + penalties
        const employeeAdvances = discounts.filter((d) => {
          return d.employeeId === employeeId && d.kind === "advance" && d.date.startsWith(month);
        });
        const employeePenalties = penalties.filter((p) => {
          return p.employeeId === employeeId && p.issueDate.startsWith(month);
        });

        const variableDeductions =
          employeeAdvances.reduce((sum, d) => sum + toNumber(d.amount), 0) +
          employeePenalties.reduce((sum, p) => sum + toNumber(p.amount), 0);

        // Calculate early leave deduction amount
        const dailyRate = calcGross / STANDARD_WORK_DAYS;
        const minuteRate = dailyRate / (HOURS_PER_DAY * 60);
        const earlyLeaveDeductionAmount = earlyLeaveMinutes * minuteRate;

        // ✅ FIXED: netPay = earnedSalary (already includes attendance adjustments - insurance) + bonuses - variable deductions - early leave
        // Insurance is already subtracted from earnedSalary, so we don't subtract it again
        const netPay =
          earnedSalary + variableEarnings - variableDeductions - earlyLeaveDeductionAmount;
        const netPayRounded = Math.ceil(netPay / 1000) * 1000;
        const roundingDifference = netPayRounded - netPay;

        // ✅ FIXED: totalDeductions should NOT include insurance (it's already in earnedSalary calc)
        // Only include variable deductions + early leave deduction
        const totalDeductionsAmount = variableDeductions + earlyLeaveDeductionAmount;

        return {
          employeeId,
          employeeName,
          department,
          grossPay: calcGross,
          totalDeductions: totalDeductionsAmount,
          netPay,
          netPayRounded,
          roundingDifference,
          anomalies: [],
          earnedSalary,
          bonusesTotal: variableEarnings,
          discountsTotal: variableDeductions,
          fixedEarnings: calcGross,
          variableEarnings,
          fixedDeductions: insuranceAmount,
          variableDeductions,
          totalEarlyLeaveMinutes: earlyLeaveMinutes,
          earlyLeaveDeduction: earlyLeaveDeductionAmount,
          details: {
            salaryConfig,
            bonuses: employeeBonuses,
            deductions: [...employeeAdvances, ...employeePenalties],
            attendance: null,
          },
        };
      });
  }, [
    employees,
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

  const payrollData = useMemo<AggregatedPayroll[]>(() => {
    // If we have a payroll run, use backend data — but EXCLUDE resigned/terminated employees
    const backendPayrollItems = reportData?.items || [];
    const filteredBackendPayrollItems = backendPayrollItems.filter((backendItem: PayrollItem) =>
      !resignedEmployeeIds.has(backendItem.employeeId)
    );

    let processedPayrollData: AggregatedPayroll[];

    if (filteredBackendPayrollItems.length) {
      processedPayrollData = filteredBackendPayrollItems.map((backendItem: PayrollItem) => {
        const { employeeId, employeeName } = backendItem;

        const salaryConfig = salaries.find((s) => s.employeeId === employeeId) ?? null;
        const department =
          backendItem.department?.trim() ||
          "" ||
          salaryConfig?.profession?.trim() ||
          "أقسام عامة";

        const grossPay = toNumber(backendItem.grossPay);

        const anomalies: string[] = Array.isArray(backendItem.anomalies)
          ? backendItem.anomalies
          : [];

        // ── 1. Calculate Earned Salary exactly as TimeTable ──────────────────────
        let earnedSalary = 0;
        let earlyLeaveMinutes = 0; // Track for early leave deduction calculation
        const emp = employees.find((e) => e.employeeId === employeeId);

        let calcGross = 0;
        if (salaryConfig) {
          calcGross =
            toNumber(salaryConfig.baseSalary) +
            toNumber(salaryConfig.lumpSumSalary) +
            toNumber(salaryConfig.livingAllowance) +
            toNumber(salaryConfig.responsibilityAllowance) +
            toNumber(salaryConfig.extraEffortAllowance) +
            toNumber(salaryConfig.productionIncentive) +
            toNumber(salaryConfig.transportAllowance);
        }
        if (calcGross <= 0 && emp) {
          calcGross =
            toNumber((emp as { baseSalary?: number }).baseSalary) ||
            toNumber((emp as { hourlyRate?: number }).hourlyRate) *
              HOURS_PER_DAY *
              STANDARD_WORK_DAYS;
        }

        if (emp) {
          const manualInput = payrollInputs.find((pi) => pi.employeeId === employeeId);
          const autoInput = autoDeductions.find(
            (d: AttendanceDeductionBreakdown) => d.employeeId === employeeId,
          );
          const hasManualInput = !!manualInput;
          const leaveData = employeeLeavesMap.get(employeeId);

          // Late minutes
          const autoLateMinutes =
            autoInput?.delayMinutes ?? localLateMinutesMap.get(employeeId) ?? 0;
          const lateMinutes =
            hasManualInput && (manualInput.lateMinutes ?? 0) > 0
              ? (manualInput.lateMinutes ?? 0)
              : autoLateMinutes;

          // Present days
          let actualWorkDays: number;
          if (hasManualInput && manualInput.absenceDays !== undefined) {
            actualWorkDays = Math.max(0, STANDARD_WORK_DAYS - manualInput.absenceDays);
          } else {
            const backendPresent = autoInput?.presentDays ?? 0;
            const localPresent = localPresentDaysMap.get(employeeId) ?? 0;
            actualWorkDays = Math.max(backendPresent, localPresent);
          }

          // Paid leave days (100% + 50% sick)
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
          const effectivePaidLeaveDays = paidLeaveDays + sickLeaveDays * 0.5;

          // Early leave minutes
          earlyLeaveMinutes = manualInput?.earlyLeaveMinutes ?? autoInput?.earlyLeaveMinutes ?? 0;

          // Overtime
          const totalOvertimeMinutes =
            hasManualInput && (manualInput.overtimeRegularMinutes ?? 0) > 0
              ? (manualInput.overtimeRegularMinutes ?? 0)
              : (autoInput?.overtimeMinutes ?? 0);
          const totalOvertimeDays =
            hasManualInput && (manualInput.overtimeWeekendDays ?? 0) > 0
              ? (manualInput.overtimeWeekendDays ?? 0)
              : (autoInput?.overtimeWeekendDays ?? 0);

          // Insurance deduction
          const insuranceAmount = salaryConfig ? toNumber(salaryConfig.insuranceAmount) : 0;

          const rawEarned = calcEarnedSalary(
            calcGross,
            actualWorkDays,
            effectivePaidLeaveDays,
            lateMinutes,
            earlyLeaveMinutes,
            totalOvertimeMinutes,
            totalOvertimeDays,
          );
          earnedSalary = Math.max(0, rawEarned - insuranceAmount);
        }

        // Bonuses - filter by employee, exclude permanent salary raises (already in baseSalary)
        const employeeBonuses = bonuses.filter(
          (b) => b.employeeId === employeeId && b.bonusReason !== "زيادة في الراتب"
        );
        const variableEarnings = employeeBonuses.reduce((sum, bonus) => {
          const bonusAmt = toNumber(bonus.bonusAmount);
          const assistAmt = toNumber((bonus as { assistanceAmount?: number }).assistanceAmount);
          return sum + bonusAmt + assistAmt;
        }, 0);

        // Deductions — only advances (kind='advance') + penalties
        const employeeAdvancesDisc = discounts.filter((d) => {
          return d.employeeId === employeeId && d.kind === "advance" && d.date.startsWith(month);
        });
        const employeePenaltiesDisc = penalties.filter((p) => {
          return p.employeeId === employeeId && p.issueDate.startsWith(month);
        });

        const variableDeductions =
          employeeAdvancesDisc.reduce((sum, d) => sum + toNumber(d.amount), 0) +
          employeePenaltiesDisc.reduce((sum, p) => sum + toNumber(p.amount), 0);

        // Calculate early leave deduction amount
        const backendEarlyLeaveMinutes = Number(backendItem.earlyLeaveMinutes ?? 0);
        const backendEarlyLeaveDeduction = toNumber(backendItem.earlyLeaveDeduction);

        // Use backend early leave deduction if available, otherwise calculate it
        const earlyLeaveDedAmount =
          backendEarlyLeaveDeduction > 0
            ? backendEarlyLeaveDeduction
            : (earlyLeaveMinutes * (calcGross / STANDARD_WORK_DAYS)) / (HOURS_PER_DAY * 60);

        // ✅ FIXED: netPay = earnedSalary (already includes attendance adjustments - insurance) + bonuses - variable deductions - early leave
        // Insurance is already subtracted from earnedSalary, so we don't subtract it again
        const computedNetPay =
          earnedSalary + variableEarnings - variableDeductions - earlyLeaveDedAmount;
        const computedNetPayRounded = Math.ceil(computedNetPay / 1000) * 1000;
        const computedRoundingDiff = computedNetPayRounded - computedNetPay;

        // ✅ FIXED: totalDeductions should NOT include insurance (it's already in earnedSalary calc)
        const totalDeductionsAmount = variableDeductions + earlyLeaveDedAmount;

        return {
          employeeId,
          employeeName,
          department,
          grossPay,
          totalDeductions: totalDeductionsAmount,
          netPay: computedNetPay,
          netPayRounded: computedNetPayRounded,
          roundingDifference: computedRoundingDiff,
          anomalies,
          earnedSalary,
          bonusesTotal: variableEarnings,
          discountsTotal: variableDeductions,
          fixedEarnings: calcGross,
          variableEarnings,
          fixedDeductions: toNumber(salaryConfig?.insuranceAmount),
          variableDeductions,
          totalEarlyLeaveMinutes: backendEarlyLeaveMinutes,
          earlyLeaveDeduction: earlyLeaveDedAmount,
          details: {
            salaryConfig,
            bonuses: employeeBonuses,
            deductions: [...employeeAdvancesDisc, ...employeePenaltiesDisc],
            attendance: null,
          },
        };
      });
    } else {
      processedPayrollData = previewData;
    }
    return processedPayrollData;
  }, [
    reportData,
    salaries,
    bonuses,
    discounts,
    penalties,
    month,
    employees,
    payrollInputs,
    autoDeductions,
    localLateMinutesMap,
    localPresentDaysMap,
    previewData,
    employeeLeavesMap,
    resignedEmployeeIds,
  ]);

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filteredPayrollData = useMemo(() => {
    if (!searchTerm) return payrollData;
    const q = searchTerm.toLowerCase();
    return payrollData.filter(
      (p) =>
        p.employeeName.toLowerCase().includes(q) ||
        p.employeeId.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q),
    );
  }, [payrollData, searchTerm]);

  // Flatten the data for virtualization, including department headers
  const allRows = useMemo(() => {
    // Removed grouping logic, now returns a flat array of AggregatedPayroll
    const rows: AggregatedPayroll[] = filteredPayrollData; // Changed type
    return rows;
  }, [
    filteredPayrollData,
  ]);

  // ── Grand totals (server figures only) ───────────────────────────────────────
  const globalTotals = useMemo(
    () =>
      filteredPayrollData.reduce(
        (acc, p) => ({
          totalEarnedSalary: acc.totalEarnedSalary + p.earnedSalary,
          totalBonuses: acc.totalBonuses + p.bonusesTotal,
          totalDiscounts: acc.totalDiscounts + p.discountsTotal,
          totalEarnings: acc.totalEarnings + p.grossPay,
          totalNetPay: acc.totalNetPay + p.netPay,
          totalNetPayRounded: acc.totalNetPayRounded + p.netPayRounded,
          totalRoundingDifference: acc.totalRoundingDifference + p.roundingDifference,
          totalDeductions: acc.totalDeductions + p.totalDeductions,
        }),
        {
          totalEarnedSalary: 0,
          totalBonuses: 0,
          totalDiscounts: 0,
          totalEarnings: 0,
          totalNetPay: 0,
          totalNetPayRounded: 0,
          totalRoundingDifference: 0,
          totalDeductions: 0,
        },
      ),
    [filteredPayrollData],
  );

  // ── Excel export ──────────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    if (!filteredPayrollData.length) {
      toast.error("لا توجد بيانات رواتب للتنزيل");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      
      // 1. Create a brand new workbook instance (Fixes the undefined crash)
      const workbook = XLSX.utils.book_new();

      // 2. Map data to strictly match our exact layout columns
      const rows = filteredPayrollData.map((item, index) => ({
        "#": String(index + 1),
        "كود الموظف": item.employeeId,
        "اسم الموظف": item.employeeName,
        "القسم": item.department,
        "الراتب المستحق": Number(item.earnedSalary.toFixed(2)),
        "المكافآت": Number(item.bonusesTotal.toFixed(2)),
        "الخصومات": Number(item.discountsTotal.toFixed(2)),
        "المجموع": Number(item.netPay.toFixed(2)),
        "الفرق": Number(item.roundingDifference.toFixed(2)),
        "الراتب المقبوض (النهائي)": Number(item.netPayRounded.toFixed(2)),
      }));

      // 3. Add Grand Totals row matching the same columns
      rows.push({
        "#": "",
        "كود الموظف": "",
        "اسم الموظف": "الإجمالي العام",
        "القسم": "",
        "الراتب المستحق": Number(globalTotals.totalEarnedSalary.toFixed(2)),
        "المكافآت": Number(globalTotals.totalBonuses.toFixed(2)),
        "الخصومات": Number(globalTotals.totalDiscounts.toFixed(2)),
        "المجموع": Number(globalTotals.totalNetPay.toFixed(2)),
        "الفرق": Number(globalTotals.totalRoundingDifference.toFixed(2)),
        "الراتب المقبوض (النهائي)": Number(globalTotals.totalNetPayRounded.toFixed(2)),
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      
      // Set comfortable column widths
      worksheet["!cols"] = [
        { wch: 6 }, { wch: 15 }, { wch: 25 }, { wch: 20 },
        { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
        { wch: 12 }, { wch: 22 }
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "مسير الرواتب");
      XLSX.writeFile(workbook, `تقرير-الرواتب-${month}.xlsx`);
      toast.success("تم تنزيل ملف Excel بنجاح");
    } catch (error) {
      console.error(error);
      toast.error("تعذر تنزيل ملف Excel حالياً");
    }
  };

  // ── Flags ─────────────────────────────────────────────────────────────────────
  /** True when the report endpoint responded but no payroll run exists for this month. */
  const hasNoPayrollRun = !reportLoading && (!reportData?.items || reportData.items.length === 0);

  // Show inline spinner when data is loading — rendered inside the same root
  // wrapper to avoid SSR/client hydration mismatch (never return a different root element)
  const showSpinner = !mounted || isLoading;

  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden"
      dir="rtl"
    >
      {/* grid watermark */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: "24px 24px",
        }}
      />

      {showSpinner ? (
        <div className="flex-1 flex items-center justify-center p-16">
          <div className="flex flex-col items-center gap-4 bg-white/40 p-8 rounded-3xl backdrop-blur-2xl border border-white/60 shadow-[0_20px_40px_rgba(38,53,68,0.1)]">
            <div className="w-14 h-14 border-4 border-[#C89355]/30 border-t-[#263544] rounded-full animate-spin shadow-lg" />
            <p className="text-[#263544] font-black animate-pulse text-sm tracking-wide">
              جاري تجميع بيانات الرواتب...
            </p>
          </div>
        </div>
      ) : (
      <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
        {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
        <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
          <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
          <span className="hover:text-[#263544] cursor-pointer transition-colors relative z-10">
            المركز المالي
          </span>
          <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
          <span className="text-[#263544] relative z-10">تقارير الرواتب</span>
        </nav>

        {/* ── Page header ─────────────────────────────────────────────────────── */}
        <header className="mb-10 flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-[#263544]/10 pb-8 relative">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4">
                <FileSpreadsheet size={22} className="text-[#C89355]" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">
                التقرير النهائي للرواتب
              </h1>
            </div>
            <p className="text-slate-600 text-sm font-bold pr-14 mt-1">
              اختر الشهر لعرض ملخص المسير مقسماً حسب الأقسام الوظيفية.
            </p>
          </div>

          <div className="mt-4 xl:mt-0 flex flex-wrap items-center justify-start xl:justify-end gap-3 w-full xl:w-auto">
            {/* Month Period Selector */}
            <MonthPeriodSelector
              value={month}
              onChange={(newMonth) => {
                setMonth(newMonth);
                const params = new URLSearchParams(searchParams.toString());
                params.set("period", newMonth);
                router.replace(`?${params.toString()}`);
              }}
              className="flex-1 sm:flex-none"
            />

            <button
              onClick={handleExportExcel}
              disabled={!filteredPayrollData.length}
              aria-label="تنزيل تقرير الرواتب بصيغة Excel"
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm rounded-xl relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 transition-all active:scale-95 group disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="absolute inset-1 rounded-xl border border-dashed border-white/30 pointer-events-none" />
              <Download
                size={16}
                className="group-hover:-translate-y-1 transition-transform relative z-10"
              />
              <span className="relative z-10">تنزيل Excel</span>
            </button>

            <Link
              href={`/vouchers?month=${month}`}
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm rounded-xl relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 transition-all active:scale-95 group"
            >
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#263544]/10 pointer-events-none transition-colors group-hover:border-[#C89355]/30" />
              <span className="relative z-10">قسائم القبض</span>
            </Link>

            <button
              type="button"
              onClick={() => setPayrollModalOpen(true)}
              aria-label="فتح نافذة حساب المسير الشهري"
              className="bg-slate-800 text-white hover:bg-slate-900 shadow-md rounded-xl font-bold relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 transition-all active:scale-95 group"
            >
              <div className="absolute inset-1 rounded-xl border border-dashed border-white/20 pointer-events-none" />
              <Play
                size={16}
                className="group-hover:-translate-y-1 transition-transform relative z-10"
              />
              <span className="relative z-10">حساب المسير</span>
            </button>
          </div>
        </header>

        {/* ── No payroll run banner ────────────────────────────────────────────── */}
        {hasNoPayrollRun && (
          <div className="mb-8 flex items-start gap-4 p-5 bg-amber-50/80 border-2 border-amber-200 rounded-3xl shadow-sm animate-in fade-in duration-300">
            <div className="p-2.5 bg-amber-100 rounded-xl border border-amber-200 shrink-0 mt-0.5">
              <Info size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="font-black text-amber-800 text-sm mb-1">
                لا يوجد مسير رواتب محسوب لهذا الشهر
              </p>
              <p className="text-amber-700 text-xs font-bold leading-relaxed">
                أرقام الرواتب تأتي حصراً من الباك إند بعد تشغيل عملية حساب المسير عبر{" "}
                <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">
                  POST /api/payroll/calculate
                </code>
                . لا تُعرض أصفار — بل لا تُعرض بيانات حتى يكتمل الحساب.
              </p>
            </div>
          </div>
        )}

        {/* ── KPI cards ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {/* صافي الإجمالي المقبوض (ل.س) * */}
          <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] hover:-translate-y-1 transition-all group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-3 bg-[#1a2530] rounded-xl border border-[#C89355]/30 shadow-sm group-hover:shadow-[0_0_15px_rgba(200,147,85,0.4)] transition-shadow">
                <Wallet className="text-[#C89355]" size={22} />
              </div>
              <p className="font-black text-[#263544] text-sm">صافي الإجمالي المقبوض (ل.س) *</p>
            </div>
            <p className="text-4xl font-black text-[#263544] relative z-10 drop-shadow-sm">
              {globalTotals.totalNetPayRounded.toLocaleString()} ل.س
            </p>
            <p className="text-[10px] text-slate-500 font-bold mt-2 relative z-10">
              * الراتب المستحق من أيام الدوام الفعلية
            </p>
          </div>
          {/* المكافآت */}
          <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(16,185,129,0.12)] hover:-translate-y-1 transition-all group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-emerald-500/30 pointer-events-none transition-colors group-hover:border-emerald-500/50" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 shadow-sm group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-shadow">
                <HandCoins className="text-emerald-600" size={22} />
              </div>
              <p className="font-black text-[#263544] text-sm">المكافآت (ل.س)</p>
            </div>
            <p className="text-4xl font-black text-emerald-600 relative z-10 drop-shadow-sm">
              +{globalTotals.totalBonuses.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 font-bold mt-2 relative z-10">
              إجمالي المكافآت والبونصات
            </p>
          </div>
          {/* الخصومات */}
          <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(239,68,68,0.12)] hover:-translate-y-1 transition-all group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-rose-500/30 pointer-events-none transition-colors group-hover:border-rose-500/50" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 shadow-sm group-hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-shadow">
                <Receipt className="text-rose-600" size={22} />
              </div>
              <p className="font-black text-[#263544] text-sm">الخصومات (ل.س)</p>
            </div>
            <p className="text-4xl font-black text-rose-600 relative z-10 drop-shadow-sm">
              -{globalTotals.totalDiscounts.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 font-bold mt-2 relative z-10">
              السلف + العقوبات + الخصومات الأخرى
            </p>
          </div>

          {/* فرق التقريب */}
          <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(217,119,6,0.12)] hover:-translate-y-1 transition-all group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-amber-500/30 pointer-events-none transition-colors group-hover:border-amber-500/50" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-sm group-hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-shadow">
                <Calculator className="text-amber-600" size={22} />
              </div>
              <p className="font-black text-[#263544] text-sm">فرق التقريب (ل.س)</p>
            </div>
            <p className="text-4xl font-black text-amber-700 relative z-10 drop-shadow-sm">
              {globalTotals.totalRoundingDifference > 0 ? "+" : ""}
              {globalTotals.totalRoundingDifference.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 font-bold mt-2 relative z-10">
              إجمالي فروقات جبر الكسور للرواتب
            </p>
          </div>
        </div>

        {/* بطاقة إجمالية للتصفية */}
        {/* <div className="mb-8 relative overflow-hidden bg-gradient-to-br from-[#1a2530] to-[#263544] backdrop-blur-xl border-2 border-[#C89355]/40 rounded-[2.5rem] p-8 shadow-[0_25px_60px_rgba(200,147,85,0.2)] group">
        {/* <div className="mb-8 relative overflow-hidden bg-gradient-to-br from-[#1a2530] to-[#263544] backdrop-blur-xl border-2 border-[#C89355]/40 rounded-[2.5rem] p-8 shadow-[0_25px_60px_rgba(200,147,85,0.2)] group">
          <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/40 pointer-events-none transition-colors group-hover:border-[#C89355]/60" />
          <div className="relative z-10">
            <h3 className="text-lg font-black text-[#C89355] mb-6 uppercase tracking-wide flex items-center gap-3">
              <div className="w-2 h-6 bg-[#C89355] rounded-full shadow-lg" />
              إجمالي التصفية
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center md:text-right">
                <p className="text-white/60 text-xs font-bold mb-2 uppercase tracking-widest">الراتب النهائي:</p>
                <p className="text-white text-3xl font-black font-mono">{globalTotals.totalEarnedSalary.toLocaleString()} ل.س</p>
              </div>
              <div className="text-center">
                <p className="text-emerald-300/80 text-xs font-bold mb-2 uppercase tracking-widest">+ المكافآت:</p>
                <p className="text-emerald-300 text-3xl font-black font-mono">+{globalTotals.totalBonuses.toLocaleString()} ل.س</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-rose-300/80 text-xs font-bold mb-2 uppercase tracking-widest">- الخصومات:</p>
                <p className="text-rose-300 text-3xl font-black font-mono">-{globalTotals.totalDiscounts.toLocaleString()} ل.س</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t-2 border-dashed border-white/20 flex justify-between items-center">
              <span className="text-[#C89355] text-sm font-black uppercase tracking-widest">صافي الإجمالي المقبوض (مقرب):</span>
              <span className="text-[#C89355] text-4xl font-black font-mono drop-shadow-[0_0_20px_rgba(200,147,85,0.5)]">
                {globalTotals.totalNetPayRounded.toLocaleString()} ل.س
              </span>
            </div>
          </div>


        {/* ── Search ───────────────────────────────────────────────────────────── */}
        <div className="mb-6 relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-4 py-3 shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 hover:shadow-md transition-all group">
          <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
          <Search
            size={20}
            className="text-[#C89355] ml-3 relative z-10 group-focus-within:scale-110 transition-transform"
          />
          <input
            type="text"
            placeholder="البحث بالاسم أو القسم أو الكود..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none font-bold text-sm text-[#263544] w-full focus:ring-0 relative z-10 placeholder:text-slate-400"
          />
        </div>

        {/* ── Payroll table ─────────────────────────────────────────────────────── */}
        <PayrollVirtualTable
          allRows={allRows}
          onSelectPayslip={(item) => setSelectedPayslip(item)}
        />

        {/* ── Resigned Employees Section (All resigned/terminated employees with settlement info) ── */}
        {allResignedList.length > 0 && (
          <div className="mt-8">
            {/* Warning Banner */}
            <div className="mb-6 flex items-start gap-4 p-5 bg-amber-50/80 border-2 border-amber-200 rounded-3xl shadow-sm animate-in fade-in duration-300">
              <div className="p-2.5 bg-amber-100 rounded-xl border border-amber-200 shrink-0 mt-0.5">
                <Info size={20} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-black text-amber-800 text-sm mb-1">موظفون مستقيلون / مقالون</p>
                <p className="text-amber-700 text-xs font-bold leading-relaxed">
                  {resignedPendingCount > 0
                    ? `${resignedPendingCount} موظف بحاجة إلى تصفية مالية. يجب إتمام التصفية قبل إغلاق المسير النهائي.`
                    : "جميع الموظفين المستقيلين تمت تصفيتهم المالية."}
                </p>
              </div>
              <Link
                href="/resigned"
                className="relative overflow-hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white font-black text-xs hover:bg-amber-700 transition-all shadow-sm active:scale-95 group shrink-0"
              >
                <div className="absolute inset-1 rounded-lg border border-dashed border-white/30 pointer-events-none" />
                <ExternalLink size={14} className="relative z-10" />
                <span className="relative z-10">إدارة التصفيات</span>
              </Link>
            </div>

            {/* Resigned Employees Table */}
            <div className="relative bg-amber-50/40 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(245,158,11,0.15)] border-2 border-amber-200/80 overflow-hidden group/resigned">
              <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-amber-400/40 pointer-events-none z-0 transition-colors group-hover/resigned:border-amber-400/60" />

              {/* Section Header */}
              <div className="relative z-10 bg-amber-100/60 backdrop-blur-md border-b-2 border-amber-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-600 rounded-xl shadow-md">
                    <UserMinus size={20} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-amber-900 tracking-tight">
                      المستقيلون والمقالون
                    </h2>
                    <p className="text-xs text-amber-700 font-bold mt-0.5">
                      {allResignedList.length} موظف ({resignedPendingCount} بحاجة إلى تصفية مالية)
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
                <table className="w-full text-right min-w-225 border-collapse">
                  <thead className="bg-amber-600/90 text-white">
                    <tr>
                      <th className="p-4 font-black text-xs uppercase tracking-wider text-center">
                        كود الموظف
                      </th>
                      <th className="p-4 font-black text-xs uppercase tracking-wider text-center">
                        اسم الموظف
                      </th>
                      <th className="p-4 font-black text-xs uppercase tracking-wider text-center">
                        القسم
                      </th>
                      <th className="p-4 font-black text-xs uppercase tracking-wider text-center">
                        الراتب الأساسي
                      </th>
                      <th className="p-4 font-black text-xs uppercase tracking-wider text-center">
                        الراتب المقوض
                      </th>
                      <th className="p-4 text-center font-black text-xs uppercase tracking-wider">
                        تاريخ الإنهاء
                      </th>
                      <th className="p-4 text-center font-black text-xs uppercase tracking-wider">
                        نوع الإنهاء
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-amber-200/50">
                    {allResignedList.map((employee: Employee) => {
                      const isFired = employee.status === "terminated";
                      const terminationType = isFired ? "إقالة" : "استقالة";
                      const terminationColor = isFired
                        ? "text-rose-700 bg-rose-100/80 border-rose-300"
                        : "text-amber-700 bg-amber-100/80 border-amber-300";
                      const baseSalaryVal = toNumber(employee.baseSalary ?? employee.hourlyRate);
                      const resignedCalc = resignedPayrollMap.get(employee.employeeId);

                      return (
                        <tr
                          key={employee.employeeId}
                          className="transition-all duration-300 group/row bg-white/60 hover:bg-white/90"
                        >
                          <td className="p-4 text-center font-mono text-sm font-black text-amber-900/70 group-hover/row:text-amber-700 transition-colors">
                            {employee.employeeId}
                          </td>
                          <td className="p-4 text-center font-black text-slate-800 group-hover/row:text-amber-900 transition-colors">
                            {employee.name}
                          </td>
                          <td className="p-4 text-center font-bold text-slate-700 text-sm">
                            {employee.department || employee.profession || "—"}
                          </td>
                          <td className="p-4 text-center font-mono font-black text-slate-700 text-sm">
                            {baseSalaryVal > 0 ? `${baseSalaryVal.toLocaleString()} ل.س` : "—"}
                          </td>
                          <td className="p-4 text-center font-mono font-black text-emerald-700 text-sm">
                            {resignedCalc ? `${resignedCalc.netPayRounded.toLocaleString()} ل.س` : "—"}
                          </td>
                          <td className="p-4 text-center font-mono font-bold text-slate-700 text-sm">
                            {employee.terminationDate
                              ? new Date(employee.terminationDate).toLocaleDateString("ar-SY")
                              : "—"}
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`inline-block px-3 py-1.5 rounded-xl text-xs font-black border shadow-sm ${terminationColor}`}
                            >
                              {terminationType}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Modals — outside the loading ternary, always rendered inside outer wrapper */}
      <RunPayrollModal
        isOpen={isPayrollModalOpen}
        onClose={() => setPayrollModalOpen(false)}
        isPending={calculatePayroll.isPending}
        initialMonth={month}
        onRun={async (payload) => {
          calculatePayroll.mutate(payload, {
            onSuccess: () => {
              const calculatedMonth = payload.periodStart.slice(0, 7);
              setMonth(calculatedMonth);
              router.push(`/salaries/payroll?period=${calculatedMonth}`);
              setPayrollModalOpen(false);
              toast.success(`تم حساب الرواتب لشهر ${calculatedMonth} بنجاح`);
            },
            onError: (error) => {
              console.error('[Payroll] Calculation failed:', error);
            }
          });
        }}
      />
      {selectedPayslip && (
        <PayslipModal
          payslip={selectedPayslip}
          month={month}
          onClose={() => setSelectedPayslip(null)}
        />
      )}
    </div>
  );
}
