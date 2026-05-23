"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Download, FileSpreadsheet, Wallet, Receipt,
  HandCoins, Calendar as CalendarIcon,
  ChevronLeft, Search, AlertTriangle, Info, Play,
} from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import useSalaries from "@/hooks/useSalaries";
import { useBonuses } from "@/hooks/useBonuses";
import { useAdvances } from "@/hooks/useAdvances";
import { usePayrollReport } from "@/hooks/usePayrollReport";
import { usePayroll } from "@/hooks/usePayroll";
import RunPayrollModal from "@/components/RunPayrollModal";
import { toast } from "react-hot-toast";

import type { Salary } from "@/types/salary";
import type { Bonus } from "@/types/bonus";
import type { Advance } from "@/types/advance";
import type { PayrollItem } from "@/types/payroll";

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

  // 📋 Visual-only subtotals for the payslip modal
  fixedEarnings: number;
  variableEarnings: number;
  fixedDeductions: number;
  variableDeductions: number;
  details: {
    salaryConfig: Salary | null;
    bonuses: Bonus[];
    advances: Advance[];
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const [month, setMonth] = useState(getLocalMonth());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayslip, setSelectedPayslip] = useState<AggregatedPayroll | null>(null);
  const [isPayrollModalOpen, setPayrollModalOpen] = useState(false);

  const { calculatePayroll } = usePayroll();

  // ── Fetch supporting data (for payslip modal display only) ───────────────────
  const { isLoading: employeesLoading } = useEmployees({ status: "active", limit: 500 });
  const { data: salaries = [], isLoading: salariesLoading } = useSalaries();
  const { data: bonuses = [], isLoading: bonusesLoading } = useBonuses({ period: month });
  const { data: advances = [], isLoading: advancesLoading } = useAdvances();

  // ── PRIMARY data source — backend-calculated payroll for the selected month ──
  const { data: reportData, isLoading: reportLoading } = usePayrollReport(month);

  const isLoading =
    employeesLoading || salariesLoading || bonusesLoading || advancesLoading || reportLoading;

  // ── Build payroll rows ───────────────────────────────────────────────────────
  /**
   * Each row is driven by a payrollItem returned from GET /api/payroll/report/:month.
   * If no payroll run exists for the selected month `reportData.items` is empty
   * and the table shows the "no run" empty-state — NOT zeros.
   */
  const payrollData = useMemo<AggregatedPayroll[]>(() => {
    if (!reportData?.items?.length) return [];

    return reportData.items.map((backendItem: PayrollItem) => {
      const { employeeId, employeeName } = backendItem;

      // Department: authoritative value lives in the payrollItem (from employee.department).
      // Fall back to salaryConfig.profession only if the backend field is absent.
      const salaryConfig = salaries.find((s) => s.employeeId === employeeId) ?? null;
      const department =
        (backendItem.department?.trim() || "") ||
        salaryConfig?.profession?.trim() ||
        "أقسام عامة";

      // ── Server-authoritative financial figures ────────────────────────────
      const grossPay = toNumber(backendItem.grossPay);
      const totalDeductions = toNumber(backendItem.totalDeductions);
      const netPay = toNumber(backendItem.netPay);
      const netPayRounded = toNumber(backendItem.netPayRounded);
      const roundingDifference = toNumber(backendItem.roundingDifference);
      const anomalies: string[] = Array.isArray(backendItem.anomalies)
        ? backendItem.anomalies
        : [];

      // ── Display-only subtotals for the payslip modal ──────────────────────
      // Bug-fix: include ALL seven salary components that the backend sums into grossPay.
      // Previously missing: responsibilityAllowance, extraEffortAllowance, productionIncentive.
      const fixedEarnings = salaryConfig
        ? toNumber(salaryConfig.baseSalary) +
          toNumber(salaryConfig.lumpSumSalary) +
          toNumber(salaryConfig.livingAllowance) +
          toNumber(salaryConfig.responsibilityAllowance) +
          toNumber(salaryConfig.extraEffortAllowance ?? salaryConfig.extraEffort) +
          toNumber(salaryConfig.productionIncentive) +
          toNumber(salaryConfig.transportAllowance)
        : 0;

      const employeeBonuses = bonuses.filter((b) => b.employeeId === employeeId);
      // Bug-fix: bonusAmount is an earning; assistanceAmount is treated as a DEDUCTION
      // by the backend (administrativeDeductions) — do NOT add it to variableEarnings.
      const variableEarnings = employeeBonuses.reduce(
        (sum, bonus) => sum + toNumber(bonus.bonusAmount),
        0,
      );

      const employeeAdvances = advances.filter((a) => {
        if (a.employeeId !== employeeId) return false;
        const advanceDate = a.issueDate || a.createdAt || "";
        return advanceDate.startsWith(month);
      });
      const advancesDeduction = employeeAdvances.reduce(
        (sum, adv) =>
          sum + (toNumber(adv.installmentAmount) || toNumber(adv.remainingAmount)),
        0,
      );

      return {
        employeeId,
        employeeName,
        department,
        // ✅ Server-authoritative
        grossPay,
        totalDeductions,
        netPay,
        netPayRounded,
        roundingDifference,
        anomalies,
        // 📋 Visual only
        fixedEarnings,
        variableEarnings,
        fixedDeductions: toNumber(salaryConfig?.insuranceAmount),
        variableDeductions: advancesDeduction,
        details: {
          salaryConfig,
          bonuses: employeeBonuses,
          advances: employeeAdvances,
          attendance: null,
        },
      };
    });
  }, [reportData, salaries, bonuses, advances, month]);

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

  // ── Group by department ───────────────────────────────────────────────────────
  const groupedPayrollData = useMemo(() => {
    const groups: Record<string, AggregatedPayroll[]> = {};
    filteredPayrollData.forEach((item) => {
      if (!groups[item.department]) groups[item.department] = [];
      groups[item.department].push(item);
    });
    return Object.fromEntries(Object.entries(groups).sort());
  }, [filteredPayrollData]);

  // ── Grand totals (server figures only) ───────────────────────────────────────
  const globalTotals = useMemo(
    () =>
      filteredPayrollData.reduce(
        (acc, p) => ({
          totalEarnings: acc.totalEarnings + p.grossPay,
          totalNetPay: acc.totalNetPay + p.netPay,
          totalNetPayRounded: acc.totalNetPayRounded + p.netPayRounded,
          totalRoundingDifference: acc.totalRoundingDifference + p.roundingDifference,
          totalDeductions: acc.totalDeductions + p.totalDeductions,
        }),
        {
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
      const rows: Array<Record<string, string | number>> = filteredPayrollData.map(
        (item, index) => ({
          "#": index + 1,
          "القسم": item.department,
          "كود الموظف": item.employeeId,
          "اسم الموظف": item.employeeName,
          "إجمالي الاستحقاقات": Number(item.grossPay.toFixed(2)),
          "إجمالي الخصومات": Number(item.totalDeductions.toFixed(2)),
          "صافي الراتب (حسابي دقيق)": Number(item.netPay.toFixed(2)),
          "الصافي المقبوض (مقرب)": Number(item.netPayRounded.toFixed(2)),
          "فرق التقريب": Number(item.roundingDifference.toFixed(2)),
        }),
      );
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
              <CalendarIcon size={18} className="text-[#C89355] group-hover:scale-110 transition-transform relative z-10 ml-2" />
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-transparent border-none outline-none font-mono text-sm font-black text-[#263544] w-full cursor-pointer focus:ring-0 relative z-10"
              />
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!filteredPayrollData.length}
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
          {/* Total gross */}
          <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] hover:-translate-y-1 transition-all group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-3 bg-[#1a2530] rounded-xl border border-[#C89355]/30 shadow-sm group-hover:shadow-[0_0_15px_rgba(200,147,85,0.4)] transition-shadow">
                <Wallet className="text-[#C89355]" size={22} />
              </div>
              <p className="font-black text-[#263544] text-sm">إجمالي الاستحقاقات</p>
            </div>
            <p className="text-4xl font-black text-[#263544] relative z-10 drop-shadow-sm">
              {globalTotals.totalEarnings.toLocaleString()}
            </p>
          </div>

          {/* Total net rounded */}
          <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(200,147,85,0.12)] hover:-translate-y-1 transition-all group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-3 bg-[#1a2530] rounded-xl border border-[#C89355]/30 shadow-sm group-hover:shadow-[0_0_15px_rgba(200,147,85,0.4)] transition-shadow">
                <HandCoins className="text-[#C89355]" size={22} />
              </div>
              <p className="font-black text-[#263544] text-sm">إجمالي المقبوض (مقرب)</p>
            </div>
            <p className="text-4xl font-black text-[#C89355] relative z-10 drop-shadow-sm">
              {globalTotals.totalNetPayRounded.toLocaleString()}
            </p>
          </div>

          {/* Rounding difference */}
          <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(245,158,11,0.12)] hover:-translate-y-1 transition-all group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-amber-300" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-sm group-hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-shadow">
                <Receipt className="text-amber-600" size={22} />
              </div>
              <p className="font-black text-[#263544] text-sm">إجمالي فروقات التقريب</p>
            </div>
            <p className="text-4xl font-black text-amber-600 relative z-10 drop-shadow-sm">
              {globalTotals.totalRoundingDifference.toLocaleString()}
            </p>
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
        <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group/table">
          <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover/table:border-[#C89355]/50" />
          <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
            <table className="w-full text-right min-w-[900px] border-collapse">
              <thead className="bg-[#1a2530] text-white outline-dashed outline-1 outline-[#C89355]/50 -outline-offset-[6px]">
                <tr>
                  <th className="p-5 font-black text-xs uppercase tracking-wider text-center">كود</th>
                  <th className="p-5 font-black text-xs uppercase tracking-wider text-center">الموظف</th>
                  <th className="p-5 font-black text-xs uppercase tracking-wider text-center">الإجمالي (دقيق)</th>
                  <th className="p-5 font-black text-xs uppercase tracking-wider text-center">الخصومات (دقيق)</th>
                  <th className="p-5 font-black text-xs uppercase tracking-wider text-center">الصافي (حسابي)</th>
                  <th className="p-5 font-black text-xs uppercase tracking-wider text-center bg-[#C89355]/20 text-[#C89355] border-b-4 border-[#C89355]/50">
                    المقبوض (مقرب)
                  </th>
                  <th className="p-5 font-black text-xs uppercase tracking-wider text-center">فرق التقريب</th>
                  <th className="p-5 font-black text-xs uppercase tracking-wider text-center">إجراء</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200/50">
                {Object.keys(groupedPayrollData).length ? (
                  Object.entries(groupedPayrollData).map(([dept, items]) => (
                    <React.Fragment key={dept}>
                      {/* Department header row */}
                      <tr className="bg-slate-100/80 hover:bg-slate-200/60 transition-colors border-y border-slate-300">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-5 bg-[#C89355] rounded-full shadow-sm" />
                            <span className="font-black text-[#263544] text-sm uppercase tracking-wide">
                              {dept}
                            </span>
                            <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                              {items.length} موظف
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Employee rows */}
                      {items.map((item) => (
                        <tr
                          key={item.employeeId}
                          className="bg-white/40 hover:bg-white/90 transition-all duration-300 group/row hover:scale-[1.002] hover:shadow-sm"
                        >
                          <td className="p-4 text-center font-mono text-sm font-black text-[#263544]/60 group-hover/row:text-[#C89355] transition-colors">
                            {item.employeeId}
                          </td>
                          <td className="p-4 text-center font-black text-slate-800 group-hover/row:text-[#263544] transition-colors">
                            <div className="flex flex-col items-center">
                              <span>{item.employeeName}</span>
                              {item.anomalies.length > 0 && (
                                <span className="text-[10px] text-amber-500 flex items-center gap-1 mt-1 font-bold">
                                  <AlertTriangle size={10} /> تنبيه حسابي
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center font-mono font-black text-[#263544]">
                            {item.grossPay.toLocaleString()}
                          </td>
                          <td className="p-4 text-center font-mono font-black text-rose-600 bg-rose-50/30 rounded-xl">
                            {item.totalDeductions.toLocaleString()}
                          </td>
                          <td className="p-4 text-center font-mono font-black text-[#263544]">
                            {item.netPay.toLocaleString()}
                          </td>
                          <td className="p-4 text-center font-black text-xl text-[#1a2530] bg-gradient-to-l from-[#C89355]/10 to-transparent rounded-xl shadow-inner border-l-4 border-l-[#C89355]">
                            {item.netPayRounded.toLocaleString()}
                          </td>
                          <td className="p-4 text-center font-mono font-black text-amber-600 bg-amber-50/30 rounded-xl">
                            {item.roundingDifference.toLocaleString()}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => setSelectedPayslip(item)}
                              className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-xl bg-white text-[#C89355] hover:bg-[#C89355] hover:text-white font-bold text-xs transition-all shadow-sm border border-[#C89355]/30 active:scale-95 group/btn"
                            >
                              <Receipt size={16} className="group-hover/btn:scale-110 transition-transform" />
                              عرض الوصل
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td className="p-16 text-center" colSpan={8}>
                      <div className="flex flex-col items-center justify-center gap-3 animate-in fade-in zoom-in duration-500">
                        <div className="p-4 bg-white/50 rounded-full border-2 border-dashed border-slate-300">
                          <Search size={32} className="text-slate-400" />
                        </div>
                        <p className="text-[#263544]/60 font-black text-lg">
                          {searchTerm
                            ? "لا توجد نتائج مطابقة للبحث"
                            : "لا توجد بيانات رواتب لهذا الشهر"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md"
          dir="rtl"
        >
          <div className="payslip-container bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(200,147,85,0.15)] w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col border border-white/10 outline-dashed outline-1 outline-[#C89355]/30 -outline-offset-8 animate-in fade-in zoom-in-95 duration-200">

            {/* Modal header */}
            <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10 print:bg-transparent print:border-b-2 print:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl border shadow-[0_0_20px_rgba(200,147,85,0.15)] bg-[#C89355]/10 border-[#C89355]/20 print:hidden">
                  <Receipt className="text-[#C89355]" size={28} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide print:text-slate-900">
                    تفاصيل وصل الراتب
                  </h2>
                  <p className="text-xs text-slate-400 font-bold mt-1 print:text-slate-500">
                    KU&amp;M JEANS — إدارة الموارد البشرية
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-left bg-black/20 p-3 rounded-xl border border-white/10 backdrop-blur-sm print:bg-transparent print:border-slate-300">
                  <p className="text-white/60 text-xs font-bold mb-1 uppercase tracking-widest print:text-slate-500">
                    فترة الاستحقاق
                  </p>
                  <p className="text-[#C89355] text-xl font-black font-mono print:text-slate-800">
                    {month}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="text-slate-500 hover:text-rose-400 bg-[#263544] p-2.5 rounded-2xl border border-transparent hover:border-rose-400/30 transition-all hover:rotate-90 active:scale-90 print:hidden"
                >
                  <ChevronLeft size={24} />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto custom-scrollbar flex-1 bg-slate-50 p-6 sm:p-10 relative print:p-4 print:overflow-visible">

              {/* Employee info card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8 print:border-none print:shadow-none print:p-0 print:mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="sm:col-span-2">
                    <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-widest print:text-black">
                      اسم الموظف
                    </p>
                    <p className="text-slate-800 text-2xl font-black print:text-black break-words">
                      {selectedPayslip.employeeName}
                    </p>
                    <p className="text-slate-400 text-sm font-bold mt-1">
                      {selectedPayslip.department}
                    </p>
                  </div>
                  <div className="text-right sm:text-left">
                    <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-widest print:text-black">
                      كود الموظف
                    </p>
                    <p className="text-[#C89355] text-2xl font-black font-mono print:text-black">
                      {selectedPayslip.employeeId}
                    </p>
                  </div>
                </div>
                {selectedPayslip.anomalies.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-sm font-bold print:hidden">
                    <strong>ملاحظات النظام: </strong>
                    <ul className="list-disc list-inside ms-4 mt-1">
                      {selectedPayslip.anomalies.map((an, idx) => (
                        <li key={idx}>{an}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Earnings / Deductions grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-4 print:grid-cols-2">

                {/* ── Earnings column ──────────────────────────────────────── */}
                <div className="space-y-6 print:space-y-4">
                  <div className="flex items-center gap-3 border-b-2 border-emerald-100 pb-4 print:border-emerald-200">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-200 print:bg-transparent">
                      <Wallet className="text-emerald-600 print:text-black" size={20} />
                    </div>
                    <h2 className="text-xl font-black text-emerald-800 tracking-tight print:text-black">
                      التفاصيل المالية (المستحقات)
                    </h2>
                  </div>

                  {/* Fixed salary components (display-only) */}
                  {selectedPayslip.details.salaryConfig ? (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                      <h3 className="text-sm font-black text-slate-500 mb-4 uppercase tracking-widest print:text-black">
                        الأجور الثابتة
                      </h3>
                      <div className="space-y-4 text-slate-700 print:text-black">
                        {(
                          [
                            { label: "الراتب الأساسي",          value: toNumber(selectedPayslip.details.salaryConfig.baseSalary) },
                            { label: "الراتب المقطوع",           value: toNumber(selectedPayslip.details.salaryConfig.lumpSumSalary) },
                            { label: "بدل المعيشة",              value: toNumber(selectedPayslip.details.salaryConfig.livingAllowance) },
                            { label: "تعويض المسؤولية",          value: toNumber(selectedPayslip.details.salaryConfig.responsibilityAllowance) },
                            {
                              label: "تعويض الجهد الإضافي",
                              value: toNumber(
                                selectedPayslip.details.salaryConfig.extraEffortAllowance ??
                                selectedPayslip.details.salaryConfig.extraEffort,
                              ),
                            },
                            { label: "حوافز الإنتاجية",          value: toNumber(selectedPayslip.details.salaryConfig.productionIncentive) },
                            { label: "بدل النقل",                value: toNumber(selectedPayslip.details.salaryConfig.transportAllowance) },
                          ] as { label: string; value: number }[]
                        )
                          .filter((row) => row.value > 0)
                          .map((row) => (
                            <div key={row.label} className="flex justify-between items-center">
                              <span className="text-sm font-bold">{row.label}</span>
                              <span className="text-lg font-black text-emerald-600 font-mono print:text-black">
                                {row.value.toLocaleString()}
                              </span>
                            </div>
                          ))}
                      </div>
                      <div className="mt-5 pt-4 border-t border-slate-200 border-dashed flex justify-between items-center print:border-slate-400">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest print:text-black">
                          مجموع الثوابت (واجهة)
                        </span>
                        <span className="text-xl font-black text-emerald-600 font-mono print:text-black">
                          {selectedPayslip.fixedEarnings.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic print:text-black">
                      لا يوجد راتب ثابت مضبوط للموظف
                    </p>
                  )}

                  {/* Bonuses */}
                  {selectedPayslip.details.bonuses.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                      <h3 className="text-sm font-black text-[#C89355] mb-4 uppercase tracking-widest print:text-black">
                        المكافآت
                      </h3>
                      <div className="space-y-4 text-slate-700 print:text-black">
                        {selectedPayslip.details.bonuses.map((bonus, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-sm font-bold">
                              {bonus.bonusReason || "مكافأة غير مسماة"}
                            </span>
                            <span className="text-lg font-black text-[#C89355] font-mono print:text-black">
                              +{toNumber(bonus.bonusAmount).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 pt-4 border-t border-slate-200 border-dashed flex justify-between items-center print:border-slate-400">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest print:text-black">
                          مجموع المكافآت
                        </span>
                        <span className="text-xl font-black text-[#C89355] font-mono print:text-black">
                          {selectedPayslip.variableEarnings.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Authoritative gross (from backend) */}
                  <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200 shadow-sm print:shadow-none print:border-slate-400 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-emerald-800 uppercase tracking-widest print:text-black">
                        إجمالي الاستحقاق الدقيق (حسب النظام)
                      </span>
                      <span className="text-2xl font-black text-emerald-600 font-mono print:text-black">
                        {selectedPayslip.grossPay.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Deductions column ────────────────────────────────────── */}
                <div className="space-y-6 print:space-y-4">
                  <div className="flex items-center gap-3 border-b-2 border-rose-100 pb-4 print:border-slate-300 print:pb-2">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-200 print:hidden">
                      <Receipt className="text-rose-600" size={20} />
                    </div>
                    <h2 className="text-xl font-black text-rose-800 tracking-tight print:text-black print:text-lg">
                      الاقتطاعات والخصومات
                    </h2>
                  </div>

                  {/* Insurance (fixed deduction) */}
                  {selectedPayslip.fixedDeductions > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                      <h3 className="text-sm font-black text-slate-500 mb-4 uppercase tracking-widest print:text-black">
                        اقتطاعات ثابتة
                      </h3>
                      <div className="flex justify-between items-center text-slate-700 print:text-black">
                        <span className="text-sm font-bold">مؤسسة التأمينات الاجتماعية</span>
                        <span className="text-lg font-black text-rose-600 font-mono print:text-black">
                          -{selectedPayslip.fixedDeductions.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Advances */}
                  {selectedPayslip.details.advances.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                      <h3 className="text-sm font-black text-slate-500 mb-4 uppercase tracking-widest print:text-black">
                        سلف وعقوبات (مستردة)
                      </h3>
                      <div className="space-y-4 text-slate-700 print:text-black">
                        {selectedPayslip.details.advances.map((adv, idx) => {
                          const amount =
                            toNumber(adv.installmentAmount) || toNumber(adv.remainingAmount);
                          return (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="text-sm font-bold">
                                سلفة{" "}
                                {adv.advanceType === "salary"
                                  ? "راتب"
                                  : adv.advanceType === "clothing"
                                  ? "ملابس"
                                  : "أخرى"}
                              </span>
                              <span className="text-lg font-black text-rose-600 font-mono print:text-black">
                                -{amount.toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-5 pt-4 border-t border-slate-200 border-dashed flex justify-between items-center print:border-slate-400">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest print:text-black">
                          مجموع السلف
                        </span>
                        <span className="text-xl font-black text-rose-600 font-mono print:text-black">
                          -{selectedPayslip.variableDeductions.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Authoritative total deductions (from backend) */}
                  <div className="bg-rose-50 rounded-2xl p-6 border border-rose-200 shadow-sm print:shadow-none print:border-slate-400 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-rose-500" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-rose-800 uppercase tracking-widest print:text-black">
                        إجمالي الخصم الدقيق (حسب النظام)
                      </span>
                      <span className="text-2xl font-black text-rose-600 font-mono print:text-black">
                        {selectedPayslip.totalDeductions.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {selectedPayslip.totalDeductions === 0 && (
                    <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center shadow-sm print:shadow-none print:border-slate-300">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100 print:hidden">
                        <HandCoins className="text-slate-400" size={28} />
                      </div>
                      <p className="text-slate-500 font-bold text-base print:text-black">
                        لا توجد أي خصومات مالية مسجلة لهذا الشهر.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Print signature row */}
              <div className="hidden print:flex justify-between items-end w-full mt-8 pt-4 border-t-2 border-slate-800">
                <div className="text-center w-1/3">
                  <p className="text-black font-bold text-xs mb-6">توقيع المحاسب</p>
                  <div className="border-b border-dashed border-slate-400 w-full" />
                </div>
                <div className="text-center">
                  <p className="text-black text-xs font-black uppercase mb-1">الصافي للدفع</p>
                  <p className="text-black text-2xl font-black font-mono">
                    {selectedPayslip.netPayRounded.toLocaleString()}{" "}
                    <span className="text-sm">ل.س</span>
                  </p>
                </div>
                <div className="text-center w-1/3">
                  <p className="text-black font-bold text-xs mb-6">توقيع الموظف المستلم</p>
                  <div className="border-b border-dashed border-slate-400 w-full" />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="p-6 sm:p-8 bg-[#1a2530]/90 backdrop-blur-md border-t border-white/5 flex flex-col md:flex-row items-center justify-between shrink-0 relative z-10 print:hidden">
              <div className="text-right mb-6 md:mb-0">
                <p className="text-[#C89355] font-black text-sm uppercase tracking-widest mb-1">
                  صافي المبلغ المستحق للدفع
                </p>
                <p className="text-white text-5xl font-black font-mono drop-shadow-md">
                  {selectedPayslip.netPayRounded.toLocaleString()}
                  <span className="text-2xl mr-3 opacity-80">ل.س</span>
                </p>
                <p className="text-slate-400 text-xs font-bold mt-2">
                  (الصافي الدقيق: {selectedPayslip.netPay.toLocaleString()} | فرق تقريب:{" "}
                  {selectedPayslip.roundingDifference > 0 ? "+" : ""}
                  {selectedPayslip.roundingDifference.toLocaleString()})
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md text-white font-black text-sm hover:bg-white/20 transition-all border border-white/20 active:scale-95 group"
                >
                  <Download size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                  طباعة الوصل
                </button>
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#C89355] text-[#1a2530] font-black text-sm hover:bg-[#d4a472] transition-all border border-[#C89355]/50 active:scale-95"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}