"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Warehouse as WarehouseIcon, MapPin, Plus, Loader2, Trash2, Eye, Package, Edit, Save, X } from "lucide-react";
import { useWarehouses, useNextWarehouseCode } from "@/hooks/useInventory";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";
import InventoryPageShell from "@/components/inventory/InventoryPageShell";
import { usePermissionOrPrivilege } from "@/lib/permissions/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Warehouse, WarehouseInput } from "@/types/inventory";

interface WarehouseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: WarehouseInput & { id?: string }) => Promise<void>;
  isPending?: boolean;
  initialData?: Warehouse | null;
  nextCode?: string;
}

function WarehouseFormModal({ isOpen, onClose, onSave, isPending = false, initialData, nextCode }: WarehouseFormModalProps) {
  const [form, setForm] = useState<{ name: string; address: string }>({ name: "", address: "" });
  const isEdit = !!initialData?.id;

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: initialData?.name || "",
        address: initialData?.address || "",
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("اسم المخزن مطلوب");
      return;
    }
    await onSave({
      id: initialData?.id,
      name: form.name.trim(),
      code: isEdit ? (initialData?.code ?? "") : (nextCode ?? ""),
      address: form.address.trim() || undefined,
    });
  };

  const commonInputClass =
    "w-full p-3.5 bg-white/90 backdrop-blur border-2 border-white rounded-2xl text-sm font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/50 focus:border-[#C89355]/50 shadow-inner transition-all";

  const labelClass = "block text-sm font-black text-[#263544] mb-2";

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border-2 border-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
          <div className="absolute inset-1 rounded-[1.4rem] border border-dashed border-[#C89355]/30 pointer-events-none" />
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_10px_20px_rgba(38,53,68,0.4)] border border-[#C89355]/40">
                <WarehouseIcon size={20} className="text-[#C89355]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#263544]">
                  {isEdit ? "تعديل بيانات المخزن" : "إضافة مخزن جديد"}
                </h2>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  {isEdit ? "تحديث بيانات المخزن الحالي" : "تسجيل مخزن جديد في النظام"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-rose-500 transition-colors active:scale-95 p-2 rounded-xl hover:bg-rose-50"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 text-right relative">
          <div className="absolute inset-2 rounded-[2rem] border border-dashed border-[#C89355]/20 pointer-events-none" />

          <div className="relative z-10">
            <label className={labelClass}>
              كود المخزن <span className="text-xs font-bold text-slate-400">(توليد تلقائي)</span>
            </label>
            <div className="w-full p-3.5 bg-[#1a2530] text-[#C89355] rounded-2xl text-sm font-mono font-bold shadow-md border-2 border-[#C89355]/30 flex items-center justify-between">
              <span className="opacity-60 text-xs">FORMAT</span>
              <span className="tracking-widest">WH-01</span>
              <span className="opacity-80 text-lg">{isEdit ? initialData?.code : nextCode}</span>
            </div>
          </div>

          <div className="relative z-10">
            <label className={labelClass}>
              اسم المخزن <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="مثال: مخزن المواد الخام الرئيسي، مخزن المنتجات النهائية..."
              className={commonInputClass}
            />
          </div>

          <div className="relative z-10">
            <label className={labelClass}>العنوان (اختياري)</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              rows={2}
              placeholder="مثال: المنطقة الصناعية الثانية، مبنى رقم 3..."
              className={`${commonInputClass} resize-none`}
            />
          </div>

          <div className="relative z-10 pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white/80 text-slate-500 font-black text-sm border-2 border-white hover:bg-white hover:text-[#263544] hover:border-[#C89355]/30 transition-all active:scale-95 shadow-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`flex-1 relative overflow-hidden inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-black text-sm disabled:opacity-60 transition-all active:scale-95 group ${
                isEdit
                  ? "bg-[#C89355]/15 text-[#8a5f26] border-2 border-[#C89355]/30 hover:bg-[#C89355]/25"
                  : "bg-[#1a2530] text-[#C89355] shadow-[0_10px_20px_rgba(38,53,68,0.4)] border-2 border-[#C89355]/40 hover:bg-[#263544]"
              }`}
            >
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
              {isPending ? (
                <Loader2 className="animate-spin relative z-10" size={18} />
              ) : (
                <Save size={18} className="group-hover:-translate-y-0.5 transition-transform relative z-10" />
              )}
              <span className="relative z-10">{isEdit ? "حفظ التعديلات" : "إضافة المخزن"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryWarehousesPage() {
  const { data: warehouses, isLoading } = useWarehouses();
  const { data: nextCode, refetch: refetchNextCode } = useNextWarehouseCode();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const canView = usePermissionOrPrivilege("view_inventory");
  const canEdit = usePermissionOrPrivilege("edit_inventory");

  if (!canView) {
    return (
      <InventoryPageShell title="المخازن" subtitle="إدارة المواقع والمخازن وتوزيع الأصناف بينها.">
        <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden p-8">
          <p className="text-sm font-black text-amber-700 bg-amber-50 p-4 rounded-2xl border border-amber-200">
            حسابك لا يملك صلاحية المخزون. سجّل دخولاً بحساب إدارة المصنع (admin) لعرض وإدارة المخازن.
          </p>
        </div>
      </InventoryPageShell>
    );
  }

  const handleSaveWarehouse = async (input: WarehouseInput & { id?: string }) => {
    setIsSaving(true);
    try {
      if (input.id) {
        await apiClient.put(`/inventory/warehouses/${input.id}`, {
          name: input.name,
          address: input.address,
        });
        toast.success("تم تحديث بيانات المخزن بنجاح");
      } else {
        await apiClient.post("/inventory/warehouses", {
          name: input.name,
          address: input.address,
        });
        toast.success("تمت إضافة المخزن بنجاح");
      }
      setIsFormOpen(false);
      setEditingWarehouse(null);
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      await refetchNextCode();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string; error?: { message?: string } } } };
      toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || "فشل حفظ المخزن");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (wh: Warehouse) => {
    if ((wh.totalQuantity ?? 0) > 0) {
      toast.error(`لا يمكن حذف المخزن: الكمية الإجمالية ${wh.totalQuantity}. أزل جميع المخزون أولاً.`);
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف المخزن "${wh.name}"؟ الكمية الإجمالية صفر.`)) return;
    try {
      await apiClient.delete(`/inventory/warehouses/${wh.id}`);
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setSelectedWarehouse(null);
      toast.success("تم حذف المخزن بنجاح");
      await refetchNextCode();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string; error?: { message?: string } } } };
      toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || "فشل حذف المخزن");
    }
  };

  const getStockBadge = (wh: Warehouse) => {
    const qty = wh.totalQuantity ?? 0;
    if (qty === 0) return <span className="px-3 py-1 rounded-xl text-[11px] font-black bg-slate-100 text-slate-500 border border-slate-200">فارغ</span>;
    if (qty < 100) return <span className="px-3 py-1 rounded-xl text-[11px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200">منخفض</span>;
    return <span className="px-3 py-1 rounded-xl text-[11px] font-black bg-[#C89355]/10 text-[#C89355] border border-[#C89355]/30">مخزون</span>;
  };

  return (
    <>
      <InventoryPageShell
        title="المخازن"
        subtitle="إدارة المواقع والمخازن وتوزيع الأصناف بينها. يُنشأ الكود تلقائياً بصيغة WH-01."
        actions={
          canEdit ? (
            <button
              onClick={() => {
                setEditingWarehouse(null);
                setIsFormOpen(true);
              }}
              className="relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#1a2530] hover:bg-[#263544] text-[#C89355] font-black text-sm shadow-[0_10px_20px_rgba(38,53,68,0.4)] transition-all active:scale-95 border border-[#C89355]/40 group/btn"
            >
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/btn:border-[#C89355]/50" />
              <Plus size={16} className="group-hover/btn:-translate-y-1 transition-transform relative z-10" />
              <span className="relative z-10">إضافة مخزن</span>
            </button>
          ) : undefined
        }
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

            <div className="p-6">
              {isLoading ? (
                <div className="text-sm font-black text-[#263544]/50 text-center py-4">جارٍ تحميل المخازن...</div>
              ) : !warehouses || warehouses.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-[#C89355]/30 bg-[#1a2530] shadow-[0_10px_20px_rgba(38,53,68,0.3)]">
                    <WarehouseIcon size={32} className="text-[#C89355]" />
                  </div>
                  <div className="text-center max-w-md">
                    <p className="font-black text-[#263544] text-base">لا توجد مخازن مسجّلة حتى الآن</p>
                    <p className="text-xs font-bold text-[#263544]/50 mt-1.5">ابدأ بإضافة مخزن المواد الخام الرئيسي ثم مخزن المنتجات النهائية. سيُولَّد رمز المخزن تلقائياً بصيغة WH-01.</p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => { setEditingWarehouse(null); setIsFormOpen(true); }}
                      className="mt-3 rounded-2xl bg-[#1a2530] px-6 py-3 text-xs font-black text-[#C89355] transition-all hover:scale-105 border border-[#C89355]/40 shadow-md"
                    >
                      📦 إضافة أول مخزن
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {warehouses.map((wh) => (
                    <div key={wh.id} className="relative rounded-3xl border-2 border-[#C89355]/20 bg-white/70 p-5 flex flex-col gap-4 hover:shadow-2xl hover:border-[#C89355]/45 transition-all group/item overflow-hidden">
                      <div className="absolute inset-1 rounded-[2rem] border border-dashed border-[#C89355]/20 pointer-events-none opacity-0 group-hover/item:opacity-100 transition-opacity" />

                      <div className="flex items-start justify-between relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_10px_20px_rgba(38,53,68,0.3)] border border-[#C89355]/35 shrink-0">
                            <WarehouseIcon className="text-[#C89355] group-hover/item:animate-pulse transition-all duration-300" size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-[#263544] text-sm truncate">{wh.name}</p>
                            <p className="text-xs font-mono font-bold text-[#C89355] mt-0.5 tracking-wider">{wh.code}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStockBadge(wh)}
                          {canEdit && (
                            <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                              <button
                                onClick={() => { setEditingWarehouse(wh); setIsFormOpen(true); }}
                                className="p-2 rounded-xl bg-[#C89355]/10 text-[#8a5f26] hover:bg-[#C89355]/20 hover:scale-110 transition-all border border-[#C89355]/30"
                                title="تعديل بيانات المخزن"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(wh)}
                                className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-110 transition-all border border-rose-200"
                                title="حذف المخزن (لا يعمل إذا كان يحتوي مخزون)"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {wh.address ? (
                        <p className="text-xs font-bold text-slate-500 truncate flex items-center gap-1.5 relative z-10 line-clamp-2 bg-slate-50/60 p-3 rounded-2xl border border-slate-100">
                          <MapPin size={12} className="text-[#C89355] shrink-0" /> {wh.address}
                        </p>
                      ) : (
                        <div className="text-xs font-bold text-slate-300 bg-slate-50/60 p-3 rounded-2xl border border-dashed border-slate-200 text-center relative z-10">
                          لا يوجد عنوان مسجّل
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 relative z-10">
                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-500">
                          <Package size={12} className="text-[#C89355]" />
                          <span>الكمية: <span className="text-[#263544] text-sm">{wh.totalQuantity ?? 0}</span></span>
                        </div>
                        <button
                          onClick={() => setSelectedWarehouse(wh)}
                          className="inline-flex items-center gap-1 text-[11px] font-black text-[#263544]/70 hover:text-[#C89355] transition-colors px-3 py-1.5 rounded-xl hover:bg-white/80"
                        >
                          تفاصيل
                          <Eye size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedWarehouse && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setSelectedWarehouse(null)}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border-2 border-white" onClick={(e) => e.stopPropagation()}>
              <div className="relative p-6 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
                <div className="absolute inset-1 rounded-[1.4rem] border border-dashed border-[#C89355]/30 pointer-events-none" />
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_10px_20px_rgba(38,53,68,0.4)] border border-[#C89355]/40">
                      <WarehouseIcon size={20} className="text-[#C89355]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#263544]">{selectedWarehouse.name}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">تفاصيل حالة المخزن والكود</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedWarehouse(null)} className="text-slate-400 hover:text-rose-500 transition-colors active:scale-95 p-2 rounded-xl hover:bg-rose-50">
                    <X size={22} />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4 relative">
                <div className="absolute inset-2 rounded-[2rem] border border-dashed border-[#C89355]/20 pointer-events-none" />
                <div className="grid grid-cols-2 gap-3 relative z-10">
                  <div className="bg-[#1a2530] rounded-2xl p-5 border border-[#C89355]/30">
                    <p className="text-[11px] font-black text-slate-400 mb-1.5 tracking-wider">كود المخزن</p>
                    <p className="text-base font-black text-[#C89355] font-mono tracking-widest">{selectedWarehouse.code}</p>
                  </div>
                  <div className="bg-white/80 rounded-2xl p-5 border-2 border-white shadow-inner">
                    <p className="text-[11px] font-black text-slate-500 mb-1.5">الحالة</p>
                    <p className="text-base font-black text-[#263544]">{selectedWarehouse.status}</p>
                  </div>
                </div>
                {selectedWarehouse.address && (
                  <div className="bg-slate-50 rounded-2xl p-5 relative z-10 border-2 border-white">
                    <p className="text-[11px] font-black text-slate-500 mb-1.5">العنوان</p>
                    <p className="text-sm font-black text-[#263544]">{selectedWarehouse.address}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 relative z-10">
                  <div className="bg-[#1a2530] rounded-2xl p-4 text-center border border-[#C89355]/30">
                    <p className="text-[11px] font-black text-slate-400 mb-1.5">الإجمالي</p>
                    <p className="text-xl font-black text-[#C89355] tabular-nums">{selectedWarehouse.totalQuantity ?? 0}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-4 text-center border-2 border-emerald-100">
                    <p className="text-[11px] font-black text-emerald-700 mb-1.5">المتاح</p>
                    <p className="text-xl font-black text-emerald-700 tabular-nums">{selectedWarehouse.totalAvailable ?? 0}</p>
                  </div>
                  <div className="bg-sky-50 rounded-2xl p-4 text-center border-2 border-sky-100">
                    <p className="text-[11px] font-black text-sky-700 mb-1.5">محجوز</p>
                    <p className="text-xl font-black text-sky-700 tabular-nums">{selectedWarehouse.totalReserved ?? 0}</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-2 relative z-10">
                  <button
                    onClick={() => { router.push(`/inventory/locations?warehouse=${selectedWarehouse.id}`); setSelectedWarehouse(null); }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#1a2530] text-[#C89355] font-black text-sm hover:bg-[#263544] transition-all active:scale-95 border border-[#C89355]/40 shadow-md"
                  >
                    <MapPin size={16} /> إدارة المواقع
                  </button>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => { setEditingWarehouse(selectedWarehouse); setIsFormOpen(true); setSelectedWarehouse(null); }}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#C89355]/15 text-[#8a5f26] font-black text-sm hover:bg-[#C89355]/25 transition-all active:scale-95 border-2 border-[#C89355]/30 shadow-sm"
                      >
                        <Edit size={16} /> تعديل
                      </button>
                      <button
                        onClick={() => { handleDelete(selectedWarehouse); }}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-rose-50 text-rose-600 font-black text-sm hover:bg-rose-100 transition-all active:scale-95 border-2 border-rose-200 shadow-sm"
                      >
                        <Trash2 size={16} /> حذف
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </InventoryPageShell>

      <WarehouseFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingWarehouse(null); }}
        onSave={handleSaveWarehouse}
        isPending={isSaving}
        initialData={editingWarehouse}
        nextCode={nextCode}
      />
    </>
  );
}
