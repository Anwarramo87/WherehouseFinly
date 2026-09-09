"use client";

import { useMemo, useState } from "react";
import {
  Layers,
  Search,
  ShieldAlert,
  ShieldCheck,
  Printer,
  Plus,
  ScanLine,
  X,
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
  useBatches,
  useCreateBatch,
  useScanBarcode,
  useUpdateBatchStatus,
} from "@/hooks/useWms";
import apiClient from "@/lib/api-client";
import { toNum, type BatchLabel, type ProductBatch } from "@/types/wms";
import { toast } from "react-hot-toast";

const STATUS_FILTERS = [
  { value: "", label: "الكل" },
  { value: "AVAILABLE", label: "متاحة" },
  { value: "NEAR_EXPIRY", label: "قاربت الانتهاء" },
  { value: "QUARANTINE", label: "محجورة" },
  { value: "EXPIRED", label: "منتهية" },
  { value: "REJECTED", label: "مرفوضة" },
];

/** Days-left colour coding, shared by the cell and the summary tiles. */
const expiryTone = (days: number | null) => {
  if (days === null) return "slate" as const;
  if (days < 0) return "red" as const;
  if (days <= 30) return "red" as const;
  if (days <= 90) return "amber" as const;
  return "green" as const;
};

export default function BatchesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [scanCode, setScanCode] = useState("");
  const [labels, setLabels] = useState<BatchLabel[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useBatches({
    page,
    limit: 50,
    search: search || undefined,
    status: status || undefined,
    onlyInStock,
  });

  const setStatusMutation = useUpdateBatchStatus();
  const createBatch = useCreateBatch();
  const scan = useScanBarcode();

  const batches = data?.data ?? [];

  const summary = useMemo(() => {
    const value = batches.reduce((sum, b) => sum + toNum(b.unitCost) * b.quantity, 0);
    return {
      total: data?.total ?? 0,
      units: batches.reduce((sum, b) => sum + b.quantity, 0),
      value,
      quarantined: batches.filter((b) => b.status === "QUARANTINE").length,
      expiringSoon: batches.filter((b) => b.daysToExpiry !== null && b.daysToExpiry >= 0 && b.daysToExpiry <= 30)
        .length,
    };
  }, [batches, data?.total]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const printLabels = async (ids: string[]) => {
    if (ids.length === 0) {
      toast.error("اختر دفعة واحدة على الأقل");
      return;
    }
    try {
      const res = await apiClient.post<BatchLabel[]>("/batches/labels", { batchIds: ids });
      setLabels(res.data);
    } catch {
      toast.error("تعذّر توليد الملصقات");
    }
  };

  const handleScan = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!scanCode.trim()) return;
    const result = await scan.mutateAsync(scanCode.trim());
    if (result?.kind === "batch") {
      setSearch(result.batch.batchNumber);
      setScanCode("");
      toast.success(`الدفعة ${result.batch.batchNumber}`);
    } else if (result?.kind === "product") {
      setSearch(result.product.sku);
      setScanCode("");
      toast.success(`المنتج ${result.product.name}`);
    }
  };

  return (
    <WmsPageShell
      group="inventory"
      title="الدفعات وتواريخ الصلاحية"
      subtitle="تتبّع كل دفعة بتاريخ إنتاجها وصلاحيتها، مع الحجر وطباعة ملصقات الباركود."
      actions={
        <>
          <form onSubmit={handleScan} className="flex items-center gap-2">
            <div className="relative">
              <ScanLine size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C89355]" />
              <input
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                placeholder="امسح باركود دفعة..."
                className={`${inputClass} pr-10 w-56`}
              />
            </div>
            <Button type="submit" variant="ghost" loading={scan.isPending}>
              بحث
            </Button>
          </form>
          <Button variant="ghost" onClick={() => printLabels([...selected])}>
            <Printer size={16} />
            طباعة الملصقات ({selected.size})
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            دفعة جديدة
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Stat label="إجمالي الدفعات" value={fmtInt(summary.total)} icon={<Layers size={16} />} />
        <Stat label="الوحدات المعروضة" value={fmtInt(summary.units)} />
        <Stat label="قيمة المعروض" value={fmtMoney(summary.value, 0)} tone="info" />
        <Stat
          label="محجورة"
          value={fmtInt(summary.quarantined)}
          tone={summary.quarantined > 0 ? "warning" : "neutral"}
          icon={<ShieldAlert size={16} />}
        />
        <Stat
          label="تنتهي خلال 30 يوم"
          value={fmtInt(summary.expiringSoon)}
          tone={summary.expiringSoon > 0 ? "danger" : "neutral"}
        />
      </div>

      <Panel
        title="سجل الدفعات"
        icon={<Layers size={20} />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-black text-[#263544]/70">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => {
                  setOnlyInStock(e.target.checked);
                  setPage(1);
                }}
                className="accent-[#C89355]"
              />
              التي عليها رصيد فقط
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className={`${inputClass} w-40`}
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C89355]" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="SKU أو رقم دفعة"
                className={`${inputClass} pr-10 w-52`}
              />
            </div>
          </div>
        }
      >
        {isLoading ? (
          <Loading />
        ) : batches.length === 0 ? (
          <Empty message="لا توجد دفعات مطابقة. أنشئ دفعة يدوياً أو رحّل فاتورة شراء تحمل بيانات دفعة." />
        ) : (
          <>
            <TableFrame
              head={
                <>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === batches.length && batches.length > 0}
                      onChange={(e) =>
                        setSelected(e.target.checked ? new Set(batches.map((b) => b.id)) : new Set())
                      }
                      className="accent-[#C89355]"
                    />
                  </th>
                  <th>الصنف</th>
                  <th>رقم الدفعة</th>
                  <th>الإنتاج</th>
                  <th>الصلاحية</th>
                  <th>المتبقي</th>
                  <th>الكمية</th>
                  <th>محجوز</th>
                  <th>التكلفة</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </>
              }
            >
              {batches.map((batch) => (
                <BatchRow
                  key={batch.id}
                  batch={batch}
                  checked={selected.has(batch.id)}
                  onToggle={() => toggle(batch.id)}
                  onQuarantine={(reason) =>
                    setStatusMutation.mutate({ batchId: batch.id, status: "QUARANTINE", reason })
                  }
                  onRelease={() => setStatusMutation.mutate({ batchId: batch.id, status: "AVAILABLE" })}
                  onPrint={() => printLabels([batch.id])}
                />
              ))}
            </TableFrame>

            {(data?.totalPages ?? 1) > 1 ? (
              <div className="p-5 flex items-center justify-between gap-4 bg-white/40 border-t border-white/70">
                <span className="text-xs font-black text-[#263544]/60">
                  صفحة {data?.page} من {data?.totalPages} — {fmtInt(data?.total)} دفعة
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

      {labels ? <LabelSheet labels={labels} onClose={() => setLabels(null)} /> : null}
      {showCreate ? (
        <CreateBatchModal
          onClose={() => setShowCreate(false)}
          onSubmit={async (payload) => {
            await createBatch.mutateAsync(payload);
            setShowCreate(false);
          }}
          saving={createBatch.isPending}
        />
      ) : null}
    </WmsPageShell>
  );
}

// ------------------------------------------------------------------------ row

function BatchRow({
  batch,
  checked,
  onToggle,
  onQuarantine,
  onRelease,
  onPrint,
}: {
  batch: ProductBatch;
  checked: boolean;
  onToggle: () => void;
  onQuarantine: (reason: string) => void;
  onRelease: () => void;
  onPrint: () => void;
}) {
  const tone = expiryTone(batch.daysToExpiry);
  const frozen = batch.status === "QUARANTINE" || batch.status === "REJECTED";

  return (
    <tr className="bg-white/50 hover:bg-white/80 transition-colors [&>td]:px-4 [&>td]:py-3">
      <td>
        <input type="checkbox" checked={checked} onChange={onToggle} className="accent-[#C89355]" />
      </td>
      <td className="font-black text-[#263544]">{batch.sku}</td>
      <td className="font-mono text-xs font-bold">{batch.batchNumber}</td>
      <td className="text-xs font-bold text-[#263544]/70">{fmtDate(batch.productionDate)}</td>
      <td className="text-xs font-bold text-[#263544]/70">{fmtDate(batch.expiryDate)}</td>
      <td>
        {batch.daysToExpiry === null ? (
          <span className="text-xs font-bold text-[#263544]/40">بلا تاريخ</span>
        ) : (
          <Pill tone={tone}>
            {batch.daysToExpiry < 0
              ? `منتهية منذ ${Math.abs(batch.daysToExpiry)} يوم`
              : `${batch.daysToExpiry} يوم`}
          </Pill>
        )}
      </td>
      <td className="font-black tabular-nums">{fmtInt(batch.quantity)}</td>
      <td className="tabular-nums text-[#263544]/70">{fmtInt(batch.reserved)}</td>
      <td className="tabular-nums text-xs font-bold">{fmtMoney(batch.unitCost)}</td>
      <td>
        <StatusPill status={batch.status} />
      </td>
      <td>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrint}
            title="طباعة ملصق"
            className="p-2 rounded-xl bg-white/70 border border-white hover:border-[#C89355]/40 transition-colors"
          >
            <Printer size={14} className="text-[#263544]/70" />
          </button>
          {frozen ? (
            <button
              onClick={onRelease}
              title="فك الحجر وإتاحة البيع"
              className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <ShieldCheck size={14} className="text-emerald-700" />
            </button>
          ) : (
            <button
              onClick={() => {
                const reason = window.prompt("سبب الحجر؟", "حجر يدوي للفحص");
                if (reason) onQuarantine(reason);
              }}
              title="حجر الدفعة ومنع بيعها"
              className="p-2 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              <ShieldAlert size={14} className="text-amber-700" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// --------------------------------------------------------------- label sheet

/**
 * Print sheet. The SVG comes from the server already encoded, so what the
 * printer puts on the shelf is byte-for-byte what the scanner was told to
 * expect — no client-side encoder to disagree with it.
 */
function LabelSheet({ labels, onClose }: { labels: BatchLabel[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 print:bg-white print:p-0">
      <div className="bg-white rounded-[2rem] max-w-5xl w-full max-h-[85vh] overflow-y-auto p-8 print:rounded-none print:max-h-none print:shadow-none">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <h3 className="text-xl font-black text-[#263544]">ملصقات الدفعات ({labels.length})</h3>
          <div className="flex gap-2">
            <Button onClick={() => window.print()}>
              <Printer size={16} />
              طباعة
            </Button>
            <Button variant="ghost" onClick={onClose}>
              <X size={16} />
              إغلاق
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {labels.map((label) => (
            <div
              key={label.barcode}
              className="border-2 border-dashed border-[#263544]/40 rounded-2xl p-4 break-inside-avoid"
              dir="rtl"
            >
              <p className="font-black text-[#263544] text-sm">{label.productName}</p>
              <p className="text-xs font-bold text-[#263544]/60 mb-2">{label.sku}</p>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-bold text-[#263544]/80 mb-3">
                <span>الدفعة: {label.batchNumber}</span>
                <span>الكمية: {fmtInt(label.quantity)} {label.unit}</span>
                <span>الإنتاج: {label.productionDate ?? "—"}</span>
                <span className="text-red-700">الصلاحية: {label.expiryDate ?? "—"}</span>
              </div>
              <div
                className="flex justify-center bg-white"
                dangerouslySetInnerHTML={{ __html: label.svg }}
              />
              <p className="text-center text-[10px] font-mono text-[#263544]/50 mt-1">{label.gs1}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- create modal

function CreateBatchModal({
  onClose,
  onSubmit,
  saving,
}: {
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    sku: "",
    batchNumber: "",
    productionDate: "",
    expiryDate: "",
    unitCost: "",
    notes: "",
  });

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-[2rem] max-w-lg w-full p-8" dir="rtl">
        <h3 className="text-xl font-black text-[#263544] mb-6">دفعة جديدة</h3>

        <form
          className="grid grid-cols-2 gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.sku.trim() || !form.batchNumber.trim()) {
              toast.error("الصنف ورقم الدفعة مطلوبان");
              return;
            }
            await onSubmit({
              sku: form.sku.trim(),
              batchNumber: form.batchNumber.trim(),
              productionDate: form.productionDate || undefined,
              expiryDate: form.expiryDate || undefined,
              unitCost: form.unitCost ? Number(form.unitCost) : undefined,
              notes: form.notes || undefined,
            });
          }}
        >
          <Field label="SKU الصنف">
            <input value={form.sku} onChange={set("sku")} className={inputClass} required />
          </Field>
          <Field label="رقم الدفعة">
            <input value={form.batchNumber} onChange={set("batchNumber")} className={inputClass} required />
          </Field>
          <Field label="تاريخ الإنتاج">
            <input type="date" value={form.productionDate} onChange={set("productionDate")} className={inputClass} />
          </Field>
          <Field label="تاريخ الصلاحية">
            <input type="date" value={form.expiryDate} onChange={set("expiryDate")} className={inputClass} />
          </Field>
          <Field label="تكلفة الوحدة">
            <input type="number" step="0.01" value={form.unitCost} onChange={set("unitCost")} className={inputClass} />
          </Field>
          <div className="col-span-2">
            <Field label="ملاحظات">
              <input value={form.notes} onChange={set("notes")} className={inputClass} />
            </Field>
          </div>

          <p className="col-span-2 text-[11px] font-bold text-[#263544]/50">
            إن كان الصنف مضبوطاً على التتبّع بالدفعات فتاريخ الصلاحية إلزامي — ويمكن اشتقاقه تلقائياً من
            تاريخ الإنتاج إذا كان للصنف عمر افتراضي محدّد.
          </p>

          <div className="col-span-2 flex justify-end gap-2 mt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" loading={saving}>
              حفظ الدفعة
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
