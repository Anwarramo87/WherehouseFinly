"use client";

import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { AdvanceInput, AdvanceType } from "@/types/advance";

interface AddAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AdvanceInput) => void;
  isPending?: boolean;
  employees: Array<{ employeeId: string; name: string }>;
  initialData?: {
    id?: string;
    employeeId?: string;
    advanceType?: AdvanceType;
    totalAmount?: number | string | { $numberDecimal: string };
    installmentAmount?: number | string | { $numberDecimal: string };
    remainingAmount?: number | string | { $numberDecimal: string };
    notes?: string | null;
  } | null;
}

const asStringAmount = (value?: number | string | { $numberDecimal: string }) => {
  if (value && typeof value === "object" && "$numberDecimal" in value) {
    return value.$numberDecimal || "";
  }
  return value?.toString() || "";
};

const defaultForm: AdvanceInput = {
  employeeId: "",
  advanceType: "salary",
  totalAmount: "",
  installmentAmount: "",
  remainingAmount: "",
  notes: "",
};

export default function AddAdvanceModal({ isOpen, onClose, onSave, isPending, employees, initialData }: AddAdvanceModalProps) {
  const [form, setForm] = useState<AdvanceInput>(() => {
    if (initialData) {
      return {
        employeeId: initialData.employeeId || "",
        advanceType: initialData.advanceType || "salary",
        totalAmount: asStringAmount(initialData.totalAmount),
        installmentAmount: asStringAmount(initialData.installmentAmount),
        remainingAmount: asStringAmount(initialData.remainingAmount),
        notes: initialData.notes || "",
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
          <h2 className="text-xl font-bold text-slate-800">{initialData ? "تعديل سلفة" : "إضافة سلفة"}</h2>
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
            <label className="block text-sm font-bold text-slate-700 mb-2">نوع السلفة</label>
            <select
              value={form.advanceType}
              onChange={(e) => setForm((p) => ({ ...p, advanceType: e.target.value as AdvanceType }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="salary">سلفة راتب</option>
              <option value="clothing">سلفة ملابس</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">إجمالي السلفة</label>
            <input
              type="number"
              required
              value={form.totalAmount}
              onChange={(e) => setForm((p) => ({ ...p, totalAmount: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">قيمة القسط</label>
            <input
              type="number"
              value={form.installmentAmount}
              onChange={(e) => setForm((p) => ({ ...p, installmentAmount: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">المتبقي</label>
            <input
              type="number"
              value={form.remainingAmount}
              onChange={(e) => setForm((p) => ({ ...p, remainingAmount: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
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

