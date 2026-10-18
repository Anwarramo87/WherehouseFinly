"use client";

import { useState, useEffect } from "react";
import { ArrowDownCircle, ArrowUpCircle, Loader2, SlidersHorizontal, X, Truck, ArrowRightLeft, Warehouse as WarehouseIcon } from "lucide-react";
import { AdjustStockInput, InventoryItem, Warehouse } from "@/types/inventory";

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AdjustStockInput) => void;
  isPending?: boolean;
  item?: InventoryItem | null;
  locations?: string[];
  warehouses?: Warehouse[];
}

const defaultForm: Omit<AdjustStockInput, "productId"> & {
  destinationWarehouse?: string;
  batchNumber?: string;
  inTransit?: boolean;
} = {
  type: "IN",
  quantity: "",
  note: "",
  location: "MAIN",
  destinationWarehouse: "",
  batchNumber: "",
  inTransit: false,
};

const TYPE_GROUPS = {
  inbound: ["IN", "PURCHASE_RECEIPT", "PRODUCTION_OUTPUT", "RETURN_TO_STOCK"] as const,
  outbound: ["OUT", "SALES_SHIPMENT", "PRODUCTION_CONSUMPTION", "DAMAGE_LOSS"] as const,
  transfer: ["WAREHOUSE_TRANSFER"] as const,
  adjustment: ["ADJUSTMENT"] as const,
};

export default function AdjustStockModal({ isOpen, onClose, onSave, isPending = false, item, locations = [] }: AdjustStockModalProps) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (isOpen) {
      setForm(defaultForm);
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const isInbound = TYPE_GROUPS.inbound.includes(form.type as any);
  const isOutbound = TYPE_GROUPS.outbound.includes(form.type as any);
  const isTransfer = form.type === "WAREHOUSE_TRANSFER";
  const isAdjustment = form.type === "ADJUSTMENT";

  const typeLabel = (type: string) => {
    const labels: Record<string, string> = {
      IN: "إضافة رصيد", OUT: "صرف مادة", ADJUSTMENT: "تسوية جرد",
      PURCHASE_RECEIPT: "استلام شراء (GRN)", PRODUCTION_OUTPUT: "إنتاج نهائي", RETURN_TO_STOCK: "إعادة مخزون",
      SALES_SHIPMENT: "شحن بيع", PRODUCTION_CONSUMPTION: "استهلاك إنتاجي", DAMAGE_LOSS: "تلف/خسارة (مصاريف)",
      WAREHOUSE_TRANSFER: "تحويل بين مخازن",
    };
    return labels[type] || type;
  };

  const typeColor = (type: string, solid = false) => {
    if (solid) {
      const colors: Record<string, string> = {
        IN: "bg-emerald-600 hover:bg-emerald-700", OUT: "bg-orange-600 hover:bg-orange-700", ADJUSTMENT: "bg-indigo-600 hover:bg-indigo-700",
        PURCHASE_RECEIPT: "bg-emerald-600 hover:bg-emerald-700", PRODUCTION_OUTPUT: "bg-blue-600 hover:bg-blue-700", RETURN_TO_STOCK: "bg-teal-600 hover:bg-teal-700",
        SALES_SHIPMENT: "bg-rose-600 hover:bg-rose-700", PRODUCTION_CONSUMPTION: "bg-amber-600 hover:bg-amber-700", DAMAGE_LOSS: "bg-red-600 hover:bg-red-700",
        WAREHOUSE_TRANSFER: "bg-purple-600 hover:bg-purple-700",
      };
      return colors[type] || "bg-gray-600";
    }
    const chips: Record<string, string> = {
      IN: "bg-emerald-50 text-emerald-700 border-emerald-200", OUT: "bg-orange-50 text-orange-700 border-orange-200", ADJUSTMENT: "bg-indigo-50 text-indigo-700 border-indigo-200",
      PURCHASE_RECEIPT: "bg-emerald-50 text-emerald-700 border-emerald-200", PRODUCTION_OUTPUT: "bg-blue-50 text-blue-700 border-blue-200", RETURN_TO_STOCK: "bg-teal-50 text-teal-700 border-teal-200",
      SALES_SHIPMENT: "bg-rose-50 text-rose-700 border-rose-200", PRODUCTION_CONSUMPTION: "bg-amber-50 text-amber-700 border-amber-200", DAMAGE_LOSS: "bg-red-50 text-red-700 border-red-200",
      WAREHOUSE_TRANSFER: "bg-purple-50 text-purple-700 border-purple-200",
    };
    return chips[type] || "bg-slate-50 text-slate-600 border-slate-200";
  };

  const typeBadge = (type: string) => (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black border ${typeColor(type, false)}`}>
      {isInbound ? <ArrowUpCircle size={12} /> : isOutbound ? <ArrowDownCircle size={12} /> : isTransfer ? <Truck size={12} /> : <SlidersHorizontal size={12} />}
      {typeLabel(type)}
    </span>
  );

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
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 border-2 border-white max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
          <div className="absolute inset-1 rounded-[1.4rem] border border-dashed border-[#C89355]/30 pointer-events-none" />
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              {item.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photo} alt={item.name} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-md" />
              ) : (
                <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_10px_20px_rgba(38,53,68,0.4)] border border-[#C89355]/40">
                  <SlidersHorizontal size={20} className="text-[#C89355]" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-black text-[#263544]">حركة مخزون</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">{item.name} • {item.sku}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors active:scale-95 p-2 rounded-xl hover:bg-rose-50">
              <X size={22} />
            </button>
          </div>
        </div>

        <form
          className="flex-1 overflow-y-auto custom-scrollbar p-8 relative"
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
          <div className="absolute inset-2 rounded-[2rem] border border-dashed border-[#C89355]/20 pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="md:col-span-2 rounded-2xl border-2 border-[#C89355]/25 bg-gradient-to-l from-[#C89355]/10 to-transparent p-5">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <p className="text-[11px] font-black text-slate-500 mb-1">الكمية الحالية في النظام</p>
                  <p className="text-2xl font-black text-[#263544]">{Number(item.quantity || 0).toLocaleString()} {item.unit}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {typeBadge(form.type)}
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>نوع العملية</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as any }))}
                className={`${commonInputClass} cursor-pointer appearance-none`}
              >
                <optgroup label="📥 وارد (زيادة الرصيد)">
                  <option value="IN">إضافة رصيد (رصيد افتتاحي)</option>
                  <option value="PURCHASE_RECEIPT">استلام شراء (GRN — مرتبط بأمر شراء)</option>
                  <option value="PRODUCTION_OUTPUT">إنتاج نهائي (إغلاق أمر إنتاج)</option>
                  <option value="RETURN_TO_STOCK">إعادة إلى المخزون</option>
                </optgroup>
                <optgroup label="📤 صادر (نقصان الرصيد)">
                  <option value="OUT">صرف مباشر</option>
                  <option value="SALES_SHIPMENT">شحن بيع / فاتورة بيع</option>
                  <option value="PRODUCTION_CONSUMPTION">استهلاك إنتاجي (تخصيص لأمر إنتاج)</option>
                  <option value="DAMAGE_LOSS">تلف/خسارة — يتم ترحيلها للمصاريف</option>
                </optgroup>
                <optgroup label="🚚 تحويل بين المخازن">
                  <option value="WAREHOUSE_TRANSFER">أمر تحويل بين مخازن (In-Transit)</option>
                </optgroup>
                <optgroup label="⚖️ تعديلات وتسوية">
                  <option value="ADJUSTMENT">تسوية جرد دوري (زيادة أو نقصان)</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className={labelClass}>
                الكمية <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                step="any"
                value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                placeholder="0"
                className={commonInputClass}
              />
            </div>

            {isTransfer ? (
              <>
                <div>
                  <label className={`${labelClass} flex items-center gap-1.5`}>
                    <WarehouseIcon size={14} className="text-rose-500" />
                    المخزن المصدر (يُخصم فوراً)
                  </label>
                  <select
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    className={`${commonInputClass} cursor-pointer appearance-none`}
                  >
                    <option value="MAIN">المخزن الرئيسي (MAIN)</option>
                    {Array.from(new Set(locations)).filter((l) => l && l !== "MAIN").map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`${labelClass} flex items-center gap-1.5`}>
                    <WarehouseIcon size={14} className="text-emerald-600" />
                    المخزن الوجهة
                  </label>
                  <select
                    value={form.destinationWarehouse || ""}
                    onChange={(e) => setForm((p) => ({ ...p, destinationWarehouse: e.target.value }))}
                    className={`${commonInputClass} cursor-pointer appearance-none`}
                  >
                    <option value="">اختر المخزن الوجهة...</option>
                    {Array.from(new Set(["MAIN", ...locations])).filter((l) => l && l !== form.location).map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  {form.destinationWarehouse && (
                    <p className="text-[11px] font-bold text-purple-700 mt-1.5 flex items-center gap-1 bg-purple-50 p-2 rounded-xl border border-purple-200">
                      <ArrowRightLeft size={12} />
                      بعد التحويل: يُخصم فوراً من المصدر ويصبح «قيد النقل (In-Transit)» حتى يضغط أمين المخزن الوجهة زر «تأكيد الاستلام».
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>رقم الدفعة (Batch)</label>
                  <input
                    type="text"
                    value={form.batchNumber || ""}
                    onChange={(e) => setForm((p) => ({ ...p, batchNumber: e.target.value }))}
                    placeholder="BATCH-2026-001"
                    className={`${commonInputClass} font-mono`}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className={labelClass}>
                    المخزن / الموقع
                  </label>
                  <select
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    className={`${commonInputClass} cursor-pointer appearance-none`}
                  >
                    <option value="MAIN">المخزن الرئيسي (MAIN)</option>
                    {Array.from(new Set(locations)).filter((l) => l && l !== "MAIN").map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {form.type === "PURCHASE_RECEIPT" && (
                  <div>
                    <label className={labelClass}>رقم الدفعة / Batch</label>
                    <input
                      type="text"
                      value={form.batchNumber || ""}
                      onChange={(e) => setForm((p) => ({ ...p, batchNumber: e.target.value }))}
                      placeholder="BATCH-2026-001"
                      className={`${commonInputClass} font-mono`}
                    />
                  </div>
                )}
              </>
            )}

            <div className={isTransfer ? "md:col-span-2" : "md:col-span-2"}>
              <label className={labelClass}>ملاحظة / وثيقة مرتبطة</label>
              <textarea
                value={form.note || ""}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                rows={isTransfer ? 3 : 2}
                placeholder={
                  isTransfer
                    ? "رقم أمر التحويل / السائق / تاريخ التوصيل المتوقع..."
                    : isInbound
                      ? "مثال: رقم فاتورة الشراء، أمر الإنتاج، اسم المستلم..."
                      : isOutbound
                        ? "مثال: رقم فاتورة البيع، أمر الإنتاج، سبب التلف/الهلاك..."
                        : "مثال: ملاحظات الجرد الفعلي، ورقة الجرد رقم..."
                }
                className={`${commonInputClass} resize-none`}
              />
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
              disabled={isPending || (isTransfer && !form.destinationWarehouse)}
              className={`relative overflow-hidden inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-white font-black text-sm shadow-[0_10px_20px_rgba(38,53,68,0.25)] disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95 group ${typeColor(form.type, true)}`}
            >
              <div className="absolute inset-1 rounded-xl border border-dashed border-white/30 pointer-events-none transition-colors group-hover:border-white/50" />
              {isPending ? (
                <Loader2 className="animate-spin relative z-10" size={18} />
              ) : isOutbound ? (
                <ArrowDownCircle size={18} className="group-hover:-translate-y-0.5 transition-transform relative z-10" />
              ) : isTransfer ? (
                <Truck size={18} className="group-hover:animate-bounce transition-transform relative z-10" />
              ) : (
                <ArrowUpCircle size={18} className="group-hover:-translate-y-0.5 transition-transform relative z-10" />
              )}
              <span className="relative z-10">
                {isTransfer ? `إنشاء أمر تحويل → ${form.destinationWarehouse || "الوجهة"}` : typeLabel(form.type)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
