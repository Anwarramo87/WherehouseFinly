"use client";
import { useState } from "react";
import {
  Users, Plus, ChevronDown, ChevronUp, Package, UserCheck,
  ArrowDownToLine, CheckCircle2, AlertTriangle, DollarSign,
  Send, X, Eye,
} from "lucide-react";
import WmsPageShell from "@/components/wms/WmsPageShell";
import {
  Panel, Stat, Pill, TableFrame, Button, Field, Loading, Empty,
  fmtMoney, fmtInt, inputClass,
} from "@/components/wms/primitives";
import {
  useRepresentatives, useRepresentative,
  useCreateRepresentative, useUpdateRepresentative,
  useAssignCustomers, useAssignProducts, useTransferStock,
  useApproveSettlement, useRepSettlements,
  type Representative,
} from "@/hooks/useRepresentatives";
import { useCustomers } from "@/hooks/useWms";
import { useInventory } from "@/hooks/useInventory";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";

const STATUS_TONE: Record<string, "green"|"red"|"amber"|"slate"> = {
  active: "green", inactive: "red", suspended: "amber",
};
const STATUS_LABEL: Record<string, string> = {
  active: "نشط", inactive: "غير نشط", suspended: "موقوف",
};

export default function RepresentativesAdminPage() {
  const { data, isLoading } = useRepresentatives();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [expandedRepId, setExpandedRepId] = useState<string | null>(null);

  const reps = data?.data ?? [];

  // Summary stats
  const totalStockValue = reps.reduce((s, r) => s + (r.summary?.stockValue ?? 0), 0);
  const totalOutstanding = reps.reduce((s, r) => s + (r.summary?.outstanding ?? 0), 0);
  const activeCount = reps.filter(r => r.status === "active").length;

  return (
    <WmsPageShell
      group="analytics"
      title="إدارة المندوبين"
      subtitle="توزيع البضاعة، تتبع المبيعات والتحصيلات، اعتماد التسويات"
      actions={
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={15} /> مندوب جديد
        </Button>
      }
    >
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="المندوبون النشطون" value={fmtInt(activeCount)} tone="success" icon={<UserCheck size={16} />} />
        <Stat label="إجمالي المندوبين" value={fmtInt(reps.length)} tone="neutral" icon={<Users size={16} />} />
        <Stat label="قيمة المخزون الموزع" value={`${fmtMoney(totalStockValue, 0)} ل.س`} tone="info" icon={<Package size={16} />} />
        <Stat label="مستحق التحصيل" value={`${fmtMoney(totalOutstanding, 0)} ل.س`} tone={totalOutstanding > 0 ? "warning" : "success"} icon={<DollarSign size={16} />} />
      </div>

      {/* Representatives Table */}
      <Panel title="قائمة المندوبين" icon={<Users size={20} />}>
        {isLoading ? <Loading /> : !reps.length ? (
          <Empty message="لا يوجد مندوبون — أضف مندوباً جديداً" />
        ) : (
          <TableFrame
            head={<>
              <th>المندوب</th>
              <th>المخزون</th>
              <th>المبيعات</th>
              <th>المحصّل</th>
              <th>المتبقي</th>
              <th>الحالة</th>
              <th></th>
            </>}
          >
            {reps.map((rep) => {
              const s = rep.summary;
              const isExp = expandedRepId === rep.id;
              return (
                <>
                  <tr key={rep.id} className="bg-white/50 hover:bg-white/80 [&>td]:px-4 [&>td]:py-3">
                    <td>
                      <p className="font-black text-[#263544]">{rep.name}</p>
                      <p className="text-[11px] font-bold text-[#263544]/40">{rep.code} · {rep.user?.username}</p>
                    </td>
                    <td className="tabular-nums font-bold">{fmtMoney(s?.stockValue ?? 0, 0)}</td>
                    <td className="tabular-nums font-bold">{fmtMoney(s?.totalSold ?? 0, 0)}</td>
                    <td className="tabular-nums font-bold text-emerald-700">{fmtMoney(s?.totalCollected ?? 0, 0)}</td>
                    <td className={`tabular-nums font-black ${(s?.outstanding ?? 0) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {fmtMoney(s?.outstanding ?? 0, 0)}
                    </td>
                    <td><Pill tone={STATUS_TONE[rep.status] ?? "slate"}>{STATUS_LABEL[rep.status] ?? rep.status}</Pill></td>
                    <td>
                      <div className="flex gap-1.5 items-center">
                        <button
                          onClick={() => setSelectedRepId(rep.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#1a2530] text-[#C89355] text-xs font-black flex items-center gap-1"
                        >
                          <Eye size={12} /> إدارة
                        </button>
                        <button
                          onClick={() => setExpandedRepId(isExp ? null : rep.id)}
                          className="p-1.5 rounded-xl bg-white/70 border border-white hover:bg-white"
                        >
                          {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExp && (
                    <tr key={`${rep.id}-exp`}>
                      <td colSpan={7} className="bg-slate-50/50 px-6 py-4">
                        <RepQuickActions repId={rep.id} repName={rep.name} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </TableFrame>
        )}
      </Panel>

      {/* Modals */}
      {showCreate && <CreateRepModal onClose={() => setShowCreate(false)} />}
      {selectedRepId && <RepManageDrawer repId={selectedRepId} onClose={() => setSelectedRepId(null)} />}
    </WmsPageShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Actions (inline expanded row)
// ─────────────────────────────────────────────────────────────────────────────

function RepQuickActions({ repId, repName }: { repId: string; repName: string }) {
  const { data: settlements } = useRepSettlements(repId);
  const approveSettlement = useApproveSettlement();

  const pendingSettlements = settlements?.filter(s => s.status === "SUBMITTED") ?? [];

  return (
    <div className="space-y-3">
      {pendingSettlements.length > 0 && (
        <div>
          <p className="text-xs font-black text-[#263544]/60 mb-2">تسويات بانتظار الاعتماد</p>
          {pendingSettlements.map(s => (
            <div key={s.id} className="flex items-center gap-4 p-3 bg-amber-50 rounded-xl border border-amber-200 mb-2">
              <div className="flex-1">
                <p className="text-xs font-black text-[#263544]">
                  {new Date(s.periodStart).toLocaleDateString("ar-SY")} — {new Date(s.periodEnd).toLocaleDateString("ar-SY")}
                </p>
                <p className="text-xs font-bold text-amber-700">
                  مستحق: {fmtMoney(s.outstandingAmount, 0)} ل.س · فرق المخزون: {fmtMoney(s.stockVarianceValue, 0)} ل.س
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => approveSettlement.mutate({ id: s.id, approved: true })}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black"
                >
                  اعتماد
                </button>
                <button
                  onClick={() => approveSettlement.mutate({ id: s.id, approved: false })}
                  className="px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-black"
                >
                  رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {pendingSettlements.length === 0 && (
        <p className="text-xs font-bold text-[#263544]/40">لا توجد تسويات بانتظار الاعتماد</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Representative Modal
// ─────────────────────────────────────────────────────────────────────────────

function CreateRepModal({ onClose }: { onClose: () => void }) {
  const createRep = useCreateRepresentative();
  const [form, setForm] = useState({ userId: "", name: "", code: "", phone: "", email: "", notes: "" });
  const [users, setUsers] = useState<Array<{ id: string; username: string; email: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useState(() => {
    setLoadingUsers(true);
    apiClient.get("/auth/users", { params: { limit: 100 } })
      .then(r => setUsers((r.data as { data?: unknown[] }).data as typeof users ?? []))
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.userId || !form.name || !form.code) return toast.error("المستخدم والاسم والكود مطلوبة");
    await createRep.mutateAsync({
      userId: form.userId,
      name: form.name,
      code: form.code,
      phone: form.phone || undefined,
      email: form.email || undefined,
      notes: form.notes || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1520]/70 backdrop-blur-md" dir="rtl">
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] border-2 border-white shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-white/80 bg-white/50 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#263544] flex items-center gap-2">
            <UserCheck size={20} className="text-[#C89355]" /> مندوب جديد
          </h2>
          <button onClick={onClose} className="text-2xl text-[#263544]/40 font-black">×</button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="حساب المستخدم">
            {loadingUsers ? <Loading /> : (
              <select value={form.userId} onChange={e => set("userId", e.target.value)} className={inputClass}>
                <option value="">— اختر مستخدماً —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.username} ({u.email || "—"})</option>
                ))}
              </select>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="الاسم الكامل">
              <input value={form.name} onChange={e => set("name", e.target.value)} className={inputClass} placeholder="أحمد محمد" />
            </Field>
            <Field label="كود المندوب">
              <input value={form.code} onChange={e => set("code", e.target.value)} className={inputClass} placeholder="REP-001" />
            </Field>
            <Field label="الهاتف">
              <input value={form.phone} onChange={e => set("phone", e.target.value)} className={inputClass} />
            </Field>
            <Field label="البريد الإلكتروني">
              <input value={form.email} onChange={e => set("email", e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="ملاحظات">
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} className={`${inputClass} h-20 resize-none`} />
          </Field>
        </div>
        <div className="p-6 border-t border-white/80 bg-white/40 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={createRep.isPending}>
            <Plus size={16} /> إنشاء المندوب
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rep Manage Drawer (full management panel)
// ─────────────────────────────────────────────────────────────────────────────

function RepManageDrawer({ repId, onClose }: { repId: string; onClose: () => void }) {
  const { data: rep, isLoading } = useRepresentative(repId);
  const [activeTab, setActiveTab] = useState<"stock"|"customers"|"products"|"transfer">("stock");
  const assignCustomers = useAssignCustomers(repId);
  const assignProducts = useAssignProducts(repId);
  const transferStock = useTransferStock(repId);

  const { data: customersData } = useCustomers();
  const { data: inventoryData } = useInventory({ limit: 200 });

  const allCustomers = (customersData?.data ?? []) as Array<{ id: string; name: string }>;
  const allProducts = (inventoryData?.items ?? []) as Array<{ sku: string; name: string; unit: string }>;

  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [transferItems, setTransferItems] = useState<Record<string, string>>({});
  const [transferLocation, setTransferLocation] = useState("WH-A");

  // Pre-select assigned customers/products
  useState(() => {
    if (rep) {
      setSelectedCustomers(rep.customers?.map((c: { customerId: string }) => c.customerId) ?? []);
      setSelectedProducts(rep.products?.map((p: { sku: string }) => p.sku) ?? []);
    }
  });

  const handleTransfer = async () => {
    const items = Object.entries(transferItems)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([sku, qty]) => ({ sku, quantity: Number(qty) }));
    if (!items.length) return toast.error("أضف كمية لصنف واحد على الأقل");
    await transferStock.mutateAsync({ items, warehouseLocation: transferLocation });
    setTransferItems({});
    toast.success("تم تسليم البضاعة للمندوب");
  };

  const TABS = [
    { key: "stock", label: "المخزون الحالي", icon: Package },
    { key: "customers", label: "العملاء", icon: Users },
    { key: "products", label: "المنتجات", icon: Package },
    { key: "transfer", label: "تسليم بضاعة", icon: ArrowDownToLine },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-[#0a1520]/50 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-2xl h-full bg-white/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/80 bg-gradient-to-r from-[#1a2530] to-[#263544] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">{rep?.name ?? "..."}</h2>
            <p className="text-xs font-bold text-[#C89355] mt-0.5">{rep?.code}</p>
          </div>
          <div className="flex items-center gap-3">
            {rep && <Pill tone={STATUS_TONE[rep.status] ?? "slate"}>{STATUS_LABEL[rep.status] ?? rep.status}</Pill>}
            <button onClick={onClose} className="text-white/60 hover:text-white text-2xl font-black">×</button>
          </div>
        </div>

        {/* Summary Bar */}
        {rep?.summary && (
          <div className="grid grid-cols-4 divide-x divide-x-reverse divide-white/20 bg-[#263544]/10 border-b border-white/40">
            {[
              { label: "قيمة المخزون", value: fmtMoney(rep.summary.stockValue, 0) },
              { label: "إجمالي المبيعات", value: fmtMoney(rep.summary.totalSold, 0) },
              { label: "المحصّل", value: fmtMoney(rep.summary.totalCollected, 0) },
              { label: "المتبقي", value: fmtMoney(rep.summary.outstanding, 0) },
            ].map(item => (
              <div key={item.label} className="p-3 text-center">
                <p className="text-[10px] font-black text-[#263544]/50">{item.label}</p>
                <p className="text-sm font-black text-[#263544] tabular-nums mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-white/60 bg-white/40 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 min-w-[100px] py-3 px-4 text-xs font-black flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === t.key
                  ? "border-b-2 border-[#C89355] text-[#263544] bg-white/60"
                  : "text-[#263544]/50 hover:text-[#263544]"
              }`}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? <Loading /> : (
            <>
              {/* Stock Tab */}
              {activeTab === "stock" && (
                <div className="space-y-3">
                  {!(rep?.stockItems?.length) ? (
                    <Empty message="لا يوجد مخزون لدى هذا المندوب" />
                  ) : (
                    <TableFrame head={<><th>المنتج</th><th>الكمية</th><th>تكلفة الوحدة</th><th>الإجمالي</th></>}>
                      {rep.stockItems.map((item: { sku: string; quantity: number; unitCost: number; totalValue: number }) => (
                        <tr key={item.sku} className="bg-white/50 [&>td]:px-4 [&>td]:py-2.5">
                          <td className="font-bold text-[#263544]">{item.sku}</td>
                          <td className="tabular-nums font-black">{fmtInt(item.quantity)}</td>
                          <td className="tabular-nums">{fmtMoney(item.unitCost, 0)}</td>
                          <td className="tabular-nums font-black text-[#C89355]">{fmtMoney(item.totalValue, 0)}</td>
                        </tr>
                      ))}
                    </TableFrame>
                  )}
                </div>
              )}

              {/* Customers Tab */}
              {activeTab === "customers" && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-[#263544]/50">حدد العملاء المخصصين لهذا المندوب</p>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {allCustomers.map(c => (
                      <label key={c.id} className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/80 cursor-pointer hover:bg-white/80">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(c.id)}
                          onChange={e => setSelectedCustomers(prev =>
                            e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id)
                          )}
                          className="w-4 h-4 accent-[#C89355]"
                        />
                        <span className="font-bold text-[#263544]">{c.name}</span>
                      </label>
                    ))}
                  </div>
                  <Button
                    onClick={() => assignCustomers.mutate(selectedCustomers)}
                    loading={assignCustomers.isPending}
                    className="w-full"
                  >
                    <UserCheck size={16} /> حفظ العملاء ({selectedCustomers.length})
                  </Button>
                </div>
              )}

              {/* Products Tab */}
              {activeTab === "products" && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-[#263544]/50">حدد المنتجات المسموحة لهذا المندوب</p>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {allProducts.map(p => (
                      <label key={p.sku} className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/80 cursor-pointer hover:bg-white/80">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(p.sku)}
                          onChange={e => setSelectedProducts(prev =>
                            e.target.checked ? [...prev, p.sku] : prev.filter(s => s !== p.sku)
                          )}
                          className="w-4 h-4 accent-[#C89355]"
                        />
                        <div>
                          <p className="font-bold text-[#263544]">{p.name}</p>
                          <p className="text-[11px] text-[#263544]/40">{p.sku}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <Button
                    onClick={() => assignProducts.mutate(selectedProducts)}
                    loading={assignProducts.isPending}
                    className="w-full"
                  >
                    <Package size={16} /> حفظ المنتجات ({selectedProducts.length})
                  </Button>
                </div>
              )}

              {/* Transfer Tab */}
              {activeTab === "transfer" && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-[#263544]/50">
                    سلّم بضاعة من المخزن الرئيسي لهذا المندوب. البضاعة تُخصم من المخزن وتُضاف لمخزون المندوب.
                  </p>
                  <Field label="موقع المخزن">
                    <input value={transferLocation} onChange={e => setTransferLocation(e.target.value)} className={inputClass} placeholder="WH-A" />
                  </Field>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {allProducts.filter(p => selectedProducts.includes(p.sku)).map(p => (
                      <div key={p.sku} className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/80">
                        <div className="flex-1">
                          <p className="font-bold text-[#263544]">{p.name}</p>
                          <p className="text-[11px] text-[#263544]/40">{p.sku}</p>
                        </div>
                        <input
                          type="number"
                          min="0"
                          placeholder="الكمية"
                          value={transferItems[p.sku] ?? ""}
                          onChange={e => setTransferItems(prev => ({ ...prev, [p.sku]: e.target.value }))}
                          className={`${inputClass} w-28`}
                        />
                      </div>
                    ))}
                  </div>
                  {selectedProducts.length === 0 && (
                    <p className="text-xs font-bold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                      ⚠️ لم تُعيَّن منتجات لهذا المندوب بعد — اذهب لتبويب "المنتجات" أولاً
                    </p>
                  )}
                  <Button
                    onClick={handleTransfer}
                    loading={transferStock.isPending}
                    disabled={!Object.values(transferItems).some(q => Number(q) > 0)}
                    className="w-full"
                  >
                    <Send size={16} /> تسليم البضاعة
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
