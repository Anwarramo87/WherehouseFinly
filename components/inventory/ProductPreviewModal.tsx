"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Coins,
  Edit,
  Hash,
  Package2,
  PackageCheck,
  Tag,
  Warehouse,
  X,
} from "lucide-react";
import { InventoryItem } from "@/types/inventory";

interface ProductPreviewModalProps {
  item: InventoryItem | null;
  onClose: () => void;
  onEdit: () => void;
  onAdjust: () => void;
}

const toNumber = (value: number | undefined) => Number(value ?? 0);

export default function ProductPreviewModal({
  item,
  onClose,
  onEdit,
  onAdjust,
}: ProductPreviewModalProps) {
  const progress = useMemo(() => {
    if (!item) return 0;
    const min = Math.max(1, Number(item.minStockLevel || 0));
    const ratio = Number(item.quantity || 0) / min;
    return Math.min(100, Math.round(ratio * 100));
  }, [item]);

  if (!item) return null;

  const isLowStock = item.quantity <= item.minStockLevel;
  const stockValue = toNumber(item.quantity) * toNumber(item.unitPrice);

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[92vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo */}
        <div className="relative h-56 bg-gradient-to-br from-[#1a2530] to-[#263544]">
          {item.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photo} alt={item.name} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package2 size={64} className="text-[#C89355]/60" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 p-2 bg-black/30 backdrop-blur-md text-white rounded-xl hover:bg-black/50 transition-all active:scale-95"
          >
            <X size={20} />
          </button>
          <div
            className={`absolute bottom-3 right-3 px-4 py-1.5 rounded-xl text-xs font-black shadow-lg ${
              isLowStock
                ? "bg-rose-500 text-white"
                : "bg-[#C89355] text-[#1a2530]"
            }`}
          >
            {isLowStock ? "كمية منخفضة" : "مخزون جيد"}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-[#263544] mb-1 truncate">{item.name}</h2>
              <p className="text-xs font-mono font-bold text-slate-500 flex items-center gap-1.5">
                <Hash size={12} className="text-[#C89355]" />
                {item.sku}
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C89355]/10 border border-[#C89355]/30 rounded-xl text-xs font-black text-[#1a2530]">
              <Tag size={13} className="text-[#C89355]" />
              {item.category}
            </span>
          </div>

          {/* Quantity + progress */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-500 flex items-center gap-2">
                <PackageCheck size={14} className="text-emerald-600" />
                الكمية المتاحة
              </span>
              <span className="text-2xl font-black text-[#263544]">
                {Number(item.quantity || 0).toLocaleString()}{" "}
                <span className="text-xs font-bold text-slate-500">{item.unit}</span>
              </span>
            </div>
            <div className="h-2.5 bg-white rounded-full overflow-hidden border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isLowStock ? "bg-rose-500" : "bg-emerald-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] font-bold text-slate-500 mt-2 flex items-center gap-1.5">
              <Warehouse size={12} />
              حد إعادة الطلب: <span className="font-black text-[#263544]">{Number(item.minStockLevel || 0).toLocaleString()}</span> {item.unit}
              {isLowStock ? (
                <span className="mr-auto inline-flex items-center gap-1 text-rose-600">
                  <AlertTriangle size={12} /> يجب إعادة الطلب
                </span>
              ) : null}
            </p>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-[11px] font-black text-slate-500 mb-1 flex items-center gap-1.5">
                <Coins size={12} className="text-[#C89355]" /> سعر الوحدة
              </p>
              <p className="text-base font-black text-[#263544]">
                {toNumber(item.unitPrice) > 0 ? toNumber(item.unitPrice).toLocaleString() : "—"}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-[11px] font-black text-slate-500 mb-1 flex items-center gap-1.5">
                <Coins size={12} className="text-emerald-600" /> القيمة التقديرية
              </p>
              <p className="text-base font-black text-emerald-700">
                {stockValue > 0 ? stockValue.toLocaleString() : "—"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onEdit}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1a2530] text-[#C89355] font-black text-sm hover:bg-[#263544] transition-all active:scale-95 border border-[#C89355]/40"
            >
              <Edit size={16} /> تعديل الصنف
            </button>
            <button
              onClick={onAdjust}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#C89355] text-[#1a2530] font-black text-sm hover:bg-[#d9a56b] transition-all active:scale-95"
            >
              <ArrowRightLeft size={16} /> حركة مخزون
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
