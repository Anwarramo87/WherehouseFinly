"use client";
import { useState } from "react";
import {
  Factory, Plus, Play, CheckCircle2, Clock, BarChart3,
  Package, Layers, AlertTriangle, ChevronDown, ChevronUp, X,
} from "lucide-react";
import WmsPageShell from "@/components/wms/WmsPageShell";
import {
  Panel, Stat, Pill, TableFrame, Button, Field, Loading, Empty,
  fmtMoney, fmtInt, fmtDate, inputClass,
} from "@/components/wms/primitives";
import {
  useProductionOrders, useManufacturingSummary,
  useCreateProductionOrder, useStartProductionOrder, useCompleteProductionOrder,
  useCancelProductionOrder,
  type ProductionOrder, type CreateOrderPayload, type CompleteOrderPayload,
} from "@/hooks/useManufacturing";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";

// Status metadata
const STATUS: Record<string, { label: string; tone: "slate"|"blue"|"warning"|"success"|"danger" }> = {
  DRAFT:       { label: "مسودة",     tone: "slate" },
  PLANNED:     { label: "مخطط",      tone: "blue" },
  IN_PROGRESS: { label: "جارٍ",       tone: "warning" },
  COMPLETED:   { label: "مكتمل",     tone: "success" },
  CANCELLED:   { label: "ملغى",      tone: "danger" },
};

// Fetch active BOMs for order creation
function useActiveBOMs() {
  return useQuery({
    queryKey: [...queryKeys.manufacturing.all, "active-boms"],
    queryFn: async () => {
      const res = await apiClient.get<Array<{
        id: string; productSku: string; version: number;
        product?: { name: string };
      }>>("/manufacturing/bom/list/active");
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export default function ProductionPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<ProductionOrder | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: summary } = useManufacturingSummary();
  const { data: orders, isLoading } = useProductionOrders({ status: statusFilter || undefined });
  const startOrder = useStartProductionOrder();
  const cancelOrder = useCancelProductionOrder();

  const handleCancel = async (order: ProductionOrder) => {
    if (!window.confirm(`إلغاء أمر الإنتاج ${order.orderNumber}؟ سيتم إفراج المواد الخام المحجوزة.`)) return;
    await cancelOrder.mutateAsync(order.id);
  };

  const stats = (summary?.byStatus ?? []) as Array<{ status: string; _count: { id: number }; _sum: { totalCost: string | null } }>;
  const get = (s: string) => stats.find(x => x.status === s);

  return (
    <WmsPageShell
      group="analytics"
      title="أوامر الإنتاج"
      subtitle="تتبع دورة الإنتاج من المواد الخام إلى المنتج النهائي في المخزن"
      actions={
        <div className="flex gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${inputClass} w-36`}>
            <option value="">كل الحالات</option>
            {Object.entries(STATUS).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </select>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={15} /> أمر إنتاج
          </Button>
        </div>
      }
    >
      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="مخطط" value={fmtInt(get("PLANNED")?._count.id ?? 0)} tone="info" icon={<Clock size={16} />} />
        <Stat label="جارٍ" value={fmtInt(get("IN_PROGRESS")?._count.id ?? 0)} tone="warning" icon={<Factory size={16} />} />
        <Stat label="مكتمل" value={fmtInt(get("COMPLETED")?._count.id ?? 0)} tone="success" icon={<CheckCircle2 size={16} />} />
        <Stat
          label="تكلفة إنتاج إجمالية"
          value={fmtMoney(get("COMPLETED")?._sum.totalCost ?? 0, 0)}
          tone="neutral"
          icon={<BarChart3 size={16} />}
        />
      </div>

      {/* Orders Table */}
      <Panel title="أوامر الإنتاج" icon={<Factory size={20} />}>
        {isLoading ? <Loading /> : !(orders?.data.length) ? (
          <Empty message="لا توجد أوامر إنتاج — أنشئ أمراً جديداً" />
        ) : (
          <TableFrame
            head={<>
              <th>رقم الأمر</th>
              <th>المنتج</th>
              <th>مخطط</th>
              <th>فعلي</th>
              <th>التاريخ</th>
              <th>التكلفة</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </>}
          >
            {orders.data.map((order) => {
              const sm = STATUS[order.status] ?? { label: order.status, tone: "slate" as const };
              const isExpanded = expandedId === order.id;
              return (
                <>
                  <tr key={order.id} className="bg-white/50 hover:bg-white/80 [&>td]:px-4 [&>td]:py-3">
                    <td className="font-black text-[#263544] font-mono text-sm">{order.orderNumber}</td>
                    <td>
                      <p className="font-bold text-[#263544]">{order.productSku}</p>
                      <p className="text-[11px] text-[#263544]/40">BOM v{(order as { bom?: { version?: number } }).bom?.version ?? "—"}</p>
                    </td>
                    <td className="tabular-nums font-black">{fmtInt(order.plannedQty)}</td>
                    <td className="tabular-nums">
                      {order.actualQty > 0 ? <span className="font-black text-emerald-700">{fmtInt(order.actualQty)}</span> : "—"}
                    </td>
                    <td className="text-xs font-bold text-[#263544]/60">{fmtDate(order.plannedDate)}</td>
                    <td className="tabular-nums font-bold">
                      {Number(order.totalCost) > 0 ? fmtMoney(order.totalCost, 0) : "—"}
                    </td>
                    <td><Pill tone={sm.tone as "slate"|"blue"|"green"|"red"|"amber"|"gold"|"neutral"}>{sm.label}</Pill></td>
                    <td>
                      <div className="flex gap-2 items-center">
                        {order.status === "PLANNED" && (
                          <button
                            onClick={() => startOrder.mutate(order.id)}
                            className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-black hover:bg-sky-700 flex items-center gap-1"
                          >
                            <Play size={12} /> بدء
                          </button>
                        )}
                        {order.status === "IN_PROGRESS" && (
                          <>
                            <button
                              onClick={() => setCompleteTarget(order)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 flex items-center gap-1"
                            >
                              <CheckCircle2 size={12} /> إتمام
                            </button>
                            <button
                              onClick={() => handleCancel(order)}
                              disabled={cancelOrder.isPending}
                              className="px-3 py-1.5 rounded-xl bg-white text-red-600 text-xs font-black border border-red-200 hover:bg-red-50 flex items-center gap-1"
                            >
                              <X size={12} /> إلغاء
                            </button>
                          </>
                        )}
                        {(order.status === "PLANNED" || order.status === "DRAFT") && (
                          <button
                            onClick={() => handleCancel(order)}
                            disabled={cancelOrder.isPending}
                            className="px-3 py-1.5 rounded-xl bg-white text-[#263544]/50 text-xs font-black border border-white/80 hover:bg-white/80 flex items-center gap-1"
                          >
                            <X size={12} /> إلغاء
                          </button>
                        )}
                        {order.status === "COMPLETED" && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : order.id)}
                            className="px-3 py-1.5 rounded-xl bg-white text-[#263544] text-xs font-black border border-white/80 hover:bg-white/80 flex items-center gap-1"
                          >
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} تفاصيل
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && order.status === "COMPLETED" && (
                    <tr key={`${order.id}-detail`} className="bg-slate-50/50">
                      <td colSpan={8} className="px-6 py-4">
                        <OrderCostBreakdown order={order} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </TableFrame>
        )}
        {orders && orders.total > 20 && (
          <div className="px-6 py-3 text-xs font-bold text-[#263544]/50 bg-white/30 border-t border-white/70">
            يعرض {orders.data.length} من {orders.total} أمر
          </div>
        )}
      </Panel>

      {/* Create Modal */}
      {showCreate && <CreateOrderModal onClose={() => setShowCreate(false)} />}

      {/* Complete Modal */}
      {completeTarget && (
        <CompleteOrderModal order={completeTarget} onClose={() => setCompleteTarget(null)} />
      )}
    </WmsPageShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost Breakdown (expanded row)
// ─────────────────────────────────────────────────────────────────────────────

function OrderCostBreakdown({ order }: { order: ProductionOrder }) {
  const costs = [
    { label: "تكلفة المواد", value: order.materialCost },
    { label: "تكلفة العمالة", value: order.laborCost },
    { label: "التكاليف العامة", value: order.overheadCost },
    { label: "تكلفة التغليف", value: order.packagingCost },
    { label: "تكاليف أخرى", value: order.otherCost },
  ].filter(c => Number(c.value) > 0);

  return (
    <div className="space-y-3">
      <p className="text-xs font-black text-[#263544]/60 uppercase tracking-wide">تفصيل التكاليف</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {costs.map(c => (
          <div key={c.label} className="bg-white/60 rounded-xl p-3 border border-white/80">
            <p className="text-[11px] font-black text-[#263544]/50">{c.label}</p>
            <p className="text-sm font-black text-[#263544] tabular-nums mt-1">{fmtMoney(c.value, 0)}</p>
          </div>
        ))}
        <div className="bg-[#1a2530] rounded-xl p-3">
          <p className="text-[11px] font-black text-[#C89355]/70">تكلفة الوحدة</p>
          <p className="text-sm font-black text-[#C89355] tabular-nums mt-1">{fmtMoney(order.unitCost, 2)}</p>
        </div>
      </div>
      <p className="text-[11px] font-bold text-[#263544]/40">
        الكمية الفعلية: {fmtInt(order.actualQty)} | الهدر: {fmtInt(order.wasteQty)} | التكلفة الإجمالية: {fmtMoney(order.totalCost, 0)} ل.س
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Order Modal
// ─────────────────────────────────────────────────────────────────────────────

function CreateOrderModal({ onClose }: { onClose: () => void }) {
  const createOrder = useCreateProductionOrder();
  const [form, setForm] = useState<CreateOrderPayload>({
    bomId: "", plannedQty: 1, plannedDate: new Date().toISOString().slice(0, 10),
    laborCost: 0, overheadCost: 0, packagingCost: 0, otherCost: 0,
  });
  const set = (k: keyof CreateOrderPayload, v: string | number) =>
    setForm(p => ({ ...p, [k]: v }));

  // Fetch active BOMs for dropdown
  const { data: boms, isLoading } = useQuery({
    queryKey: [...queryKeys.manufacturing.all, "bom-list"],
    queryFn: async () => {
      // Get finished products and fetch their BOMs
      const prodRes = await apiClient.get<{ data: Array<{ sku: string; name: string }> }>(
        "/inventory/products", { params: { productType: "FINISHED", limit: 100 } }
      );
      const products = prodRes.data.data ?? [];
      const bomResults = await Promise.allSettled(
        products.map(p => apiClient.get(`/manufacturing/bom/${p.sku}`).then(r => ({ ...r.data, productName: p.name })))
      );
      return bomResults
        .filter((r): r is PromiseFulfilledResult<{ id: string; productSku: string; version: number; productName: string }> => r.status === "fulfilled")
        .map(r => r.value);
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleSubmit = async () => {
    if (!form.bomId) return toast.error("اختر BOM");
    if (form.plannedQty <= 0) return toast.error("الكمية يجب أن تكون أكبر من صفر");
    await createOrder.mutateAsync(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1520]/70 backdrop-blur-md" dir="rtl">
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] border-2 border-white shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="p-6 border-b border-white/80 bg-white/50 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#263544] flex items-center gap-2">
            <Factory size={20} className="text-[#C89355]" /> أمر إنتاج جديد
          </h2>
          <button onClick={onClose} className="text-2xl text-[#263544]/40 hover:text-[#263544] font-black">×</button>
        </div>
        <div className="p-6 space-y-4">
          {isLoading ? <Loading /> : (
            <>
              <Field label="المنتج (BOM)">
                <select value={form.bomId} onChange={e => set("bomId", e.target.value)} className={inputClass}>
                  <option value="">— اختر منتجاً —</option>
                  {(boms ?? []).map(b => (
                    <option key={b.id} value={b.id}>{b.productName} (v{b.version})</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="الكمية المخططة">
                  <input type="number" min="1" value={form.plannedQty} onChange={e => set("plannedQty", Number(e.target.value))} className={inputClass} />
                </Field>
                <Field label="تاريخ الإنتاج">
                  <input type="date" value={form.plannedDate} onChange={e => set("plannedDate", e.target.value)} className={inputClass} />
                </Field>
              </div>
              <p className="text-xs font-black text-[#263544]/50 uppercase tracking-wide">تكاليف إضافية (اختيارية)</p>
              <div className="grid grid-cols-2 gap-3">
                {(["laborCost","overheadCost","packagingCost","otherCost"] as const).map(k => (
                  <Field key={k} label={{ laborCost: "العمالة", overheadCost: "التكاليف العامة", packagingCost: "التغليف", otherCost: "أخرى" }[k]}>
                    <input type="number" min="0" value={form[k] ?? 0} onChange={e => set(k, Number(e.target.value))} className={inputClass} />
                  </Field>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="p-6 border-t border-white/80 bg-white/40 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={createOrder.isPending}>
            <Plus size={16} /> إنشاء الأمر
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Complete Order Modal
// ─────────────────────────────────────────────────────────────────────────────

function CompleteOrderModal({ order, onClose }: { order: ProductionOrder; onClose: () => void }) {
  const completeOrder = useCompleteProductionOrder();
  const [form, setForm] = useState<CompleteOrderPayload & { id: string }>({
    id: order.id,
    actualQty: order.plannedQty,
    wasteQty: 0,
    laborCost: Number(order.laborCost) || 0,
    overheadCost: Number(order.overheadCost) || 0,
    packagingCost: Number(order.packagingCost) || 0,
    otherCost: Number(order.otherCost) || 0,
  });
  const set = (k: string, v: number | string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (form.actualQty <= 0) return toast.error("الكمية الفعلية يجب أن تكون أكبر من صفر");
    await completeOrder.mutateAsync(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1520]/70 backdrop-blur-md" dir="rtl">
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] border-2 border-white shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="p-6 border-b border-white/80 bg-white/50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-[#263544] flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-600" /> إتمام التصنيع
            </h2>
            <p className="text-xs font-bold text-[#263544]/50 mt-0.5">{order.orderNumber} — {order.productSku}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-[#263544]/40 hover:text-[#263544] font-black">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="الكمية المنتجة فعلياً">
              <input type="number" min="1" value={form.actualQty} onChange={e => set("actualQty", Number(e.target.value))} className={inputClass} />
            </Field>
            <Field label="كمية الهدر">
              <input type="number" min="0" value={form.wasteQty ?? 0} onChange={e => set("wasteQty", Number(e.target.value))} className={inputClass} />
            </Field>
            <Field label="رقم الدفعة (اختياري)">
              <input value={form.batchNumber ?? ""} placeholder="تلقائي" onChange={e => set("batchNumber", e.target.value)} className={inputClass} />
            </Field>
            <Field label="تاريخ انتهاء الدفعة (اختياري)">
              <input type="date" value={form.batchExpiryDate ?? ""} onChange={e => set("batchExpiryDate", e.target.value)} className={inputClass} />
            </Field>
          </div>
          <p className="text-xs font-black text-[#263544]/50 uppercase tracking-wide">تعديل التكاليف</p>
          <div className="grid grid-cols-2 gap-3">
            {(["laborCost","overheadCost","packagingCost","otherCost"] as const).map(k => (
              <Field key={k} label={{ laborCost: "العمالة", overheadCost: "التكاليف العامة", packagingCost: "التغليف", otherCost: "أخرى" }[k]}>
                <input type="number" min="0" value={(form as unknown as Record<string, number>)[k] ?? 0} onChange={e => set(k, Number(e.target.value))} className={inputClass} />
              </Field>
            ))}
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-xs font-bold text-amber-700">
              عند الإتمام: تُستهلك المواد الخام المحجوزة تلقائياً من المخزن، وتُضاف الكمية المنتجة إلى الموقع الفعلي للمخزون، مع تسجيل الدفعة إذا كان المنتج يتبع دفعات.
            </p>
          </div>
        </div>
        <div className="p-6 border-t border-white/80 bg-white/40 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={completeOrder.isPending}>
            <CheckCircle2 size={16} /> تأكيد الإتمام
          </Button>
        </div>
      </div>
    </div>
  );
}
