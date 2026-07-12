"use client";

import React, { useState, useMemo } from "react";
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
import { usePayroll } from "@/hooks/usePayroll";
import { toast } from "react-hot-toast";
import { MonthPeriodSelector } from "@/components/MonthPeriodSelector";
import { PayrollVirtualTable } from "@/components/PayrollVirtualTable";
import { usePayrollPageData } from "@/hooks/usePayrollPageData";
import type { Employee } from "@/types/employee";
import type { AggregatedPayroll } from "@/types/payroll-aggregated";
import { toNumber } from "@/lib/number-utils";

// Lazy load heavy components
const RunPayrollModal = dynamic(() => import("@/components/RunPayrollModal"), {
  loading: () => <div className="text-center py-4">جاري التحميل...</div>,
  ssr: false,
});

const PayslipModal = dynamic(() => import("@/components/PayslipModal"), {
  ssr: false,
});

const getLocalMonth = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

export default function PayrollPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(searchParams.get("period") || getLocalMonth());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayslip, setSelectedPayslip] = useState<AggregatedPayroll | null>(null);
  const [isPayrollModalOpen, setPayrollModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true); }, []);

  const { calculatePayroll } = usePayroll();

  const {
    payrollData,
    allResignedList,
    resignedPayrollMap,
    resignedPendingCount,
    isLoading,
    hasNoPayrollRun,
  } = usePayrollPageData(month);

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

  const allRows = useMemo(() => filteredPayrollData, [filteredPayrollData]);

  // ── Grand totals ─────────────────────────────────────────────────────────────
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
      const workbook = XLSX.utils.book_new();
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
      worksheet["!cols"] = [
        { wch: 6 }, { wch: 15 }, { wch: 25 }, { wch: 20 },
        { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
        { wch: 12 }, { wch: 22 },
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, "مسير الرواتب");
      XLSX.writeFile(workbook, `تقرير-الرواتب-${month}.xlsx`);
      toast.success("تم تنزيل ملف Excel بنجاح");
    } catch (error) {
      console.error(error);
      toast.error("تعذر تنزيل ملف Excel حالياً");
    }
  };

  // Show inline spinner when data is loading
  const showSpinner = !mounted || isLoading;

  return (
    <div
      className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden"
      dir="rtl"
    >
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
          {/* Breadcrumb */}
          <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
            <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
            <span className="hover:text-[#263544] cursor-pointer transition-colors relative z-10">المركز المالي</span>
            <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
            <span className="text-[#263544] relative z-10">تقارير الرواتب</span>
          </nav>

          {/* Page header */}
          <header className="mb-10 flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-[#263544]/10 pb-8 relative">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4">
                  <FileSpreadsheet size={22} className="text-[#C89355]" strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">التقرير النهائي للرواتب</h1>
              </div>
              <p className="text-slate-600 text-sm font-bold pr-14 mt-1">اختر الشهر لعرض ملخص المسير مقسماً حسب الأقسام الوظيفية.</p>
            </div>

            <div className="mt-4 xl:mt-0 flex flex-wrap items-center justify-start xl:justify-end gap-3 w-full xl:w-auto">
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
                <Download size={16} className="group-hover:-translate-y-1 transition-transform relative z-10" />
                <span className="relative z-10">تنزيل Excel</span>
              </button>
              <Link href={`/vouchers?month=${month}`} className="bg-emerald-100 border border-emerald-200 text-emerald-800 hover:bg-emerald-200 shadow-sm rounded-xl relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 transition-all active:scale-95 group">
                <div className="absolute inset-1 rounded-xl border border-dashed border-emerald-300/50 pointer-events-none transition-colors group-hover:border-emerald-400/70" />
                <Receipt size={16} className="relative z-10" />
                <span className="relative z-10">طباعة جميع القسائم</span>
              </Link>
              <Link href={`/vouchers?month=${month}&unreceived=true`} className="bg-amber-100 border border-amber-200 text-amber-800 hover:bg-amber-200 shadow-sm rounded-xl relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 transition-all active:scale-95 group">
                <div className="absolute inset-1 rounded-xl border border-dashed border-amber-300/50 pointer-events-none transition-colors group-hover:border-amber-400/70" />
                <Receipt size={16} className="relative z-10" />
                <span className="relative z-10">القسائم غير المقبوضة فقط</span>
              </Link>
              <button
                type="button"
                onClick={() => setPayrollModalOpen(true)}
                aria-label="فتح نافذة حساب المسير الشهري"
                className="bg-slate-800 text-white hover:bg-slate-900 shadow-md rounded-xl font-bold relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 transition-all active:scale-95 group"
              >
                <div className="absolute inset-1 rounded-xl border border-dashed border-white/20 pointer-events-none" />
                <Play size={16} className="group-hover:-translate-y-1 transition-transform relative z-10" />
                <span className="relative z-10">حساب المسير</span>
              </button>
            </div>
          </header>

          {/* No payroll run banner */}
          {hasNoPayrollRun && (
            <div className="mb-8 flex items-start gap-4 p-5 bg-amber-50/80 border-2 border-amber-200 rounded-3xl shadow-sm animate-in fade-in duration-300">
              <div className="p-2.5 bg-amber-100 rounded-xl border border-amber-200 shrink-0 mt-0.5">
                <Info size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="font-black text-amber-800 text-sm mb-1">لا يوجد مسير رواتب محسوب لهذا الشهر</p>
                <p className="text-amber-700 text-xs font-bold leading-relaxed">
                  أرقام الرواتب تأتي حصراً من الباك إند بعد تشغيل عملية حساب المسير عبر{" "}
                  <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">POST /api/payroll/calculate</code>.
                  لا تُعرض أصفار — بل لا تُعرض بيانات حتى يكتمل الحساب.
                </p>
              </div>
            </div>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] hover:-translate-y-1 transition-all group">
              <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-3 bg-[#1a2530] rounded-xl border border-[#C89355]/30 shadow-sm group-hover:shadow-[0_0_15px_rgba(200,147,85,0.4)] transition-shadow">
                  <Wallet className="text-[#C89355]" size={22} />
                </div>
                <p className="font-black text-[#263544] text-sm">صافي الإجمالي المقبوض (ل.س) *</p>
              </div>
              <p className="text-4xl font-black text-[#263544] relative z-10 drop-shadow-sm">{globalTotals.totalNetPayRounded.toLocaleString()} ل.س</p>
              <p className="text-[10px] text-slate-500 font-bold mt-2 relative z-10">* الراتب المستحق من أيام الدوام الفعلية</p>
            </div>
            <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(16,185,129,0.12)] hover:-translate-y-1 transition-all group">
              <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-emerald-500/30 pointer-events-none transition-colors group-hover:border-emerald-500/50" />
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 shadow-sm group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-shadow">
                  <HandCoins className="text-emerald-600" size={22} />
                </div>
                <p className="font-black text-[#263544] text-sm">المكافآت (ل.س)</p>
              </div>
              <p className="text-4xl font-black text-emerald-600 relative z-10 drop-shadow-sm">+{globalTotals.totalBonuses.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 font-bold mt-2 relative z-10">إجمالي المكافآت والبونصات</p>
            </div>
            <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(239,68,68,0.12)] hover:-translate-y-1 transition-all group">
              <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-rose-500/30 pointer-events-none transition-colors group-hover:border-rose-500/50" />
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 shadow-sm group-hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-shadow">
                  <Receipt className="text-rose-600" size={22} />
                </div>
                <p className="font-black text-[#263544] text-sm">الخصومات (ل.س)</p>
              </div>
              <p className="text-4xl font-black text-rose-600 relative z-10 drop-shadow-sm">-{globalTotals.totalDiscounts.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 font-bold mt-2 relative z-10">السلف + العقوبات + الخصومات الأخرى</p>
            </div>
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
              <p className="text-[10px] text-slate-500 font-bold mt-2 relative z-10">إجمالي فروقات جبر الكسور للرواتب</p>
            </div>
          </div>

          {/* Search */}
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

          {/* Payroll table */}
          <PayrollVirtualTable
            allRows={allRows}
            onSelectPayslip={(item) => setSelectedPayslip(item)}
          />

          {/* Resigned Employees Section */}
          {allResignedList.length > 0 && (
            <div className="mt-8">
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
                <Link href="/resigned" className="relative overflow-hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white font-black text-xs hover:bg-amber-700 transition-all shadow-sm active:scale-95 group shrink-0">
                  <div className="absolute inset-1 rounded-lg border border-dashed border-white/30 pointer-events-none" />
                  <ExternalLink size={14} className="relative z-10" />
                  <span className="relative z-10">إدارة التصفيات</span>
                </Link>
              </div>

              <div className="relative bg-amber-50/40 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(245,158,11,0.15)] border-2 border-amber-200/80 overflow-hidden group/resigned">
                <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-amber-400/40 pointer-events-none z-0 transition-colors group-hover/resigned:border-amber-400/60" />
                <div className="relative z-10 bg-amber-100/60 backdrop-blur-md border-b-2 border-amber-200 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-600 rounded-xl shadow-md">
                      <UserMinus size={20} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-amber-900 tracking-tight">المستقيلون والمقالون</h2>
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
                        <th className="p-4 font-black text-xs uppercase tracking-wider text-center">كود الموظف</th>
                        <th className="p-4 font-black text-xs uppercase tracking-wider text-center">اسم الموظف</th>
                        <th className="p-4 font-black text-xs uppercase tracking-wider text-center">القسم</th>
                        <th className="p-4 font-black text-xs uppercase tracking-wider text-center">الراتب الأساسي</th>
                        <th className="p-4 font-black text-xs uppercase tracking-wider text-center">الراتب المقوض</th>
                        <th className="p-4 text-center font-black text-xs uppercase tracking-wider">تاريخ الإنهاء</th>
                        <th className="p-4 text-center font-black text-xs uppercase tracking-wider">نوع الإنهاء</th>
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
                          <tr key={employee.employeeId} className="transition-all duration-300 group/row bg-white/60 hover:bg-white/90">
                            <td className="p-4 text-center font-mono text-sm font-black text-amber-900/70 group-hover/row:text-amber-700 transition-colors">{employee.employeeId}</td>
                            <td className="p-4 text-center font-black text-slate-800 group-hover/row:text-amber-900 transition-colors">{employee.name}</td>
                            <td className="p-4 text-center font-bold text-slate-700 text-sm">{employee.department || employee.profession || "—"}</td>
                            <td className="p-4 text-center font-mono font-black text-slate-700 text-sm">{baseSalaryVal > 0 ? `${baseSalaryVal.toLocaleString()} ل.س` : "—"}</td>
                            <td className="p-4 text-center font-mono font-black text-emerald-700 text-sm">{resignedCalc ? `${resignedCalc.netPayRounded.toLocaleString()} ل.س` : "—"}</td>
                            <td className="p-4 text-center font-mono font-bold text-slate-700 text-sm">{employee.terminationDate ? new Date(employee.terminationDate).toLocaleDateString("ar-SY") : "—"}</td>
                            <td className="p-4 text-center">
                              <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-black border shadow-sm ${terminationColor}`}>{terminationType}</span>
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

      {/* Modals */}
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
              console.error("[Payroll] Calculation failed:", error);
            },
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
