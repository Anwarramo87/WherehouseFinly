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
        reorderLevel: initialData.reorderLevel?.toString() || "10",
        unit: initialData.unit || "قطعة",
        photo: initialData.photo ?? null,
      };
    }
    return defaultForm;
  });

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

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">سعر الوحدة</label>
            <input
              type="number"
              required
              min={0}
              value={form.unitPrice}
              onChange={(e) => setForm((p) => ({ ...p, unitPrice: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">سعر التكلفة</label>
            <input
              type="number"
              required
              min={0}
              value={form.costPrice}
              onChange={(e) => setForm((p) => ({ ...p, costPrice: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
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

