"use client";
import { useState } from "react";
import {
  Package, ShoppingCart, DollarSign, RotateCcw, FileText,
  Plus, TrendingUp, Clock, CheckCircle2, AlertTriangle, User,
} from "lucide-react";
import {
  Panel, Stat, Pill, TableFrame, Button, Field, Loading, Empty,
  fmtMoney, fmtInt, fmtDate, inputClass,
} from "@/components/wms/primitives";
import {
  useRepSummary, useRepStock, useRepSales, useRepCollections,
  useRepReturns, useRepSettlements, useCreateRepSale,
  useCreateRepCollection, useCreateRepReturn, useCreateSettlement,
  type RepSale,
} from "@/hooks/useRepresentatives";
import { useAuthStore } from "@/stores/auth-store";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";

const SALE_STATUS: Record<string, { label: string; tone: "slate"|"blue"|"green"|"red"|"amber" }> = {
  PENDING: { label: "بانتظار التحصيل", tone: "amber" },
  PARTIAL: { label: "مدفوع جزئياً",    tone: "blue" },
  PAID:    { label: "مدفوع",           tone: "green" },
  CANCELLED: { label: "ملغى",          tone: "red" },
};

// Fetch this user's representative record
function useMyRepId() {
  return useQuery({
    queryKey: queryKeys.representatives.myProfile(),
    queryFn: async () => {
      const res = await apiClient.get<{ id: string; name: string; code: string; customers: Array<{ customerId: string }>; products: Array<{ sku: string }> }>(
        "/representatives/me/profile"
      );
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

export default function RepWorkspacePage() {
  const user = useAuthStore(s => s.user);
  const { data: myProfile, isLoading: profileLoading, error: profileError } = useMyRepId();
  const [activeTab, setActiveTab] = useState<"stock"|"sales"|"collections"|"returns"|"settlement">("stock");

  if (profileLoading) return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <Loading label="جارٍ تحميل ملفك الشخصي..." />
    </div>
  );

  if (profileError || !myProfile) return (
    <div className="min-h-screen flex items-center justify-center p-8" dir="rtl">
      <div className="bg-white/80 rounded-[2.5rem] border-2 border-white shadow-xl p-10 max-w-md text-center">
        <AlertTriangle size={40} className="text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-black text-[#263544] mb-2">لا يوجد حساب مندوب</h2>
        <p className="text-sm font-bold text-[#263544]/60">
          حسابك ({user?.username}) غير مرتبط بمندوب. تواصل مع المسؤول.
        </p>
      </div>
    </div>
  );

  return <RepWorkspace repId={myProfile.id} repProfile={myProfile} activeTab={activeTab} setActiveTab={setActiveTab} />;
}

function RepWorkspace({
  repId, repProfile, activeTab, setActiveTab,
}: {
  repId: string;
  repProfile: { id: string; name: string; code: string; customers: Array<{ customerId: string }>; products: Array<{ sku: string }> };
  activeTab: string;
  setActiveTab: (t: "stock"|"sales"|"collections"|"returns"|"settlement") => void;
}) {
  const { data: summary } = useRepSummary(repId);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  const TABS = [
    { key: "stock",      label: "مخزوني",      icon: Package },
    { key: "sales",      label: "مبيعاتي",     icon: ShoppingCart },
    { key: "collections",label: "تحصيلاتي",    icon: DollarSign },
    { key: "returns",    label: "مرتجعاتي",    icon: RotateCcw },
    { key: "settlement", label: "التسوية",      icon: FileText },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f4f8] to-[#e8edf2]" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a2530] to-[#263544] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#C89355]/20 flex items-center justify-center">
              <User size={24} className="text-[#C89355]" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">{repProfile.name}</h1>
              <p className="text-xs font-bold text-[#C89355]">مندوب مبيعات · {repProfile.code}</p>
            </div>
          </div>
          <Button onClick={() => setShowSaleModal(true)}>
            <Plus size={15} /> بيع جديد
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Stat label="قيمة المخزون" value={`${fmtMoney(summary?.stockValue ?? 0, 0)}`} tone="neutral" icon={<Package size={16} />} />
          <Stat label="إجمالي المبيعات" value={`${fmtMoney(summary?.totalSold ?? 0, 0)}`} tone="info" icon={<TrendingUp size={16} />} />
          <Stat label="المحصّل" value={`${fmtMoney(summary?.totalCollected ?? 0, 0)}`} tone="success" icon={<CheckCircle2 size={16} />} />
          <Stat label="المتبقي" value={`${fmtMoney(summary?.outstanding ?? 0, 0)}`} tone={(summary?.outstanding ?? 0) > 0 ? "warning" : "success"} icon={<DollarSign size={16} />} />
          <Stat label="مرتجعات معلقة" value={fmtInt(summary?.pendingReturns ?? 0)} tone={(summary?.pendingReturns ?? 0) > 0 ? "danger" : "neutral"} icon={<RotateCcw size={16} />} />
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-white/60 backdrop-blur-sm rounded-2xl p-1 border border-white/80 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                activeTab === t.key
                  ? "bg-[#1a2530] text-[#C89355] shadow-md"
                  : "text-[#263544]/60 hover:text-[#263544] hover:bg-white/60"
              }`}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "stock" && <StockTab repId={repId} />}
        {activeTab === "sales" && <SalesTab repId={repId} onNew={() => setShowSaleModal(true)} />}
        {activeTab === "collections" && <CollectionsTab repId={repId} onNew={() => setShowCollectionModal(true)} />}
        {activeTab === "returns" && <ReturnsTab repId={repId} onNew={() => setShowReturnModal(true)} />}
        {activeTab === "settlement" && <SettlementTab repId={repId} onNew={() => setShowSettlementModal(true)} />}
      </div>

      {/* Modals */}
      {showSaleModal && <CreateSaleModal repId={repId} repProfile={repProfile} onClose={() => setShowSaleModal(false)} />}
      {showCollectionModal && <CreateCollectionModal repId={repId} onClose={() => setShowCollectionModal(false)} />}
      {showReturnModal && <CreateReturnModal repId={repId} repProfile={repProfile} onClose={() => setShowReturnModal(false)} />}
      {showSettlementModal && <CreateSettlementModal repId={repId} onClose={() => setShowSettlementModal(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────────────────

function StockTab({ repId }: { repId: string }) {
  const { data, isLoading } = useRepStock(repId);
  return (
    <Panel title="مخزوني الحالي" icon={<Package size={20} />}>
      {isLoading ? <Loading /> : !data?.length ? (
        <Empty message="لا يوجد مخزون حالياً — انتظر تسليم بضاعة من المسؤول" />
      ) : (
        <TableFrame head={<><th>المنتج</th><th>الكمية</th><th>تكلفة الوحدة</th><th>القيمة الإجمالية</th></>}>
          {data.map(item => (
            <tr key={item.sku} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
              <td>
                <p className="font-black text-[#263544]">{item.product?.name ?? item.sku}</p>
                <p className="text-[11px] font-bold text-[#263544]/40">{item.sku} · {item.product?.unit}</p>
              </td>
              <td>
                <span className={`text-lg font-black tabular-nums ${item.quantity <= 5 ? "text-red-600" : "text-[#263544]"}`}>
                  {fmtInt(item.quantity)}
                </span>
                {item.quantity <= 5 && <Pill tone="red">منخفض</Pill>}
              </td>
              <td className="tabular-nums">{fmtMoney(item.unitCost, 0)} ل.س</td>
              <td className="tabular-nums font-black text-[#C89355]">{fmtMoney(item.totalValue, 0)} ل.س</td>
            </tr>
          ))}
        </TableFrame>
      )}
    </Panel>
  );
}

function SalesTab({ repId, onNew }: { repId: string; onNew: () => void }) {
  const { data, isLoading } = useRepSales(repId);
  const sales = data?.data ?? [];
  return (
    <Panel title="مبيعاتي" icon={<ShoppingCart size={20} />} actions={
      <Button onClick={onNew}><Plus size={14} /> بيع جديد</Button>
    }>
      {isLoading ? <Loading /> : !sales.length ? (
        <Empty message="لا توجد مبيعات بعد" />
      ) : (
        <TableFrame head={<><th>رقم الفاتورة</th><th>التاريخ</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></>}>
          {sales.map(s => {
            const sm = SALE_STATUS[s.status] ?? { label: s.status, tone: "slate" as const };
            const remaining = Number(s.totalAmount) - Number(s.paidAmount);
            return (
              <tr key={s.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                <td className="font-black font-mono text-sm text-[#263544]">{s.saleNumber}</td>
                <td className="text-xs font-bold text-[#263544]/60">{fmtDate(s.saleDate)}</td>
                <td className="tabular-nums font-black">{fmtMoney(s.totalAmount, 0)} ل.س</td>
                <td className="tabular-nums text-emerald-700 font-bold">{fmtMoney(s.paidAmount, 0)} ل.س</td>
                <td className={`tabular-nums font-black ${remaining > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {fmtMoney(remaining, 0)} ل.س
                </td>
                <td><Pill tone={sm.tone}>{sm.label}</Pill></td>
              </tr>
            );
          })}
        </TableFrame>
      )}
    </Panel>
  );
}

function CollectionsTab({ repId, onNew }: { repId: string; onNew: () => void }) {
  const { data, isLoading } = useRepCollections(repId);
  const cols = data?.data ?? [];
  return (
    <Panel title="تحصيلاتي" icon={<DollarSign size={20} />} actions={
      <Button onClick={onNew}><Plus size={14} /> تحصيل جديد</Button>
    }>
      {isLoading ? <Loading /> : !cols.length ? (
        <Empty message="لا توجد تحصيلات بعد" />
      ) : (
        <TableFrame head={<><th>التاريخ</th><th>المبلغ</th><th>الطريقة</th><th>ملاحظات</th></>}>
          {cols.map(c => (
            <tr key={c.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
              <td className="text-xs font-bold">{fmtDate(c.collectionDate)}</td>
              <td className="tabular-nums font-black text-emerald-700">{fmtMoney(c.amount, 0)} ل.س</td>
              <td><Pill tone="slate">{c.method === "cash" ? "نقدي" : c.method === "transfer" ? "تحويل" : c.method}</Pill></td>
              <td className="text-xs text-[#263544]/50">{c.notes ?? "—"}</td>
            </tr>
          ))}
        </TableFrame>
      )}
    </Panel>
  );
}

function ReturnsTab({ repId, onNew }: { repId: string; onNew: () => void }) {
  const { data, isLoading } = useRepReturns(repId);
  const returns = data?.data ?? [];
  return (
    <Panel title="مرتجعاتي" icon={<RotateCcw size={20} />} actions={
      <Button onClick={onNew}><Plus size={14} /> مرتجع جديد</Button>
    }>
      {isLoading ? <Loading /> : !returns.length ? (
        <Empty message="لا توجد مرتجعات" />
      ) : (
        <TableFrame head={<><th>التاريخ</th><th>المنتج</th><th>الكمية</th><th>القيمة</th><th>الحالة</th></>}>
          {returns.map(r => (
            <tr key={r.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
              <td className="text-xs font-bold">{fmtDate(r.returnDate)}</td>
              <td className="font-bold">{r.sku}</td>
              <td className="tabular-nums">{fmtInt(r.quantity)}</td>
              <td className="tabular-nums font-bold">{fmtMoney(r.totalValue, 0)} ل.س</td>
              <td><Pill tone={r.status === "pending" ? "amber" : r.status === "approved" ? "green" : "red"}>
                {r.status === "pending" ? "بانتظار الموافقة" : r.status === "approved" ? "مقبول" : "مرفوض"}
              </Pill></td>
            </tr>
          ))}
        </TableFrame>
      )}
    </Panel>
  );
}

function SettlementTab({ repId, onNew }: { repId: string; onNew: () => void }) {
  const { data, isLoading } = useRepSettlements(repId);
  const settlements = data ?? [];
  const STATUS_S: Record<string, { label: string; tone: "slate"|"blue"|"green"|"red"|"amber" }> = {
    PENDING:   { label: "قيد الإعداد",   tone: "slate" },
    SUBMITTED: { label: "مقدَّمة",        tone: "blue" },
    APPROVED:  { label: "معتمدة",         tone: "green" },
    DISPUTED:  { label: "متنازع عليها",   tone: "red" },
    CLOSED:    { label: "مغلقة",           tone: "slate" },
  };
  return (
    <Panel title="تسوياتي" icon={<FileText size={20} />} actions={
      <Button onClick={onNew}><Plus size={14} /> إنشاء تسوية</Button>
    }>
      {isLoading ? <Loading /> : !settlements.length ? (
        <Empty message="لا توجد تسويات — أنشئ تسوية للفترة الحالية" />
      ) : (
        <TableFrame head={<><th>الفترة</th><th>المبيعات</th><th>المحصّل</th><th>المستحق</th><th>فرق المخزون</th><th>الحالة</th></>}>
          {settlements.map(s => {
            const sm = STATUS_S[s.status] ?? { label: s.status, tone: "slate" as const };
            return (
              <tr key={s.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                <td className="text-xs font-bold">
                  {fmtDate(s.periodStart)} — {fmtDate(s.periodEnd)}
                </td>
                <td className="tabular-nums font-bold">{fmtMoney(s.soldValue, 0)}</td>
                <td className="tabular-nums font-bold text-emerald-700">{fmtMoney(s.collectedValue, 0)}</td>
                <td className={`tabular-nums font-black ${Number(s.outstandingAmount) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {fmtMoney(s.outstandingAmount, 0)}
                </td>
                <td className={`tabular-nums font-bold ${Number(s.stockVarianceValue) > 0 ? "text-amber-700" : "text-emerald-600"}`}>
                  {fmtMoney(s.stockVarianceValue, 0)}
                </td>
                <td><Pill tone={sm.tone}>{sm.label}</Pill></td>
              </tr>
            );
          })}
        </TableFrame>
      )}
    </Panel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modals
// ─────────────────────────────────────────────────────────────────────────────

function CreateSaleModal({
  repId, repProfile, onClose,
}: {
  repId: string;
  repProfile: { customers: Array<{ customerId: string }>; products: Array<{ sku: string }> };
  onClose: () => void;
}) {
  const createSale = useCreateRepSale(repId);
  const { data: stock } = useRepStock(repId);

  const [customerId, setCustomerId] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<Array<{ sku: string; quantity: string; unitPrice: string; discountPercent: string }>>([
    { sku: "", quantity: "1", unitPrice: "", discountPercent: "0" },
  ]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [notes, setNotes] = useState("");

  // Customers allowed for this rep
  const { data: allCustomers } = useQuery({
    queryKey: ["all-customers"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Array<{ id: string; name: string }> }>("/sales/customers");
      return res.data.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const allowedCustomerIds = new Set(repProfile.customers.map(c => c.customerId));
  const allowedSkus = new Set(repProfile.products.map(p => p.sku));
  const myCustomers = (allCustomers ?? []).filter(c => allowedCustomerIds.has(c.id));
  const myStock = (stock ?? []).filter(s => allowedSkus.has(s.sku) && s.quantity > 0);

  const addItem = () => setItems(p => [...p, { sku: "", quantity: "1", unitPrice: "", discountPercent: "0" }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, k: string, v: string) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const subtotal = items.reduce((s, i) => {
    const line = Number(i.quantity || 0) * Number(i.unitPrice || 0);
    const disc = line * (Number(i.discountPercent || 0) / 100);
    return s + line - disc;
  }, 0);
  const total = subtotal - Number(discountAmount || 0);

  const getStockQty = (sku: string) => myStock.find(s => s.sku === sku)?.quantity ?? 0;

  const handleSubmit = async () => {
    if (!customerId) return toast.error("اختر العميل");
    const validItems = items.filter(i => i.sku && Number(i.quantity) > 0 && Number(i.unitPrice) > 0);
    if (!validItems.length) return toast.error("أضف صنفاً واحداً على الأقل");
    for (const item of validItems) {
      if (Number(item.quantity) > getStockQty(item.sku)) {
        return toast.error(`الكمية المطلوبة لـ${item.sku} أكبر من المتاح (${getStockQty(item.sku)})`);
      }
    }
    await createSale.mutateAsync({
      customerId,
      saleDate,
      items: validItems.map(i => ({
        sku: i.sku,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discountPercent: Number(i.discountPercent) || 0,
      })),
      discountAmount: Number(discountAmount) || 0,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1520]/70 backdrop-blur-md" dir="rtl">
      <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] border-2 border-white shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-white/80 bg-white/50 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#263544] flex items-center gap-2">
            <ShoppingCart size={20} className="text-[#C89355]" /> فاتورة بيع جديدة
          </h2>
          <button onClick={onClose} className="text-2xl text-[#263544]/40 font-black">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="العميل">
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} className={inputClass}>
                <option value="">— اختر عميلاً —</option>
                {myCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="تاريخ البيع">
              <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => {
              const stockQty = getStockQty(item.sku);
              const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
              return (
                <div key={idx} className="bg-white/60 rounded-2xl border border-white/80 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#263544]/50">الصنف {idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-xs font-bold">حذف</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <Field label="المنتج">
                        <select value={item.sku} onChange={e => updateItem(idx, "sku", e.target.value)} className={inputClass}>
                          <option value="">— اختر منتجاً —</option>
                          {myStock.map(s => (
                            <option key={s.sku} value={s.sku}>{s.product?.name ?? s.sku} (متاح: {s.quantity})</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label="الكمية">
                      <input type="number" min="1" max={stockQty || 999} value={item.quantity}
                        onChange={e => updateItem(idx, "quantity", e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="سعر الوحدة">
                      <input type="number" min="0" value={item.unitPrice}
                        onChange={e => updateItem(idx, "unitPrice", e.target.value)} className={inputClass} />
                    </Field>
                  </div>
                  {lineTotal > 0 && (
                    <p className="text-xs font-bold text-[#C89355]">إجمالي الصنف: {fmtMoney(lineTotal, 0)} ل.س</p>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={addItem} className="w-full py-3 border-2 border-dashed border-[#C89355]/40 rounded-2xl text-sm font-black text-[#C89355] hover:bg-[#C89355]/5 flex items-center justify-center gap-2">
            <Plus size={15} /> إضافة صنف
          </button>
          <div className="grid grid-cols-2 gap-4">
            <Field label="خصم إجمالي (ل.س)">
              <input type="number" min="0" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} className={inputClass} />
            </Field>
            <Field label="ملاحظات">
              <input value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} />
            </Field>
          </div>
        </div>
        <div className="p-6 border-t border-white/80 bg-white/40 flex items-center justify-between">
          <div className="text-sm font-black text-[#263544]">
            الإجمالي: <span className="text-xl text-[#C89355] tabular-nums">{fmtMoney(total, 0)} ل.س</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button onClick={handleSubmit} loading={createSale.isPending}>
              <CheckCircle2 size={16} /> تأكيد البيع
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateCollectionModal({ repId, onClose }: { repId: string; onClose: () => void }) {
  const createCollection = useCreateRepCollection(repId);
  const { data: sales } = useRepSales(repId, { status: "PENDING" });
  const [form, setForm] = useState({ customerId: "", saleId: "", amount: "", method: "cash", collectionDate: new Date().toISOString().slice(0, 10), notes: "" });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const pendingSales = (sales?.data ?? []).filter(s => s.status === "PENDING" || s.status === "PARTIAL");

  const handleSubmit = async () => {
    if (!form.customerId && !form.saleId) return toast.error("حدد العميل أو الفاتورة");
    if (!form.amount || Number(form.amount) <= 0) return toast.error("أدخل مبلغاً صحيحاً");
    const selectedSale = pendingSales.find(s => s.id === form.saleId);
    await createCollection.mutateAsync({
      customerId: form.customerId || selectedSale?.customerId || "",
      saleId: form.saleId || undefined,
      amount: Number(form.amount),
      method: form.method,
      collectionDate: form.collectionDate,
      notes: form.notes || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1520]/70 backdrop-blur-md" dir="rtl">
      <div className="bg-white/95 rounded-[2.5rem] border-2 border-white shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-white/80 bg-white/50 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#263544] flex items-center gap-2"><DollarSign size={20} className="text-[#C89355]" /> تسجيل تحصيل</h2>
          <button onClick={onClose} className="text-2xl text-[#263544]/40 font-black">×</button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="الفاتورة (اختياري)">
            <select value={form.saleId} onChange={e => set("saleId", e.target.value)} className={inputClass}>
              <option value="">— تحصيل عام —</option>
              {pendingSales.map(s => (
                <option key={s.id} value={s.id}>{s.saleNumber} — متبقي: {fmtMoney(Number(s.totalAmount) - Number(s.paidAmount), 0)} ل.س</option>
              ))}
            </select>
          </Field>
          <Field label="رقم العميل (إذا لم تختر فاتورة)">
            <input value={form.customerId} onChange={e => set("customerId", e.target.value)} className={inputClass} placeholder="UUID العميل" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="المبلغ المحصّل"><input type="number" min="1" value={form.amount} onChange={e => set("amount", e.target.value)} className={inputClass} /></Field>
            <Field label="طريقة الدفع">
              <select value={form.method} onChange={e => set("method", e.target.value)} className={inputClass}>
                <option value="cash">نقدي</option>
                <option value="transfer">تحويل</option>
                <option value="check">شيك</option>
              </select>
            </Field>
            <Field label="تاريخ التحصيل"><input type="date" value={form.collectionDate} onChange={e => set("collectionDate", e.target.value)} className={inputClass} /></Field>
            <Field label="ملاحظات"><input value={form.notes} onChange={e => set("notes", e.target.value)} className={inputClass} /></Field>
          </div>
        </div>
        <div className="p-6 border-t border-white/80 bg-white/40 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={createCollection.isPending}><CheckCircle2 size={16} /> تأكيد</Button>
        </div>
      </div>
    </div>
  );
}

function CreateReturnModal({
  repId, repProfile, onClose,
}: { repId: string; repProfile: { products: Array<{ sku: string }> }; onClose: () => void }) {
  const createReturn = useCreateRepReturn(repId);
  const { data: stock } = useRepStock(repId);
  const [form, setForm] = useState({ sku: "", quantity: "1", unitPrice: "", customerId: "", returnDate: new Date().toISOString().slice(0, 10), reason: "", notes: "" });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const myStock = (stock ?? []).filter(s => repProfile.products.some(p => p.sku === s.sku));

  const handleSubmit = async () => {
    if (!form.sku || !form.customerId || !form.unitPrice) return toast.error("المنتج والعميل والسعر مطلوبة");
    await createReturn.mutateAsync({
      sku: form.sku, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice),
      customerId: form.customerId, returnDate: form.returnDate,
      reason: form.reason || undefined, notes: form.notes || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1520]/70 backdrop-blur-md" dir="rtl">
      <div className="bg-white/95 rounded-[2.5rem] border-2 border-white shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-white/80 bg-white/50 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#263544] flex items-center gap-2"><RotateCcw size={20} className="text-[#C89355]" /> تسجيل مرتجع</h2>
          <button onClick={onClose} className="text-2xl text-[#263544]/40 font-black">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="المنتج المرتجع">
                <select value={form.sku} onChange={e => set("sku", e.target.value)} className={inputClass}>
                  <option value="">— اختر منتجاً —</option>
                  {myStock.map(s => <option key={s.sku} value={s.sku}>{s.product?.name ?? s.sku}</option>)}
                </select>
              </Field>
            </div>
            <Field label="الكمية"><input type="number" min="1" value={form.quantity} onChange={e => set("quantity", e.target.value)} className={inputClass} /></Field>
            <Field label="سعر الوحدة"><input type="number" min="0" value={form.unitPrice} onChange={e => set("unitPrice", e.target.value)} className={inputClass} /></Field>
            <div className="col-span-2">
              <Field label="رقم العميل (UUID)"><input value={form.customerId} onChange={e => set("customerId", e.target.value)} className={inputClass} /></Field>
            </div>
            <Field label="تاريخ المرتجع"><input type="date" value={form.returnDate} onChange={e => set("returnDate", e.target.value)} className={inputClass} /></Field>
            <Field label="السبب"><input value={form.reason} onChange={e => set("reason", e.target.value)} className={inputClass} /></Field>
          </div>
        </div>
        <div className="p-6 border-t border-white/80 bg-white/40 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={createReturn.isPending}><CheckCircle2 size={16} /> تأكيد</Button>
        </div>
      </div>
    </div>
  );
}

function CreateSettlementModal({ repId, onClose }: { repId: string; onClose: () => void }) {
  const createSettlement = useCreateSettlement(repId);
  const { data: stock } = useRepStock(repId);
  const [form, setForm] = useState({
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    periodEnd: new Date().toISOString().slice(0, 10),
    varianceReason: "", notes: "",
  });
  const [actualCounts, setActualCounts] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    const actualStock = (stock ?? []).map(s => ({
      sku: s.sku,
      quantity: Number(actualCounts[s.sku] ?? s.quantity),
    }));
    await createSettlement.mutateAsync({
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      actualStock,
      varianceReason: form.varianceReason || undefined,
      notes: form.notes || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1520]/70 backdrop-blur-md" dir="rtl">
      <div className="bg-white/95 rounded-[2.5rem] border-2 border-white shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-white/80 bg-white/50 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#263544] flex items-center gap-2"><FileText size={20} className="text-[#C89355]" /> إنشاء تسوية</h2>
          <button onClick={onClose} className="text-2xl text-[#263544]/40 font-black">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="بداية الفترة"><input type="date" value={form.periodStart} onChange={e => setForm(p => ({ ...p, periodStart: e.target.value }))} className={inputClass} /></Field>
            <Field label="نهاية الفترة"><input type="date" value={form.periodEnd} onChange={e => setForm(p => ({ ...p, periodEnd: e.target.value }))} className={inputClass} /></Field>
          </div>
          <p className="text-xs font-black text-[#263544]/60">الكميات الفعلية في حوزتك</p>
          {(stock ?? []).map(s => (
            <div key={s.sku} className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/80">
              <div className="flex-1">
                <p className="font-bold text-[#263544] text-sm">{s.product?.name ?? s.sku}</p>
                <p className="text-[11px] text-[#263544]/40">متوقع: {s.quantity}</p>
              </div>
              <input
                type="number"
                min="0"
                placeholder={String(s.quantity)}
                value={actualCounts[s.sku] ?? ""}
                onChange={e => setActualCounts(p => ({ ...p, [s.sku]: e.target.value }))}
                className={`${inputClass} w-28`}
              />
            </div>
          ))}
          <Field label="سبب الفرق (إن وجد)"><input value={form.varianceReason} onChange={e => setForm(p => ({ ...p, varianceReason: e.target.value }))} className={inputClass} /></Field>
          <Field label="ملاحظات"><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={`${inputClass} h-16 resize-none`} /></Field>
        </div>
        <div className="p-6 border-t border-white/80 bg-white/40 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={createSettlement.isPending}><CheckCircle2 size={16} /> إرسال للاعتماد</Button>
        </div>
      </div>
    </div>
  );
}
