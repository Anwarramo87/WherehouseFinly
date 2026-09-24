"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Search, Edit, ArrowRightLeft, Package2, AlertTriangle, Boxes, Upload, Download, Loader2 } from "lucide-react";
import {
  useInventory,
  useCategories,
  useInventoryStats,
  useWarehouses,
  type ProductSortField,
  type SortDirection,
} from "@/hooks/useInventory";
import SortableHeader from "@/components/inventory/SortableHeader";
import TablePagination from "@/components/inventory/TablePagination";
import StockCell, { StockBadge, stockStateOf, type StockState } from "@/components/inventory/StockCell";
import { InventoryItem, InventoryItemInput, AdjustStockInput } from "@/types/inventory";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import InventoryPageShell from "@/components/inventory/InventoryPageShell";
import { SkeletonTable } from "@/components/inventory/movement-meta";

const AddEditItemModal = dynamic(() => import("@/components/AddEditItemModal"), {
  loading: () => null,
});
const AdjustStockModal = dynamic(() => import("@/components/AdjustStockModal"), {
  loading: () => null,
});
const ProductPreviewModal = dynamic(() => import("@/components/inventory/ProductPreviewModal"), {
  loading: () => null,
});

const parseCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  out.push(current.trim());
  return out;
};

const escapeCsvCell = (value: string | number) => {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export default function InventoryPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState<ProductSortField | undefined>(undefined);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [stockFilter, setStockFilter] = useState<StockState | "all">("all");
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isBulkPending, setIsBulkPending] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const { data, isLoading, isFetching, createItem, updateItem, adjustStock, refetch } = useInventory({
    page,
    limit,
    search: search.trim() || undefined,
    category: category === "all" ? undefined : category,
    sortBy,
    sortDir,
  });

  /**
   * Clicking a header sorts ascending; clicking the same one again flips it.
   * Sorting resets to page 1 -- staying on page 7 of a newly-ordered list shows
   * rows the user never asked to see.
   */
  const handleSort = (field: ProductSortField) => {
    setPage(1);
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortDir("asc");
  };

  const categoriesQuery = useCategories();
  const statsQuery = useInventoryStats();
  const warehousesQuery = useWarehouses();

  const warehouses = useMemo(() => warehousesQuery.data || [], [warehousesQuery.data]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput);
      // A new search makes the current page number meaningless: page 5 of the
      // old result set is not page 5 of the new one.
      setPage(1);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  const allItems: InventoryItem[] = useMemo(() => data?.items || [], [data?.items]);
  const pagination = data?.pagination;

  /**
   * Stock state is derived from live stock levels rather than stored on the
   * product, so it cannot be filtered in SQL without a much larger query. This
   * narrows the page you are looking at; the counts beside each button say how
   * many are on this page, not in the whole catalogue.
   */
  const stockCounts = useMemo(() => {
    const c = { all: allItems.length, ok: 0, low: 0, out: 0 };
    allItems.forEach((i) => { c[stockStateOf(i)] += 1; });
    return c;
  }, [allItems]);

  const items = useMemo(
    () => (stockFilter === "all" ? allItems : allItems.filter((i) => stockStateOf(i) === stockFilter)),
    [allItems, stockFilter],
  );

  const categories = useMemo(() => {
    const serverCategories = categoriesQuery.data || [];
    return ["all", ...serverCategories];
  }, [categoriesQuery.data]);

  const stats = statsQuery.data;

  const totalProducts = stats?.totalProducts ?? items.length;
  const totalAvailable =
    stats?.totalAvailable ?? items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const lowStockCount =
    stats?.lowStockCount ?? items.filter((item) => item.quantity <= item.minStockLevel).length;
  const totalReserved =
    stats?.totalReserved ?? items.reduce((sum, item) => sum + Number(item.reserved || 0), 0);

  const statusBadge = (item: InventoryItem) => {
    if (item.quantity <= item.minStockLevel) {
      return <span className="px-4 py-1.5 rounded-xl text-[11px] font-black bg-rose-50/80 backdrop-blur-md text-rose-600 border border-rose-100 shadow-sm flex items-center gap-1.5 w-fit mx-auto"><AlertTriangle size={14}/> كمية منخفضة</span>;
    }

    return <span className="px-4 py-1.5 rounded-xl text-[11px] font-black bg-[#1a2530] text-[#C89355] border border-[#C89355]/30 shadow-sm flex items-center gap-1.5 w-fit mx-auto"><Package2 size={14}/> مخزون جيد</span>;
  };

  const pending = isBulkPending || createItem.isPending || updateItem.isPending || adjustStock.isPending;

  const extractMessage = (error: unknown, fallback: string) => {
    const err = error as { response?: { data?: { message?: string; error?: { message?: string } } } };
    return err?.response?.data?.error?.message || err?.response?.data?.message || fallback;
  };

  const handleExportCsv = () => {
    if (items.length === 0) {
      toast("لا توجد بيانات لتصديرها", { icon: "ℹ️" });
      return;
    }

    const headers = ["sku", "name", "category", "unit", "quantity", "reorderLevel"];
    const rows = items.map((item) => [
      item.sku,
      item.name,
      item.category,
      item.unit,
      Number(item.quantity || 0),
      Number(item.minStockLevel || 0),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = URL.createObjectURL(blob);
    link.download = `inventory-export-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success("تم تصدير البيانات بنجاح");
  };

  const handleDownloadCsvTemplate = () => {
    const headers = ["sku", "name", "category", "unitPrice", "costPrice", "reorderLevel"];
    const examples = [
      ["RAW-MAT-001", "خامة بلاستيك", "خامات", 25, 18, 50],
      ["PKG-BOX-010", "صندوق تعبئة كبير", "تغليف", 4.5, 2.75, 120],
    ];

    const csv = [headers.join(","), ...examples.map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "inventory-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success("تم تنزيل قالب CSV");
  };

  const handleImportCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsBulkPending(true);
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        throw new Error("ملف CSV لا يحتوي على بيانات كافية");
      }

      const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/^\uFEFF/, "").trim());
      const requiredHeaders = ["sku", "name", "category", "unitprice", "costprice", "reorderlevel"];
      const missing = requiredHeaders.filter((key) => !headers.includes(key));

      if (missing.length > 0) {
        throw new Error(`أعمدة مفقودة: ${missing.join(", ")}`);
      }

      const idx = (key: string) => headers.indexOf(key);
      const existingBySku = new Map(items.map((item) => [item.sku.toLowerCase(), item]));
      let created = 0;
      let updated = 0;
      let failed = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const sku = (cols[idx("sku")] || "").trim();
        const name = (cols[idx("name")] || "").trim();
        const categoryValue = (cols[idx("category")] || "").trim();
        const unitPrice = Number(cols[idx("unitprice")] || 0);
        const costPrice = Number(cols[idx("costprice")] || 0);
        const reorderLevel = Number(cols[idx("reorderlevel")] || 0);

        if (!sku || !name || !categoryValue) {
          failed++;
          continue;
        }

        try {
          const payload = {
            sku,
            name,
            category: categoryValue,
            unitPrice,
            costPrice,
            reorderLevel,
          };

          const existing = existingBySku.get(sku.toLowerCase());
          if (existing) {
            await apiClient.put(`/inventory/products/${existing.id}`, payload);
            updated++;
          } else {
            await apiClient.post("/inventory/products", payload);
            created++;
          }
        } catch {
          failed++;
        }
      }

      await Promise.all([
        refetch(),
        statsQuery.refetch(),
        categoriesQuery.refetch(),
      ]);

      if (failed > 0) {
        toast(`تم الاستيراد مع بعض الأخطاء: مضاف ${created} | محدث ${updated} | فشل ${failed}`, { icon: "⚠️" });
      } else {
        toast.success(`تم الاستيراد بنجاح: مضاف ${created} | محدث ${updated}`);
      }
    } catch (error) {
      toast.error(extractMessage(error, "فشل استيراد ملف CSV"));
    } finally {
      setIsBulkPending(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  const handleSaveItem = (payload: InventoryItemInput) => {
    const { profitPercent, ...rest } = payload;
    const body: InventoryItemInput = { ...rest };
    const profitValue = Number(profitPercent);
    if (profitPercent !== undefined && profitPercent !== null && profitPercent !== "" && Number.isFinite(profitValue)) {
      body.profitPercent = profitValue;
    }

    if (selectedItem) {
      updateItem.mutate(
        {
          id: selectedItem.id,
          data: body,
        },
        {
          onSuccess: () => {
            setIsItemModalOpen(false);
            setSelectedItem(null);
          },
        },
      );
      return;
    }

    createItem.mutate(body, {
      onSuccess: () => {
        setIsItemModalOpen(false);
      },
    });
  };

  const handleAdjustStock = (input: AdjustStockInput) => {
    adjustStock.mutate(input, {
      onSuccess: () => {
        setIsStockModalOpen(false);
        setSelectedItem(null);
      },
    });
  };

  return (
    <>
      <InventoryPageShell
        title="مركز إدارة المخزون"
        subtitle="إدارة الأصناف وحالة المخزون وتنبيهات النقص عبر لوحة تشغيل احترافية."
        actions={
          <>
            <button
              onClick={() => {
                setSelectedItem(null);
                setIsItemModalOpen(true);
              }}
              disabled={pending}
              className="relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#C89355] hover:bg-[#d9a56b] text-[#1a2530] font-black text-sm shadow-[0_10px_20px_rgba(200,147,85,0.45)] disabled:opacity-60 transition-all active:scale-95 group/btn"
            >
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#1a2530]/20 pointer-events-none transition-colors group-hover/btn:border-[#1a2530]/40" />
              <Plus size={16} className="group-hover/btn:-translate-y-1 transition-transform relative z-10" />
              <span className="relative z-10">إضافة صنف</span>
            </button>

            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleImportCsv}
              className="hidden"
            />

          <button
            onClick={() => importInputRef.current?.click()}
            disabled={pending}
            className="relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-white bg-white/80 backdrop-blur-md text-[#263544] font-black text-sm hover:bg-white hover:border-[#C89355]/30 disabled:opacity-60 transition-all shadow-sm active:scale-95 group/btn"
          >
            <div className="absolute inset-1 rounded-xl border border-dashed border-[#263544]/10 pointer-events-none transition-colors group-hover/btn:border-[#C89355]/30" />
            <Upload size={16} className="text-[#C89355] group-hover/btn:-translate-y-1 transition-transform relative z-10" />
            <span className="relative z-10">استيراد CSV</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={isLoading || items.length === 0}
            className="relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#1a2530] hover:bg-[#263544] text-[#C89355] font-black text-sm shadow-[0_10px_20px_rgba(38,53,68,0.4)] disabled:opacity-60 transition-all active:scale-95 border border-[#C89355]/40 group/btn"
          >
            <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/btn:border-[#C89355]/50" />
            <Download size={16} className="group-hover/btn:-translate-y-1 transition-transform relative z-10" />
            <span className="relative z-10">تصدير CSV</span>
          </button>

          <button
            onClick={handleDownloadCsvTemplate}
            disabled={pending}
            className="relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-white/80 bg-[#C89355]/10 text-[#263544] font-black text-sm hover:bg-[#C89355]/20 disabled:opacity-60 transition-all shadow-sm active:scale-95 group/btn"
          >
            <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/btn:border-[#C89355]/50" />
            <Download size={16} className="text-[#C89355] group-hover/btn:-translate-y-1 transition-transform relative z-10" />
            <span className="relative z-10">تحميل قالب CSV</span>
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="relative bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-5 sm:p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] hover:-translate-y-1 transition-all group">
          <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
          <div className="flex items-center gap-3 mb-3 sm:mb-4 relative z-10">
            <div className="p-2.5 sm:p-3 bg-[#1a2530] rounded-xl border border-[#C89355]/30 shadow-sm shrink-0">
              <Boxes className="text-[#C89355] group-hover:animate-pulse transition-all duration-300" size={20}/>
            </div>
            <p className="font-black text-[#263544] text-xs sm:text-sm leading-tight">إجمالي الأصناف</p>
          </div>
          <div className="min-w-0">
            <p className="text-2xl sm:text-3xl md:text-4xl font-black text-[#263544] relative z-10 break-all leading-tight tabular-nums">{totalProducts.toLocaleString()}</p>
            <p className="relative z-10 mt-1 text-[11px] font-bold text-[#263544]/45">صنف مُعرَّف في الكتالوج</p>
          </div>
        </div>

        <div className="relative bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-5 sm:p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] hover:-translate-y-1 transition-all group">
          <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
          <div className="flex items-center gap-3 mb-3 sm:mb-4 relative z-10">
            <div className="p-2.5 sm:p-3 bg-white/80 backdrop-blur-md rounded-xl border border-white shadow-sm shrink-0">
              <Package2 className="text-[#263544] group-hover:animate-pulse transition-all duration-300" size={20}/>
            </div>
            <p className="font-black text-[#263544] text-xs sm:text-sm leading-tight">إجمالي الكمية المتاحة</p>
          </div>
          <div className="min-w-0">
            <p className="text-2xl sm:text-3xl md:text-4xl font-black text-[#263544] relative z-10 break-all leading-tight tabular-nums">{totalAvailable.toLocaleString()}</p>
            <p className="relative z-10 mt-1 text-[11px] font-bold text-[#263544]/45">قابل للبيع أو الصرف الآن</p>
          </div>
        </div>

        <div className="relative bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-5 sm:p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] hover:-translate-y-1 transition-all group">
          <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
          <div className="flex items-center gap-3 mb-3 sm:mb-4 relative z-10">
            <div className="p-2.5 sm:p-3 bg-[#C89355]/10 rounded-xl border border-[#C89355]/25 shadow-sm shrink-0">
              <ArrowRightLeft className="text-[#8a5f26] group-hover:animate-pulse transition-all duration-300" size={20}/>
            </div>
            <p className="font-black text-[#263544] text-xs sm:text-sm leading-tight">الكمية المحجوزة</p>
          </div>
          <div className="min-w-0">
            <p className="text-2xl sm:text-3xl md:text-4xl font-black text-[#8a5f26] relative z-10 break-all leading-tight tabular-nums">{totalReserved.toLocaleString()}</p>
            <p className="relative z-10 mt-1 text-[11px] font-bold text-[#263544]/45">مرتبطة بطلبات مؤكدة</p>
          </div>
        </div>

        <div className="relative bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-5 sm:p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(225,29,72,0.12)] hover:-translate-y-1 transition-all group">
          <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-rose-300" />
          <div className="flex items-center gap-3 mb-3 sm:mb-4 relative z-10">
            <div className="p-2.5 sm:p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 shadow-sm shrink-0">
              <AlertTriangle className="text-rose-600 group-hover:animate-pulse transition-all duration-300" size={20}/>
            </div>
            <p className="font-black text-rose-600 text-xs sm:text-sm leading-tight">تنبيهات المخزون المنخفض</p>
          </div>
          <div className="min-w-0">
            <p className="text-2xl sm:text-3xl md:text-4xl font-black text-rose-600 relative z-10 break-all leading-tight tabular-nums">{lowStockCount.toLocaleString()}</p>
            <p className="relative z-10 mt-1 text-[11px] font-bold text-[#263544]/45">بلغت حد إعادة الطلب أو أقل</p>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden bg-white/60 backdrop-blur-2xl border-2 border-white/90 rounded-[2.5rem] p-5 shadow-[0_15px_40px_rgba(38,53,68,0.06)] mb-8 group/search">
        <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/search:border-[#C89355]/50 z-0" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
          <div className="relative group focus-within:ring-2 focus-within:ring-[#C89355]/50 focus-within:border-[#C89355] rounded-2xl transition-all">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C89355] group-hover:animate-pulse transition-all duration-300 z-10" size={18} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ابحث باسم الصنف أو SKU..."
              className="w-full pr-12 pl-4 py-3.5 bg-white/80 backdrop-blur-sm border-none rounded-2xl text-sm font-black text-[#263544] outline-none shadow-inner"
            />
          </div>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="w-full py-3.5 px-4 bg-white/80 backdrop-blur-sm border-none rounded-2xl text-sm font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/50 transition-all shadow-inner cursor-pointer appearance-none"
          >
            <option value="all">كل الفئات</option>
            {categories.filter((c) => c !== "all").map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2 border-t border-white/70 pt-4">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#263544]/50">حالة المخزون</span>
          {([
            ["all", "الكل", stockCounts.all],
            ["ok", "متوفر", stockCounts.ok],
            ["low", "أوشك على النفاد", stockCounts.low],
            ["out", "نفد", stockCounts.out],
          ] as const).map(([key, label, count]) => {
            const active = stockFilter === key;
            const tone =
              key === "low" ? "text-amber-800" : key === "out" ? "text-rose-700" : key === "ok" ? "text-emerald-800" : "text-[#263544]";
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStockFilter(key)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C89355]/60
                  ${active ? "bg-[#1a2530] text-[#C89355] shadow-md" : `bg-white/70 ${tone} hover:bg-white`}`}
              >
                {label}
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${active ? "bg-white/15" : "bg-[#263544]/8"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group/table">
        <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover/table:border-[#C89355]/50" />
        {isLoading ? (
          <div className="relative z-10"><SkeletonTable /></div>
        ) : (
        <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
          <table className="w-full text-right border-collapse min-w-245">
            <thead className="bg-white/40 border-b border-white/80">
              <tr>
                <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الصورة</th>
                <SortableHeader label="اسم الصنف" field="name" activeField={sortBy} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="SKU / الباركود" field="sku" activeField={sortBy} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="الفئة" field="category" activeField={sortBy} direction={sortDir} onSort={handleSort} />
                <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الرصيد المتاح</th>
                <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">حالة المخزون</th>
                <SortableHeader label="سعر البيع" field="unitPrice" activeField={sortBy} direction={sortDir} onSort={handleSort} />
                <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الربح %</th>
                <SortableHeader label="الحالة" field="status" activeField={sortBy} direction={sortDir} onSort={handleSort} />
                <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C89355]/30 bg-[#1a2530]">
                        <Package2 size={26} className="text-[#C89355]" />
                      </div>
                      <p className="text-lg font-black text-[#263544]">
                        {stockFilter !== "all" && allItems.length > 0
                          ? "لا يوجد صنف بهذه الحالة في هذه الصفحة"
                          : "لا توجد أصناف مطابقة"}
                      </p>
                      <p className="max-w-sm text-xs font-bold text-[#263544]/50">
                        {stockFilter !== "all" && allItems.length > 0
                          ? "جرّب زر «الكل» أو انتقل إلى صفحة أخرى."
                          : "عدّل كلمة البحث أو الفئة، أو أضف صنفًا جديدًا للبدء."}
                      </p>
                      {stockFilter !== "all" && allItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setStockFilter("all")}
                          className="rounded-xl bg-[#1a2530] px-4 py-2 text-xs font-black text-[#C89355] transition-all hover:scale-105"
                        >
                          عرض كل الأصناف
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                <tr
                  key={item.id}
                  className={`group/row transition-all duration-300 ${
                    stockStateOf(item) === "out"
                      ? "bg-rose-50/50 hover:bg-rose-50/80"
                      : stockStateOf(item) === "low"
                        ? "bg-amber-50/40 hover:bg-amber-50/70"
                        : "hover:bg-white/80"
                  }`}
                >
                  {/* Severity stripe on the leading (right, in RTL) edge of the row. */}
                  <td
                    className={`p-4 shadow-[inset_-4px_0_0_0_var(--row-stripe)] ${
                      stockStateOf(item) === "out"
                        ? "[--row-stripe:var(--color-rose-500)]"
                        : stockStateOf(item) === "low"
                          ? "[--row-stripe:var(--color-amber-500)]"
                          : "[--row-stripe:transparent]"
                    }`}
                  >
                    <div className="flex justify-center">
                      {item.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.photo}
                          alt={item.name}
                          onClick={() => setPreviewItem(item)}
                          className="w-14 h-14 rounded-xl object-cover cursor-pointer border-2 border-white shadow-md hover:scale-110 hover:shadow-lg transition-all"
                        />
                      ) : (
                        <button
                          onClick={() => setPreviewItem(item)}
                          className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-inner border cursor-pointer transition-all hover:scale-110 ${item.quantity <= item.minStockLevel ? 'bg-rose-100 border-rose-200' : 'bg-[#1a2530] border-[#C89355]/40'}`}
                          title="عرض تفاصيل الصنف"
                        >
                          <Package2 size={20} className={item.quantity <= item.minStockLevel ? 'text-rose-600' : 'text-[#C89355]'} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="font-black text-slate-800 text-sm whitespace-nowrap group-hover/row:text-[#C89355] transition-colors hover:text-[#C89355] cursor-pointer"
                      title="عرض تفاصيل الصنف"
                    >
                      {item.name}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-block rounded-md bg-[#263544]/5 px-2 py-1 font-mono text-[11px] font-bold tracking-wider text-slate-500">
                      {item.sku}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-black text-[#263544]/80 text-center">{item.category}</td>
                  <td className="p-4"><StockCell item={item} /></td>
                  <td className="p-4 text-center"><StockBadge item={item} /></td>
                  <td className="p-4 text-center text-sm font-black text-[#263544] tabular-nums whitespace-nowrap">
                    {item.unitPrice === undefined || item.unitPrice === null
                      ? <span className="text-[#263544]/30">—</span>
                      : Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-center">
                    {(() => {
                      const price = Number(item.unitPrice || 0);
                      const cost = Number(item.costPrice || 0);
                      const profit =
                        typeof item.profitPercent === "number" && item.profitPercent !== 0
                          ? item.profitPercent
                          : cost > 0
                            ? ((price - cost) / cost) * 100
                            : null;
                      if (profit === null) {
                        return <span className="text-[#263544]/30 font-black text-xs">—</span>;
                      }
                      const positive = profit >= 0;
                      return (
                        <span className={`inline-block rounded-xl px-3 py-1 text-xs font-black tabular-nums ${positive ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"}`}>
                          {positive ? "+" : ""}{profit.toFixed(1)}%
                        </span>
                      );
                    })()}
                  </td>
                  <td className="p-4 text-center">
                    {statusBadge(item)}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2 opacity-60 group-hover/row:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setIsItemModalOpen(true);
                        }}
                        className="p-2.5 text-[#C89355] hover:bg-[#1a2530] hover:text-[#C89355] rounded-xl transition-all hover:scale-110 shadow-sm border border-transparent hover:border-[#C89355]/30"
                        title="تعديل الصنف"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setIsStockModalOpen(true);
                        }}
                        className="p-2.5 text-[#263544] hover:bg-white hover:text-[#C89355] rounded-xl transition-all hover:scale-110 shadow-sm border border-transparent hover:border-[#C89355]/30"
                        title="حركة مخزون"
                      >
                        <ArrowRightLeft size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))) }
            </tbody>
          </table>
        </div>
        )}

        {!isLoading && stockFilter !== "all" && (
          <div className="relative z-10 flex items-center justify-center gap-2 border-t border-white/70 bg-amber-50/50 px-5 py-2.5 text-[11px] font-black text-amber-800">
            <AlertTriangle size={13} />
            تصفية حالة المخزون تُطبَّق على الصفحة الحالية فقط ({items.length} من {allItems.length} صنفًا معروضًا).
          </div>
        )}

        {!isLoading && (
          <TablePagination
            page={pagination?.page ?? page}
            limit={pagination?.limit ?? limit}
            total={pagination?.total ?? items.length}
            totalPages={pagination?.totalPages ?? 1}
            isFetching={isFetching}
            onPageChange={setPage}
            onLimitChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        )}
      </div>

      <button
        onClick={() => {
          setSelectedItem(null);
          setIsItemModalOpen(true);
        }}
        className="fixed bottom-8 left-8 z-40 rounded-full w-16 h-16 bg-[#1a2530] text-[#C89355] shadow-[0_10px_30px_rgba(38,53,68,0.5)] hover:bg-[#263544] hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-2 border-[#C89355]/40 group"
        title="إضافة صنف جديد"
      >
        <div className="absolute inset-1.5 rounded-full border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
        <Plus size={28} className="group-hover:animate-spin transition-all duration-300 relative z-10" />
      </button>

      {isItemModalOpen ? (
        <AddEditItemModal
          key={`${isItemModalOpen}-${selectedItem?.id ?? "new"}`}
          isOpen={isItemModalOpen}
          onClose={() => {
            setIsItemModalOpen(false);
            setSelectedItem(null);
          }}
          isPending={createItem.isPending || updateItem.isPending}
          initialData={
            selectedItem
              ? {
                  id: selectedItem.id,
                  sku: selectedItem.sku,
                  name: selectedItem.name,
                  category: selectedItem.category,
                  reorderLevel: selectedItem.minStockLevel,
                  unit: selectedItem.unit,
                  unitPrice: selectedItem.unitPrice ?? 0,
                  costPrice: selectedItem.costPrice ?? 0,
                  profitPercent: selectedItem.profitPercent ?? "",
                  photo: selectedItem.photo ?? null,
                }
              : null
          }
          onSave={handleSaveItem}
        />
      ) : null}

      {isStockModalOpen ? (
        <AdjustStockModal
          key={`${isStockModalOpen}-${selectedItem?.id ?? "new"}`}
          isOpen={isStockModalOpen}
          onClose={() => {
            setIsStockModalOpen(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          isPending={adjustStock.isPending}
          onSave={handleAdjustStock}
          locations={["MAIN", ...warehouses.map((w) => w.name)]}
        />
      ) : null}

      {previewItem ? (
        <ProductPreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onEdit={() => {
            setSelectedItem(previewItem);
            setPreviewItem(null);
            setIsItemModalOpen(true);
          }}
          onAdjust={() => {
            setSelectedItem(previewItem);
            setPreviewItem(null);
            setIsStockModalOpen(true);
          }}
        />
      ) : null}

      {pending && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border-2 border-white/90 bg-white/80 backdrop-blur-xl px-6 py-4 shadow-[0_15px_40px_rgba(38,53,68,0.15)] flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
          <Loader2 className="animate-spin text-[#C89355] relative z-10" size={20} />
          <p className="text-sm font-black text-[#263544] relative z-10">
            جارٍ تنفيذ العملية في المخزون...
          </p>
        </div>
      )}
      </InventoryPageShell>
    </>
  );
}
