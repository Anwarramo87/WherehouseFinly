"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Download, FileSpreadsheet, Wallet, Receipt,
  HandCoins, Calendar as CalendarIcon,
  ChevronLeft, Search, AlertTriangle, Info, Play,
  UserMinus, ExternalLink,
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
import { toast } from "react-hot-toast";

import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';
import PayrollRow from '@/components/PayrollRow';

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
  earnedSalary: number;

  // 🎁 Total rewards from the rewards page (bonusAmount + assistanceAmount) per employee
  bonusesTotal: number;

  // ✂️ Total deductions from the discounts/advances page (advances + penalties + other)
  discountsTotal: number;

  // 📋 Visual-only subtotals for the payslip modal
  fixedEarnings: number;
  variableEarnings: number;
  fixedDeductions: number;
  variableDeductions: number;
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

const calcEarnedSalaryTimeTable = (
  grossSalary: number,
  actualWorkDays: number,
  totalDelayMinutes: number,
): number => {
  if (grossSalary <= 0) return 0;
  const dailyRate = grossSalary / STANDARD_WORK_DAYS;
  const minuteRate = dailyRate / (HOURS_PER_DAY * 60);
  const salaryFromDays = dailyRate * actualWorkDays;
  const delayDeduction = totalDelayMinutes * minuteRate;
  return Math.max(0, salaryFromDays - delayDeduction);
};

const calcLateMinutes = (checkIn: string, scheduledStart: string, gracePeriod = 15): number => {
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const [month, setMonth] = useState(getLocalMonth());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayslip, setSelectedPayslip] = useState<AggregatedPayroll | null>(null);
  const [isPayrollModalOpen, setPayrollModalOpen] = useState(false);

  const { calculatePayroll } = usePayroll();

  // ── Fetch supporting data (for payslip modal display only) ───────────────────
    const { data: salaries = [], isLoading: salariesLoading } = useSalaries();
  const { data: bonuses = [], isLoading: bonusesLoading } = useBonuses({ period: month });
  const { data: discounts = [], isLoading: discountsLoading } = useDiscounts();
  const { data: reportData, isLoading: reportLoading } = usePayrollReport(month);
  const { data: allResignedEmployees = [] } = useResignedEmployees();
  
  // --- Attendance Hooks for Earned Salary Calculation ---
  const { data: rawEmployees, isLoading: employeesLoading } = useEmployees({ limit: 500, status: "active" });
  const employees = useMemo(() => (Array.isArray(rawEmployees) ? rawEmployees : []), [rawEmployees]);
  
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

  const { data: payrollInputs = [], isLoading: inputsLoading } = usePayrollInputs(periodStart, periodEnd);
  
  const { data: deductionsResponse, isLoading: deductionsLoading } = useAttendanceDeductions({
    periodStart: periodStart ?? "",
    periodEnd: periodEnd ?? "",
  });
  
  const autoDeductions = useMemo(() => {
    if (!deductionsResponse) return [];
    if (Array.isArray(deductionsResponse.data)) return deductionsResponse.data;
    return [];
  }, [deductionsResponse]);

  const { data: monthlyAttendanceData, isLoading: attendanceLoading } = useAttendance({
    startDate: periodStart,
    endDate: periodEnd,
    limit: 500,
  });

  const localLateMinutesMap = useMemo(() => {
    const map = new Map<string, number>();
    const dailyRecords = monthlyAttendanceData?.dailyRecords || [];
    for (const dr of dailyRecords) {
      if (!dr.checkIn) continue;
      const emp = employees.find((e) => e.employeeId === dr.employeeId);
      const scheduledStart = emp?.scheduledStart || "08:00";
      const gracePeriod = (emp && typeof (emp as { gracePeriodMinutes?: number }).gracePeriodMinutes === 'number') ? (emp as { gracePeriodMinutes: number }).gracePeriodMinutes : 15;
      const lateMin = calcLateMinutes(dr.checkIn, scheduledStart, gracePeriod);
      if (lateMin > 0) {
        map.set(dr.employeeId, (map.get(dr.employeeId) ?? 0) + lateMin);
      }
    }
    return map;
  }, [monthlyAttendanceData?.dailyRecords, employees]);

  const isLoading = salariesLoading || bonusesLoading || reportLoading || employeesLoading || inputsLoading || deductionsLoading || attendanceLoading || discountsLoading || penaltiesLoading;
  // ── Filter resigned employees pending financial settlement ──
  const resignedPendingSettlement = useMemo<Employee[]>(() => {
    return allResignedEmployees.filter(
      (emp) =>
        (emp.status === "resigned" || emp.status === "terminated") &&
        emp.financialSettlementStatus === "pending" &&
        !emp.isSettled
    );
  }, [allResignedEmployees]);

  // ── Build payroll rows ───────────────────────────────────────────────────────
  /**
   * Each row is driven by a payrollItem returned from GET /api/payroll/report/:month.
   * If no payroll run exists, we'll generate preview data from active employees.
   */
  const previewData = useMemo<AggregatedPayroll[]>(() => {
    // Generate preview data from active employees when no report exists
    return employees.filter(e => e.status === 'active').map((emp) => {
      const employeeId = emp.employeeId;
      const employeeName = emp.name;
      
      const salaryConfig = salaries.find((s) => s.employeeId === employeeId) ?? null;
      const department = emp.department || salaryConfig?.profession?.trim() || "أقسام عامة";

      // Calculate gross salary
      let calcGross = 0;
      if (salaryConfig) {
        calcGross = toNumber(salaryConfig.baseSalary) +
          toNumber(salaryConfig.lumpSumSalary) +
          toNumber(salaryConfig.livingAllowance) +
          toNumber(salaryConfig.responsibilityAllowance) +
          toNumber(salaryConfig.extraEffortAllowance) +
          toNumber(salaryConfig.productionIncentive) +
          toNumber(salaryConfig.transportAllowance);
      }
      if (calcGross <= 0) {
        calcGross = toNumber((emp as { baseSalary?: number }).baseSalary) || toNumber((emp as { hourlyRate?: number }).hourlyRate) * HOURS_PER_DAY * STANDARD_WORK_DAYS;
      }

      // Calculate earned salary
      let earnedSalary = 0;
      const manualInput = payrollInputs.find((pi) => pi.employeeId === employeeId);
      const autoInput = autoDeductions.find((d: { employeeId: string }) => d.employeeId === employeeId);
      const hasManualInput = !!manualInput;

      const autoLateMinutes = localLateMinutesMap.get(employeeId) ?? 0;
      const lateMinutes = (hasManualInput && (manualInput.lateMinutes ?? 0) > 0)
        ? (manualInput.lateMinutes ?? 0)
        : autoLateMinutes;

      const totalDelayMinutes = lateMinutes + (manualInput?.earlyLeaveMinutes ?? 0);
      
      let actualWorkDays: number;
      if (hasManualInput && manualInput.absenceDays !== undefined) {
        actualWorkDays = Math.max(0, STANDARD_WORK_DAYS - manualInput.absenceDays);
      } else if (autoInput !== undefined) {
        actualWorkDays = Math.max(0, autoInput.presentDays);
      } else {
        actualWorkDays = STANDARD_WORK_DAYS;
      }

      earnedSalary = calcEarnedSalaryTimeTable(calcGross, actualWorkDays, totalDelayMinutes);

      // Bonuses
      const employeeBonuses = bonuses.filter((b) => b.employeeId === employeeId);
      const variableEarnings = employeeBonuses.reduce((sum, bonus) => {
        const bonusAmt = toNumber(bonus.bonusAmount);
        const assistAmt = toNumber((bonus as { assistanceAmount?: number }).assistanceAmount);
        return sum + bonusAmt + assistAmt;
      }, 0);

      // Deductions — only advances (kind='advance') from discounts + penalties
      const employeeAdvances = discounts.filter((d) => {
        return d.employeeId === employeeId && d.kind === 'advance' && d.date.startsWith(month);
      });
      const employeePenalties = penalties.filter((p) => {
        return p.employeeId === employeeId && p.issueDate.startsWith(month);
      });
      
      const variableDeductions = employeeAdvances.reduce(
        (sum, d) => sum + toNumber(d.amount),
        0
      ) + employeePenalties.reduce(
        (sum, p) => sum + toNumber(p.amount),
        0
      );

      const netPay = earnedSalary + variableEarnings - variableDeductions;
      const netPayRounded = Math.ceil(netPay / 1000) * 1000;
      const roundingDifference = netPayRounded - netPay;

      return {
        employeeId,
        employeeName,
        department,
        grossPay: calcGross,
        totalDeductions: variableDeductions + toNumber(salaryConfig?.insuranceAmount),
        netPay,
        netPayRounded,
        roundingDifference,
        anomalies: [],
        earnedSalary,
        bonusesTotal: variableEarnings,
        discountsTotal: variableDeductions,
        fixedEarnings: calcGross,
        variableEarnings,
        fixedDeductions: toNumber(salaryConfig?.insuranceAmount),
        variableDeductions,
        details: {
          salaryConfig,
          bonuses: employeeBonuses,
          deductions: [...employeeAdvances, ...employeePenalties],
          attendance: null,
        },
      };
    });
  }, [employees, salaries, bonuses, discounts, penalties, month, payrollInputs, autoDeductions, localLateMinutesMap]);

  const payrollData = useMemo<AggregatedPayroll[]>(() => {
    // If we have a payroll run, use backend data
    if (reportData?.items?.length) {
      return reportData.items.map((backendItem: PayrollItem) => {
        const { employeeId, employeeName } = backendItem;

        const salaryConfig = salaries.find((s) => s.employeeId === employeeId) ?? null;
        const department =
          (backendItem.department?.trim() || "") ||
          salaryConfig?.profession?.trim() ||
          "أقسام عامة";

        const grossPay = toNumber(backendItem.grossPay);
        const totalDeductions = toNumber(backendItem.totalDeductions);
        const _netPay = toNumber(backendItem.netPay);
        const netPayRounded = toNumber(backendItem.netPayRounded);
        const roundingDifference = toNumber(backendItem.roundingDifference);
        const netPayWithAdvance = toNumber(backendItem.netPayWithAdvance);
        
        const anomalies: string[] = Array.isArray(backendItem.anomalies)
          ? backendItem.anomalies
          : [];

        // ── 1. Calculate Earned Salary exactly as TimeTable ──────────────────────
        let earnedSalary = 0;
        const emp = employees.find((e) => e.employeeId === employeeId);
        
        let calcGross = 0;
        if (salaryConfig) {
          calcGross = toNumber(salaryConfig.baseSalary) +
            toNumber(salaryConfig.lumpSumSalary) +
            toNumber(salaryConfig.livingAllowance) +
            toNumber(salaryConfig.responsibilityAllowance) +
            toNumber(salaryConfig.extraEffortAllowance) +
            toNumber(salaryConfig.productionIncentive) +
            toNumber(salaryConfig.transportAllowance);
        }
        if (calcGross <= 0 && emp) {
          calcGross = toNumber((emp as { baseSalary?: number }).baseSalary) || toNumber((emp as { hourlyRate?: number }).hourlyRate) * HOURS_PER_DAY * STANDARD_WORK_DAYS;
        }

        if (emp) {
          const manualInput = payrollInputs.find((pi) => pi.employeeId === employeeId);
          const autoInput = autoDeductions.find((d: { employeeId: string }) => d.employeeId === employeeId);
          const hasManualInput = !!manualInput;

          const autoLateMinutes = localLateMinutesMap.get(employeeId) ?? 0;
          const lateMinutes = (hasManualInput && (manualInput.lateMinutes ?? 0) > 0)
            ? (manualInput.lateMinutes ?? 0)
            : autoLateMinutes;

          const totalDelayMinutes = lateMinutes + (manualInput?.earlyLeaveMinutes ?? 0);
          
          let actualWorkDays: number;
          if (hasManualInput && manualInput.absenceDays !== undefined) {
            actualWorkDays = Math.max(0, STANDARD_WORK_DAYS - manualInput.absenceDays);
          } else if (autoInput !== undefined) {
            actualWorkDays = Math.max(0, autoInput.presentDays);
          } else {
            actualWorkDays = STANDARD_WORK_DAYS;
          }

          earnedSalary = calcEarnedSalaryTimeTable(calcGross, actualWorkDays, totalDelayMinutes);
        }

        const employeeBonuses = bonuses.filter((b) => b.employeeId === employeeId);
        const variableEarnings = employeeBonuses.reduce((sum, bonus) => {
          const bonusAmt = toNumber(bonus.bonusAmount);
          const assistAmt = toNumber((bonus as { assistanceAmount?: number }).assistanceAmount);
          return sum + bonusAmt + assistAmt;
        }, 0);

        // Deductions — only advances (kind='advance') + penalties
        const employeeAdvancesDisc = discounts.filter((d) => {
          return d.employeeId === employeeId && d.kind === 'advance' && d.date.startsWith(month);
        });
        const employeePenaltiesDisc = penalties.filter((p) => {
          return p.employeeId === employeeId && p.issueDate.startsWith(month);
        });
        
        const variableDeductions = employeeAdvancesDisc.reduce(
          (sum, d) => sum + toNumber(d.amount),
          0
        ) + employeePenaltiesDisc.reduce(
          (sum, p) => sum + toNumber(p.amount),
          0
        );

        // ✅ Use backend authoritative values - these are already calculated correctly
        return {
          employeeId,
          employeeName,
          department,
          grossPay,
          totalDeductions,
          netPay: netPayWithAdvance, // ✅ Use the actual value from backend (381,000)
          netPayRounded,
          roundingDifference,
          anomalies,
          earnedSalary,
          bonusesTotal: variableEarnings,
          discountsTotal: variableDeductions,
          fixedEarnings: calcGross,
          variableEarnings,
          fixedDeductions: toNumber(salaryConfig?.insuranceAmount),
          variableDeductions,
          details: {
            salaryConfig,
            bonuses: employeeBonuses,
            deductions: [...employeeAdvancesDisc, ...employeePenaltiesDisc],
            attendance: null,
          },
        };
      });
    }
    
    // ✅ NEW: If no payroll run, use the generated preview data
    return previewData;
  }, [reportData, salaries, bonuses, discounts, penalties, month, employees, payrollInputs, autoDeductions, localLateMinutesMap, previewData]);

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
    const rows: (AggregatedPayroll | { isHeader: true; department: string; count: number })[] = [];
    const grouped = filteredPayrollData.reduce<Record<string, AggregatedPayroll[]>>((acc, item) => {
      const key = item.department || 'أقسام عامة';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});

    Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).forEach(([department, items]) => {
      rows.push({ isHeader: true, department, count: items.length });
      rows.push(...items);
    });

    return rows;
  }, [filteredPayrollData]);

  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index: number) => {
      const row = allRows[index] as { isHeader?: boolean } | undefined;
      return row?.isHeader ? 48 : 96;
    },
    overscan: 5,
  });

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
      const rows: Array<Record<string, string | number>> = filteredPayrollData.map((item, index) => ({
        "#": index + 1,
        "كود الموظف": item.employeeId,
        "اسم الموظف": item.employeeName,
        "الأرباح الثابتة": Number(item.fixedEarnings.toFixed(2)),
        "الأرباح المتغيرة": Number(item.variableEarnings.toFixed(2)),
        "إجمالي الأرباح": Number((item.fixedEarnings + item.variableEarnings).toFixed(2)),
        "إجمالي الخصومات": Number((item.fixedDeductions + item.variableDeductions).toFixed(2)),
        "صافي الراتب": Number(item.netPay.toFixed(2)),
      }));

      // Add totals row
      rows.push({
        "#": "",
        "القسم": "",
        "كود الموظف": "",
        "اسم الموظف": "الإجمالي",
        "إجمالي الاستحقاقات": Number(globalTotals.totalEarnings.toFixed(2)),
        "إجمالي الخصومات": Number(globalTotals.totalDeductions.toFixed(2)),
        "صافي الراتب (حسابي دقيق)": Number(globalTotals.totalNetPay.toFixed(2)),
        "الصافي المقبوض (مقرب)": Number(globalTotals.totalNetPayRounded.toFixed(2)),
        "فرق التقريب": Number(globalTotals.totalRoundingDifference.toFixed(2)),
      });
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 5 }, { wch: 15 }, { wch: 14 }, { wch: 24 },
        { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");
      XLSX.writeFile(workbook, `payroll-report-${month}.xlsx`);
      toast.success("تم تنزيل ملف Excel بنجاح");
    } catch {
      toast.error("تعذر تنزيل ملف Excel حالياً");
    }
  };

  // ── Flags ─────────────────────────────────────────────────────────────────────
  /** True when the report endpoint responded but no payroll run exists for this month. */
  const hasNoPayrollRun =
    !reportLoading && (!reportData?.items || reportData.items.length === 0);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="relative min-h-[85vh] w-full flex items-center justify-center animate-in fade-in duration-500">
        <div className="flex flex-col items-center gap-4 relative z-10 bg-white/40 p-8 rounded-3xl backdrop-blur-2xl border border-white/60 shadow-[0_20px_40px_rgba(38,53,68,0.1)]">
          <div className="w-14 h-14 border-4 border-[#C89355]/30 border-t-[#263544] rounded-full animate-spin shadow-lg" />
          <p className="text-[#263544] font-black animate-pulse text-sm tracking-wide">
            جاري تجميع بيانات الرواتب...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
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
            {/* Month picker */}
            <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-4 py-2 shadow-sm transition-all duration-300 hover:shadow-md group focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20">
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50 group-focus-within:border-[#C89355]/50" />
              <label htmlFor="month-picker" className="sr-only">اختر الشهر</label>
              <CalendarIcon size={18} className="text-[#C89355] group-hover:scale-110 transition-transform relative z-10 ml-2" />
              <input
                id="month-picker"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                aria-label="اختيار شهر التقرير"
                className="bg-transparent border-none outline-none font-mono text-sm font-black text-[#263544] w-full cursor-pointer focus:ring-0 relative z-10"
              />
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!filteredPayrollData.length}
              aria-label="تنزيل تقرير الرواتب بصيغة Excel"
              className="relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600/90 backdrop-blur-md text-white font-black text-sm hover:bg-emerald-700 transition-all shadow-[0_10px_20px_rgba(5,150,105,0.3)] active:scale-95 border border-emerald-500 group disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="absolute inset-1 rounded-xl border border-dashed border-white/30 pointer-events-none" />
              <Download size={16} className="group-hover:-translate-y-1 transition-transform relative z-10" />
              <span className="relative z-10">تنزيل Excel</span>
            </button>

            <Link
              href={`/vouchers?month=${month}`}
              className="relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/80 backdrop-blur-md text-[#263544] font-black text-sm border border-white hover:bg-white hover:border-[#C89355]/30 transition-all shadow-sm active:scale-95 group"
            >
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#263544]/10 pointer-events-none transition-colors group-hover:border-[#C89355]/30" />
              <span className="relative z-10">قسائم القبض</span>
            </Link>

            <button
              type="button"
              onClick={() => setPayrollModalOpen(true)}
              aria-label="فتح نافذة حساب المسير الشهري"
              className="relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#263544] backdrop-blur-md text-white font-black text-sm hover:bg-[#1a2530] transition-all shadow-sm active:scale-95 group"
            >
              <div className="absolute inset-1 rounded-xl border border-dashed border-white/20 pointer-events-none" />
              <Play size={16} className="group-hover:-translate-y-1 transition-transform relative z-10" />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* الراتب النهائي (المستحق من الدوام) */}
          <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] hover:-translate-y-1 transition-all group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-3 bg-[#1a2530] rounded-xl border border-[#C89355]/30 shadow-sm group-hover:shadow-[0_0_15px_rgba(200,147,85,0.4)] transition-shadow">
                <Wallet className="text-[#C89355]" size={22} />
              </div>
              <p className="font-black text-[#263544] text-sm">الراتب النهائي (ل.س) *</p>
            </div>
            <p className="text-4xl font-black text-[#263544] relative z-10 drop-shadow-sm">
              {globalTotals.totalEarnedSalary.toLocaleString()}
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
        </div>

        {/* بطاقة إجمالية للتصفية */}
        <div className="mb-8 relative overflow-hidden bg-gradient-to-br from-[#1a2530] to-[#263544] backdrop-blur-xl border-2 border-[#C89355]/40 rounded-[2.5rem] p-8 shadow-[0_25px_60px_rgba(200,147,85,0.2)] group">
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
        </div>

        {/* ── Search ───────────────────────────────────────────────────────────── */}
        <div className="mb-6 relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-4 py-3 shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 hover:shadow-md transition-all group">
          <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
          <Search size={20} className="text-[#C89355] ml-3 relative z-10 group-focus-within:scale-110 transition-transform" />
          <input
            type="text"
            placeholder="البحث بالاسم أو القسم أو الكود..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none font-bold text-sm text-[#263544] w-full focus:ring-0 relative z-10 placeholder:text-slate-400"
          />
        </div>

        {/* ── Payroll table ─────────────────────────────────────────────────────── */}
        <div className="relative bg-white rounded-3xl shadow-[0_10px_40px_rgba(38,53,68,0.08)] border border-slate-200 overflow-hidden group/table">
          <div ref={parentRef} className="w-full overflow-x-auto custom-scrollbar relative z-10" style={{ height: '75vh', minHeight: '500px' }}>
            <table className="w-full text-center min-w-[1000px] border-collapse" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
              <thead className="bg-[#1a2530] text-white sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-4 font-black text-xs uppercase tracking-wider">الموظف</th>
                  <th className="px-4 py-4 font-black text-xs uppercase tracking-wider">الراتب المستحق</th>
                  <th className="px-4 py-4 font-black text-xs uppercase tracking-wider text-emerald-300">المكافآت</th>
                  <th className="px-4 py-4 font-black text-xs uppercase tracking-wider text-rose-300">الخصومات</th>
                  <th className="px-4 py-4 font-black text-xs uppercase tracking-wider">المجموع</th>
                  <th className="px-4 py-4 font-black text-xs uppercase tracking-wider bg-[#C89355]/20 text-[#C89355] border-b-3 border-[#C89355]/50">
                    الراتب المقبوض
                  </th>
                  <th className="px-4 py-4 font-black text-xs uppercase tracking-wider">الفرق</th>
                  <th className="px-4 py-4 font-black text-xs uppercase tracking-wider">إجراء</th>
                </tr>
              </thead>
              <tbody style={{ position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualItem: VirtualItem) => {
                  const row = allRows[virtualItem.index];
                  const isHeaderRow = (r: typeof row): r is { isHeader: true; department: string; count: number } => 'isHeader' in r;
                  if (isHeaderRow(row)) {
                    return (
                      <tr key={virtualItem.index} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)` }} className="bg-slate-100 border-y border-slate-200">
                        <td colSpan={8} className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-4 bg-[#C89355] rounded-full" />
                            <span className="font-black text-[#263544] text-sm">
                              {row.department}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              {row.count} موظف
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <PayrollRow
                      key={virtualItem.index}
                      item={row}
                      onSelectPayslip={() => setSelectedPayslip(row as AggregatedPayroll)}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)` }}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Resigned Employees Section (Pending Financial Settlement) ─────────── */}
        {resignedPendingSettlement.length > 0 && (
          <div className="mt-8">
            {/* Warning Banner */}
            <div className="mb-6 flex items-start gap-4 p-5 bg-amber-50/80 border-2 border-amber-300 rounded-3xl shadow-sm animate-in fade-in duration-300">
              <div className="p-2.5 bg-amber-100 rounded-xl border border-amber-300 shrink-0 mt-0.5">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-black text-amber-800 text-sm mb-1">
                  موظفون مستقيلون بحاجة إلى تصفية مالية
                </p>
                <p className="text-amber-700 text-xs font-bold leading-relaxed">
                  الموظفون التالية أسماؤهم قد أنهوا خدمتهم ولكن لم تتم تصفية مستحقاتهم المالية بعد. 
                  يجب إتمام التصفية المالية قبل إغلاق المسير النهائي.
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
                      المستقيلون (قيد التصفية المالية)
                    </h2>
                    <p className="text-xs text-amber-700 font-bold mt-0.5">
                      {resignedPendingSettlement.length} موظف بحاجة إلى تصفية مالية
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
                <table className="w-full text-right min-w-225 border-collapse">
                  <thead className="bg-amber-600/90 text-white">
                    <tr>
                      <th className="p-4 font-black text-xs uppercase tracking-wider text-center">كود الموظف</th>
                      <th className="p-4 font-black text-xs uppercase tracking-wider text-center">اسم الموظف</th>
                      <th className="p-4 font-black text-xs uppercase tracking-wider text-center">القسم</th>
                      <th className="p-4 font-black text-xs uppercase tracking-wider text-center">تاريخ الإنهاء</th>
                      <th className="p-4 font-black text-xs uppercase tracking-wider text-center">نوع الإنهاء</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-amber-200/50">
                    {resignedPendingSettlement.map((employee) => {
                      const isFired = employee.status === "terminated";
                      const terminationType = isFired ? "إقالة" : "استقالة";
                      const terminationColor = isFired 
                        ? "text-rose-700 bg-rose-100/80 border-rose-300" 
                        : "text-amber-700 bg-amber-100/80 border-amber-300";

                      return (
                        <tr
                          key={employee.employeeId}
                          className="bg-white/60 hover:bg-white/90 transition-all duration-300 group/row"
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

      <RunPayrollModal
        isOpen={isPayrollModalOpen}
        onClose={() => setPayrollModalOpen(false)}
        isPending={calculatePayroll.isPending}
        initialMonth={month}
        onRun={(payload) => {
          calculatePayroll.mutate(payload, {
            onSuccess: () => {
              setPayrollModalOpen(false);
            }
          });
        }}
      />

      {/* ─── Payslip Modal ────────────────────────────────────────────────────── */}
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