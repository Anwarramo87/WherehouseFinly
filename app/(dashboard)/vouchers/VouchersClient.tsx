"use client";

import { useState, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Printer,
  Search,
  Calendar as CalendarIcon,
  Receipt,
  Wallet,
  ChevronLeft,
} from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import useSalaries from "@/hooks/useSalaries";
import { useBonuses } from "@/hooks/useBonuses";
import { useAdvances } from "@/hooks/useAdvances";
import { usePayrollInputs } from "@/hooks/usePayrollInputs";
import { useAttendanceDeductions } from "@/hooks/useAttendanceDeductions";
import { useAttendance } from "@/hooks/useAttendance";
import { useLeaves } from "@/hooks/useLeaves";
import { usePenalties } from "@/hooks/usePenalties";
import type { Salary } from "@/types/salary";
import type { Bonus } from "@/types/bonus";
import type { Advance } from "@/types/advance";
import type { AttendanceDeductionBreakdown } from "@/types/attendance-deduction";

// ─── TypeScript Interfaces ─────────────────────────────────────────────────────
interface AggregatedPayroll {
  employeeId: string;
  employeeName: string;
  fixedEarnings: number;
  variableEarnings: number;
  fixedDeductions: number;
  variableDeductions: number;
  netPay: number;
  earnedSalary: number;
  details: {
    salaryConfig: Salary | null;
    bonuses: Bonus[];
    advances: Advance[];
    attendance: null;
  };
}

// ─── Salary Calculation Constants ──────────────────────────────────────────────
const STANDARD_WORK_DAYS = 26;
const HOURS_PER_DAY = 8;

/**
 * حساب الراتب المستحق — نفس الصيغة المستخدمة في صفحة TimeTable بالضبط
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

// ─── Helper Functions ──────────────────────────────────────────────────────────
const toNumber = (value: unknown): number => {
  if (
    value &&
    typeof value === "object" &&
    "$numberDecimal" in (value as Record<string, unknown>)
  ) {
    return Number((value as { $numberDecimal: string }).$numberDecimal || 0);
  }
  return Number(value || 0);
};

const getLocalMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function VouchersClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedMonth = searchParams.get("month");
  const month = requestedMonth || getLocalMonth();

  const [searchTerm, setSearchTerm] = useState("");

  const handleMonthChange = (nextMonth: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!nextMonth || nextMonth === getLocalMonth()) {
      params.delete("month");
    } else {
      params.set("month", nextMonth);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // ─── STEP 1: Raw Data Fetching ───────────────────────────────────────────────
  const { data: employees = [], isLoading: employeesLoading } = useEmployees({
    status: "active",
    limit: 500,
  });
  const { data: salaries = [], isLoading: salariesLoading } = useSalaries();
  const { data: bonuses = [], isLoading: bonusesLoading } = useBonuses({ period: month });
  const { data: advances = [], isLoading: advancesLoading } = useAdvances();

  // Period boundaries for leaves/attendance queries
  const { periodStart, periodEnd } = useMemo(() => {
    if (!month) return { periodStart: undefined, periodEnd: undefined };
    const [year, m] = month.split("-");
    const startDate = `${year}-${m}-01`;
    const endDay = new Date(Number(year), Number(m), 0).getDate();
    const endDate = `${year}-${m}-${String(endDay).padStart(2, "0")}`;
    return { periodStart: startDate, periodEnd: endDate };
  }, [month]);

  // Attendance hooks (same as payroll page)
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

  const { data: monthlyAttendanceData, isLoading: attendanceLoading } = useAttendance({
    period: month,
    limit: 500,
  });
  const { data: monthlyLeaves = [], isLoading: leavesLoading } = useLeaves({
    startDate: periodStart,
    endDate: periodEnd,
  });
  const { data: penalties = [], isLoading: penaltiesLoading } = usePenalties({
    startDate: periodStart,
    endDate: periodEnd,
  });

  // Local present days map from attendance records
  const localPresentDaysMap = useMemo(() => {
    const map = new Map<string, number>();
    const dailyRecords = monthlyAttendanceData?.dailyRecords || [];
    for (const dr of dailyRecords) {
      if (!dr.checkIn) continue;
      map.set(dr.employeeId, (map.get(dr.employeeId) ?? 0) + 1);
    }
    return map;
  }, [monthlyAttendanceData?.dailyRecords]);

  // Employee leaves map (same as TimeTable)
  const employeeLeavesMap = useMemo(() => {
    const map = new Map<
      string,
      {
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
          paidLeaveDays: 0,
          sickLeaveDays: 0,
          unpaidLeaveDays: 0,
          countedDates: new Set(),
        });
      }
      const entry = map.get(leave.employeeId)!;
      const cur = new Date(effectiveStart);
      const endD = new Date(effectiveEnd);
      while (cur <= endD) {
        const dateStr = cur.toISOString().slice(0, 10);
        if (!entry.countedDates.has(dateStr)) {
          entry.countedDates.add(dateStr);
          if (leave.leaveType === "SICK") entry.sickLeaveDays++;
          else if (leave.isPaid) entry.paidLeaveDays++;
          else entry.unpaidLeaveDays++;
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [monthlyLeaves, periodStart, periodEnd]);

  const isLoading =
    employeesLoading ||
    salariesLoading ||
    bonusesLoading ||
    advancesLoading ||
    inputsLoading ||
    deductionsLoading ||
    attendanceLoading ||
    leavesLoading ||
    penaltiesLoading;

  // ─── STEP 1: The Maestro Aggregation ─────────────────────────────────────────
  const payrollData = useMemo<AggregatedPayroll[]>(() => {
    if (!employees.length) return [];

    return employees.map((employee) => {
      const employeeId = employee.employeeId;
      const employeeName = employee.name;

      const salaryConfig = salaries.find((s) => s.employeeId === employeeId) || null;

      // Calculate gross salary (all components)
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
          toNumber(employee.baseSalary) ||
          toNumber(employee.hourlyRate) * HOURS_PER_DAY * STANDARD_WORK_DAYS;
      }

      const insuranceAmount = salaryConfig ? toNumber(salaryConfig.insuranceAmount) : 0;

      // ── Earned salary calculation (same as TimeTable) ──
      const manualInput = payrollInputs.find((pi) => pi.employeeId === employeeId);
      const autoInput = autoDeductions.find(
        (d: AttendanceDeductionBreakdown) => d.employeeId === employeeId,
      );
      const hasManualInput = !!manualInput;
      const leaveData = employeeLeavesMap.get(employeeId);

      // Late minutes
      const lateMinutes =
        hasManualInput && (manualInput.lateMinutes ?? 0) > 0
          ? (manualInput.lateMinutes ?? 0)
          : (autoInput?.delayMinutes ?? 0);

      // Present days
      let actualWorkDays: number;
      if (hasManualInput && manualInput.absenceDays !== undefined) {
        actualWorkDays = Math.max(0, STANDARD_WORK_DAYS - manualInput.absenceDays);
      } else {
        const backendPresent = autoInput?.presentDays ?? 0;
        const localPresent = localPresentDaysMap.get(employeeId) ?? 0;
        actualWorkDays = Math.max(backendPresent, localPresent);
      }

      // Paid leave days
      const sickLeaveDays = Math.max(
        hasManualInput ? (manualInput.sickLeaveDays ?? 0) : 0,
        leaveData?.sickLeaveDays ?? 0,
      );
      const paidLeaveDays = Math.max(
        hasManualInput ? (manualInput.adminLeaveDays ?? 0) + (manualInput.deathLeaveDays ?? 0) : 0,
        leaveData?.paidLeaveDays ?? 0,
      );
      const effectivePaidLeaveDays = paidLeaveDays + sickLeaveDays * 0.5;

      // Early leave & overtime
      const earlyLeaveMinutes = manualInput?.earlyLeaveMinutes ?? autoInput?.earlyLeaveMinutes ?? 0;
      const totalOvertimeMinutes =
        hasManualInput && (manualInput.overtimeRegularMinutes ?? 0) > 0
          ? (manualInput.overtimeRegularMinutes ?? 0)
          : (autoInput?.overtimeMinutes ?? 0);
      const totalOvertimeDays =
        hasManualInput && (manualInput.overtimeWeekendDays ?? 0) > 0
          ? (manualInput.overtimeWeekendDays ?? 0)
          : (autoInput?.overtimeWeekendDays ?? 0);

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
      const earnedSalary = Math.max(0, rawEarned - insuranceAmount);

      // ── Bonuses ──
      const employeeBonuses = bonuses.filter((b) => b.employeeId === employeeId);
      const variableEarnings = employeeBonuses.reduce((sum, bonus) => {
        return sum + toNumber(bonus.bonusAmount) + toNumber(bonus.assistanceAmount);
      }, 0);

      // ── Deductions: advances + penalties ──
      const employeeAdvances = advances.filter((a) => {
        if (a.employeeId !== employeeId) return false;
        const advanceDate = a.issueDate || a.createdAt || "";
        return advanceDate.startsWith(month);
      });
      const advancesDeduction = employeeAdvances.reduce((sum, advance) => {
        return sum + (toNumber(advance.installmentAmount) || toNumber(advance.remainingAmount));
      }, 0);

      const employeePenalties = penalties.filter((p) => {
        return p.employeeId === employeeId && p.issueDate.startsWith(month);
      });
      const penaltiesDeduction = employeePenalties.reduce((sum, p) => sum + toNumber(p.amount), 0);

      const fixedDeductions = insuranceAmount;
      const variableDeductions = advancesDeduction + penaltiesDeduction;

      // ── Net pay = earned salary + bonuses - variable deductions ──
      const netPay = earnedSalary + variableEarnings - variableDeductions;

      return {
        employeeId,
        employeeName,
        fixedEarnings: calcGross,
        variableEarnings,
        fixedDeductions,
        variableDeductions,
        netPay,
        earnedSalary,
        details: {
          salaryConfig,
          bonuses: employeeBonuses,
          advances: employeeAdvances,
          attendance: null,
        },
      };
    });
  }, [
    employees,
    salaries,
    bonuses,
    advances,
    month,
    payrollInputs,
    autoDeductions,
    localPresentDaysMap,
    employeeLeavesMap,
    penalties,
  ]);

  // ─── STEP 1: Filter Vouchers ─────────────────────────────────────────────────
  const filteredVouchers = useMemo(() => {
    let filtered = payrollData.filter((p) => {
      // Do not print if netPay <= 0 AND fixedEarnings === 0
      if (p.netPay <= 0 && p.fixedEarnings === 0 && p.variableEarnings === 0) return false;
      return true;
    });

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.employeeName.toLowerCase().includes(query) ||
          p.employeeId.toLowerCase().includes(query),
      );
    }
    return filtered;
  }, [payrollData, searchTerm]);

  // ─── Loading State ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="relative min-h-[85vh] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 relative z-10 bg-white/40 p-8 rounded-3xl backdrop-blur-2xl border border-white/60 shadow-[0_20px_40px_rgba(38,53,68,0.1)]">
          <div className="w-14 h-14 border-4 border-[#C89355]/30 border-t-[#263544] rounded-full animate-spin shadow-lg" />
          <p className="text-[#263544] font-black animate-pulse text-sm tracking-wide">
            جاري تجهيز القسائم...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full min-h-screen bg-slate-50" dir="rtl">
      {/* ─── STEP 2: Dashboard UI (Screen View) ──────────────────────────────────── */}
      <div className="print:hidden relative z-10 w-full max-w-7xl mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 p-6 md:p-10 mb-8 mt-8">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`,
            backgroundSize: "24px 24px",
          }}
        />

        {/* ─── مسار التنقل مع زر الرجوع ─── */}
        <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
          <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />

          <button
            onClick={() => router.back()}
            className="hover:text-[#263544] cursor-pointer transition-colors relative z-10 active:scale-95"
          >
            الرجوع للسابق
          </button>

          <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
          <span className="text-[#263544] relative z-10">طباعة القسائم المجمعة</span>
        </nav>

        <header className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-[#263544]/10 pb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4">
                <Receipt size={22} className="text-[#C89355] animate-bounce" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">
                قسائم القبض المجمعة
              </h1>
            </div>
            <p className="text-slate-600 text-sm font-bold pr-14 mt-1">
              جاهزة للطباعة المباشرة بصيغة PDF أو على الورق المباشر (قسيمتان لكل صفحة A4)
            </p>
          </div>

          <div className="mt-4 xl:mt-0 flex flex-wrap items-center justify-start xl:justify-end gap-3 w-full xl:w-auto">
            <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-4 py-2 shadow-sm transition-all duration-300 hover:shadow-md group focus-within:border-[#C89355]">
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
              <CalendarIcon size={18} className="text-[#C89355] relative z-10 ml-2" />
              <input
                type="month"
                value={month}
                onChange={(event) => handleMonthChange(event.target.value)}
                className="bg-transparent border-none outline-none font-mono text-sm font-black text-[#263544] w-full cursor-pointer relative z-10"
              />
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="relative overflow-hidden inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-emerald-600/90 backdrop-blur-md text-white font-black text-lg hover:bg-emerald-700 transition-all shadow-[0_15px_30px_rgba(5,150,105,0.4)] active:scale-95 border border-emerald-500 group"
            >
              <div className="absolute inset-1 rounded-xl border border-dashed border-white/30 pointer-events-none" />
              <Printer
                size={22}
                className="group-hover:-translate-y-1 transition-transform relative z-10"
              />
              <span className="relative z-10">طباعة القسائم</span>
              {filteredVouchers.length > 0 && (
                <span className="relative z-10 bg-white/20 px-3 py-1 rounded-full text-sm font-black">
                  {filteredVouchers.length}
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-4 py-3 shadow-sm focus-within:border-[#C89355] transition-all">
          <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
          <Search size={20} className="text-[#C89355] ml-3 relative z-10" />
          <input
            type="text"
            placeholder="البحث عن موظف بالاسم أو الكود (لطباعة قسيمة مخصصة)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none font-bold text-sm text-[#263544] w-full focus:ring-0 relative z-10 placeholder:text-slate-400"
          />
        </div>

        {filteredVouchers.length === 0 && (
          <div className="mt-8 relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-12 text-center shadow-sm">
            <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/20 pointer-events-none" />
            <p className="text-slate-600 font-black text-lg relative z-10">
              {searchTerm ? "لا توجد نتائج للبحث" : "لا توجد قسائم متاحة للطباعة"}
            </p>
          </div>
        )}
      </div>

      {/* ─── STEP 3: The Bulk Vouchers Layout (The Masterpiece) ─────────────────── */}
      <div className="vouchers-grid max-w-7xl mx-auto px-4 pb-8 grid grid-cols-1 gap-6 print:gap-0 print:px-0 print:pb-0">
        {filteredVouchers.map((voucher) => (
          <article
            key={voucher.employeeId}
            className="voucher-card relative bg-white rounded-3xl border-4 border-[#1a2530] shadow-[0_10px_30px_rgba(38,53,68,0.15)] overflow-hidden print:rounded-none print:shadow-none print:border-2 print:page-break-inside-avoid print:max-h-[48vh] print:mb-2 flex flex-col"
          >
            {/* Header */}
            <div className="bg-linear-to-br from-[#1a2530] to-[#263544] p-6 border-b-4 border-[#C89355] print:p-4 print:border-b-2">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black text-[#C89355] mb-1 tracking-tight print:text-lg">
                    قسيمة قبض راتب
                  </h2>
                  <p className="text-white/80 font-bold text-xs print:text-[10px]">
                    KU&M JEANS — نظام الرواتب المتكامل
                  </p>
                </div>
                <div className="text-left bg-black/20 p-2 rounded-lg border border-white/10 print:border-none print:bg-transparent">
                  <p className="text-white/60 text-xs font-bold mb-1 print:text-[10px]">الفترة</p>
                  <p className="text-[#C89355] text-xl font-black font-mono print:text-base">
                    {month}
                  </p>
                </div>
              </div>

              {/* Employee Info */}
              <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 print:p-2 print:mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/60 text-xs font-bold mb-1 print:text-[10px]">
                      اسم الموظف
                    </p>
                    <p className="text-white text-lg font-black print:text-sm">
                      {voucher.employeeName}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-white/60 text-xs font-bold mb-1 print:text-[10px]">
                      كود الموظف
                    </p>
                    <p className="text-[#C89355] text-lg font-black font-mono print:text-sm">
                      {voucher.employeeId}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Body - Compact Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 print:p-3 print:gap-3 flex-1">
              {/* Right: Earnings */}
              <div className="space-y-3 print:space-y-1.5">
                <div className="flex items-center gap-2 mb-3 print:mb-1">
                  <Wallet className="text-emerald-600 print:w-4 print:h-4" size={18} />
                  <h3 className="text-lg font-black text-emerald-700 print:text-sm">المستحقات</h3>
                </div>

                {voucher.fixedEarnings > 0 && (
                  <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-200/50 print:p-1.5 print:bg-emerald-50">
                    <p className="text-xs font-black text-emerald-800 mb-2 uppercase print:text-[9px] print:mb-1">
                      {" "}
                      الاستحقاقات الثابتة
                    </p>
                    {voucher.details.salaryConfig && (
                      <div className="space-y-1.5 print:space-y-0.5 text-xs print:text-[10px]">
                        {toNumber(voucher.details.salaryConfig.baseSalary) > 0 && (
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-700">الراتب الأساسي</span>
                            <span className="font-black text-emerald-700 font-mono">
                              {toNumber(voucher.details.salaryConfig.baseSalary).toLocaleString()}
                            </span>
                          </div>
                        )}

                        {toNumber(voucher.details.salaryConfig.livingAllowance) > 0 && (
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-700">بدل المعيشة</span>
                            <span className="font-black text-emerald-700 font-mono">
                              {toNumber(
                                voucher.details.salaryConfig.livingAllowance,
                              ).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {toNumber(voucher.details.salaryConfig.transportAllowance) > 0 && (
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-700">بدل النقل</span>
                            <span className="font-black text-emerald-700 font-mono">
                              {toNumber(
                                voucher.details.salaryConfig.transportAllowance,
                              ).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-emerald-300 flex justify-between items-center text-xs print:text-[10px] print:mt-1 print:pt-1">
                      <span className="font-black text-emerald-900 uppercase">المجموع</span>
                      <span className="font-black text-emerald-700 font-mono">
                        {voucher.fixedEarnings.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {voucher.variableEarnings > 0 && (
                  <div className="bg-[#C89355]/10 rounded-xl p-3 border border-[#C89355]/30 print:p-1.5 print:bg-transparent">
                    <p className="text-xs font-black text-[#C89355] mb-2 uppercase print:text-[9px] print:mb-1">
                      الاستحقاقات المتغيرة
                    </p>
                    <div className="space-y-1.5 print:space-y-0.5 text-xs print:text-[10px]">
                      {voucher.details.bonuses.map((bonus, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="font-bold text-slate-700">
                            {bonus.bonusReason || "مكافأة"}
                          </span>
                          <span className="font-black text-[#C89355] font-mono">
                            +
                            {(
                              toNumber(bonus.bonusAmount) + toNumber(bonus.assistanceAmount)
                            ).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Left: Deductions */}
              <div className="space-y-3 print:space-y-1.5">
                <div className="flex items-center gap-2 mb-3 print:mb-1">
                  <Receipt className="text-rose-600 print:w-4 print:h-4" size={18} />
                  <h3 className="text-lg font-black text-rose-700 print:text-sm">الاقتطاعات</h3>
                </div>

                {voucher.fixedDeductions > 0 && (
                  <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-200/50 print:p-1.5 print:bg-rose-50">
                    <p className="text-xs font-black text-rose-800 mb-2 uppercase print:text-[9px] print:mb-1">
                      الخصومات الثابتة
                    </p>
                    <div className="flex justify-between text-xs print:text-[10px]">
                      <span className="font-bold text-slate-700">التأمينات</span>
                      <span className="font-black text-rose-700 font-mono">
                        -{voucher.fixedDeductions.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {voucher.variableDeductions > 0 && (
                  <div className="bg-rose-100/50 rounded-xl p-3 border border-rose-300/50 print:p-1.5 print:bg-rose-50">
                    <p className="text-xs font-black text-rose-800 mb-2 uppercase print:text-[9px] print:mb-1">
                      الخصومات المتغيرة
                    </p>
                    <div className="space-y-1.5 print:space-y-0.5 text-xs print:text-[10px]">
                      {voucher.details.advances.map((advance, idx) => {
                        const deductionAmount =
                          toNumber(advance.installmentAmount) || toNumber(advance.remainingAmount);
                        return (
                          <div key={idx} className="flex justify-between">
                            <span className="font-bold text-slate-700">
                              سلفة {advance.advanceType === "salary" ? "راتب" : "أخرى"}
                            </span>
                            <span className="font-black text-rose-700 font-mono">
                              -{deductionAmount.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 pt-2 border-t border-rose-400 flex justify-between items-center text-xs print:text-[10px] print:mt-1 print:pt-1">
                      <span className="font-black text-rose-900 uppercase">المجموع</span>
                      <span className="font-black text-rose-700 font-mono">
                        -{voucher.variableDeductions.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {voucher.fixedDeductions === 0 && voucher.variableDeductions === 0 && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center print:p-2">
                    <p className="text-slate-500 font-bold text-xs print:text-[10px]">
                      لا توجد اقتطاعات
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-6 border-t-2 border-slate-200 print:p-3 mt-auto">
              {/* Massive Net Pay */}
              <div className="text-center mb-6 print:mb-3">
                <p className="text-[#1a2530]/60 font-black text-xs uppercase tracking-widest mb-1 print:text-[9px]">
                  صافي المستحق للدفع
                </p>
                <p className="text-[#1a2530] text-5xl font-black font-mono drop-shadow-md print:text-2xl">
                  {voucher.netPay.toLocaleString()}
                  <span className="text-xl mr-2 print:text-sm">ل.س</span>
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-[#1a2530]/20 print:gap-2 print:pt-2">
                <div>
                  <p className="text-[#1a2530]/60 text-xs font-bold mb-4 print:text-[9px] print:mb-3">
                    توقيع المحاسب:
                  </p>
                  <div className="border-b-2 border-dashed border-[#1a2530]/30 w-3/4 print:w-full"></div>
                </div>
                <div>
                  <p className="text-[#1a2530]/60 text-xs font-bold mb-4 print:text-[9px] print:mb-3">
                    توقيع الموظف المستلم:
                  </p>
                  <div className="border-b-2 border-dashed border-[#1a2530]/30 w-3/4 print:w-full"></div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1a2530]/10 text-center print:mt-2 print:pt-1">
                <p className="text-[#1a2530]/40 text-[10px] font-bold">
                  تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG")}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* ─── STEP 4: Advanced Print CSS ──────────────────────────────────────────── */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        @media print {
          /* Hide dashboard UI elements */
          .print\\:hidden {
            display: none !important;
          }

          /* Reset body */
          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }

          /* Vouchers grid optimization */
          .vouchers-grid {
            display: block !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Voucher card constraints */
          .voucher-card {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
            height: auto !important;
            min-height: 48vh !important;
            margin-bottom: 5mm !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border-width: 2px !important;
          }

          /* Force 2 per page */
          .voucher-card:nth-child(2n) {
            page-break-after: always !important;
          }

          /* Colors & Backgrounds */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .bg-gradient-to-br,
          .bg-emerald-50,
          .bg-rose-50,
          .bg-slate-50,
          [class*="bg-"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Layout fixes */
          .grid {
            display: grid !important;
          }
          .grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .flex {
            display: flex !important;
          }
          .justify-between {
            justify-content: space-between !important;
          }

          /* Typography optimizations */
          * {
            line-height: 1.3 !important;
            font-family:
              system-ui,
              -apple-system,
              sans-serif !important;
          }
          .font-black {
            font-weight: 900 !important;
          }
          .font-bold {
            font-weight: 700 !important;
          }

          /* Remove visual fluff */
          .backdrop-blur-sm,
          [class*="backdrop-blur"],
          [class*="shadow-"] {
            backdrop-filter: none !important;
            box-shadow: none !important;
          }
          *,
          *::before,
          *::after {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }

          /* SVG Icons */
          svg {
            width: 1rem !important;
            height: 1rem !important;
          }

          /* Signatures */
          .border-dashed {
            border-style: dashed !important;
          }
        }
      `}</style>
    </div>
  );
}
