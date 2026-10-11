"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, X, Sparkles, Package, Hash, Palette, Ruler, ArrowLeft, ArrowRight } from "lucide-react";
import { InventoryItemInput, CATEGORY_TYPES } from "@/types/inventory";
import PhotoUploadField from "@/components/PhotoUploadField";
import EntityCustomFieldsForm from "@/components/EntityCustomFieldsForm";
import { toast } from "react-hot-toast";

interface AddRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: InventoryItemInput, customFields?: Record<string, unknown>) => void;
  isPending?: boolean;
  initialData?: (Partial<InventoryItemInput> & { id?: string }) | null;
  categories: string[];
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
  productType: "RAW_MATERIAL",
  size: "",
  feature: "",
  barcode: "",
  description: "",
};

export default function AddRawMaterialModal({
  isOpen,
  onClose,
  onSave,
  isPending = false,
  initialData,
  categories = [],
}: AddRawMaterialModalProps) {
  const [activeSection, setActiveSection] = useState<1 | 2>(1);
  const [form, setForm] = useState<InventoryItemInput>(defaultForm);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (isOpen) {
      setActiveSection(1);
      setCustomFieldValues({});
      if (initialData) {
        setForm({
          sku: initialData.sku || "",
          name: initialData.name || "",
          category: initialData.category || "",
          unitPrice: initialData.unitPrice?.toString() || "",
          costPrice: initialData.costPrice?.toString() || "",
          profitPercent: initialData.profitPercent?.toString() || "",
          reorderLevel: initialData.reorderLevel?.toString() || "10",
          unit: initialData.unit || "قطعة",
          photo: initialData.photo ?? null,
          productType: initialData.productType || "RAW_MATERIAL",
          size: initialData.size || "",
          feature: initialData.feature || "",
          barcode: initialData.barcode || "",
          description: initialData.description || "",
        });
      } else {
        setForm(defaultForm);
      }
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

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

  const canGoNext = form.name.trim() && form.category.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canGoNext) {
      toast.error("الاسم والتصنيف مطلوبان");
      setActiveSection(1);
      return;
    }
    onSave(form, customFieldValues);
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
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 border-2 border-white max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
          <div className="absolute inset-1 rounded-[1.4rem] border border-dashed border-[#C89355]/30 pointer-events-none" />
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_10px_20px_rgba(38,53,68,0.4)] border border-[#C89355]/40">
                <Sparkles size={20} className="text-[#C89355]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#263544]">
                  {initialData?.id ? "تعديل مادة خام" : "إضافة مادة خام جديدة"}
                </h2>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  القسم {activeSection} من 2 — {activeSection === 1 ? "البيانات الأساسية والتصنيف" : "المعرّفات والخصائص"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-rose-500 transition-colors active:scale-95 p-2 rounded-xl hover:bg-rose-50"
            >
              <X size={22} />
            </button>
          </div>

          <div className="relative z-10 mt-6 flex items-center justify-between gap-2">
            {[1, 2].map((step) => (
              <div key={step} className="flex-1 flex items-center gap-3">
                <div
                  className={`flex items-center justify-center rounded-2xl w-11 h-11 shrink-0 font-black transition-all ${
                    activeSection >= step
                      ? "bg-[#1a2530] text-[#C89355] shadow-[0_8px_16px_rgba(38,53,68,0.3)] border border-[#C89355]/40"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {step}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-xs font-black ${
                      activeSection >= step ? "text-[#263544]" : "text-slate-400"
                    }`}
                  >
                    {step === 1 ? "البيانات الأساسية والتصنيف" : "المعرّفات والخصائص"}
                  </p>
                  <div className="h-1.5 mt-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        activeSection >= step
                          ? "bg-gradient-to-l from-[#C89355] to-[#E0A868] w-full"
                          : "w-0"
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 relative">
            <div className="absolute inset-2 rounded-[2rem] border border-dashed border-[#C89355]/20 pointer-events-none" />

            {activeSection === 1 && (
              <div className="space-y-6 relative z-10 animate-in slide-in-from-right-5 fade-in duration-200">
                <div className="rounded-2xl border-2 border-[#C89355]/25 bg-white/70 p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-2.5 bg-[#C89355]/15 rounded-xl">
                      <Package size={18} className="text-[#8a5f26]" />
                    </div>
                    <h3 className="font-black text-[#263544] text-base">البيانات الأساسية والتصنيف</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <PhotoUploadField
                        value={form.photo ?? null}
                        onChange={(photo) => setForm((p) => ({ ...p, photo }))}
                        label="صورة المادة الخام"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        اسم المادة الخام <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="مثال: جلسرين نقي، كريم أساس..."
                        className={commonInputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        التصنيف <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={form.category}
                        onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                        className={`${commonInputClass} cursor-pointer appearance-none`}
                      >
                        <option value="">اختر التصنيف...</option>
                        {categories.length === 0 ? (
                          <option value="" disabled>لا توجد تصنيفات — أضف تصنيفاً أولاً</option>
                        ) : (
                          categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))
                        )}
                      </select>
                      {categories.length === 0 && (
                        <p className="text-xs font-bold text-amber-700 mt-1.5 flex items-center gap-1">
                          ⚠️ يجب إضافة تصنيف أولاً من زر "إضافة تصنيف"
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>نوع المادة</label>
                      <select
                        value={form.productType || "RAW_MATERIAL"}
                        onChange={(e) => setForm((p) => ({ ...p, productType: e.target.value }))}
                        className={`${commonInputClass} cursor-pointer appearance-none`}
                      >
                        {CATEGORY_TYPES.filter((ct) => ct.id !== "OTHER").map((ct) => (
                          <option key={ct.id} value={ct.name}>
                            {ct.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>وحدة القياس</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.unit || ""}
                          onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                          placeholder="مثال: قطعة، كيلو، لتر، علبة..."
                          list="unit-options"
                          className={commonInputClass}
                        />
                        <datalist id="unit-options">
                          <option value="قطعة" />
                          <option value="كيلو جرام" />
                          <option value="جرام" />
                          <option value="لتر" />
                          <option value="مل لتر" />
                          <option value="علبة" />
                          <option value="كرتون" />
                          <option value="شريط" />
                          <option value="حزمة" />
                        </datalist>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className={labelClass}>وصف المادة (اختياري)</label>
                      <textarea
                        value={form.description || ""}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        rows={3}
                        placeholder="وصف تفصيلي للمادة الخام، الاستخدام، المواصفات..."
                        className={`${commonInputClass} resize-none`}
                      />
                    </div>
                  </div>
                </div>

                <EntityCustomFieldsForm
                  entity="product"
                  initialValues={customFieldValues}
                  onChange={setCustomFieldValues}
                />
              </div>
            )}

            {activeSection === 2 && (
              <div className="space-y-6 relative z-10 animate-in slide-in-from-left-5 fade-in duration-200">
                <div className="rounded-2xl border-2 border-[#C89355]/25 bg-white/70 p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-2.5 bg-[#C89355]/15 rounded-xl">
                      <Hash size={18} className="text-[#8a5f26]" />
                    </div>
                    <h3 className="font-black text-[#263544] text-base">المعرّفات والخصائص</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className={`${labelClass} flex items-center gap-1.5`}>
                        <Hash size={14} className="text-[#C89355]" />
                        كود SKU <span className="text-xs font-bold text-slate-400">(اختياري)</span>
                      </label>
                      <input
                        type="text"
                        value={form.sku || ""}
                        onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                        placeholder="مثال: RAW-GLY-001"
                        className={`${commonInputClass} font-mono`}
                      />
                    </div>

                    <div>
                      <label className={`${labelClass} flex items-center gap-1.5`}>
                        <Hash size={14} className="text-[#C89355]" />
                        الباركود <span className="text-xs font-bold text-slate-400">(اختياري)</span>
                      </label>
                      <input
                        type="text"
                        value={form.barcode || ""}
                        onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))}
                        placeholder="باركود المنتج"
                        className={`${commonInputClass} font-mono`}
                      />
                    </div>

                    <div>
                      <label className={`${labelClass} flex items-center gap-1.5`}>
                        <Ruler size={14} className="text-[#C89355]" />
                        الحجم / القياس
                      </label>
                      <input
                        type="text"
                        value={form.size || ""}
                        onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))}
                        placeholder="مثال: 100 مل، 500 غرام، كبير..."
                        className={commonInputClass}
                      />
                    </div>

                    <div>
                      <label className={`${labelClass} flex items-center gap-1.5`}>
                        <Palette size={14} className="text-[#C89355]" />
                        اللون / الخصائص
                      </label>
                      <input
                        type="text"
                        value={form.feature || ""}
                        onChange={(e) => setForm((p) => ({ ...p, feature: e.target.value }))}
                        placeholder="مثال: أبيض، لافندر، غير معطر..."
                        className={commonInputClass}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border-2 border-[#C89355]/25 bg-white/70 p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-2.5 bg-emerald-500/15 rounded-xl">
                      <Sparkles size={18} className="text-emerald-600" />
                    </div>
                    <h3 className="font-black text-[#263544] text-base">الأسعار والحد الأدنى للمخزون</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className={labelClass}>سعر التكلفة</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.costPrice || ""}
                        onChange={(e) => handleCostChange(e.target.value)}
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
                        onChange={(e) => handlePriceChange(e.target.value)}
                        placeholder="0.00"
                        className={commonInputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>نسبة الربح %</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={form.profitPercent || ""}
                        onChange={(e) => handleProfitChange(e.target.value)}
                        placeholder="0.0"
                        className={commonInputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>حد إعادة الطلب (الأدنى)</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={form.reorderLevel || ""}
                        onChange={(e) => setForm((p) => ({ ...p, reorderLevel: e.target.value }))}
                        placeholder="10"
                        className={commonInputClass}
                      />
                    </div>

                    {price > 0 && cost > 0 && (
                      <div className="md:col-span-2 rounded-2xl bg-gradient-to-l from-[#C89355]/10 to-transparent p-4 border-2 border-[#C89355]/30">
                        <div className="flex flex-wrap gap-4 items-center justify-between text-xs font-black">
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
            )}
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50/80 backdrop-blur-xl relative">
          <div className="absolute inset-x-6 top-2 rounded-2xl border border-dashed border-[#C89355]/25 pointer-events-none h-[calc(100%-1rem)]" />
          <div className="flex items-center justify-between gap-3 relative z-10">
            <button
              type="button"
              onClick={() => setActiveSection(activeSection === 2 ? 1 : activeSection)}
              disabled={activeSection === 1}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/80 text-[#263544] font-black text-sm border-2 border-white hover:bg-white hover:border-[#C89355]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
            >
              <ArrowRight size={16} />
              السابق
            </button>

            <div className="flex items-center gap-3">
              {activeSection === 1 ? (
                <button
                  type="button"
                  onClick={() => canGoNext && setActiveSection(2)}
                  disabled={!canGoNext}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#C89355]/15 text-[#8a5f26] font-black text-sm border-2 border-[#C89355]/30 hover:bg-[#C89355]/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
                >
                  التالي
                  <ArrowLeft size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isPending}
                  className="relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#1a2530] hover:bg-[#263544] text-[#C89355] font-black text-sm shadow-[0_10px_20px_rgba(38,53,68,0.4)] disabled:opacity-60 transition-all active:scale-95 border-2 border-[#C89355]/40 group"
                >
                  <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
                  {isPending ? (
                    <Loader2 className="animate-spin relative z-10" size={18} />
                  ) : (
                    <Save size={18} className="group-hover:-translate-y-0.5 transition-transform relative z-10" />
                  )}
                  <span className="relative z-10">حفظ المادة الخام</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
