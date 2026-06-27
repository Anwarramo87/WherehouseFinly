"use client";

import { useState } from "react";
import { Loader2, Play, X } from "lucide-react";
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

  const handleClose = () => {
    // Reset form to current initialMonth when closing
    setForm(createDefaultForm(initialMonth));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">تشغيل مسير الرواتب</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-red-500 transition-colors active:scale-95">
            <X size={24} />
          </button>
        </div>

        <form
          className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-right"
          onSubmit={(e) => {
            e.preventDefault();
            onRun(form);
          }}
        >
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">بداية الفترة</label>
            <input
              type="date"
              required
              value={form.periodStart}
              max={form.periodEnd}
              onChange={(e) => setForm((p) => ({ ...p, periodStart: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">نهاية الفترة</label>
            <input
              type="date"
              required
              value={form.periodEnd}
              min={form.periodStart}
              onChange={(e) => setForm((p) => ({ ...p, periodEnd: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">دقائق السماحية</label>
            <input
              type="number"
              min={0}
              value={form.gracePeriodMinutes?.toString() || ""}
              onChange={(e) => setForm((p) => ({ ...p, gracePeriodMinutes: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* خصومات الدوام */}
          <div className="md:col-span-2 flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <input
              type="checkbox"
              id="attendanceDeductions"
              checked={form.includeAttendanceDeductions ?? true}
              onChange={(e) => setForm((p) => ({ ...p, includeAttendanceDeductions: e.target.checked }))}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="attendanceDeductions" className="text-sm font-bold text-slate-700 cursor-pointer">
              تضمين خصومات الدوام (الغياب والتأخير)
            </label>
          </div>

          {/* خصومات النقل */}
          <div className="md:col-span-2 flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <input
              type="checkbox"
              id="transportationDeductions"
              checked={form.includeTransportationDeductions ?? true}
              onChange={(e) => setForm((p) => ({ ...p, includeTransportationDeductions: e.target.checked }))}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="transportationDeductions" className="text-sm font-bold text-slate-700 cursor-pointer">
              تضمين خصومات النقل (تكاليف الحافلات)
            </label>
          </div>

          <div className="md:col-span-2 pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={handleClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all active:scale-95">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all disabled:bg-slate-300 active:scale-95"
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Play size={20} />}
              تشغيل
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

