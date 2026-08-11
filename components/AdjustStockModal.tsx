"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Loader2, SlidersHorizontal, X } from "lucide-react";
import { AdjustStockInput, InventoryItem } from "@/types/inventory";

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AdjustStockInput) => void;
  isPending?: boolean;
  item?: InventoryItem | null;
  locations?: string[];
}

const defaultForm: Omit<AdjustStockInput, "productId"> = {
  type: "IN",
  quantity: "",
  note: "",
  location: "MAIN",
};

export default function AdjustStockModal({ isOpen, onClose, onSave, isPending = false, item, locations = [] }: AdjustStockModalProps) {
  const [form, setForm] = useState(defaultForm);

  if (!isOpen || !item) return null;

  const typeIsIn = form.type === "IN";
  const typeIsOut = form.type === "OUT";

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">حركة مخزون</h2>
            <p className="text-xs text-slate-500 mt-1">{item.name} • {item.sku}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors active:scale-95">
            <X size={24} />
          </button>
        </div>

        <form
          className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-right"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              productId: item.id,
              type: form.type,
              quantity: form.quantity,
              note: form.note,
              location: form.location,
            });
          }}
        >
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">الكمية الحالية</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{Number(item.quantity || 0).toLocaleString()} {item.unit}</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">نوع العملية</label>
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as "IN" | "OUT" | "ADJUSTMENT" }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="IN">إضافة رصيد</option>
              <option value="OUT">صرف مادة</option>
              <option value="ADJUSTMENT">تسوية جرد</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">الكمية</label>
            <input
              type="number"
              required
              min={1}
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">الموقع</label>
            <input
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="MAIN"
              list="inventory-locations"
            />
            <datalist id="inventory-locations">
              {Array.from(new Set(["MAIN", ...locations])).map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظة</label>
            <input
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder={typeIsIn ? "توريد مواد" : typeIsOut ? "استهلاك إنتاجي" : "جرد فعلي"}
            />
          </div>

          <div className="md:col-span-2 pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all active:scale-95">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-white disabled:bg-slate-300 active:scale-95 ${
                typeIsIn
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : typeIsOut
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {isPending ? (
                <Loader2 className="animate-spin" />
              ) : typeIsIn ? (
                <ArrowUpCircle size={20} />
              ) : typeIsOut ? (
                <ArrowDownCircle size={20} />
              ) : (
                <SlidersHorizontal size={20} />
              )}
              تنفيذ العملية
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

