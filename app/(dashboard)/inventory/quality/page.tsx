"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, Plus, Check, X } from "lucide-react";
import WmsPageShell from "@/components/wms/WmsPageShell";
import {
  Button,
  Empty,
  Field,
  Loading,
  Panel,
  Stat,
  StatusPill,
  TableFrame,
  fmtDate,
  fmtInt,
  inputClass,
} from "@/components/wms/primitives";
import {
  useCreateInspection,
  useInspections,
  usePendingQc,
  useRecordInspection,
  useUpdateBatchStatus,
} from "@/hooks/useWms";
import type { QualityInspection } from "@/types/wms";
import { toast } from "react-hot-toast";

export default function QualityPage() {
  const { data: pending, isLoading: pendingLoading } = usePendingQc();
  const { data: inspections } = useInspections({ limit: 50 });
  const createInspection = useCreateInspection();
  const releaseBatch = useUpdateBatchStatus();
  const [recording, setRecording] = useState<QualityInspection | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <WmsPageShell
      group="inventory"
      title="فحص الجودة والحجر"
      subtitle="فحص البضاعة الواردة قبل إتاحتها للبيع — الدفعة تبقى محجورة حتى تُعتمد."
      actions={
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          فحص جديد
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat
          label="فحوصات معلّقة"
          value={fmtInt(pending?.pendingInspections)}
          tone={(pending?.pendingInspections ?? 0) > 0 ? "warning" : "neutral"}
          icon={<ShieldAlert size={16} />}
        />
        <Stat
          label="دفعات محجورة"
          value={fmtInt(pending?.quarantinedBatches)}
          tone={(pending?.quarantinedBatches ?? 0) > 0 ? "danger" : "neutral"}
        />
        <Stat label="وحدات محجوزة عن البيع" value={fmtInt(pending?.quarantinedUnits)} tone="warning" />
        <Stat label="إجمالي الفحوصات" value={fmtInt(inspections?.total)} tone="info" />
      </div>

      <Panel title="طابور الفحص" icon={<ShieldAlert size={20} />} className="mb-6">
        {pendingLoading ? (
          <Loading />
        ) : (pending?.inspections.length ?? 0) === 0 ? (
          <Empty message="لا توجد فحوصات معلّقة." />
        ) : (
          <TableFrame
            head={
              <>
                <th>رقم الفحص</th>
                <th>الصنف</th>
                <th>الكمية المفحوصة</th>
                <th>تاريخ الفتح</th>
                <th>إجراء</th>
              </>
            }
          >
            {(pending?.inspections ?? []).map((inspection) => (
              <tr key={inspection.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                <td className="font-mono text-xs font-black">{inspection.inspectionNumber}</td>
                <td className="font-black text-[#263544]">{inspection.sku}</td>
                <td className="tabular-nums font-black">{fmtInt(inspection.quantityInspected)}</td>
                <td className="text-xs font-bold">{fmtDate(inspection.createdAt)}</td>
                <td>
                  <Button variant="ghost" onClick={() => setRecording(inspection)}>
                    تسجيل النتيجة
                  </Button>
                </td>
              </tr>
            ))}
          </TableFrame>
        )}
      </Panel>

      <Panel title="الدفعات المحجورة" icon={<ShieldCheck size={20} />} className="mb-6">
        {(pending?.quarantined.length ?? 0) === 0 ? (
          <Empty message="لا توجد دفعات محجورة — كل المخزون متاح للبيع." />
        ) : (
          <TableFrame
            head={
              <>
                <th>الصنف</th>
                <th>الدفعة</th>
                <th>الكمية</th>
                <th>الصلاحية</th>
                <th>سبب الحجر</th>
                <th>إجراء</th>
              </>
            }
          >
            {(pending?.quarantined ?? []).map((batch) => (
              <tr key={batch.id} className="bg-amber-50/60 [&>td]:px-4 [&>td]:py-3">
                <td className="font-black text-[#263544]">{batch.sku}</td>
                <td className="font-mono text-xs">{batch.batchNumber}</td>
                <td className="tabular-nums font-black">{fmtInt(batch.quantity)}</td>
                <td className="text-xs font-bold">{fmtDate(batch.expiryDate)}</td>
                <td className="text-xs font-bold text-amber-800">{batch.quarantineReason ?? "—"}</td>
                <td>
                  <button
                    onClick={() => {
                      if (window.confirm(`فك الحجر عن الدفعة ${batch.batchNumber} وإتاحتها للبيع؟`)) {
                        releaseBatch.mutate({ batchId: batch.id, status: "AVAILABLE" });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-black text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <Check size={13} />
                    فك الحجر
                  </button>
                </td>
              </tr>
            ))}
          </TableFrame>
        )}
      </Panel>

      <Panel title="سجل الفحوصات" icon={<ShieldCheck size={20} />}>
        {(inspections?.data.length ?? 0) === 0 ? (
          <Empty message="لا توجد فحوصات مسجّلة." />
        ) : (
          <TableFrame
            head={
              <>
                <th>رقم الفحص</th>
                <th>الصنف</th>
                <th>مفحوص</th>
                <th>ناجح</th>
                <th>راسب</th>
                <th>النتيجة</th>
                <th>السبب</th>
                <th>التاريخ</th>
              </>
            }
          >
            {(inspections?.data ?? []).map((inspection) => (
              <tr key={inspection.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                <td className="font-mono text-xs font-black">{inspection.inspectionNumber}</td>
                <td className="font-black text-[#263544]">{inspection.sku}</td>
                <td className="tabular-nums">{fmtInt(inspection.quantityInspected)}</td>
                <td className="tabular-nums text-emerald-700 font-bold">
                  {fmtInt(inspection.quantityPassed)}
                </td>
                <td className="tabular-nums text-red-700 font-bold">{fmtInt(inspection.quantityFailed)}</td>
                <td>
                  <StatusPill status={inspection.status} />
                </td>
                <td className="text-xs font-bold text-[#263544]/70">{inspection.failureReason ?? "—"}</td>
                <td className="text-xs font-bold">{fmtDate(inspection.inspectedAt ?? inspection.createdAt)}</td>
              </tr>
            ))}
          </TableFrame>
        )}
      </Panel>

      {showCreate ? (
        <CreateInspectionModal
          onClose={() => setShowCreate(false)}
          onSubmit={async (payload) => {
            await createInspection.mutateAsync(payload);
            setShowCreate(false);
          }}
          saving={createInspection.isPending}
        />
      ) : null}

      {recording ? (
        <RecordInspectionModal inspection={recording} onClose={() => setRecording(null)} />
      ) : null}
    </WmsPageShell>
  );
}

function CreateInspectionModal({
  onClose,
  onSubmit,
  saving,
}: {
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState({ sku: "", quantityInspected: 1, batchId: "", notes: "" });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-[2rem] max-w-md w-full p-8" dir="rtl">
        <h3 className="text-xl font-black text-[#263544] mb-6">فتح فحص جودة</h3>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.sku.trim()) {
              toast.error("SKU مطلوب");
              return;
            }
            await onSubmit({
              sku: form.sku.trim(),
              quantityInspected: form.quantityInspected,
              batchId: form.batchId.trim() || undefined,
              notes: form.notes || undefined,
            });
          }}
        >
          <Field label="SKU">
            <input
              value={form.sku}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="الكمية المفحوصة">
            <input
              type="number"
              min={1}
              value={form.quantityInspected}
              onChange={(e) => setForm((p) => ({ ...p, quantityInspected: Number(e.target.value) }))}
              className={inputClass}
            />
          </Field>
          <Field label="معرّف الدفعة (اختياري)">
            <input
              value={form.batchId}
              onChange={(e) => setForm((p) => ({ ...p, batchId: e.target.value }))}
              placeholder="سيُحجَر تلقائياً عند تحديده"
              className={inputClass}
            />
          </Field>
          <Field label="ملاحظات">
            <input
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className={inputClass}
            />
          </Field>

          <p className="text-[11px] font-bold text-slate-500">
            تحديد الدفعة يحجزها فوراً عن البيع طوال مدة الفحص — وهذا هو الغرض: ألّا تُشحن بضاعة تحت الفحص.
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" loading={saving}>
              فتح الفحص
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordInspectionModal({
  inspection,
  onClose,
}: {
  inspection: QualityInspection;
  onClose: () => void;
}) {
  const record = useRecordInspection();
  const [passed, setPassed] = useState(inspection.quantityInspected);
  const [failureReason, setFailureReason] = useState("");

  const failed = inspection.quantityInspected - passed;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-[2rem] max-w-md w-full p-8" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-[#263544]">نتيجة الفحص {inspection.inspectionNumber}</h3>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (failed > 0 && !failureReason.trim()) {
              toast.error("سبب الرسوب مطلوب");
              return;
            }
            await record.mutateAsync({
              inspectionId: inspection.id,
              quantityPassed: passed,
              quantityFailed: failed,
              failureReason: failureReason.trim() || undefined,
            });
            onClose();
          }}
        >
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-2xl bg-slate-100">
              <p className="text-[11px] font-black text-slate-500">مفحوص</p>
              <p className="text-xl font-black tabular-nums">{fmtInt(inspection.quantityInspected)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50">
              <p className="text-[11px] font-black text-emerald-700">ناجح</p>
              <p className="text-xl font-black tabular-nums text-emerald-700">{fmtInt(passed)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-red-50">
              <p className="text-[11px] font-black text-red-700">راسب</p>
              <p className="text-xl font-black tabular-nums text-red-700">{fmtInt(failed)}</p>
            </div>
          </div>

          <Field label="الكمية الناجحة">
            <input
              type="range"
              min={0}
              max={inspection.quantityInspected}
              value={passed}
              onChange={(e) => setPassed(Number(e.target.value))}
              className="w-full accent-[#C89355]"
            />
          </Field>

          <Field label="سبب الرسوب">
            <input
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              disabled={failed === 0}
              placeholder={failed === 0 ? "غير مطلوب — الفحص ناجح بالكامل" : "مثال: تلف في التغليف"}
              className={`${inputClass} disabled:opacity-40`}
            />
          </Field>

          <div
            className={`p-4 rounded-2xl text-xs font-bold ${
              failed === 0
                ? "bg-emerald-50 text-emerald-800"
                : passed === 0
                  ? "bg-red-50 text-red-800"
                  : "bg-amber-50 text-amber-800"
            }`}
          >
            {failed === 0
              ? "النتيجة: ناجح — ستُفَك عن الدفعة حالة الحجر وتصبح متاحة للبيع."
              : passed === 0
                ? "النتيجة: راسب — ستُعلَّم الدفعة كمرفوضة ولن تُباع."
                : "النتيجة: جزئي — تبقى الدفعة محجورة حتى تُفرَز الوحدات الراسبة فعلياً."}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" loading={record.isPending}>
              تسجيل النتيجة
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
