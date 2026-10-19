"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, X, Sparkles, Package, Hash, Palette, Ruler } from "lucide-react";
import {
  INVENTORY_PRODUCT_TYPES,
  isInventoryProductType,
  ProductInput,
} from "@/types/inventory";
import PhotoUploadField from "@/components/PhotoUploadField";
import { toast } from "react-hot-toast";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProductInput & { photo?: string | null; reorderLevel?: number | string; unit?: string; category?: string }) => void;
  isPending?: boolean;
  initialData?: (Partial<ProductInput> & { id?: string; photo?: string | null }) | null;
}

const defaultForm: ProductInput & { photo?: string | null; reorderLevel?: number | string; unit?: string; category?: string } = {
  name: "",
  productType: "FINISHED",
  sku: "",
  size: "",
  color: "",
  costPrice: "",
  unitPrice: "",
  photo: null,
  reorderLevel: "10",
  unit: "قطعة",
  category: "منتجات نهائية",
};

export default function AddProductModal({
  isOpen,
  onClose,
  onSave,
  isPending = false,
  initialData,
}: AddProductModalProps) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          name: initialData.name || "",
          productType: initialData.productType || "FINISHED",
          sku: initialData.sku || "",
          size: initialData.size || "",
          color: initialData.color || "",
          costPrice: initialData.costPrice?.toString() || "",
          unitPrice: initialData.unitPrice?.toString() || "",
          photo: initialData.photo ?? null,
          reorderLevel: "10",
          unit: "قطعة",
          category: "منتجات نهائية",
        });
      } else {
        setForm(defaultForm);
      }
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const cost = Number(form.costPrice || 0);
  const price = Number(form.unitPrice || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("اسم المنتج مطلوب");
      return;
    }
    onSave(form);
  };

  const commonInputClass =
    "w-full p-3.5 bg-white/90 backdrop-blur border-2 border-white rounded-2xl text-sm font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/50 focus:border-[#C89355]/50 shadow-inner transition-all";

  const labelClass = "block text-sm font-black text-[#263544] mb-2";

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border-2 border-white max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
          <div className="absolute inset-1 rounded-[1.4rem] border border-dashed border-[#C89355]/30 pointer-events-none" />
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#C89355]/15 rounded-2xl shadow-[0_10px_20px_rgba(200,147,85,0.2)] border border-[#C89355]/40">
                <Package size={20} className="text-[#8a5f26]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#263544]">
                  {initialData?.id ? "تعديل منتج نهائي" : "إضافة منتج نهائي جديد"}
                </h2>
                <p className="text-xs font-bold text-slate-500 mt-0.5">بيانات المنتج النهائي الجاهز للبيع</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-rose-500 transition-colors active:scale-95 p-2 rounded-xl hover:bg-rose-50"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 relative space-y-6">
            <div className="absolute inset-2 rounded-[2rem] border border-dashed border-[#C89355]/20 pointer-events-none" />

            <div className="relative z-10">
              <PhotoUploadField
                value={form.photo ?? null}
                onChange={(photo) => setForm((p) => ({ ...p, photo }))}
                label="صورة المنتج النهائي"
              />
            </div>

            <div className="relative z-10 rounded-2xl border-2 border-[#C89355]/25 bg-white/70 p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2.5 bg-[#C89355]/15 rounded-xl">
                  <Sparkles size={18} className="text-[#8a5f26]" />
                </div>
                <h3 className="font-black text-[#263544] text-base">بيانات المنتج الأساسية</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className={labelClass}>
                    اسم المنتج <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="مثال: كريم ترطيب هيلوري، عطر روز جولد..."
                    className={commonInputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>نوع المنتج</label>
                  <select
                    value={form.productType || "FINISHED"}
                    onChange={(e) => {
                      const productType = e.target.value;
                      if (isInventoryProductType(productType)) {
                        setForm((p) => ({ ...p, productType }));
                      }
                    }}
                    className={`${commonInputClass} cursor-pointer appearance-none`}
                  >
                    {INVENTORY_PRODUCT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`${labelClass} flex items-center gap-1.5`}>
                    <Hash size={14} className="text-[#C89355]" />
                    كود SKU
                  </label>
                  <input
                    type="text"
                    value={form.sku || ""}
                    onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                    placeholder="مثال: FIN-CRM-001"
                    className={`${commonInputClass} font-mono`}
                  />
                </div>

                <div>
                  <label className={`${labelClass} flex items-center gap-1.5`}>
                    <Ruler size={14} className="text-[#C89355]" />
                    الحجم / المقاس
                  </label>
                  <input
                    type="text"
                    value={form.size || ""}
                    onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))}
                    placeholder="مثال: 50 مل، 200 غرام، صغير/متوسط/كبير..."
                    className={commonInputClass}
                  />
                </div>

                <div>
                  <label className={`${labelClass} flex items-center gap-1.5`}>
                    <Palette size={14} className="text-[#C89355]" />
                    اللون / النكهة
                  </label>
                  <input
                    type="text"
                    value={form.color || ""}
                    onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                    placeholder="مثال: وردي، فانيليا، تركواز..."
                    className={commonInputClass}
                  />
                </div>
              </div>
            </div>

            <div className="relative z-10 rounded-2xl border-2 border-[#C89355]/25 bg-white/70 p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2.5 bg-emerald-500/15 rounded-xl">
                  <Sparkles size={18} className="text-emerald-600" />
                </div>
                <h3 className="font-black text-[#263544] text-base">الأسعار</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>سعر التكلفة</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.costPrice || ""}
                    onChange={(e) => setForm((p) => ({ ...p, costPrice: e.target.value }))}
                    placeholder="0.00"
                    className={commonInputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>سعر البيع</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.unitPrice || ""}
                    onChange={(e) => setForm((p) => ({ ...p, unitPrice: e.target.value }))}
                    placeholder="0.00"
                    className={commonInputClass}
                  />
                </div>

                {price > 0 && cost > 0 && (
                  <div className="md:col-span-2 rounded-2xl bg-gradient-to-l from-[#C89355]/10 to-transparent p-4 border-2 border-[#C89355]/30">
                    <div className="flex flex-wrap gap-4 items-center justify-between text-xs font-black">
                      <div>
                        <span className="text-slate-500">نسبة الربح على التكلفة:</span>{" "}
                        <span className="text-emerald-700 text-sm">
                          {(((price - cost) / cost) * 100 || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">هامش الربح:</span>{" "}
                        <span className="text-emerald-700 text-sm">
                          {(((price - cost) / price) * 100 || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">الربح لكل وحدة:</span>{" "}
                        <span className="text-[#263544] text-sm">
                          {(price - cost).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50/80 backdrop-blur-xl relative">
          <div className="absolute inset-x-6 top-2 rounded-2xl border border-dashed border-[#C89355]/25 pointer-events-none h-[calc(100%-1rem)]" />
          <div className="flex items-center justify-end gap-3 relative z-10">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/80 text-slate-500 font-black text-sm border-2 border-white hover:bg-white hover:text-[#263544] hover:border-[#C89355]/30 transition-all active:scale-95 shadow-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#C89355] hover:bg-[#d9a56b] text-[#1a2530] font-black text-sm shadow-[0_10px_20px_rgba(200,147,85,0.45)] disabled:opacity-60 transition-all active:scale-95 border-2 border-[#C89355]/40 group"
            >
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#1a2530]/20 pointer-events-none transition-colors group-hover:border-[#1a2530]/40" />
              {isPending ? (
                <Loader2 className="animate-spin relative z-10" size={18} />
              ) : (
                <Save size={18} className="group-hover:-translate-y-0.5 transition-transform relative z-10" />
              )}
              <span className="relative z-10">حفظ المنتج</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
