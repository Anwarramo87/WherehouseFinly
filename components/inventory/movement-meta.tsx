import { MovementType } from "@/types/inventory";

export const MOVEMENT_TYPE_META: Record<MovementType, { label: string; badge: string; numberClass: string }> = {
  IN: { label: "إضافة", badge: "bg-emerald-50 text-emerald-600 border-emerald-200", numberClass: "text-emerald-600" },
  OUT: { label: "صرف", badge: "bg-orange-50 text-orange-600 border-orange-200", numberClass: "text-orange-600" },
  ADJUSTMENT: { label: "تسوية", badge: "bg-indigo-50 text-indigo-600 border-indigo-200", numberClass: "text-indigo-600" },
  RESERVE: { label: "حجز", badge: "bg-sky-50 text-sky-600 border-sky-200", numberClass: "text-sky-600" },
  RELEASE: { label: "إفراج", badge: "bg-violet-50 text-violet-600 border-violet-200", numberClass: "text-violet-600" },
  PURCHASE_RECEIPT: { label: "استلام شراء", badge: "bg-emerald-50 text-emerald-600 border-emerald-200", numberClass: "text-emerald-600" },
  PRODUCTION_OUTPUT: { label: "إنتاج", badge: "bg-blue-50 text-blue-600 border-blue-200", numberClass: "text-blue-600" },
  RETURN_TO_STOCK: { label: "إعادة", badge: "bg-teal-50 text-teal-600 border-teal-200", numberClass: "text-teal-600" },
  SALES_SHIPMENT: { label: "شحن بيع", badge: "bg-rose-50 text-rose-600 border-rose-200", numberClass: "text-rose-600" },
  PRODUCTION_CONSUMPTION: { label: "استهلاك", badge: "bg-amber-50 text-amber-600 border-amber-200", numberClass: "text-amber-600" },
  DAMAGE_LOSS: { label: "تلف/خسارة", badge: "bg-red-50 text-red-600 border-red-200", numberClass: "text-red-600" },
  WAREHOUSE_TRANSFER: { label: "تحويل", badge: "bg-purple-50 text-purple-600 border-purple-200", numberClass: "text-purple-600" },
};

export const MOVEMENT_TYPE_ORDER: MovementType[] = ["IN", "OUT", "ADJUSTMENT", "RESERVE", "RELEASE", "PURCHASE_RECEIPT", "PRODUCTION_OUTPUT", "RETURN_TO_STOCK", "SALES_SHIPMENT", "PRODUCTION_CONSUMPTION", "DAMAGE_LOSS", "WAREHOUSE_TRANSFER"];

export const formatSignedQuantity = (quantity: number) => {
  const value = Number(quantity || 0);
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toLocaleString()}`;
};

export const referenceLabel = (referenceType?: string) => {
  if (!referenceType) return "يدوي";
  if (referenceType === "sales_order") return "أمر بيع";
  if (referenceType === "purchase_order") return "أمر شراء";
  if (referenceType === "bulk_import") return "استيراد";
  if (referenceType === "production") return "إنتاج";
  if (referenceType === "purchase") return "شراء";
  if (referenceType === "sales") return "بيع";
  if (referenceType === "warehouse") return "مخزن";
  if (referenceType === "transfer") return "تحويل";
  return referenceType;
};

export const SkeletonTable = () => (
  <div className="space-y-3 p-6 bg-white/50 rounded-3xl">
    {Array.from({ length: 7 }).map((_, idx) => (
      <div key={idx} className="h-12 rounded-xl bg-slate-200/50 animate-pulse" />
    ))}
  </div>
);
