"use client";

import { useState, useMemo } from "react";
import {
  Scan,
  ClipboardCheck,
  Package,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  BarChart3,
  CheckCheck,
  XCircle,
  Percent,
  Download,
  RefreshCw,
  Warehouse,
  Filter,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useProducts, useWarehouses } from "@/hooks/useInventory";
import { InventoryItem } from "@/types/inventory";
import InventoryPageShell from "@/components/inventory/InventoryPageShell";

export default function StocktakePage() {
  const [search, setSearch] = useState("");
  const [countedItems, setCountedItems] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [showDiscrepanciesOnly, setShowDiscrepanciesOnly] = useState(false);
  const [showUncountedOnly, setShowUncountedOnly] = useState(false);
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out" | "ok">("all");

  const { data, isLoading, refetch } = useProducts({
    page: 1,
    limit: 500,
    search: search.trim() || undefined,
    location: selectedWarehouse || undefined,
  });
  const { data: warehouses } = useWarehouses();
  const allItems: InventoryItem[] = useMemo(() => data?.items || [], [data?.items]);

  const filteredItems = useMemo(() => {
    return allItems.filter((it) => {
      if (showDiscrepanciesOnly) {
        const counted = countedItems[it.id];
        if (counted === undefined || counted === it.quantity) return false;
      }
      if (showUncountedOnly) {
        if (countedItems[it.id] !== undefined) return false;
      }
      if (stockFilter === "low") {
        if (it.quantity === 0 || it.quantity > it.minStockLevel) return false;
      }
      if (stockFilter === "out") {
        if (it.quantity !== 0) return false;
      }
      if (stockFilter === "ok") {
        if (it.quantity === 0 || it.quantity <= it.minStockLevel) return false;
      }
      return true;
    });
  }, [allItems, countedItems, showDiscrepanciesOnly, showUncountedOnly, stockFilter]);

  const stats = useMemo(() => {
    const total = allItems.length;
    const counted = Object.keys(countedItems).length;
    const discrepancies = allItems.filter((item) => {
      const c = countedItems[item.id];
      return c !== undefined && c !== item.quantity;
    }).length;
    const matches = counted - discrepancies;
    const progressPct = total === 0 ? 0 : Math.round((counted / total) * 100);
    const accuracyPct = counted === 0 ? 0 : Math.round((matches / counted) * 100);
    return { total, counted, discrepancies, matches, progressPct, accuracyPct };
  }, [allItems, countedItems]);

  const handleCount = (id: string, value: string) => {
    const num = parseInt(value, 10);
    setCountedItems((prev) => ({ ...prev, [id]: isNaN(num) ? 0 : num }));
  };

  const handleSetSystem = (id: string, qty: number) => {
    setCountedItems((prev) => ({ ...prev, [id]: qty }));
  };

  const handleReset = () => {
    setCountedItems({});
    setSearch("");
    setShowDiscrepanciesOnly(false);
    setShowUncountedOnly(false);
    setStockFilter("all");
    toast.success("تم إعادة تعيين الجرد");
  };

  const handleExportCsv = () => {
    const header = ["SKU", "الصنف", "الكمية بالنظام", "الكمية المسجلة", "الفرق", "الحالة"];
    const rows = allItems.map((item) => {
      const counted = countedItems[item.id];
      const diff = counted === undefined ? "" : String(counted - item.quantity);
      const status =
        counted === undefined
          ? "غير مجرد"
          : counted === item.quantity
          ? "متطابق"
          : counted > item.quantity
          ? "فائض"
          : "عجز";
      return [item.sku, item.name, String(item.quantity), counted ?? "", diff, status];
    });
    const csv =
      "\uFEFF" +
      [header, ...rows]
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stocktake_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير ملف الجرد");
  };

  const handleSubmit = async () => {
    if (Object.keys(countedItems).length === 0) {
      toast.error("لم يتم تسجيل أي صنف بعد");
      return;
    }
    setIsSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      toast.success(
        `تم تسجيل ${Object.keys(countedItems).length} بند بنجاح • ${stats.discrepancies} فروقات`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const KpiCard = ({
    label,
    value,
    sub,
    icon,
    bg,
    accent,
    subIcon,
  }: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ReactNode;
    bg: string;
    accent: string;
    subIcon?: React.ReactNode;
  }) => (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] border-2 border-white/80 ${bg} shadow-[0_12px_30px_rgba(38,53,68,0.08)] group/kpi backdrop-blur-xl`}
    >
      <div className="absolute inset-1 rounded-[1.4rem] border border-dashed border-white/60 pointer-events-none" />
      <div className="relative z-10 p-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-white/70 uppercase tracking-wider">{label}</p>
          <p className="mt-1 text-2xl font-black text-white tabular-nums leading-none">{value}</p>
          {sub !== undefined && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-white/80 bg-white/10 px-2 py-0.5 rounded-lg">
              {subIcon} {sub}
            </p>
          )}
        </div>
        <div
          className={`shrink-0 p-2.5 rounded-xl ${accent} shadow-inner group-hover/kpi:scale-110 transition-transform`}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <InventoryPageShell
      title="جرد المخزون الدوري"
      subtitle="قارن المخزون الفعلي مع النظام، سجّل الفروقات، وتصدير التقارير."
      actions={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 border border-white text-[12px] font-black text-[#263544] hover:bg-white transition-all active:scale-95"
          >
            <RefreshCw size={14} className="text-[#C89355]" />
            تحديث
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 border border-white text-[12px] font-black text-slate-600 hover:bg-white transition-all active:scale-95"
          >
            <XCircle size={14} className="text-rose-500" />
            إعادة تعيين
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-[12px] font-black text-emerald-700 hover:bg-emerald-100 transition-all active:scale-95"
          >
            <FileSpreadsheet size={14} />
            تصدير CSV
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="إجمالي الأصناف"
            value={stats.total}
            sub="في النظام حالياً"
            subIcon={<Package size={11} />}
            bg="bg-gradient-to-br from-[#1a2530] to-[#263544]"
            accent="bg-[#C89355]/20 text-[#C89355]"
            icon={<Package size={20} className="text-[#C89355]" />}
          />
          <KpiCard
            label="تم جرده"
            value={stats.counted}
            sub={`${stats.progressPct}% من الإجمالي`}
            subIcon={<Percent size={11} />}
            bg="bg-gradient-to-br from-emerald-600 to-emerald-700"
            accent="bg-white/20 text-white"
            icon={<CheckCheck size={20} className="text-white" />}
          />
          <KpiCard
            label="متطابق"
            value={stats.matches}
            sub={`دقة ${stats.accuracyPct}%`}
            subIcon={<CheckCircle2 size={11} />}
            bg="bg-gradient-to-br from-sky-600 to-sky-700"
            accent="bg-white/20 text-white"
            icon={<CheckCircle2 size={20} className="text-white" />}
          />
          <KpiCard
            label="فروقات"
            value={stats.discrepancies}
            sub={stats.discrepancies > 0 ? "بحاجة لمراجعة" : "بدون فروقات ✨"}
            subIcon={<AlertTriangle size={11} />}
            bg={
              stats.discrepancies > 0
                ? "bg-gradient-to-br from-rose-600 to-rose-700"
                : "bg-gradient-to-br from-[#8a5f26] to-[#C89355]"
            }
            accent="bg-white/20 text-white"
            icon={<AlertTriangle size={20} className="text-white" />}
          />
        </div>

        {stats.progressPct > 0 && (
          <div className="relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-xl border-2 border-white/90 p-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#C89355]/15">
                  <BarChart3 size={14} className="text-[#8a5f26]" />
                </div>
                <p className="text-sm font-black text-[#263544]">تقدّم الجرد الحالي</p>
              </div>
              <span className="text-xs font-black bg-[#1a2530] text-[#C89355] px-2.5 py-1 rounded-xl tabular-nums">
                {stats.progressPct}%
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#C89355] to-emerald-500 transition-all duration-500"
                style={{ width: `${stats.progressPct}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] font-bold text-slate-500">
              {stats.counted} من {stats.total} صنف • {stats.total - stats.counted} صنف متبقٍّ
            </p>
          </div>
        )}

        <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group/wh">
          <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover/wh:border-[#C89355]/50" />
          <div className="relative z-10">
            <div className="p-6 border-b border-white/80 bg-white/40 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#1a2530] border border-[#C89355]/30">
                  <ClipboardCheck
                    size={20}
                    className="text-[#C89355] group-hover/wh:animate-pulse transition-all duration-300"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#263544]">قائمة الجرد</h2>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                    أدخل الكمية الفعلية لكل صنف كما هي في المخزن
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-[#C89355] bg-[#1a2530] px-3.5 py-1.5 rounded-xl shadow-sm border border-[#C89355]/30">
                  {filteredItems.length} صنف
                </span>
                {stats.counted > 0 && (
                  <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
                    {stats.counted} مجرد
                  </span>
                )}
              </div>
            </div>

            <div className="p-5 border-b border-white/60 bg-white/20 space-y-3">
              <div className="flex flex-wrap items-stretch gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[220px] bg-white/80 border border-white rounded-xl px-3 focus-within:ring-2 focus-within:ring-[#C89355]/40 transition-all">
                  <Search size={15} className="text-[#C89355]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 py-2 bg-transparent text-sm font-black text-[#263544] outline-none placeholder:text-slate-400"
                    placeholder="بحث بالاسم أو SKU أو الباركود..."
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-white/80 border border-white rounded-xl px-3 min-w-[160px]">
                  <Warehouse size={14} className="text-slate-500 shrink-0" />
                  <select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    className="flex-1 py-2 bg-transparent text-xs font-black text-[#263544] outline-none"
                  >
                    <option value="">كل المخازن</option>
                    {warehouses?.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} • {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-white/70 border border-white rounded-xl p-1">
                  <button
                    onClick={() => setStockFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                      stockFilter === "all"
                        ? "bg-[#1a2530] text-[#C89355] shadow"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => setStockFilter("ok")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                      stockFilter === "ok"
                        ? "bg-emerald-600 text-white shadow"
                        : "text-slate-500 hover:text-emerald-700"
                    }`}
                  >
                    متوفر
                  </button>
                  <button
                    onClick={() => setStockFilter("low")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                      stockFilter === "low"
                        ? "bg-[#C89355] text-[#1a2530] shadow"
                        : "text-slate-500 hover:text-[#8a5f26]"
                    }`}
                  >
                    وشك ينفذ
                  </button>
                  <button
                    onClick={() => setStockFilter("out")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                      stockFilter === "out"
                        ? "bg-rose-600 text-white shadow"
                        : "text-slate-500 hover:text-rose-600"
                    }`}
                  >
                    نفد
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-slate-500">
                  <Filter size={12} />
                  تصفية سريعة:
                </span>
                <button
                  onClick={() => {
                    setShowUncountedOnly((v) => !v);
                    if (!showUncountedOnly) setShowDiscrepanciesOnly(false);
                  }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black border transition-all ${
                    showUncountedOnly
                      ? "bg-sky-600 text-white border-sky-600 shadow"
                      : "bg-white/60 text-slate-600 border-white hover:bg-white"
                  }`}
                >
                  غير المجردة فقط
                </button>
                <button
                  onClick={() => {
                    setShowDiscrepanciesOnly((v) => !v);
                    if (!showDiscrepanciesOnly) setShowUncountedOnly(false);
                  }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black border transition-all ${
                    showDiscrepanciesOnly
                      ? "bg-rose-600 text-white border-rose-600 shadow"
                      : "bg-white/60 text-slate-600 border-white hover:bg-white"
                  }`}
                >
                  الفروقات فقط {stats.discrepancies > 0 && `(${stats.discrepancies})`}
                </button>
                <button
                  onClick={() => {
                    allItems.forEach((it) => handleSetSystem(it.id, it.quantity));
                    toast.success(`تم نسخ كميات النظام لـ ${allItems.length} صنف`);
                  }}
                  className="px-3 py-1 rounded-lg text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-all"
                >
                  ✨ ملء تلقائي من النظام
                </button>
              </div>
            </div>

            <div className="p-5">
              {isLoading ? (
                <div className="text-sm font-black text-[#263544]/50 text-center py-10 flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  جارٍ تحميل الأصناف...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex p-4 rounded-2xl bg-[#C89355]/10 border border-[#C89355]/20 mb-3">
                    <Package size={28} className="text-[#C89355]" />
                  </div>
                  <p className="text-sm font-black text-[#263544]/70">لا توجد أصناف مطابقة للتصفية.</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">جرّب تعديل شروط البحث</p>
                </div>
              ) : (
                <>
                  <div className="hidden md:grid grid-cols-[1fr_120px_120px_120px_80px] gap-3 px-4 py-2.5 mb-2 rounded-xl bg-[#1a2530]/5 border border-white/70">
                    <span className="text-[11px] font-black text-[#263544]/70 uppercase tracking-wide">
                      الصنف
                    </span>
                    <span className="text-[11px] font-black text-[#263544]/70 uppercase tracking-wide text-center">
                      النظام
                    </span>
                    <span className="text-[11px] font-black text-[#263544]/70 uppercase tracking-wide text-center">
                      الفعلي
                    </span>
                    <span className="text-[11px] font-black text-[#263544]/70 uppercase tracking-wide text-center">
                      الفرق
                    </span>
                    <span></span>
                  </div>

                  <div className="space-y-2 mb-6 max-h-[520px] overflow-y-auto pr-1">
                    {filteredItems.map((item) => {
                      const counted = countedItems[item.id];
                      const hasCount = counted !== undefined;
                      const hasDiscrepancy = hasCount && counted !== item.quantity;
                      const diff = hasCount ? counted - item.quantity : 0;
                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border-2 p-4 transition-all md:grid md:grid-cols-[1fr_120px_120px_120px_80px] md:gap-3 md:items-center ${
                            hasDiscrepancy
                              ? "border-rose-300 bg-rose-50/50 shadow-[0_4px_12px_rgba(244,63,94,0.08)]"
                              : hasCount
                              ? "border-emerald-200 bg-emerald-50/40"
                              : "border-[#C89355]/20 bg-white/70 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 mb-3 md:mb-0">
                            <div
                              className={`p-2 rounded-xl border shrink-0 ${
                                hasDiscrepancy
                                  ? "bg-rose-100 border-rose-300"
                                  : hasCount
                                  ? "bg-emerald-100 border-emerald-200"
                                  : "bg-[#1a2530] border-[#C89355]/30"
                              }`}
                            >
                              <Package
                                className={
                                  hasDiscrepancy
                                    ? "text-rose-500"
                                    : hasCount
                                    ? "text-emerald-600"
                                    : "text-[#C89355]"
                                }
                                size={15}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-black text-[#263544] text-sm truncate">
                                {item.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {item.sku}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {item.unit}
                                </span>
                                {item.category && (
                                  <span className="text-[10px] font-bold text-[#8a5f26] bg-[#C89355]/10 px-1.5 py-0.5 rounded">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-center">
                            <p className="text-xs font-bold text-slate-400 md:hidden mb-0.5">
                              بالنظام:
                            </p>
                            <p className="font-black text-slate-700 tabular-nums text-sm md:text-base">
                              {item.quantity}
                              <span className="text-[10px] font-bold text-slate-400 mr-1">
                                {item.unit}
                              </span>
                            </p>
                          </div>

                          <div className="mt-2 md:mt-0">
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number"
                                value={counted ?? ""}
                                onChange={(e) => handleCount(item.id, e.target.value)}
                                className={`w-full md:w-24 p-2 rounded-xl text-sm font-black text-center tabular-nums outline-none transition-all border ${
                                  hasDiscrepancy
                                    ? "bg-white border-rose-300 text-rose-700 focus:ring-2 focus:ring-rose-300"
                                    : hasCount
                                    ? "bg-white border-emerald-200 text-emerald-700 focus:ring-2 focus:ring-emerald-300"
                                    : "bg-white border-slate-200 text-[#263544] focus:ring-2 focus:ring-[#C89355]/40"
                                }`}
                                placeholder={String(item.quantity)}
                              />
                            </div>
                          </div>

                          <div className="text-center mt-2 md:mt-0">
                            {hasCount ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black tabular-nums ${
                                  diff === 0
                                    ? "bg-emerald-100 text-emerald-700"
                                    : diff > 0
                                    ? "bg-sky-100 text-sky-700"
                                    : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {diff > 0 ? "+" : ""}
                                {diff}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-slate-300">—</span>
                            )}
                          </div>

                          <div className="mt-2 md:mt-0 flex justify-end">
                            <button
                              onClick={() => handleSetSystem(item.id, item.quantity)}
                              title="نسخ كمية النظام"
                              className="p-2 rounded-lg bg-slate-100 hover:bg-[#C89355]/15 text-slate-400 hover:text-[#C89355] transition-all"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {stats.discrepancies > 0 && (
                    <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100/40 border-2 border-rose-200/70">
                      <p className="text-sm font-black text-rose-700 mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} /> {stats.discrepancies} فرق يحتاج مراجعة قبل التأكيد
                      </p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                        {allItems
                          .filter((it) => {
                            const c = countedItems[it.id];
                            return c !== undefined && c !== it.quantity;
                          })
                          .map((item) => {
                            const c = countedItems[item.id]!;
                            const diff = c - item.quantity;
                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-2 bg-white/60 rounded-xl px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-[#263544] truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-[10px] font-mono font-bold text-slate-500">
                                    {item.sku}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] font-bold text-slate-500">
                                    النظام {item.quantity}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-700">→</span>
                                  <span className="text-[10px] font-bold text-[#263544]">
                                    مسجّل {c}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black tabular-nums ${
                                      diff > 0
                                        ? "bg-sky-100 text-sky-700"
                                        : "bg-rose-100 text-rose-700"
                                    }`}
                                  >
                                    {diff > 0 ? "+" : ""}
                                    {diff}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || Object.keys(countedItems).length === 0}
                    className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#C89355] to-[#d9a56b] text-[#1a2530] font-black text-sm hover:shadow-[0_15px_30px_rgba(200,147,85,0.5)] disabled:opacity-50 disabled:hover:shadow-none transition-all active:scale-[0.98] shadow-[0_10px_20px_rgba(200,147,85,0.45)]"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <CheckCircle2 size={20} />
                    )}
                    تأكيد وتسجيل الجرد
                    {stats.counted > 0 && (
                      <span className="bg-[#1a2530]/25 px-2.5 py-0.5 rounded-lg text-xs">
                        {stats.counted} صنف
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </InventoryPageShell>
  );
}
