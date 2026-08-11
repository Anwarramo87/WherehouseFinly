"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Search, ChevronRight, ChevronLeft, Filter } from "lucide-react";
import { useStockMovements, useWarehouses } from "@/hooks/useInventory";
import { MovementType } from "@/types/inventory";
import InventoryPageShell from "@/components/inventory/InventoryPageShell";
import { MOVEMENT_TYPE_META, MOVEMENT_TYPE_ORDER, SkeletonTable, formatSignedQuantity, referenceLabel } from "@/components/inventory/movement-meta";

const PAGE_SIZE = 25;

export default function InventoryMovementsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<MovementType | "all">("all");
  const [skuInput, setSkuInput] = useState("");
  const [sku, setSku] = useState("");
  const [location, setLocation] = useState("all");

  const warehousesQuery = useWarehouses();
  const warehouses = useMemo(() => warehousesQuery.data || [], [warehousesQuery.data]);

  const query = useStockMovements({
    page,
    limit: PAGE_SIZE,
    type: type === "all" ? undefined : type,
    sku: sku.trim() || undefined,
    location: location === "all" ? undefined : location,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSku(skuInput);
      setPage(1);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [skuInput]);

  const movements = query.data?.data || [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;

  const locations = useMemo(
    () => Array.from(new Set(["MAIN", ...warehouses.map((w) => w.name)])),
    [warehouses],
  );

  const goToPage = (target: number) => {
    if (target < 1 || target > totalPages) return;
    setPage(target);
  };

  return (
    <InventoryPageShell
      title="حركات المخزون"
      subtitle="سجل كامل لعمليات الإضافة والصرف والحجز والتسوية مع إمكانية التصفية والتنقل بين الصفحات."
    >
      <div className="relative overflow-hidden bg-white/60 backdrop-blur-2xl border-2 border-white/90 rounded-[2.5rem] p-5 shadow-[0_15px_40px_rgba(38,53,68,0.06)] mb-8 group/filter">
        <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/filter:border-[#C89355]/50 z-0" />
        <div className="flex items-center gap-2 mb-4 relative z-10">
          <Filter size={18} className="text-[#C89355]" />
          <h2 className="text-sm font-black text-[#263544]">تصفية الحركات</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
          <div className="relative group focus-within:ring-2 focus-within:ring-[#C89355]/50 focus-within:border-[#C89355] rounded-2xl transition-all">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C89355] group-hover:animate-pulse transition-all duration-300 z-10" size={18} />
            <input
              type="text"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              placeholder="ابحث بواسطة SKU..."
              className="w-full pr-12 pl-4 py-3.5 bg-white/80 backdrop-blur-sm border-none rounded-2xl text-sm font-black text-[#263544] outline-none shadow-inner"
            />
          </div>

          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as MovementType | "all");
              setPage(1);
            }}
            className="w-full py-3.5 px-4 bg-white/80 backdrop-blur-sm border-none rounded-2xl text-sm font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/50 transition-all shadow-inner cursor-pointer appearance-none"
          >
            <option value="all">كل أنواع الحركات</option>
            {MOVEMENT_TYPE_ORDER.map((t) => (
              <option key={t} value={t}>{MOVEMENT_TYPE_META[t].label}</option>
            ))}
          </select>

          <select
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setPage(1);
            }}
            className="w-full py-3.5 px-4 bg-white/80 backdrop-blur-sm border-none rounded-2xl text-sm font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/50 transition-all shadow-inner cursor-pointer appearance-none"
          >
            <option value="all">كل المواقع</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group/log">
        <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover/log:border-[#C89355]/50" />
        <div className="relative z-10">
          <div className="p-6 border-b border-white/80 flex flex-col md:flex-row items-center justify-between gap-4 bg-white/40">
            <h2 className="text-lg font-black text-[#263544] flex items-center gap-3">
              <History size={20} className="text-[#C89355] group-hover/log:animate-pulse transition-all duration-300" />
              سجل حركات المخزون
            </h2>
            <span className="text-xs font-black text-[#C89355] bg-[#1a2530] px-4 py-1.5 rounded-xl shadow-sm border border-[#C89355]/30">
              {total} حركة مسجلة
            </span>
          </div>

          {query.isLoading ? (
            <div className="p-8"><SkeletonTable /></div>
          ) : movements.length === 0 ? (
            <p className="p-12 text-center text-sm font-black text-[#263544]/60">لا توجد حركات مطابقة لنتائج التصفية الحالية.</p>
          ) : (
            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full text-right min-w-245">
                <thead className="bg-white/20 border-b border-white/60">
                  <tr>
                    <th className="p-4 text-xs font-black text-[#263544] uppercase tracking-wider text-center">الصنف</th>
                    <th className="p-4 text-xs font-black text-[#263544] uppercase tracking-wider text-center">SKU</th>
                    <th className="p-4 text-xs font-black text-[#263544] uppercase tracking-wider text-center">النوع</th>
                    <th className="p-4 text-xs font-black text-[#263544] uppercase tracking-wider text-center">الكمية</th>
                    <th className="p-4 text-xs font-black text-[#263544] uppercase tracking-wider text-center">الموقع</th>
                    <th className="p-4 text-xs font-black text-[#263544] uppercase tracking-wider text-center">المرجع</th>
                    <th className="p-4 text-xs font-black text-[#263544] uppercase tracking-wider text-center">التاريخ</th>
                    <th className="p-4 text-xs font-black text-[#263544] uppercase tracking-wider text-center">ملاحظة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40">
                  {movements.map((entry) => {
                    const meta = MOVEMENT_TYPE_META[entry.type] || MOVEMENT_TYPE_META.IN;
                    return (
                    <tr key={entry.id} className="hover:bg-white/80 transition-colors">
                      <td className="p-4 text-sm font-black text-[#263544] text-center whitespace-nowrap">{entry.product?.name || entry.sku}</td>
                      <td className="p-4 text-xs text-slate-500 text-center font-mono font-bold">{entry.sku}</td>
                      <td className="p-4 text-center">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border shadow-sm ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className={`p-4 text-sm text-center font-black ${meta.numberClass}`}>{formatSignedQuantity(entry.quantity)}</td>
                      <td className="p-4 text-xs text-center font-black text-[#263544]/80">{entry.location}</td>
                      <td className="p-4 text-xs text-center font-black text-[#263544]/80">{referenceLabel(entry.referenceType)}</td>
                      <td className="p-4 text-xs text-center font-mono font-bold text-slate-500">{new Date(entry.createdAt).toLocaleString("ar-EG")}</td>
                      <td className="p-4 text-xs text-center font-bold text-slate-600 max-w-50 truncate" title={entry.reason}>{entry.reason}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="p-5 border-t border-white/80 bg-white/30 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs font-black text-[#263544]/70">
                صفحة {page} من {totalPages} • إجمالي {total} حركة
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white/80 text-[#263544] font-black text-xs border border-white shadow-sm hover:bg-white hover:border-[#C89355]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  <ChevronRight size={14} />
                  السابقة
                </button>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#1a2530] text-[#C89355] font-black text-xs border border-[#C89355]/40 shadow-sm hover:bg-[#263544] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  التالية
                  <ChevronLeft size={14} />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </InventoryPageShell>
  );
}
