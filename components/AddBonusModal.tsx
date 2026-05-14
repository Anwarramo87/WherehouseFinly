"use client";

import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { BonusInput } from "@/types/bonus";

interface AddBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BonusInput) => void;
  isPending?: boolean;
  employees: Array<{ employeeId: string; name: string }>;
  initialData?: {
    id?: string;
    employeeId?: string;
    bonusAmount?: number | string | { $numberDecimal: string };
    bonusReason?: string | null;
    assistanceAmount?: number | string | { $numberDecimal: string };
    period?: string | null;
  } | null;
}

const asStringAmount = (value?: number | string | { $numberDecimal: string }) => {
  if (value && typeof value === "object" && "$numberDecimal" in value) {
    return value.$numberDecimal || "";
  }
  return value?.toString() || "";
};

const currentPeriod = (() => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
})();

const defaultForm: BonusInput = {
  employeeId: "",
  bonusAmount: "",
  bonusReason: "",
  assistanceAmount: "",
  period: currentPeriod,
};

export default function AddBonusModal({ isOpen, onClose, onSave, isPending, employees, initialData }: AddBonusModalProps) {
  const [form, setForm] = useState<BonusInput>(() => {
    if (initialData) {
      return {
        employeeId: initialData.employeeId || "",
        bonusAmount: asStringAmount(initialData.bonusAmount),
        bonusReason: initialData.bonusReason || "",
        assistanceAmount: asStringAmount(initialData.assistanceAmount),
        period: initialData.period || currentPeriod,
      };
    }
    return defaultForm;
  });

  // No need for useEffect to set form when initialData changes
  // The useState initializer function handles this correctly

  if (!isOpen) return null;

  const handleClose = () => {
    setForm(defaultForm);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">{initialData ? "تعديل مكافأة" : "إضافة مكافأة"}</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-red-500 transition-colors active:scale-95">
            <X size={24} />
          </button>
        </div>

        <form
          className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-right"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
        >
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">الموظف</label>
            <select
              required
              value={form.employeeId}
              onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={Boolean(initialData?.employeeId)}
            >
              <option value="">اختر موظفاً...</option>
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.employeeId} — {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">الفترة (YYYY-MM)</label>
            <input
              type="month"
              value={form.period}
              onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">قيمة المكافأة</label>
            <input
              type="number"
              value={form.bonusAmount}
              onChange={(e) => setForm((p) => ({ ...p, bonusAmount: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">قيمة الإعانة</label>
            <input
              type="number"
              value={form.assistanceAmount}
              onChange={(e) => setForm((p) => ({ ...p, assistanceAmount: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">سبب المكافأة</label>
            <textarea
              value={form.bonusReason}
              onChange={(e) => setForm((p) => ({ ...p, bonusReason: e.target.value }))}
              rows={3}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
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
              {isPending ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

