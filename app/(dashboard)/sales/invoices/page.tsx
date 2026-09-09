"use client";

import { useMemo, useState } from "react";
import {
  ReceiptText,
  Plus,
  Trash2,
  Send,
  Ban,
  Wallet,
  ChevronLeft,
  FileText,
  Layers,
  AlertTriangle,
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
  useAddSalesPayment,
  useAllocateBatches,
  useCancelSalesInvoice,
  useCreateSalesInvoice,
  useCustomers,
  usePostSalesInvoice,
  usePriceTiers,
  useQuote,
  useSalesInvoice,
  useSalesInvoices,
} from "@/hooks/useWms";
import { toNum, type AllocationPlan, type Quote } from "@/types/wms";
import { toast } from "react-hot-toast";

interface DraftLine {
  sku: string;
  quantity: number;
  unitPrice: string;
  discountPercent: number;
  location: string;
}

const emptyLine = (): DraftLine => ({
  sku: "",
  quantity: 1,
  unitPrice: "",
  discountPercent: 0,
  location: "WH-A",
});

export default function SalesInvoicesPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useSalesInvoices({ page, limit: 25, status: status || undefined });
  const invoices = data?.data ?? [];

  const totals = useMemo(() => {
    const receivable = invoices.reduce((s, i) => s + toNum(i.totalAmount) - toNum(i.paidAmount), 0);
    const revenue = invoices
      .filter((i) => i.status !== "DRAFT" && i.status !== "CANCELLED")
      .reduce((s, i) => s + toNum(i.totalAmount), 0);
    const margin = invoices
      .filter((i) => i.status !== "DRAFT" && i.status !== "CANCELLED")
      .reduce((s, i) => s + toNum(i.subtotal) - toNum(i.discountAmount) - toNum(i.cogsAmount), 0);
    return { receivable, revenue, margin };
  }, [invoices]);

  if (openId) return <SalesInvoiceDetail invoiceId={openId} onBack={() => setOpenId(null)} />;

  return (
    <WmsPageShell
      group="sales"
      title="فواتير البيع"
      subtitle="إصدار الفواتير بالتسعير والضرائب، سحب الدفعات وفق FEFO، وإصدار إذن الخروج عند الترحيل."
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
            فاتورة بيع
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="عدد الفواتير" value={fmtInt(data?.total)} icon={<ReceiptText size={16} />} />
        <Stat label="إيراد الصفحة" value={fmtMoney(totals.revenue, 0)} tone="info" />
        <Stat label="هامش الربح" value={fmtMoney(totals.margin, 0)} tone="success" />
        <Stat label="ذمم مدينة" value={fmtMoney(totals.receivable, 0)} tone="danger" />
      </div>

      <Panel title="سجل الفواتير" icon={<ReceiptText size={20} />}>
        {isLoading ? (
          <Loading />
        ) : invoices.length === 0 ? (
          <Empty message="لا توجد فواتير بيع بعد." />
        ) : (
          <>
            <TableFrame
              head={
                <>
                  <th>رقم الفاتورة</th>
                  <th>العميل</th>
                  <th>التاريخ</th>
                  <th>الإجمالي</th>
                  <th>تكلفة المبيع</th>
                  <th>الهامش</th>
                  <th>المدفوع</th>
                  <th>الحالة</th>
                  <th />
                </>
              }
            >
              {invoices.map((invoice) => {
                const margin =
                  toNum(invoice.subtotal) - toNum(invoice.discountAmount) - toNum(invoice.cogsAmount);
                const posted = invoice.status !== "DRAFT" && invoice.status !== "CANCELLED";
                return (
                  <tr
                    key={invoice.id}
                    onClick={() => setOpenId(invoice.id)}
                    className="bg-white/50 hover:bg-white/90 transition-colors cursor-pointer [&>td]:px-4 [&>td]:py-3"
                  >
                    <td className="font-black text-[#263544]">{invoice.invoiceNumber}</td>
                    <td className="font-bold">{invoice.customer?.name ?? "—"}</td>
                    <td className="text-xs font-bold">{fmtDate(invoice.invoiceDate)}</td>
                    <td className="tabular-nums font-black">{fmtMoney(invoice.totalAmount)}</td>
                    <td className="tabular-nums text-xs">{posted ? fmtMoney(invoice.cogsAmount) : "—"}</td>
                    <td className="tabular-nums font-bold">
                      {posted ? (
                        <span className={margin >= 0 ? "text-emerald-700" : "text-red-700"}>
                          {fmtMoney(margin)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="tabular-nums">{fmtMoney(invoice.paidAmount)}</td>
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

      {showCreate ? <CreateSalesInvoiceModal onClose={() => setShowCreate(false)} /> : null}
    </WmsPageShell>
  );
}

// -------------------------------------------------------------------- detail

function SalesInvoiceDetail({ invoiceId, onBack }: { invoiceId: string; onBack: () => void }) {
  const { data: invoice, isLoading } = useSalesInvoice(invoiceId);
  const post = usePostSalesInvoice();
  const cancel = useCancelSalesInvoice();
  const addPayment = useAddSalesPayment();
  const [payment, setPayment] = useState({ amount: "", method: "cash" });

  const isDraft = invoice?.status === "DRAFT";
  const balance = toNum(invoice?.totalAmount) - toNum(invoice?.paidAmount);
  const margin =
    toNum(invoice?.subtotal) - toNum(invoice?.discountAmount) - toNum(invoice?.cogsAmount);

  return (
    <WmsPageShell
      group="sales"
      title={invoice?.invoiceNumber ?? "فاتورة بيع"}
      subtitle={invoice ? `${invoice.customer?.name ?? ""} — ${fmtDate(invoice.invoiceDate)}` : ""}
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
                    "الترحيل يخصم المخزون وفق FEFO ويصدر إذن الخروج ويثبّت تكلفة المبيع. متابعة؟",
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
            <Stat label="الإجمالي" value={fmtMoney(invoice.totalAmount)} />
            <Stat label="الضريبة" value={fmtMoney(invoice.taxAmount)} />
            <Stat
              label="الهامش"
              value={fmtMoney(margin)}
              tone={margin >= 0 ? "success" : "danger"}
              hint={invoice.status === "DRAFT" ? "يُحتسب عند الترحيل" : undefined}
            />
            <Stat label="الرصيد" value={fmtMoney(balance)} tone={balance > 0 ? "danger" : "success"} />
          </div>

          <Panel title="بنود الفاتورة" icon={<ReceiptText size={20} />} className="mb-8">
            <TableFrame
              head={
                <>
                  <th>الصنف</th>
                  <th>الدفعة المسحوبة</th>
                  <th>الصلاحية</th>
                  <th>الكمية</th>
                  <th>سعر الوحدة</th>
                  <th>خصم</th>
                  <th>ضريبة</th>
                  <th>تكلفة الوحدة</th>
                  <th>الإجمالي</th>
                </>
              }
            >
              {(invoice.items ?? []).map((item) => (
                <tr key={item.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-black text-[#263544]">{item.sku}</td>
                  <td className="font-mono text-xs">
                    {item.batchNumber ? (
                      <Pill tone="gold">{item.batchNumber}</Pill>
                    ) : (
                      <span className="text-[#263544]/40">بلا تتبّع</span>
                    )}
                  </td>
                  <td className="text-xs font-bold">{fmtDate(item.expiryDate)}</td>
                  <td className="tabular-nums font-black">{fmtInt(item.quantity)}</td>
                  <td className="tabular-nums">{fmtMoney(item.unitPrice)}</td>
                  <td className="tabular-nums text-xs text-red-700">{fmtMoney(item.discountAmount)}</td>
                  <td className="tabular-nums text-xs">{fmtMoney(item.taxAmount)}</td>
                  <td className="tabular-nums text-xs text-[#8a5f2a]">
                    {toNum(item.unitCost) > 0 ? fmtMoney(item.unitCost, 4) : "—"}
                  </td>
                  <td className="tabular-nums font-black">{fmtMoney(item.lineTotal)}</td>
                </tr>
              ))}
            </TableFrame>
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="أذون الخروج" icon={<FileText size={20} />}>
              {(invoice.deliveryNotes ?? []).length === 0 ? (
                <Empty message="يصدر إذن الخروج تلقائياً عند ترحيل الفاتورة." />
              ) : (
                (invoice.deliveryNotes ?? []).map((note) => (
                  <div key={note.id} className="p-6 border-b border-white/70 last:border-0">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-black text-[#263544]">{note.noteNumber}</p>
                      <StatusPill status={note.status.toUpperCase()} />
                    </div>
                    <div className="space-y-1">
                      {(note.items ?? []).map((line) => (
                        <p key={line.id} className="text-xs font-bold text-[#263544]/70">
                          {line.sku} — {fmtInt(line.quantity)} وحدة من {line.location}
                          {line.batchNumber ? ` (دفعة ${line.batchNumber})` : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </Panel>

            <Panel title="الدفعات" icon={<Wallet size={20} />}>
              {!isDraft && invoice.status !== "CANCELLED" && balance > 0 ? (
                <form
                  className="p-6 grid grid-cols-2 gap-3"
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
                      <option value="cash">نقداً</option>
                      <option value="card">بطاقة</option>
                      <option value="transfer">حوالة</option>
                      <option value="cheque">شيك</option>
                    </select>
                  </Field>
                  <div className="col-span-2">
                    <Button type="submit" loading={addPayment.isPending}>
                      تسجيل الدفعة
                    </Button>
                  </div>
                </form>
              ) : (
                <Empty
                  message={
                    isDraft
                      ? "الدفعات تُسجَّل بعد ترحيل الفاتورة."
                      : balance <= 0
                        ? "الفاتورة مسدّدة بالكامل."
                        : "لا يمكن تسجيل دفعات على فاتورة ملغاة."
                  }
                />
              )}
            </Panel>
          </div>
        </>
      )}
    </WmsPageShell>
  );
}

// -------------------------------------------------------------- create modal

function CreateSalesInvoiceModal({ onClose }: { onClose: () => void }) {
  const { data: customers } = useCustomers();
  const { data: tiers } = usePriceTiers();
  const create = useCreateSalesInvoice();
  const quote = useQuote();
  const allocate = useAllocateBatches();

  const [customerId, setCustomerId] = useState("");
  const [priceTierId, setPriceTierId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [priced, setPriced] = useState<Quote | null>(null);
  const [plans, setPlans] = useState<Record<string, AllocationPlan>>({});

  const setLine = (index: number, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  /**
   * Prices the basket server-side rather than in the browser: tier rules,
   * quantity breaks and the product's tax rate all live there, and a second
   * implementation here would eventually disagree with the invoice that gets
   * saved.
   */
  const refreshQuote = async () => {
    const valid = lines.filter((l) => l.sku.trim() && l.quantity > 0);
    if (valid.length === 0) {
      toast.error("أضف بنداً واحداً على الأقل");
      return;
    }

    const result = await quote.mutateAsync({
      customerId: customerId || undefined,
      priceTierId: priceTierId || undefined,
      items: valid.map((l) => ({
        sku: l.sku.trim(),
        quantity: l.quantity,
        unitPrice: l.unitPrice ? Number(l.unitPrice) : undefined,
        discountPercent: l.discountPercent || undefined,
      })),
    });
    setPriced(result);

    // FEFO preview per line, so a shortfall or a quarantined lot surfaces
    // before the customer is promised anything.
    const next: Record<string, AllocationPlan> = {};
    for (const line of valid) {
      try {
        next[line.sku] = await allocate.mutateAsync({
          sku: line.sku.trim(),
          quantity: line.quantity,
          strategy: "FEFO",
        });
      } catch {
        // A non-batch-tracked SKU has no plan; the absence is the answer.
      }
    }
    setPlans(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-6 overflow-y-auto">
      <div className="bg-white rounded-[2rem] max-w-5xl w-full p-8 my-8" dir="rtl">
        <h3 className="text-xl font-black text-[#263544] mb-6">فاتورة بيع جديدة</h3>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!customerId) {
              toast.error("اختر العميل");
              return;
            }
            const valid = lines.filter((l) => l.sku.trim() && l.quantity > 0);
            if (valid.length === 0) {
              toast.error("أضف بنداً واحداً على الأقل");
              return;
            }
            await create.mutateAsync({
              customerId,
              priceTierId: priceTierId || undefined,
              invoiceDate,
              dueDate: dueDate || undefined,
              items: valid.map((l) => ({
                sku: l.sku.trim(),
                quantity: l.quantity,
                unitPrice: l.unitPrice ? Number(l.unitPrice) : undefined,
                discountPercent: l.discountPercent || undefined,
                location: l.location || undefined,
              })),
            });
            onClose();
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Field label="العميل">
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">— اختر —</option>
                {(customers?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="فئة التسعير">
              <select
                value={priceTierId}
                onChange={(e) => setPriceTierId(e.target.value)}
                className={inputClass}
              >
                <option value="">فئة العميل الافتراضية</option>
                {(tiers ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="تاريخ الفاتورة">
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="تاريخ الاستحقاق">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </Field>
          </div>

          <div className="border-2 border-dashed border-[#C89355]/40 rounded-2xl overflow-hidden mb-6">
            <table className="w-full text-xs text-right">
              <thead className="bg-[#1a2530] text-[#C89355]">
                <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:font-black">
                  <th>SKU</th>
                  <th>الكمية</th>
                  <th>سعر خاص</th>
                  <th>خصم %</th>
                  <th>الموقع</th>
                  <th>السعر المحسوب</th>
                  <th>دفعة FEFO</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, index) => {
                  const quoted = priced?.lines.find((l) => l.sku === line.sku.trim());
                  const plan = plans[line.sku.trim()];
                  return (
                    <tr key={index} className="[&>td]:px-2 [&>td]:py-2">
                      <td>
                        <input
                          value={line.sku}
                          onChange={(e) => setLine(index, { sku: e.target.value })}
                          className="w-32 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold outline-none focus:border-[#C89355]"
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
                          value={line.unitPrice}
                          onChange={(e) => setLine(index, { unitPrice: e.target.value })}
                          placeholder="تلقائي"
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
                          value={line.location}
                          onChange={(e) => setLine(index, { location: e.target.value })}
                          className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold outline-none focus:border-[#C89355]"
                        />
                      </td>
                      <td className="text-xs">
                        {quoted ? (
                          <div>
                            <span className="font-black tabular-nums">{fmtMoney(quoted.lineTotal)}</span>
                            <p className="text-[10px] font-mono text-slate-400">{quoted.priceSource}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="text-xs">
                        {!plan ? (
                          <span className="text-slate-400">—</span>
                        ) : plan.shortfall > 0 ? (
                          <span className="inline-flex items-center gap-1 text-red-700 font-black">
                            <AlertTriangle size={12} />
                            نقص {plan.shortfall}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <Layers size={12} />
                            {plan.allocations.map((a) => a.batchNumber).join("، ")}
                          </span>
                        )}
                      </td>
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
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
                <Plus size={14} />
                إضافة بند
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={refreshQuote}
                loading={quote.isPending || allocate.isPending}
              >
                حساب السعر واقتراح الدفعات
              </Button>
            </div>
          </div>

          {priced ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-6">
              <div>
                <p className="text-[11px] font-black text-slate-500">المجموع</p>
                <p className="font-black tabular-nums">{fmtMoney(priced.subtotal)}</p>
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-500">الخصم</p>
                <p className="font-black tabular-nums text-red-700">{fmtMoney(priced.discountAmount)}</p>
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-500">الضريبة</p>
                <p className="font-black tabular-nums">{fmtMoney(priced.taxAmount)}</p>
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-500">
                  الإجمالي {priced.priceTier ? `(${priced.priceTier.name})` : ""}
                </p>
                <p className="font-black tabular-nums text-lg text-[#8a5f2a]">{fmtMoney(priced.total)}</p>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" loading={create.isPending}>
              حفظ كمسودة
            </Button>
          </div>

          <p className="text-[11px] font-bold text-slate-500 mt-4">
            «سعر خاص» فارغ يعني أن السعر يأتي من فئة التسعير وكسور الكمية. اقتراح الدفعات استرشادي هنا —
            يُعاد حسابه فعلياً لحظة الترحيل مقابل المخزون الحيّ.
          </p>
        </form>
      </div>
    </div>
  );
}
