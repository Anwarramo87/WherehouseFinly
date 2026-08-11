"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Search, Edit, ArrowRightLeft, Package2, AlertTriangle, Boxes, Upload, Download, Loader2 } from "lucide-react";
import { useInventory, useCategories, useInventoryStats, useWarehouses } from "@/hooks/useInventory";
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
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isBulkPending, setIsBulkPending] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const { data, isLoading, createItem, updateItem, adjustStock, refetch } = useInventory({
    page: 1,
    limit: 100,
    search: search.trim() || undefined,
    category: category === "all" ? undefined : category,
  });

  const categoriesQuery = useCategories();
  const statsQuery = useInventoryStats();
  const warehousesQuery = useWarehouses();

  const warehouses = useMemo(() => warehousesQuery.data || [], [warehousesQuery.data]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  const items: InventoryItem[] = useMemo(() => data?.items || [], [data?.items]);

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
    if (selectedItem) {
      updateItem.mutate(
        {
          id: selectedItem.id,
          data: payload,
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

    createItem.mutate(payload, {
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="relative bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-5 sm:p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] hover:-translate-y-1 transition-all group">
          <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
          <div className="flex items-center gap-3 mb-3 sm:mb-4 relative z-10">
            <div className="p-2.5 sm:p-3 bg-[#1a2530] rounded-xl border border-[#C89355]/30 shadow-sm shrink-0">
              <Boxes className="text-[#C89355] group-hover:animate-pulse transition-all duration-300" size={20}/>
            </div>
            <p className="font-black text-[#263544] text-xs sm:text-sm leading-tight">إجمالي الأصناف</p>
          </div>
          <div className="min-w-0">
            <p className="text-2xl sm:text-3xl md:text-4xl font-black text-[#263544] relative z-10 break-all leading-tight">{totalProducts.toLocaleString()}</p>
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
            <p className="text-2xl sm:text-3xl md:text-4xl font-black text-[#263544] relative z-10 break-all leading-tight">{totalAvailable.toLocaleString()}</p>
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
            <p className="text-2xl sm:text-3xl md:text-4xl font-black text-rose-600 relative z-10 break-all leading-tight">{lowStockCount.toLocaleString()}</p>
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
            onChange={(e) => setCategory(e.target.value)}
            className="w-full py-3.5 px-4 bg-white/80 backdrop-blur-sm border-none rounded-2xl text-sm font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/50 transition-all shadow-inner cursor-pointer appearance-none"
          >
            <option value="all">كل الفئات</option>
            {categories.filter((c) => c !== "all").map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
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
                <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">اسم الصنف</th>
                <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">SKU / الباركود</th>
                <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الفئة</th>
                <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الكمية المتاحة</th>
                <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الوحدة</th>
                <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الحالة</th>
                <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-[#263544]/60 font-black text-lg">لا توجد بيانات مطابقة لنتائج البحث الحالية</td>
                </tr>
              ) : (
                items.map((item) => (
                <tr
                  key={item.id}
                  className={`group/row transition-all duration-300 ${
                    item.quantity <= item.minStockLevel ? "bg-rose-50/60 hover:bg-rose-50/90" : "hover:bg-white/80"
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner border ${item.quantity <= item.minStockLevel ? 'bg-rose-100 border-rose-200' : 'bg-[#1a2530] border-[#C89355]/40'}`}>
                        <Package2 size={18} className={item.quantity <= item.minStockLevel ? 'text-rose-600' : 'text-[#C89355]'} />
                      </div>
                      <span className="font-black text-slate-800 text-sm whitespace-nowrap group-hover/row:text-[#263544] transition-colors">{item.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center text-xs text-slate-500 font-mono font-bold tracking-wider">{item.sku}</td>
                  <td className="p-4 text-xs font-black text-[#263544]/80 text-center">{item.category}</td>
                  <td className="p-4 text-base font-black text-[#263544] text-center">{Number(item.quantity || 0).toLocaleString()}</td>
                  <td className="p-4 text-center text-xs font-black text-slate-500">{item.unit}</td>
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
                  unitPrice: 0,
                  costPrice: 0,
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
                  unitPrice: 0,
                  costPrice: 0,
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
    </>
  );
}
