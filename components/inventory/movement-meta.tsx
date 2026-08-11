import { MovementType } from "@/types/inventory";

export const MOVEMENT_TYPE_META: Record<MovementType, { label: string; badge: string; numberClass: string }> = {
  IN: { label: "إضافة", badge: "bg-emerald-50 text-emerald-600 border-emerald-200", numberClass: "text-emerald-600" },
  OUT: { label: "صرف", badge: "bg-orange-50 text-orange-600 border-orange-200", numberClass: "text-orange-600" },
  ADJUSTMENT: { label: "تسوية", badge: "bg-indigo-50 text-indigo-600 border-indigo-200", numberClass: "text-indigo-600" },
  RESERVE: { label: "حجز", badge: "bg-sky-50 text-sky-600 border-sky-200", numberClass: "text-sky-600" },
  RELEASE: { label: "إفراج", badge: "bg-violet-50 text-violet-600 border-violet-200", numberClass: "text-violet-600" },
};

export const MOVEMENT_TYPE_ORDER: MovementType[] = ["IN", "OUT", "ADJUSTMENT", "RESERVE", "RELEASE"];

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
  return referenceType;
};

export const SkeletonTable = () => (
  <div className="space-y-3 p-6 bg-white/50 rounded-3xl">
    {Array.from({ length: 7 }).map((_, idx) => (
      <div key={idx} className="h-12 rounded-xl bg-slate-200/50 animate-pulse" />
    ))}
  </div>
);
