"use client";

import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { InventoryItemInput } from "@/types/inventory";
import PhotoUploadField from "@/components/PhotoUploadField";

interface AddEditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: InventoryItemInput) => void;
  isPending?: boolean;
  initialData?: (Partial<InventoryItemInput> & { id?: string }) | null;
}

const defaultForm: InventoryItemInput = {
  sku: "",
  name: "",
  category: "",
  unitPrice: "",
  costPrice: "",
  profitPercent: "",
  reorderLevel: "10",
  unit: "قطعة",
  photo: null,
};

export default function AddEditItemModal({ isOpen, onClose, onSave, isPending = false, initialData }: AddEditItemModalProps) {
  const [form, setForm] = useState<InventoryItemInput>(() => {
    if (initialData) {
      return {
        sku: initialData.sku || "",
        name: initialData.name || "",
        category: initialData.category || "",
        unitPrice: initialData.unitPrice?.toString() || "",
        costPrice: initialData.costPrice?.toString() || "",
        profitPercent: initialData.profitPercent?.toString() || "",
        reorderLevel: initialData.reorderLevel?.toString() || "10",
        unit: initialData.unit || "قطعة",
        photo: initialData.photo ?? null,
      };
    }
    return defaultForm;
  });

  const cost = Number(form.costPrice || 0);
  const price = Number(form.unitPrice || 0);

  const computeProfit = (costValue: number, priceValue: number) =>
    costValue > 0 ? (((priceValue - costValue) / costValue) * 100).toFixed(2) : "";

  const withPrice = (costValue: number, profitValue: number) =>
    costValue > 0 ? (costValue * (1 + profitValue / 100)).toFixed(2) : "";

  const handleCostChange = (value: string) => {
    const costValue = Number(value || 0);
    setForm((p) => ({
      ...p,
      costPrice: value,
      profitPercent: computeProfit(costValue, Number(p.unitPrice || 0)),
    }));
  };

  const handlePriceChange = (value: string) => {
    setForm((p) => ({
      ...p,
      unitPrice: value,
      profitPercent: computeProfit(Number(p.costPrice || 0), Number(value || 0)),
    }));
  };

  const handleProfitChange = (value: string) => {
    const profitValue = Number(value || 0);
    setForm((p) => {
      const costValue = Number(p.costPrice || 0);
      return {
        ...p,
        profitPercent: value,
        unitPrice: profitValue !== 0 ? withPrice(costValue, profitValue) : p.unitPrice,
      };
    });
  };

  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
  const unitProfit = price - cost;

  // No need for useEffect to set form when initialData changes
  // The useState initializer function handles this correctly

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">{initialData?.id ? "تعديل الصنف" : "إضافة صنف جديد"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors active:scale-95">
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
          <div className="md:col-span-2">
            <PhotoUploadField
              value={form.photo}
              onChange={(photo) => setForm((p) => ({ ...p, photo }))}
              label="صورة الصنف"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">اسم الصنف</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="مثال: قفازات مختبر"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">SKU / الباركود</label>
            <input
              required
              value={form.sku}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              placeholder="LAB-GLV-001"
              disabled={Boolean(initialData?.id)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">الفئة</label>
            <input
              required
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="مواد تشغيل"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">الوحدة</label>
            <select
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="قطعة">قطعة</option>
              <option value="علبة">علبة</option>
              <option value="كرتون">كرتون</option>
              <option value="لتر">لتر</option>
              <option value="كيلوغرام">كيلوغرام</option>
            </select>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-black text-slate-800">التسعير والربح</h3>
              <span className="text-[11px] font-bold text-slate-400">بالليرة السورية (ل.س)</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">
              أدخل التكلفة ثم نسبة الربح — يُحسب سعر البيع تلقائيًا (أو أدخل سعر البيع ليُحسب الربح).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">سعر التكلفة (ل.س)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={form.costPrice}
                  onChange={(e) => handleCostChange(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C89355] outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">نسبة الربح % (على التكلفة)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={form.profitPercent}
                  onChange={(e) => handleProfitChange(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C89355] outline-none font-bold"
                  placeholder="مثال: 25"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">سعر البيع (ل.س)</label>
                <input
                  type="number"
                  min={0}
                  value={form.unitPrice}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C89355] outline-none font-bold"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-white border border-emerald-100 px-4 py-3 flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-700">الربح لكل وحدة</span>
                <span className="text-sm font-black text-emerald-700 tabular-nums">
                  {Number.isFinite(unitProfit) ? unitProfit.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0} ل.س
                </span>
              </div>
              <div className="rounded-xl bg-white border border-emerald-100 px-4 py-3 flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-700">الهامش %</span>
                <span className="text-sm font-black text-emerald-700 tabular-nums">
                  {margin.toFixed(1)}%
                </span>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 px-4 py-3 flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-500">غطاء التكلفة</span>
                <span className="text-sm font-black text-slate-700 tabular-nums">
                  {cost > 0 ? (price / cost).toFixed(2) : "—"}×
                </span>
              </div>
            </div>

            <div className="mt-3 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${margin >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                style={{ width: `${Math.min(100, Math.max(0, Math.abs(margin)))}%` }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">حد إعادة الطلب</label>
            <input
              type="number"
              required
              min={0}
              value={form.reorderLevel}
              onChange={(e) => setForm((p) => ({ ...p, reorderLevel: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="md:col-span-2 pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all active:scale-95">
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

