"use client";
import { useState } from "react";
import {
  ShoppingCart, CheckCircle2, DollarSign, RotateCcw, FileText, Store, Plus, Route as RouteIcon,
} from "lucide-react";
import { Field, Button, fmtMoney, inputClass } from "@/components/wms/primitives";
import {
  useRepStock, useRepSales, useRepShops, useRepRoutes,
  useCreateRepSale, useCreateRepCollection, useCreateRepReturn,
  useCreateSettlement, useCreateRepShop, useCreateRepRoute,
} from "@/hooks/useRepresentatives";
import { toast } from "react-hot-toast";

function ModalShell({ title, icon, onClose, width, children, footer }: {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  width?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1520]/70 backdrop-blur-md" dir="rtl">
      <div className={`bg-white/95 rounded-[2.5rem] border-2 border-white shadow-2xl w-full ${width ?? "max-w-md"} overflow-hidden`}>
        <div className="p-6 border-b border-white/80 bg-white/50 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#263544] flex items-center gap-2">{icon} {title}</h2>
          <button onClick={onClose} className="text-2xl text-[#263544]/40 font-black">×</button>
        </div>
        <div className={`${width ? "overflow-y-auto flex-1 p-6 space-y-4" : "p-6 space-y-4"}`}>{children}</div>
        <div className="p-6 border-t border-white/80 bg-white/40 flex justify-end gap-3">{footer}</div>
      </div>
    </div>
  );
}

export function CreateSaleModal({
  repId, repProfile, onClose, defaultKeepOpen = true,
}: {
  repId: string;
  repProfile: { customers: Array<{ customerId: string }>; products: Array<{ sku: string }> };
  onClose: () => void;
  defaultKeepOpen?: boolean;
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
  const [keepOpen, setKeepOpen] = useState(defaultKeepOpen);

  const { data: myShops } = useRepShops(repId);

  const allowedCustomerIds = new Set(repProfile.customers.map(c => c.customerId));
  const allowedSkus = new Set(repProfile.products.map(p => p.sku));
  const myCustomers = (myShops ?? []).filter(c => allowedCustomerIds.has(c.customerId));
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

  const resetForm = () => {
    setCustomerId("");
    setSaleDate(new Date().toISOString().slice(0, 10));
    setItems([{ sku: "", quantity: "1", unitPrice: "", discountPercent: "0" }]);
    setDiscountAmount("0");
    setNotes("");
  };

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
    if (keepOpen) {
      toast.success("تم حفظ الفاتورة — أضف الفاتورة التالية");
      resetForm();
    } else {
      onClose();
    }
  };

  return (
    <ModalShell
      title="فاتورة بيع جديدة"
      icon={<ShoppingCart size={20} className="text-[#C89355]" />}
      onClose={onClose}
      width="max-w-2xl max-h-[92vh] flex flex-col"
      footer={
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setKeepOpen(v => !v)}
              className={`w-5 h-5 rounded-md border-2 flex-none flex items-center justify-center transition-colors ${
                keepOpen ? "bg-[#C89355] border-[#C89355]" : "border-[#263544]/30 bg-white"
              }`}
            >
              {keepOpen && <CheckCircle2 size={13} className="text-white" />}
            </button>
            <span className="text-[11px] font-black text-[#263544]/60 leading-tight">
              سرّع الإدخال: وافق وحفظ وافتح فاتورة تالية فوراً
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black text-[#263544] flex-none">
              الإجمالي: <span className="text-xl text-[#C89355] tabular-nums">{fmtMoney(total, 0)} ل.س</span>
            </div>
            <Button variant="ghost" onClick={onClose}>إغلاق</Button>
            <Button onClick={handleSubmit} loading={createSale.isPending}>
              <CheckCircle2 size={16} /> حفظ الفاتورة
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="العميل">
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} className={inputClass}>
            <option value="">— اختر عميلاً —</option>
            {myCustomers.map(c => <option key={c.customerId} value={c.customerId}>{c.name}</option>)}
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
    </ModalShell>
  );
}

export function CreateCollectionModal({ repId, onClose }: { repId: string; onClose: () => void }) {
  const createCollection = useCreateRepCollection(repId);
  const { data: sales } = useRepSales(repId, { status: "PENDING" });
  const { data: myShops } = useRepShops(repId);
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
    <ModalShell
      title="تسجيل تحصيل"
      icon={<DollarSign size={20} className="text-[#C89355]" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={createCollection.isPending}><CheckCircle2 size={16} /> تأكيد</Button>
        </>
      }
    >
      <Field label="الفاتورة (اختياري)">
        <select value={form.saleId} onChange={e => set("saleId", e.target.value)} className={inputClass}>
          <option value="">— تحصيل عام —</option>
          {pendingSales.map(s => (
            <option key={s.id} value={s.id}>{s.saleNumber} — متبقي: {fmtMoney(Number(s.totalAmount) - Number(s.paidAmount), 0)} ل.س</option>
          ))}
        </select>
      </Field>
      <Field label="المحل (إذا لم تختر فاتورة)">
        <select value={form.customerId} onChange={e => set("customerId", e.target.value)} className={inputClass}>
          <option value="">— اختر محلاً —</option>
          {myShops?.map(s => <option key={s.customerId} value={s.customerId}>{s.name}</option>)}
        </select>
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
    </ModalShell>
  );
}

export function CreateReturnModal({
  repId, repProfile, onClose,
}: { repId: string; repProfile: { products: Array<{ sku: string }> }; onClose: () => void }) {
  const createReturn = useCreateRepReturn(repId);
  const { data: stock } = useRepStock(repId);
  const { data: myShops } = useRepShops(repId);
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
    <ModalShell
      title="تسجيل مرتجع"
      icon={<RotateCcw size={20} className="text-[#C89355]" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={createReturn.isPending}><CheckCircle2 size={16} /> تأكيد</Button>
        </>
      }
    >
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
          <Field label="المحل (صاحب الشراء)">
            <select value={form.customerId} onChange={e => set("customerId", e.target.value)} className={inputClass}>
              <option value="">— اختر محلاً —</option>
              {myShops?.map(s => <option key={s.customerId} value={s.customerId}>{s.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="تاريخ المرتجع"><input type="date" value={form.returnDate} onChange={e => set("returnDate", e.target.value)} className={inputClass} /></Field>
        <Field label="السبب"><input value={form.reason} onChange={e => set("reason", e.target.value)} className={inputClass} /></Field>
      </div>
    </ModalShell>
  );
}

export function CreateSettlementModal({ repId, onClose }: { repId: string; onClose: () => void }) {
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
    <ModalShell
      title="إنشاء تسوية"
      icon={<FileText size={20} className="text-[#C89355]" />}
      onClose={onClose}
      width="max-w-xl max-h-[90vh] flex flex-col"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={createSettlement.isPending}><CheckCircle2 size={16} /> إرسال للاعتماد</Button>
        </>
      }
    >
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
    </ModalShell>
  );
}

export function CreateShopModal({ repId, onClose }: { repId: string; onClose: () => void }) {
  const createShop = useCreateRepShop(repId);
  const { data: routes } = useRepRoutes(repId);
  const [form, setForm] = useState({ name: "", phone: "", address: "", routeId: "" });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error("اسم المحل مطلوب");
    await createShop.mutateAsync({
      name: form.name.trim(),
      phone: form.phone || undefined,
      address: form.address || undefined,
      routeId: form.routeId || undefined,
    });
    onClose();
  };

  return (
    <ModalShell
      title="أضف محلاً لخطي"
      icon={<Store size={20} className="text-[#C89355]" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={createShop.isPending}><CheckCircle2 size={16} /> إضافة</Button>
        </>
      }
    >
      <Field label="اسم المحل"><input value={form.name} onChange={e => set("name", e.target.value)} className={inputClass} placeholder="محل أبو أحمد" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="الهاتف"><input value={form.phone} onChange={e => set("phone", e.target.value)} className={inputClass} /></Field>
        <Field label="الخط المرتبط">
          <select value={form.routeId} onChange={e => set("routeId", e.target.value)} className={inputClass}>
            <option value="">— بدون —</option>
            {routes?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="العنوان"><input value={form.address} onChange={e => set("address", e.target.value)} className={inputClass} placeholder="الحي / الشارع" /></Field>
    </ModalShell>
  );
}

export function CreateRouteModal({ repId, onClose }: { repId: string; onClose: () => void }) {
  const createRoute = useCreateRepRoute(repId);
  const [form, setForm] = useState({ name: "", areas: "", schedule: "" });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error("اسم الخط مطلوب");
    const areas = form.areas.split(/[،,;]|،/).map(a => a.trim()).filter(Boolean);
    await createRoute.mutateAsync({
      name: form.name.trim(),
      areas: areas.length ? areas : undefined,
      schedule: form.schedule || undefined,
    });
    onClose();
  };

  return (
    <ModalShell
      title="خط جديد"
      icon={<RouteIcon size={20} className="text-[#C89355]" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={createRoute.isPending}><CheckCircle2 size={16} /> إنشاء</Button>
        </>
      }
    >
      <Field label="اسم الخط"><input value={form.name} onChange={e => set("name", e.target.value)} className={inputClass} placeholder="خط برامكة — باب سريحية" /></Field>
      <Field label="المناطق (افصل بينها بفاصلة)">
        <input value={form.areas} onChange={e => set("areas", e.target.value)} className={inputClass} placeholder="برامكة، باب سريحية، شارع الحمرا" />
      </Field>
      <Field label="الجدول"><input value={form.schedule} onChange={e => set("schedule", e.target.value)} className={inputClass} placeholder="صباحاً — الخميس" /></Field>
    </ModalShell>
  );
}