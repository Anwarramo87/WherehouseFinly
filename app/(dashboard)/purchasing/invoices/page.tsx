"use client";

import { useMemo, useState } from "react";
import {
  ReceiptText,
  Plus,
  Trash2,
  Send,
  Ban,
  Truck,
  Wallet,
  ChevronLeft,
} from "lucide-react";
import WmsPageShell from "@/components/wms/WmsPageShell";
import {
  Button,
  Empty,
  Field,
  Loading,
  Panel,
  Pill,
  Stat,
  StatusPill,
  TableFrame,
  fmtDate,
  fmtInt,
  fmtMoney,
  inputClass,
} from "@/components/wms/primitives";
import {
  useAddLandedCost,
  useAddPurchasePayment,
  useCancelPurchaseInvoice,
  useCreatePurchaseInvoice,
  usePostPurchaseInvoice,
  usePurchaseInvoice,
  usePurchaseInvoices,
  useSuppliers,
} from "@/hooks/useWms";
import { toNum } from "@/types/wms";
import { toast } from "react-hot-toast";

interface DraftLine {
  sku: string;
  quantity: number;
  unitCost: number;
  discountPercent: number;
  taxRate: number;
  batchNumber: string;
  productionDate: string;
  expiryDate: string;
  location: string;
}

const emptyLine = (): DraftLine => ({
  sku: "",
  quantity: 1,
  unitCost: 0,
  discountPercent: 0,
  taxRate: 0,
  batchNumber: "",
  productionDate: "",
  expiryDate: "",
  location: "WH-A",
});

export default function PurchaseInvoicesPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = usePurchaseInvoices({ page, limit: 25, status: status || undefined });
  const invoices = data?.data ?? [];

  const totals = useMemo(
    () => ({
      outstanding: invoices.reduce((s, i) => s + toNum(i.totalAmount) - toNum(i.paidAmount), 0),
      drafts: invoices.filter((i) => i.status === "DRAFT").length,
      posted: invoices.filter((i) => i.status !== "DRAFT" && i.status !== "CANCELLED").length,
    }),
    [invoices],
  );

  if (openId) {
    return <InvoiceDetail invoiceId={openId} onBack={() => setOpenId(null)} />;
  }

  return (
    <WmsPageShell
      group="purchasing"
      title="فواتير الشراء"
      subtitle="إدخال فواتير الموردين، توزيع المصاريف الملحقة، وترحيلها لتحديث المخزون والتكلفة."
      actions={
        <>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={`${inputClass} w-40`}
          >
            <option value="">كل الحالات</option>
            <option value="DRAFT">مسودات</option>
            <option value="POSTED">مُرحّلة</option>
            <option value="PARTIALLY_PAID">مدفوعة جزئياً</option>
            <option value="PAID">مدفوعة</option>
            <option value="CANCELLED">ملغاة</option>
          </select>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            فاتورة شراء
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="إجمالي الفواتير" value={fmtInt(data?.total)} icon={<ReceiptText size={16} />} />
        <Stat label="مسودات" value={fmtInt(totals.drafts)} tone={totals.drafts > 0 ? "warning" : "neutral"} />
        <Stat label="مُرحّلة" value={fmtInt(totals.posted)} tone="info" />
        <Stat label="رصيد مستحق (الصفحة)" value={fmtMoney(totals.outstanding, 0)} tone="danger" />
      </div>

      <Panel title="سجل الفواتير" icon={<ReceiptText size={20} />}>
        {isLoading ? (
          <Loading />
        ) : invoices.length === 0 ? (
          <Empty message="لا توجد فواتير شراء بعد. أنشئ واحدة يدوياً أو من أمر شراء قائم." />
        ) : (
          <>
            <TableFrame
              head={
                <>
                  <th>رقم الفاتورة</th>
                  <th>فاتورة المورد</th>
                  <th>المورد</th>
                  <th>التاريخ</th>
                  <th>الاستحقاق</th>
                  <th>الإجمالي</th>
                  <th>المدفوع</th>
                  <th>الرصيد</th>
                  <th>الحالة</th>
                  <th />
                </>
              }
            >
              {invoices.map((invoice) => {
                const balance = toNum(invoice.totalAmount) - toNum(invoice.paidAmount);
                const overdue =
                  invoice.dueDate !== null &&
                  new Date(invoice.dueDate) < new Date() &&
                  balance > 0;

                return (
                  <tr
                    key={invoice.id}
                    onClick={() => setOpenId(invoice.id)}
                    className="bg-white/50 hover:bg-white/90 transition-colors cursor-pointer [&>td]:px-4 [&>td]:py-3"
                  >
                    <td className="font-black text-[#263544]">{invoice.invoiceNumber}</td>
                    <td className="font-mono text-xs">{invoice.supplierInvoiceNumber ?? "—"}</td>
                    <td className="font-bold">{invoice.supplier?.name ?? "—"}</td>
                    <td className="text-xs font-bold">{fmtDate(invoice.invoiceDate)}</td>
                    <td className="text-xs font-bold">
                      {invoice.dueDate ? (
                        overdue ? (
                          <Pill tone="red">{fmtDate(invoice.dueDate)}</Pill>
                        ) : (
                          fmtDate(invoice.dueDate)
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="tabular-nums font-black">{fmtMoney(invoice.totalAmount)}</td>
                    <td className="tabular-nums">{fmtMoney(invoice.paidAmount)}</td>
                    <td className="tabular-nums font-bold text-red-700">{fmtMoney(balance)}</td>
                    <td>
                      <StatusPill status={invoice.status} />
                    </td>
                    <td>
                      <ChevronLeft size={16} className="text-[#C89355]" />
                    </td>
                  </tr>
                );
              })}
            </TableFrame>

            {(data?.totalPages ?? 1) > 1 ? (
              <div className="p-5 flex items-center justify-between gap-4 bg-white/40 border-t border-white/70">
                <span className="text-xs font-black text-[#263544]/60">
                  صفحة {data?.page} من {data?.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    السابق
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={page >= (data?.totalPages ?? 1)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Panel>

      {showCreate ? <CreateInvoiceModal onClose={() => setShowCreate(false)} /> : null}
    </WmsPageShell>
  );
}

// -------------------------------------------------------------------- detail

function InvoiceDetail({ invoiceId, onBack }: { invoiceId: string; onBack: () => void }) {
  const { data: invoice, isLoading } = usePurchaseInvoice(invoiceId);
  const post = usePostPurchaseInvoice();
  const cancel = useCancelPurchaseInvoice();
  const addLanded = useAddLandedCost();
  const addPayment = useAddPurchasePayment();

  const [landed, setLanded] = useState({ type: "freight", amount: "", allocationMethod: "VALUE", description: "" });
  const [payment, setPayment] = useState({ amount: "", method: "cash" });

  const isDraft = invoice?.status === "DRAFT";
  const balance = toNum(invoice?.totalAmount) - toNum(invoice?.paidAmount);

  return (
    <WmsPageShell
      group="purchasing"
      title={invoice?.invoiceNumber ?? "فاتورة شراء"}
      subtitle={
        invoice
          ? `${invoice.supplier?.name ?? ""} — ${fmtDate(invoice.invoiceDate)}${
              invoice.supplierInvoiceNumber ? ` — فاتورة المورد ${invoice.supplierInvoiceNumber}` : ""
            }`
          : ""
      }
      actions={
        <>
          <Button variant="ghost" onClick={onBack}>
            رجوع للقائمة
          </Button>
          {isDraft ? (
            <Button
              onClick={() => {
                if (
                  window.confirm(
                    "الترحيل يزيد المخزون، ينشئ الدفعات، ويعيد حساب متوسط التكلفة. العملية لا تُلغى إلا بقيد عكسي. متابعة؟",
                  )
                ) {
                  post.mutate(invoiceId);
                }
              }}
              loading={post.isPending}
            >
              <Send size={16} />
              ترحيل الفاتورة
            </Button>
          ) : null}
          {invoice && invoice.status !== "CANCELLED" ? (
            <Button
              variant="danger"
              onClick={() => {
                const reason = window.prompt("سبب الإلغاء؟");
                if (reason) cancel.mutate({ invoiceId, reason });
              }}
              loading={cancel.isPending}
            >
              <Ban size={16} />
              إلغاء
            </Button>
          ) : null}
        </>
      }
    >
      {isLoading || !invoice ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Stat label="الحالة" value={<StatusPill status={invoice.status} />} />
            <Stat label="الإجمالي قبل الضريبة" value={fmtMoney(invoice.subtotal)} />
            <Stat label="الضريبة" value={fmtMoney(invoice.taxAmount)} />
            <Stat
              label="المصاريف الملحقة"
              value={fmtMoney(invoice.landedCostTotal)}
              tone={toNum(invoice.landedCostTotal) > 0 ? "info" : "neutral"}
            />
            <Stat
              label="الرصيد المستحق"
              value={fmtMoney(balance)}
              tone={balance > 0 ? "danger" : "success"}
            />
          </div>

          <Panel title="بنود الفاتورة" icon={<ReceiptText size={20} />} className="mb-8">
            <TableFrame
              head={
                <>
                  <th>الصنف</th>
                  <th>الدفعة</th>
                  <th>الصلاحية</th>
                  <th>الكمية</th>
                  <th>سعر الوحدة</th>
                  <th>خصم</th>
                  <th>ضريبة</th>
                  <th>حصة المصاريف</th>
                  <th>التكلفة النهائية</th>
                  <th>الإجمالي</th>
                  <th>الموقع</th>
                </>
              }
            >
              {(invoice.items ?? []).map((item) => (
                <tr key={item.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-black text-[#263544]">{item.sku}</td>
                  <td className="font-mono text-xs">{item.batchNumber ?? "—"}</td>
                  <td className="text-xs font-bold">{fmtDate(item.expiryDate)}</td>
                  <td className="tabular-nums font-black">{fmtInt(item.quantity)}</td>
                  <td className="tabular-nums">{fmtMoney(item.unitCost)}</td>
                  <td className="tabular-nums text-xs">{fmtMoney(item.discountAmount)}</td>
                  <td className="tabular-nums text-xs">{fmtMoney(item.taxAmount)}</td>
                  <td className="tabular-nums text-xs text-sky-700">
                    {fmtMoney(item.allocatedLandedCost)}
                  </td>
                  <td className="tabular-nums font-bold text-[#8a5f2a]">{fmtMoney(item.finalUnitCost, 4)}</td>
                  <td className="tabular-nums font-black">{fmtMoney(item.lineTotal)}</td>
                  <td className="text-xs font-bold">{item.location}</td>
                </tr>
              ))}
            </TableFrame>
            <p className="px-6 py-4 text-[11px] font-bold text-[#263544]/50 bg-white/30 border-t border-white/70">
              «التكلفة النهائية» = سعر الشراء + حصة البند من المصاريف الملحقة. هي القيمة التي تُسجَّل على
              الدفعة وتُحتسب منها تكلفة البضاعة المباعة لاحقاً.
            </p>
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="المصاريف الملحقة (Landed Costs)" icon={<Truck size={20} />}>
              {(invoice.landedCosts ?? []).length === 0 ? (
                <Empty message="لا توجد مصاريف ملحقة." />
              ) : (
                <TableFrame
                  head={
                    <>
                      <th>النوع</th>
                      <th>الوصف</th>
                      <th>المبلغ</th>
                      <th>طريقة التوزيع</th>
                    </>
                  }
                >
                  {(invoice.landedCosts ?? []).map((cost) => (
                    <tr key={cost.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                      <td className="font-black">{LANDED_LABELS[cost.type] ?? cost.type}</td>
                      <td className="text-xs">{cost.description ?? "—"}</td>
                      <td className="tabular-nums font-bold">{fmtMoney(cost.amount)}</td>
                      <td>
                        <Pill tone="blue">{ALLOCATION_LABELS[cost.allocationMethod]}</Pill>
                      </td>
                    </tr>
                  ))}
                </TableFrame>
              )}

              {isDraft ? (
                <form
                  className="p-6 grid grid-cols-2 gap-3 border-t border-white/70 bg-white/30"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!landed.amount) return;
                    await addLanded.mutateAsync({
                      invoiceId,
                      type: landed.type,
                      amount: Number(landed.amount),
                      allocationMethod: landed.allocationMethod,
                      description: landed.description || undefined,
                    });
                    setLanded({ ...landed, amount: "", description: "" });
                  }}
                >
                  <Field label="النوع">
                    <select
                      value={landed.type}
                      onChange={(e) => setLanded((p) => ({ ...p, type: e.target.value }))}
                      className={inputClass}
                    >
                      {Object.entries(LANDED_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="المبلغ">
                    <input
                      type="number"
                      step="0.01"
                      value={landed.amount}
                      onChange={(e) => setLanded((p) => ({ ...p, amount: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="طريقة التوزيع">
                    <select
                      value={landed.allocationMethod}
                      onChange={(e) => setLanded((p) => ({ ...p, allocationMethod: e.target.value }))}
                      className={inputClass}
                    >
                      {Object.entries(ALLOCATION_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="الوصف">
                    <input
                      value={landed.description}
                      onChange={(e) => setLanded((p) => ({ ...p, description: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <div className="col-span-2">
                    <Button type="submit" loading={addLanded.isPending}>
                      <Plus size={16} />
                      إضافة مصروف
                    </Button>
                  </div>
                </form>
              ) : null}
            </Panel>

            <Panel title="الدفعات" icon={<Wallet size={20} />}>
              {(invoice.payments ?? []).length === 0 ? (
                <Empty message="لم تُسجَّل أي دفعة." />
              ) : (
                <TableFrame
                  head={
                    <>
                      <th>التاريخ</th>
                      <th>المبلغ</th>
                      <th>الطريقة</th>
                    </>
                  }
                >
                  {(invoice.payments ?? []).map((p) => (
                    <tr key={p.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                      <td className="text-xs font-bold">{fmtDate(p.createdAt)}</td>
                      <td className="tabular-nums font-black">{fmtMoney(p.amount)}</td>
                      <td className="text-xs font-bold">{PAYMENT_LABELS[p.method] ?? p.method}</td>
                    </tr>
                  ))}
                </TableFrame>
              )}

              {!isDraft && invoice.status !== "CANCELLED" && balance > 0 ? (
                <form
                  className="p-6 grid grid-cols-2 gap-3 border-t border-white/70 bg-white/30"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!payment.amount) return;
                    await addPayment.mutateAsync({
                      invoiceId,
                      amount: Number(payment.amount),
                      method: payment.method,
                    });
                    setPayment({ amount: "", method: "cash" });
                  }}
                >
                  <Field label={`المبلغ (الرصيد ${fmtMoney(balance)})`}>
                    <input
                      type="number"
                      step="0.01"
                      max={balance}
                      value={payment.amount}
                      onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="الطريقة">
                    <select
                      value={payment.method}
                      onChange={(e) => setPayment((p) => ({ ...p, method: e.target.value }))}
                      className={inputClass}
                    >
                      {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="col-span-2">
                    <Button type="submit" loading={addPayment.isPending}>
                      تسجيل الدفعة
                    </Button>
                  </div>
                </form>
              ) : isDraft ? (
                <p className="px-6 py-4 text-[11px] font-bold text-[#263544]/50">
                  الدفعات تُسجَّل بعد ترحيل الفاتورة.
                </p>
              ) : null}
            </Panel>
          </div>
        </>
      )}
    </WmsPageShell>
  );
}

const LANDED_LABELS: Record<string, string> = {
  freight: "شحن",
  customs: "جمارك",
  insurance: "تأمين",
  handling: "مناولة",
  other: "أخرى",
};

const ALLOCATION_LABELS: Record<string, string> = {
  VALUE: "حسب القيمة",
  QUANTITY: "حسب الكمية",
  WEIGHT: "حسب الوزن",
  MANUAL: "يدوي",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "نقداً",
  card: "بطاقة",
  transfer: "حوالة",
  cheque: "شيك",
};

// -------------------------------------------------------------- create modal

function CreateInvoiceModal({ onClose }: { onClose: () => void }) {
  const { data: suppliers } = useSuppliers();
  const create = useCreatePurchaseInvoice();

  const [supplierId, setSupplierId] = useState("");
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    let discount = 0;
    for (const line of lines) {
      const gross = line.quantity * line.unitCost;
      const lineDiscount = (gross * line.discountPercent) / 100;
      const net = gross - lineDiscount;
      subtotal += gross;
      discount += lineDiscount;
      tax += (net * line.taxRate) / 100;
    }
    return { subtotal, discount, tax, total: subtotal - discount + tax };
  }, [lines]);

  const setLine = (index: number, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-6 overflow-y-auto">
      <div className="bg-white rounded-[2rem] max-w-6xl w-full p-8 my-8" dir="rtl">
        <h3 className="text-xl font-black text-[#263544] mb-6">فاتورة شراء جديدة</h3>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!supplierId) {
              toast.error("اختر المورد");
              return;
            }
            const valid = lines.filter((l) => l.sku.trim() && l.quantity > 0);
            if (valid.length === 0) {
              toast.error("أضف بنداً واحداً على الأقل");
              return;
            }
            await create.mutateAsync({
              supplierId,
              supplierInvoiceNumber: supplierInvoiceNumber || undefined,
              invoiceDate,
              dueDate: dueDate || undefined,
              items: valid.map((line) => ({
                sku: line.sku.trim(),
                quantity: line.quantity,
                unitCost: line.unitCost,
                discountPercent: line.discountPercent || undefined,
                taxRate: line.taxRate || undefined,
                batchNumber: line.batchNumber || undefined,
                productionDate: line.productionDate || undefined,
                expiryDate: line.expiryDate || undefined,
                location: line.location || undefined,
              })),
            });
            onClose();
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Field label="المورد">
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">— اختر —</option>
                {(suppliers?.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="رقم فاتورة المورد">
              <input
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                placeholder="الرقم المطبوع على ورق المورد"
                className={inputClass}
              />
            </Field>
            <Field label="تاريخ الفاتورة">
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="تاريخ الاستحقاق">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </Field>
          </div>

          <div className="border-2 border-dashed border-[#C89355]/40 rounded-2xl overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-[#1a2530] text-[#C89355]">
                  <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:font-black [&>th]:whitespace-nowrap">
                    <th>SKU</th>
                    <th>الكمية</th>
                    <th>سعر الوحدة</th>
                    <th>خصم %</th>
                    <th>ضريبة %</th>
                    <th>رقم الدفعة</th>
                    <th>الإنتاج</th>
                    <th>الصلاحية</th>
                    <th>الموقع</th>
                    <th>الإجمالي</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line, index) => {
                    const gross = line.quantity * line.unitCost;
                    const net = gross - (gross * line.discountPercent) / 100;
                    const total = net + (net * line.taxRate) / 100;
                    return (
                      <tr key={index} className="[&>td]:px-2 [&>td]:py-2">
                        <td>
                          <input
                            value={line.sku}
                            onChange={(e) => setLine(index, { sku: e.target.value })}
                            className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold outline-none focus:border-[#C89355]"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => setLine(index, { quantity: Number(e.target.value) })}
                            className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold outline-none focus:border-[#C89355]"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            value={line.unitCost}
                            onChange={(e) => setLine(index, { unitCost: Number(e.target.value) })}
                            className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold outline-none focus:border-[#C89355]"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.1"
                            value={line.discountPercent}
                            onChange={(e) => setLine(index, { discountPercent: Number(e.target.value) })}
                            className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold outline-none focus:border-[#C89355]"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.1"
                            value={line.taxRate}
                            onChange={(e) => setLine(index, { taxRate: Number(e.target.value) })}
                            className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold outline-none focus:border-[#C89355]"
                          />
                        </td>
                        <td>
                          <input
                            value={line.batchNumber}
                            onChange={(e) => setLine(index, { batchNumber: e.target.value })}
                            placeholder="اختياري"
                            className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold outline-none focus:border-[#C89355]"
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            value={line.productionDate}
                            onChange={(e) => setLine(index, { productionDate: e.target.value })}
                            className="w-32 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold outline-none focus:border-[#C89355]"
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            value={line.expiryDate}
                            onChange={(e) => setLine(index, { expiryDate: e.target.value })}
                            className="w-32 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold outline-none focus:border-[#C89355]"
                          />
                        </td>
                        <td>
                          <input
                            value={line.location}
                            onChange={(e) => setLine(index, { location: e.target.value })}
                            className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold outline-none focus:border-[#C89355]"
                          />
                        </td>
                        <td className="tabular-nums font-black text-[#263544]">{fmtMoney(total)}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                            disabled={lines.length === 1}
                            className="p-1.5 rounded-lg bg-red-50 border border-red-200 disabled:opacity-30"
                          >
                            <Trash2 size={13} className="text-red-700" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <Button type="button" variant="ghost" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
                <Plus size={14} />
                إضافة بند
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[11px] font-black text-slate-500">المجموع</p>
                <p className="font-black tabular-nums">{fmtMoney(totals.subtotal)}</p>
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-500">الخصم</p>
                <p className="font-black tabular-nums text-red-700">{fmtMoney(totals.discount)}</p>
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-500">الضريبة</p>
                <p className="font-black tabular-nums">{fmtMoney(totals.tax)}</p>
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-500">الإجمالي</p>
                <p className="font-black tabular-nums text-lg text-[#8a5f2a]">{fmtMoney(totals.total)}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                إلغاء
              </Button>
              <Button type="submit" loading={create.isPending}>
                حفظ كمسودة
              </Button>
            </div>
          </div>

          <p className="text-[11px] font-bold text-slate-500 mt-4">
            تُحفظ الفاتورة كمسودة ولا تمسّ المخزون. المصاريف الملحقة تُضاف بعد الحفظ، ثم يأتي الترحيل ليحرّك
            المخزون ويعيد حساب متوسط التكلفة دفعة واحدة.
          </p>
        </form>
      </div>
    </div>
  );
}
