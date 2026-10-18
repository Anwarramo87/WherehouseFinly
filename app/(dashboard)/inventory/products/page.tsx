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
import { InventoryItem, InventoryItemInput, AdjustStockInput, ProductInput } from "@/types/inventory";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import InventoryPageShell from "@/components/inventory/InventoryPageShell";
import { SkeletonTable } from "@/components/inventory/movement-meta";
import AddProductModal from "@/components/inventory/AddProductModal";

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

export default function FinishedProductsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState<ProductSortField | undefined>(undefined);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [stockFilter, setStockFilter] = useState<StockState | "all">("all");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
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
    productType: "FINISHED",
    sortBy,
    sortDir,
  });

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
      setPage(1);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  const allItems: InventoryItem[] = useMemo(() => data?.items || [], [data?.items]);
  const pagination = data?.pagination;

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
    return <span className="px-4 py-1.5 rounded-xl text-[11px] font-black bg-[#C89355]/15 text-[#8a5f26] border border-[#C89355]/30 shadow-sm flex items-center gap-1.5 w-fit mx-auto"><Package2 size={14}/> جاهز للبيع</span>;
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

    const headers = ["sku", "name", "category", "unit", "quantity", "costPrice", "unitPrice", "reorderLevel"];
    const rows = items.map((item) => [
      item.sku,
      item.name,
      item.category,
      item.unit,
      Number(item.quantity || 0),
      Number(item.costPrice || 0),
      Number(item.unitPrice || 0),
      Number(item.minStockLevel || 0),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = URL.createObjectURL(blob);
    link.download = `finished-products-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success("تم تصدير المنتجات النهائية بنجاح");
  };

  const handleDownloadCsvTemplate = () => {
    const headers = ["sku", "name", "size", "color", "costPrice", "unitPrice"];
    const examples = [
      ["FIN-CRM-001", "كريم ترطيب هيلوري 50 مل", "50 مل", "وردي", 22.5, 49.9],
      ["FIN-PRF-010", "عطر روز جولد 100 مل", "100 مل", "ذهبي", 85, 189],
    ];

    const csv = [headers.join(","), ...examples.map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "finished-products-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success("تم تنزيل قالب المنتجات النهائية");
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
      const requiredHeaders = ["sku", "name", "costprice", "unitprice"];
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
        const sizeValue = idx("size") >= 0 ? (cols[idx("size")] || "").trim() : "";
        const colorValue = idx("color") >= 0 ? (cols[idx("color")] || "").trim() : "";
        const costPrice = Number(cols[idx("costprice")] || 0);
        const unitPrice = Number(cols[idx("unitprice")] || 0);

        if (!sku || !name) {
          failed++;
          continue;
        }

        try {
          const payload = {
            sku,
            name,
            size: sizeValue,
            feature: colorValue,
            color: colorValue,
            costPrice,
            unitPrice,
            productType: "FINISHED",
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

  const handleSaveProduct = (
    payload: ProductInput & { photo?: string | null; reorderLevel?: number | string; unit?: string; category?: string }
  ) => {
    const body: InventoryItemInput = {
      name: payload.name,
      sku: payload.sku || "",
      productType: payload.productType || "FINISHED",
      size: payload.size || "",
      feature: payload.color || "",
      color: payload.color || "",
      costPrice: Number(payload.costPrice || 0),
      unitPrice: Number(payload.unitPrice || 0),
      photo: payload.photo ?? null,
      reorderLevel: String(payload.reorderLevel ?? 10),
      unit: payload.unit || "قطعة",
      category: payload.category || "منتجات نهائية",
    };

    if (selectedItem) {
      updateItem.mutate(
        { id: selectedItem.id, data: body },
        {
          onSuccess: () => {
            setIsProductModalOpen(false);
            setSelectedItem(null);
          },
        },
      );
      return;
    }

    createItem.mutate(body, {
      onSuccess: () => setIsProductModalOpen(false),
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
        title="المنتجات النهائية"
        subtitle="إدارة المنتجات الجاهزة للبيع والأسعار وحالة المخزون والتوزيع على مخازن المنتجات النهائية."
        actions={
          <>
            <button
              onClick={() => { setSelectedItem(null); setIsProductModalOpen(true); }}
              disabled={pending}
              className="relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#C89355] hover:bg-[#d9a56b] text-[#1a2530] font-black text-sm shadow-[0_10px_20px_rgba(200,147,85,0.45)] disabled:opacity-60 transition-all active:scale-95 group/btn"
            >
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#1a2530]/20 pointer-events-none transition-colors group-hover/btn:border-[#1a2530]/40" />
              <Plus size={16} className="group-hover/btn:-translate-y-1 transition-transform relative z-10" />
              <span className="relative z-10">إضافة منتج نهائي</span>
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
              <span className="relative z-10">تحميل قالب</span>
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="relative bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-5 sm:p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] hover:-translate-y-1 transition-all group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
            <div className="flex items-center gap-3 mb-3 sm:mb-4 relative z-10">
              <div className="p-2.5 sm:p-3 bg-[#C89355]/15 rounded-xl border border-[#C89355]/30 shadow-sm shrink-0">
                <Package2 className="text-[#8a5f26] group-hover:animate-pulse transition-all duration-300" size={20}/>
              </div>
              <p className="font-black text-[#263544] text-xs sm:text-sm leading-tight">إجمالي المنتجات النهائية</p>
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl md:text-4xl font-black text-[#263544] relative z-10 break-all leading-tight tabular-nums">{totalProducts.toLocaleString()}</p>
              <p className="relative z-10 mt-1 text-[11px] font-bold text-[#263544]/45">صنف في كتالوج البيع</p>
            </div>
          </div>

          <div className="relative bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-5 sm:p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] hover:-translate-y-1 transition-all group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
            <div className="flex items-center gap-3 mb-3 sm:mb-4 relative z-10">
              <div className="p-2.5 sm:p-3 bg-emerald-500/15 rounded-xl border border-emerald-500/25 shadow-sm shrink-0">
                <Boxes className="text-emerald-700 group-hover:animate-pulse transition-all duration-300" size={20}/>
              </div>
              <p className="font-black text-[#263544] text-xs sm:text-sm leading-tight">الوحدات الجاهزة للبيع</p>
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-700 relative z-10 break-all leading-tight tabular-nums">{totalAvailable.toLocaleString()}</p>
              <p className="relative z-10 mt-1 text-[11px] font-bold text-[#263544]/45">متاحة في مخازن التوزيع</p>
            </div>
          </div>

          <div className="relative bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-5 sm:p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] hover:-translate-y-1 transition-all group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
            <div className="flex items-center gap-3 mb-3 sm:mb-4 relative z-10">
              <div className="p-2.5 sm:p-3 bg-sky-500/10 rounded-xl border border-sky-500/25 shadow-sm shrink-0">
                <ArrowRightLeft className="text-sky-700 group-hover:animate-pulse transition-all duration-300" size={20}/>
              </div>
              <p className="font-black text-[#263544] text-xs sm:text-sm leading-tight">المحجوز للمبيعات</p>
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl md:text-4xl font-black text-sky-700 relative z-10 break-all leading-tight tabular-nums">{totalReserved.toLocaleString()}</p>
              <p className="relative z-10 mt-1 text-[11px] font-bold text-[#263544]/45">مرتبط بأوامر بيع مؤكدة</p>
            </div>
          </div>

          <div className="relative bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-5 sm:p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(225,29,72,0.12)] hover:-translate-y-1 transition-all group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-rose-300" />
            <div className="flex items-center gap-3 mb-3 sm:mb-4 relative z-10">
              <div className="p-2.5 sm:p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 shadow-sm shrink-0">
                <AlertTriangle className="text-rose-600 group-hover:animate-pulse transition-all duration-300" size={20}/>
              </div>
              <p className="font-black text-rose-600 text-xs sm:text-sm leading-tight">المنتجات قاربت النفاد</p>
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl md:text-4xl font-black text-rose-600 relative z-10 break-all leading-tight tabular-nums">{lowStockCount.toLocaleString()}</p>
              <p className="relative z-10 mt-1 text-[11px] font-bold text-[#263544]/45">يحتاج أمر إنتاج أو إعادة تعبئة</p>
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
                placeholder="ابحث باسم المنتج أو SKU..."
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
              <option value="all">كل التصنيفات / الخطوط</option>
              {categories.filter((c) => c !== "all").map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2 border-t border-white/70 pt-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#263544]/50">حالة المخزون</span>
            {([
              ["all", "الكل", stockCounts.all],
              ["ok", "متوفر للبيع", stockCounts.ok],
              ["low", "أوشك على النفاد", stockCounts.low],
              ["out", "نفد من المخزون", stockCounts.out],
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
                    ${active ? "bg-[#C89355] text-[#1a2530] shadow-md" : `bg-white/70 ${tone} hover:bg-white`}`}
                >
                  {label}
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${active ? "bg-[#1a2530]/15" : "bg-[#263544]/8"}`}>
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
            <table className="w-full text-right border-collapse min-w-[900px]">
              <thead className="bg-white/40 border-b border-white/80">
                <tr>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الصورة</th>
                  <SortableHeader label="اسم المنتج" field="name" activeField={sortBy} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label="SKU / اللون / الحجم" field="sku" activeField={sortBy} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label="التصنيف" field="category" activeField={sortBy} direction={sortDir} onSort={handleSort} />
                  <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الرصيد المتاح</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الحالة</th>
                  <SortableHeader label="تكلفة" field="costPrice" activeField={sortBy} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label="سعر البيع" field="unitPrice" activeField={sortBy} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label="الحالة" field="status" activeField={sortBy} direction={sortDir} onSort={handleSort} />
                  <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-16">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C89355]/30 bg-[#C89355]/15">
                          <Package2 size={26} className="text-[#8a5f26]" />
                        </div>
                        <p className="text-lg font-black text-[#263544]">
                          {stockFilter !== "all" && allItems.length > 0
                            ? "لا يوجد منتج بهذه الحالة في هذه الصفحة"
                            : "لا توجد منتجات نهائية مطابقة"}
                        </p>
                        <p className="max-w-sm text-xs font-bold text-[#263544]/50">
                          {stockFilter !== "all" && allItems.length > 0
                            ? "جرّب زر «الكل» أو انتقل إلى صفحة أخرى."
                            : "ابدأ بإضافة منتج نهائي جديد أعلاه أو استورد قائمة منتجاتك عبر ملف CSV."}
                        </p>
                        {stockFilter !== "all" && allItems.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setStockFilter("all")}
                            className="rounded-xl bg-[#1a2530] px-4 py-2 text-xs font-black text-[#C89355] transition-all hover:scale-105"
                          >
                            عرض كل المنتجات
                          </button>
                        ) : (
                          <button
                            onClick={() => { setSelectedItem(null); setIsProductModalOpen(true); }}
                            className="rounded-xl bg-[#C89355] px-4 py-2 text-xs font-black text-[#1a2530] transition-all hover:scale-105 shadow-md"
                          >
                            ✨ إضافة منتج نهائي
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
                            className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-inner border cursor-pointer transition-all hover:scale-110 ${item.quantity <= item.minStockLevel ? 'bg-rose-100 border-rose-200' : 'bg-[#C89355]/15 border-[#C89355]/30'}`}
                            title="عرض تفاصيل المنتج"
                          >
                            <Package2 size={20} className={item.quantity <= item.minStockLevel ? 'text-rose-600' : 'text-[#8a5f26]'} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="font-black text-slate-800 text-sm whitespace-nowrap group-hover/row:text-[#8a5f26] transition-colors hover:text-[#C89355] cursor-pointer"
                        title="عرض تفاصيل المنتج"
                      >
                        {item.name}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-block rounded-md bg-[#263544]/5 px-2 py-1 font-mono text-[11px] font-bold tracking-wider text-slate-500">
                          {item.sku}
                        </span>
                        {(item.feature || item.color || item.size) && (
                          <span className="inline-block rounded-md bg-[#C89355]/10 px-2 py-0.5 text-[10px] font-bold text-[#8a5f26]">
                            {[item.size, item.color || item.feature].filter(Boolean).join(" • ")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-xs font-black text-[#263544]/80 text-center">
                      <span className="inline-block px-3 py-1 rounded-lg bg-[#C89355]/10 border border-[#C89355]/30">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4"><StockCell item={item} /></td>
                    <td className="p-4 text-center"><StockBadge item={item} /></td>
                    <td className="p-4 text-center text-sm font-black text-slate-600 tabular-nums whitespace-nowrap">
                      {item.costPrice === undefined || item.costPrice === null
                        ? <span className="text-[#263544]/30">—</span>
                        : Number(item.costPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center text-sm font-black text-[#263544] tabular-nums whitespace-nowrap">
                      {item.unitPrice === undefined || item.unitPrice === null
                        ? <span className="text-[#263544]/30">—</span>
                        : Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      {statusBadge(item)}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2 opacity-60 group-hover/row:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsProductModalOpen(true);
                          }}
                          className="p-2.5 text-[#8a5f26] hover:bg-[#C89355]/15 hover:text-[#8a5f26] rounded-xl transition-all hover:scale-110 shadow-sm border border-transparent hover:border-[#C89355]/30"
                          title="تعديل المنتج النهائي"
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsStockModalOpen(true);
                          }}
                          className="p-2.5 text-[#263544] hover:bg-white hover:text-[#C89355] rounded-xl transition-all hover:scale-110 shadow-sm border border-transparent hover:border-[#C89355]/30"
                          title="تعديل الرصيد أو حركة مخزون"
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
              تصفية حالة المخزون تُطبَّق على الصفحة الحالية فقط ({items.length} من {allItems.length} منتجًا معروضًا).
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
          onClick={() => { setSelectedItem(null); setIsProductModalOpen(true); }}
          className="fixed bottom-8 left-8 z-40 rounded-full w-16 h-16 bg-[#C89355] text-[#1a2530] shadow-[0_10px_30px_rgba(200,147,85,0.5)] hover:bg-[#d9a56b] hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-2 border-[#1a2530]/20 group"
          title="إضافة منتج نهائي جديد"
        >
          <div className="absolute inset-1.5 rounded-full border border-dashed border-[#1a2530]/20 pointer-events-none transition-colors group-hover:border-[#1a2530]/40" />
          <Plus size={28} className="group-hover:animate-spin transition-all duration-300 relative z-10" />
        </button>

        {isProductModalOpen ? (
          <AddProductModal
            key={`${isProductModalOpen}-${selectedItem?.id ?? "new"}`}
            isOpen={isProductModalOpen}
            onClose={() => {
              setIsProductModalOpen(false);
              setSelectedItem(null);
            }}
            isPending={createItem.isPending || updateItem.isPending}
            initialData={
              selectedItem
                ? {
                    id: selectedItem.id,
                    name: selectedItem.name,
                    sku: selectedItem.sku,
                    size: selectedItem.size,
                    color: selectedItem.color || selectedItem.feature,
                    costPrice: selectedItem.costPrice ?? "",
                    unitPrice: selectedItem.unitPrice ?? "",
                    photo: selectedItem.photo ?? null,
                  }
                : null
            }
            onSave={handleSaveProduct}
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
              setIsProductModalOpen(true);
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
              جارٍ حفظ بيانات المنتج النهائي...
            </p>
          </div>
        )}
      </InventoryPageShell>
    </>
  );
}
