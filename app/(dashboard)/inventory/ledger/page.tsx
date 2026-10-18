"use client";

import { useState, useMemo } from "react";
import { BookOpen, Search, Filter, ArrowDownLeft, ArrowUpLeft, ArrowRightLeft, Package, Warehouse, ChevronDown, ChevronUp } from "lucide-react";
import { useStockMovements, useWarehouses } from "@/hooks/useInventory";
import { MovementType, StockMovementRecord } from "@/types/inventory";
import { MOVEMENT_TYPE_META, formatSignedQuantity } from "@/components/inventory/movement-meta";
import InventoryPageShell from "@/components/inventory/InventoryPageShell";

const PAGE_SIZE = 50;

export default function StockLedgerPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<MovementType | "all">("all");
  const [sku, setSku] = useState("");
  const [location, setLocation] = useState("all");
  const [expandedSku, setExpandedSku] = useState<string | null>(null);

  const warehousesQuery = useWarehouses();
  const warehouses = useMemo(() => warehousesQuery.data || [], [warehousesQuery.data]);

  const query = useStockMovements({
    page,
    limit: PAGE_SIZE,
    type: type === "all" ? undefined : type,
    sku: sku.trim() || undefined,
    location: location === "all" ? undefined : location,
  });

  const movements = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 0;

  const groupedBySku = useMemo(() => {
    const groups = new Map<string, StockMovementRecord[]>();
    movements.forEach((m) => {
      const list = groups.get(m.sku) ?? [];
      list.push(m);
      groups.set(m.sku, list);
    });
    return groups;
  }, [movements]);

  const toggleSku = (sku: string) => {
    setExpandedSku(expandedSku === sku ? null : sku);
  };

  const totalQuantity = useMemo(() => {
    let sum = 0;
    movements.forEach((m) => { sum += m.quantity; });
    return sum;
  }, [movements]);

  return (
    <InventoryPageShell title="الدفتر الأستاذ" subtitle="سجل كامل لحركات المخزون مع الأرصدة المتراكمة حسب الصنف والموقع.">
      <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group/wh">
        <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover/wh:border-[#C89355]/50" />
        <div className="relative z-10">
          <div className="p-6 border-b border-white/80 bg-white/40 flex items-center justify-between gap-4">
            <h2 className="text-lg font-black text-[#263544] flex items-center gap-3">
              <BookOpen size={20} className="text-[#C89355] group-hover/wh:animate-pulse transition-all duration-300" />
              الدفتر الأستاذ
            </h2>
            <span className="text-xs font-black text-[#C89355] bg-[#1a2530] px-4 py-1.5 rounded-xl shadow-sm border border-[#C89355]/30">{total.toLocaleString()} حركة</span>
          </div>

          <div className="p-6 border-b border-white/60 bg-white/20 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search size={16} className="text-[#C89355]" />
              <input
                value={sku}
                onChange={(e) => { setSku(e.target.value); setPage(1); }}
                className="w-48 p-2 bg-white/80 border border-white rounded-xl text-sm font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/50"
                placeholder="بحث بال SKU..."
              />
            </div>
            <select
              value={type}
              onChange={(e) => { setType(e.target.value as MovementType | "all"); setPage(1); }}
              className="p-2 bg-white/80 border border-white rounded-xl text-sm font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/50"
            >
              <option value="all">جميع الأنواع</option>
              <option value="IN">إضافة</option>
              <option value="OUT">صرف</option>
              <option value="PURCHASE_RECEIPT">استلام شراء</option>
              <option value="PRODUCTION_OUTPUT">إنتاج</option>
              <option value="SALES_SHIPMENT">شحن بيع</option>
              <option value="WAREHOUSE_TRANSFER">تحويل</option>
              <option value="ADJUSTMENT">تسوية</option>
              <option value="DAMAGE_LOSS">تلف</option>
            </select>
            <select
              value={location}
              onChange={(e) => { setLocation(e.target.value); setPage(1); }}
              className="p-2 bg-white/80 border border-white rounded-xl text-sm font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/50"
            >
              <option value="all">جميع المواقع</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.name}>{wh.name}</option>
              ))}
            </select>
            <span className="text-xs font-black text-[#C89355]">الإجمالي: {totalQuantity.toLocaleString()}</span>
          </div>

          <div className="p-6">
            {query.isLoading ? (
              <div className="text-sm font-black text-[#263544]/50 text-center py-4">جارٍ تحميل...</div>
            ) : movements.length === 0 ? (
              <p className="text-sm font-black text-[#263544]/50 text-center py-4">لا توجد حركات.</p>
            ) : (
              <div className="space-y-2">
                {Array.from(groupedBySku.entries()).map(([skuKey, items]) => (
                  <div key={skuKey} className="rounded-2xl border border-[#C89355]/20 bg-white/60 overflow-hidden">
                    <button
                      onClick={() => toggleSku(skuKey)}
                      className="w-full p-4 flex items-center justify-between hover:bg-white/40 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {expandedSku === skuKey ? <ChevronUp size={20} className="text-[#C89355]" /> : <ChevronDown size={20} className="text-[#C89355]" />}
                        <div>
                          <p className="font-black text-[#263544] text-sm">{skuKey}</p>
                          <p className="text-xs font-bold text-slate-500">{items.length} حركة | الصافي: {formatSignedQuantity(items.reduce((s, m) => s + m.quantity, 0))}</p>
                        </div>
                      </div>
                    </button>
                    {expandedSku === skuKey && (
                      <div className="border-t border-slate-100 divide-y divide-slate-100">
                        {items.map((m) => {
                          const meta = MOVEMENT_TYPE_META[m.type] ?? MOVEMENT_TYPE_META.IN;
                          return (
                            <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-all">
                              <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-xl text-[11px] font-black border ${meta.badge}`}>{meta.label}</span>
                                <span className="text-xs font-bold text-slate-500">{m.location}</span>
                                {m.reason ? <span className="text-xs font-bold text-slate-400">{m.reason}</span> : null}
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={`text-sm font-black ${meta.numberClass}`}>{formatSignedQuantity(m.quantity)}</span>
                                <span className="text-xs font-bold text-slate-400">{new Date(m.createdAt).toLocaleDateString('ar-EG')}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="p-6 border-t border-white/60 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm disabled:opacity-50 hover:bg-slate-200 transition-all"
              >
                السابق
              </button>
              <span className="text-sm font-black text-[#263544]">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm disabled:opacity-50 hover:bg-slate-200 transition-all"
              >
                التالي
              </button>
            </div>
          )}
        </div>
      </div>
    </InventoryPageShell>
  );
}
