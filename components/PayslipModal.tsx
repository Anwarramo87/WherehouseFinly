
import React from 'react';
import { Wallet, Receipt, HandCoins, ChevronLeft, Download } from 'lucide-react';
import type { Bonus } from '@/types/bonus';
import type { DiscountRecord } from '@/hooks/useDiscounts';
import type { PenaltyRecord } from '@/hooks/usePenalties';

// Define types directly in the component for simplicity
// In a real app, these would be imported from a central types file
type Salary = {
  baseSalary?: number | string;
  lumpSumSalary?: number | string;
  livingAllowance?: number | string;
  responsibilityAllowance?: number | string;
  extraEffortAllowance?: number | string;
  productionIncentive?: number | string;
  transportAllowance?: number | string;
  insuranceAmount?: number | string;
};

interface AggregatedPayroll {
  employeeId: string;
  employeeName: string;
  department: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  netPayRounded: number;
  roundingDifference: number;
  anomalies: string[];
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

interface Props {
  payslip: AggregatedPayroll;
  month: string;
  onClose: () => void;
}

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

const PayslipModal: React.FC<Props> = ({ payslip, month, onClose }) => {
  if (!payslip) return null;

  return (
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md"
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
                KU&M JEANS — إدارة الموارد البشرية
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
              onClick={onClose}
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
                <p className="text-slate-800 text-2xl font-black print:text-black wrap-break-word">
                  {payslip.employeeName}
                </p>
                <p className="text-slate-400 text-sm font-bold mt-1">
                  {payslip.department}
                </p>
              </div>
              <div className="text-right sm:text-left">
                <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-widest print:text-black">
                  كود الموظف
                </p>
                <p className="text-[#C89355] text-2xl font-black font-mono print:text-black">
                  {payslip.employeeId}
                </p>
              </div>
            </div>
            {payslip.anomalies.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-sm font-bold print:hidden">
                <strong>ملاحظات النظام: </strong>
                <ul className="list-disc list-inside ms-4 mt-1">
                  {payslip.anomalies.map((an, idx) => (
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
              {payslip.details.salaryConfig ? (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                  <h3 className="text-sm font-black text-slate-500 mb-4 uppercase tracking-widest print:text-black">
                    الأجور الثابتة
                  </h3>
                  <div className="space-y-4 text-slate-700 print:text-black">
                    {(
                      [
                        { label: "الراتب الأساسي",          value: toNumber(payslip.details.salaryConfig.baseSalary) },
                        { label: "الراتب المقطوع",           value: toNumber(payslip.details.salaryConfig.lumpSumSalary) },
                        { label: "بدل المعيشة",              value: toNumber(payslip.details.salaryConfig.livingAllowance) },
                        { label: "تعويض المسؤولية",          value: toNumber(payslip.details.salaryConfig.responsibilityAllowance) },
                        {
                          label: "تعويض الجهد الإضافي",
                          value: toNumber(
                            payslip.details.salaryConfig.extraEffortAllowance,
                          ),
                        },
                        { label: "حوافز الإنتاجية",          value: toNumber(payslip.details.salaryConfig.productionIncentive) },
                        { label: "بدل النقل",                value: toNumber(payslip.details.salaryConfig.transportAllowance) },
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
                      {payslip.fixedEarnings.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic print:text-black">
                  لا يوجد راتب ثابت مضبوط للموظف
                </p>
              )}

              {/* Bonuses */}
              {payslip.details.bonuses.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                  <h3 className="text-sm font-black text-[#C89355] mb-4 uppercase tracking-widest print:text-black">
                    المكافآت
                  </h3>
                  <div className="space-y-4 text-slate-700 print:text-black">
                    {payslip.details.bonuses.map((bonus, idx) => (
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
                      {payslip.variableEarnings.toLocaleString()}
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
                    {payslip.grossPay.toLocaleString()}
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
              {payslip.fixedDeductions > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                  <h3 className="text-sm font-black text-slate-500 mb-4 uppercase tracking-widest print:text-black">
                    اقتطاعات ثابتة
                  </h3>
                  <div className="flex justify-between items-center text-slate-700 print:text-black">
                    <span className="text-sm font-bold">مؤسسة التأمينات الاجتماعية</span>
                    <span className="text-lg font-black text-rose-600 font-mono print:text-black">
                      -{payslip.fixedDeductions.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Advances / Penalties */}
              {payslip.details.deductions.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                  <h3 className="text-sm font-black text-slate-500 mb-4 uppercase tracking-widest print:text-black">
                    سلف وعقوبات (مستردة)
                  </h3>
                  <div className="space-y-4 text-slate-700 print:text-black">
                    {payslip.details.deductions.map((ded, idx) => {
                      // Handle DiscountRecord (advances) and PenaltyRecord
                      const isDiscount = 'kind' in ded;
                      const amount = isDiscount ? toNumber(ded.amount) : toNumber(ded.amount);
                      const label = isDiscount
                        ? (ded as DiscountRecord).type
                        : `عقوبة: ${(ded as PenaltyRecord).category || (ded as PenaltyRecord).reason || 'عقوبة'}`;
                      return (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-sm font-bold">{label}</span>
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
                      -{payslip.variableDeductions.toLocaleString()}
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
                    {payslip.totalDeductions.toLocaleString()}
                  </span>
                </div>
              </div>

              {payslip.totalDeductions === 0 && (
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
                {payslip.netPayRounded.toLocaleString()}{" "}
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
              {payslip.netPayRounded.toLocaleString()}
              <span className="text-2xl mr-3 opacity-80">ل.س</span>
            </p>
            <p className="text-slate-400 text-xs font-bold mt-2">
              (الصافي الدقيق: {payslip.netPay.toLocaleString()} | فرق تقريب:{" "}
              {payslip.roundingDifference > 0 ? "+" : ""}
              {payslip.roundingDifference.toLocaleString()})
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
              onClick={onClose}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#C89355] text-[#1a2530] font-black text-sm hover:bg-[#d4a472] transition-all border border-[#C89355]/50 active:scale-95"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayslipModal;
