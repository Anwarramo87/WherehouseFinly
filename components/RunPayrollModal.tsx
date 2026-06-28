"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2, Play, X, CalendarDays, Timer, Minus, Info } from "lucide-react";
import { CalculatePayrollInput } from "@/types/payroll";

interface RunPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (payload: CalculatePayrollInput) => void;
  isPending?: boolean;
  initialMonth?: string;
}

const toLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultRange = (monthStr?: string) => {
  if (monthStr) {
    const [y, m] = monthStr.split('-');
    const year = parseInt(y, 10);
    const monthIndex = parseInt(m, 10) - 1;
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0);
    return {
      periodStart: toLocalDateString(startDate),
      periodEnd: toLocalDateString(endDate),
    };
  }

  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return {
    periodStart: toLocalDateString(start),
    periodEnd: toLocalDateString(end),
  };
};

const createDefaultForm = (monthStr?: string): CalculatePayrollInput => {
  const range = getDefaultRange(monthStr);
  return {
    periodStart: range.periodStart,
    periodEnd: range.periodEnd,
    gracePeriodMinutes: 5,
    includeAttendanceDeductions: true,
    includeTransportationDeductions: true,
  };
};

export default function RunPayrollModal({ isOpen, onClose, onRun, isPending, initialMonth }: RunPayrollModalProps) {
  // Initialize form with current initialMonth
  const [form, setForm] = useState<CalculatePayrollInput>(() => createDefaultForm(initialMonth));
  const formRef = useRef<HTMLFormElement>(null);

  const handleClose = () => {
    // Reset form to current initialMonth when closing
    setForm(createDefaultForm(initialMonth));
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[RunPayrollModal] Form submitted with:', form);
    onRun(form);
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[99999] p-4 sm:p-6 transition-all duration-200" 
      dir="rtl"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-[#0f172a] rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-slate-700/30">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-700/30 flex justify-between items-center bg-[#1e293b]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/10 p-2 rounded-xl border border-blue-600/20 shrink-0">
              <CalendarDays className="text-blue-400" size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">تشغيل مسير الرواتب</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">حساب الرواتب بناءً على الحضور والخصومات</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all active:scale-95 shrink-0 mr-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-4">
          <form
            ref={formRef}
            id="payrollForm"
            className="space-y-4"
            onSubmit={handleSubmit}
          >
            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-blue-400 mb-2">
                  <CalendarDays size={14} />
                  بداية الفترة
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={form.periodStart}
                    max={form.periodEnd}
                    onChange={(e) => setForm((p) => ({ ...p, periodStart: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-[#1e293b] border border-slate-700/40 rounded-xl focus:ring-2 focus:ring-blue-600/40 focus:border-blue-500/60 outline-none transition-all text-white font-mono text-sm font-bold pr-10 scheme-dark placeholder:text-slate-500"
                  />
                  <CalendarDays className="absolute right-3 top-2.5 text-slate-500 pointer-events-none" size={18} />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-blue-400 mb-2">
                  <CalendarDays size={14} />
                  نهاية الفترة
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={form.periodEnd}
                    min={form.periodStart}
                    onChange={(e) => setForm((p) => ({ ...p, periodEnd: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-[#1e293b] border border-slate-700/40 rounded-xl focus:ring-2 focus:ring-blue-600/40 focus:border-blue-500/60 outline-none transition-all text-white font-mono text-sm font-bold pr-10 scheme-dark placeholder:text-slate-500"
                  />
                  <CalendarDays className="absolute right-3 top-2.5 text-slate-500 pointer-events-none" size={18} />
                </div>
              </div>
            </div>

            {/* Grace Period */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-2">
                <Timer size={14} />
                دقائق السماحية
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={form.gracePeriodMinutes?.toString() || ""}
                  onChange={(e) => setForm((p) => ({ ...p, gracePeriodMinutes: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[#1e293b] border border-slate-700/40 rounded-xl focus:ring-2 focus:ring-blue-600/40 focus:border-blue-500/60 outline-none transition-all text-white font-mono text-sm font-bold pr-10 placeholder:text-slate-500"
                  placeholder="5"
                />
                <Timer className="absolute right-3 top-2.5 text-slate-500 pointer-events-none" size={18} />
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">الوقت المسموح به قبل احتساب التأخير (بالدقائق)</p>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-700/30 my-2" />

            {/* Deductions Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Minus size={15} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-300">الخصومات المُضمّنة</span>
              </div>

              {/* Attendance Deductions */}
              <label className="flex items-start gap-3 p-3 bg-blue-600/5 border border-blue-600/15 rounded-xl cursor-pointer hover:bg-blue-600/10 transition-all group">
                <input
                  type="checkbox"
                  checked={form.includeAttendanceDeductions ?? true}
                  onChange={(e) => setForm((p) => ({ ...p, includeAttendanceDeductions: e.target.checked }))}
                  className="w-5 h-5 mt-0.5 rounded border-blue-600/40 bg-[#1e293b] text-blue-500 focus:ring-blue-600/40 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
                    خصومات الدوام
                  </div>
                  <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    الغياب والتأخير (يتم حسابها تلقائياً من سجلات الحضور)
                  </div>
                </div>
              </label>

              {/* Transportation Deductions */}
              <label className="flex items-start gap-3 p-3 bg-indigo-600/5 border border-indigo-600/15 rounded-xl cursor-pointer hover:bg-indigo-600/10 transition-all group">
                <input
                  type="checkbox"
                  checked={form.includeTransportationDeductions ?? true}
                  onChange={(e) => setForm((p) => ({ ...p, includeTransportationDeductions: e.target.checked }))}
                  className="w-5 h-5 mt-0.5 rounded border-indigo-600/40 bg-[#1e293b] text-indigo-500 focus:ring-indigo-600/40 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    خصومات النقل
                  </div>
                  <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    تكاليف الحافلات (يتم اقتطاعها من الراتب)
                  </div>
                </div>
              </label>
            </div>

            {/* Info Box */}
            <div className="bg-blue-600/5 border border-blue-600/15 rounded-xl px-4 py-3 flex items-start gap-2">
              <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">
                سيتم حساب الرواتب بناءً على سجلات الحضور الفعلية، مع خصم الغياب والتأخير حسب ساعات العمل لكل موظف.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 bg-[#1e293b]/60 border-t border-slate-700/30 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="flex-1 sm:flex-none py-2.5 rounded-xl font-bold text-sm text-slate-300 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('[RunPayrollModal] Submit button clicked');
                if (formRef.current) {
                  formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
              }}
              disabled={isPending}
              className="flex-[2] sm:flex-none sm:px-8 py-2.5 rounded-xl font-black text-sm bg-blue-600 text-white flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-blue-600/20"
            >
              {isPending ? (
                <><Loader2 className="animate-spin" size={18} />جاري المعالجة...</>
              ) : (
                <><Play size={18} />تشغيل المسير</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

