"use client";

import { useState } from "react";
import { Warehouse as WarehouseIcon, MapPin, Plus, Loader2 } from "lucide-react";
import { useWarehouses } from "@/hooks/useInventory";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";
import InventoryPageShell from "@/components/inventory/InventoryPageShell";

export default function InventoryWarehousesPage() {
  const { data: warehouses, isLoading } = useWarehouses();
  const [warehouseForm, setWarehouseForm] = useState({ name: "", code: "", address: "" });
  const [isSaving, setIsSaving] = useState(false);

  const handleAddWarehouse = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!warehouseForm.name.trim() || !warehouseForm.code.trim()) {
      toast.error("اسم المخزن والكود مطلوبان");
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.post("/inventory/warehouses", {
        name: warehouseForm.name.trim(),
        code: warehouseForm.code.trim(),
        address: warehouseForm.address.trim() || undefined,
      });
      toast.success("تمت إضافة المخزن بنجاح");
      setWarehouseForm({ name: "", code: "", address: "" });
    } catch (error) {
      const err = error as { response?: { data?: { message?: string; error?: { message?: string } } } };
      toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || "فشل إضافة المخزن");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <InventoryPageShell
      title="المخازن"
      subtitle="إدارة المواقع والمخازن وتوزيع الأصناف بينها."
    >
      <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group/wh">
        <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover/wh:border-[#C89355]/50" />
        <div className="relative z-10">
          <div className="p-6 border-b border-white/80 bg-white/40 flex items-center justify-between gap-4">
            <h2 className="text-lg font-black text-[#263544] flex items-center gap-3">
              <WarehouseIcon size={20} className="text-[#C89355] group-hover/wh:animate-pulse transition-all duration-300" />
              المخازن
            </h2>
            <span className="text-xs font-black text-[#C89355] bg-[#1a2530] px-4 py-1.5 rounded-xl shadow-sm border border-[#C89355]/30">{warehouses?.length ?? 0} مخزن</span>
          </div>

          <form onSubmit={handleAddWarehouse} className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-white/60 bg-white/20">
            <div>
              <label className="block text-xs font-black text-[#263544]/70 mb-1.5">اسم المخزن</label>
              <input
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full p-3 bg-white/80 border border-white rounded-xl text-sm font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/50 shadow-inner"
                placeholder="المخزن الرئيسي"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#263544]/70 mb-1.5">الكود</label>
              <input
                value={warehouseForm.code}
                onChange={(e) => setWarehouseForm((p) => ({ ...p, code: e.target.value }))}
                className="w-full p-3 bg-white/80 border border-white rounded-xl text-sm font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/50 shadow-inner font-mono"
                placeholder="WH-01"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#263544]/70 mb-1.5">العنوان (اختياري)</label>
              <input
                value={warehouseForm.address}
                onChange={(e) => setWarehouseForm((p) => ({ ...p, address: e.target.value }))}
                className="w-full p-3 bg-white/80 border border-white rounded-xl text-sm font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/50 shadow-inner"
                placeholder="منطقة صناعية"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1a2530] text-[#C89355] font-black text-sm shadow-[0_10px_20px_rgba(38,53,68,0.4)] disabled:opacity-60 transition-all active:scale-95 border border-[#C89355]/40"
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                إضافة مخزن
              </button>
            </div>
          </form>

          <div className="p-6">
            {isLoading ? (
              <div className="text-sm font-black text-[#263544]/50 text-center py-4">جارٍ تحميل المخازن...</div>
            ) : !warehouses || warehouses.length === 0 ? (
              <p className="text-sm font-black text-[#263544]/50 text-center py-4">لا توجد مخازن. أضف مخزناً ليظهر في قائمة المواقع.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouses.map((wh) => (
                  <div key={wh.id} className="rounded-2xl border border-[#C89355]/20 bg-white/60 p-4 flex items-start gap-3">
                    <div className="p-2.5 bg-[#1a2530] rounded-xl border border-[#C89355]/30 shrink-0">
                      <MapPin className="text-[#C89355]" size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-[#263544] text-sm truncate">{wh.name}</p>
                      <p className="text-xs font-mono font-bold text-slate-500 mt-0.5">{wh.code}</p>
                      {wh.address ? (
                        <p className="text-xs font-bold text-slate-500 mt-1 truncate">{wh.address}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </InventoryPageShell>
  );
}
