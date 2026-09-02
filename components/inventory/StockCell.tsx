"use client";

import { InventoryItem } from "@/types/inventory";

/**
 * Stock state for one product, readable without doing arithmetic.
 *
 * The table used to show a single number, which left the reader to compare it
 * against the reorder level in their head — and said nothing about the portion
 * already committed to confirmed orders. This shows the state as a word and a
 * colour first, the numbers second, and the reserved split only when there is
 * one.
 */

export type StockState = "out" | "low" | "ok";

export function stockStateOf(item: InventoryItem): StockState {
  if (item.quantity <= 0) return "out";
  if (item.quantity <= item.minStockLevel) return "low";
  return "ok";
}

const LABEL: Record<StockState, string> = {
  out: "نفد المخزون",
  low: "أوشك على النفاد",
  ok: "متوفر",
};

const TONE: Record<StockState, { chip: string; bar: string; text: string }> = {
  out: { chip: "bg-rose-100 text-rose-700 border-rose-200", bar: "bg-rose-500", text: "text-rose-700" },
  low: { chip: "bg-amber-100 text-amber-800 border-amber-200", bar: "bg-amber-500", text: "text-amber-800" },
  ok:  { chip: "bg-emerald-100 text-emerald-800 border-emerald-200", bar: "bg-emerald-500", text: "text-[#263544]" },
};

export function StockBadge({ item }: { item: InventoryItem }) {
  const state = stockStateOf(item);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-black whitespace-nowrap ${TONE[state].chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${TONE[state].bar}`} aria-hidden />
      {LABEL[state]}
    </span>
  );
}

export default function StockCell({ item }: { item: InventoryItem }) {
  const state = stockStateOf(item);
  const tone = TONE[state];
  const reserved = item.reserved ?? 0;
  const onHand = item.onHand ?? item.quantity;

  // The bar reads against the reorder level: full means comfortably above it.
  // Anything at or below the level is what the colour is warning about.
  const target = Math.max(item.minStockLevel * 2, 1);
  const pct = Math.max(0, Math.min(100, (item.quantity / target) * 100));

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-36">
      <div className="flex items-baseline gap-1.5">
        <span className={`text-lg font-black tabular-nums leading-none ${tone.text}`}>
          {item.quantity.toLocaleString()}
        </span>
        <span className="text-[11px] font-black text-[#263544]/45">{item.unit}</span>
      </div>

      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[#263544]/10" role="presentation">
        <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="text-[10px] font-bold text-[#263544]/50 tabular-nums">
        {reserved > 0 ? (
          <span title="إجمالي الموجود / المحجوز لطلبات مؤكدة">
            {onHand.toLocaleString()} موجود · {reserved.toLocaleString()} محجوز
          </span>
        ) : (
          <span title="حد إعادة الطلب">حد الطلب {item.minStockLevel.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}
