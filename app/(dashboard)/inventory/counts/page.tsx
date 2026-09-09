"use client";

import { useMemo, useState } from "react";
import {
  ClipboardCheck,
  Plus,
  Play,
  CheckCircle2,
  ChevronLeft,
  BarChart3,
  AlertTriangle,
  Save,
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
  fmtPercent,
  inputClass,
} from "@/components/wms/primitives";
import {
  useApproveCycleCount,
  useCreateCycleCount,
  useCycleCount,
  useCycleCounts,
  useRecordCount,
  useRunAbcAnalysis,
  useStartCycleCount,
  useVarianceReport,
} from "@/hooks/useWms";
import { toNum } from "@/types/wms";
import { toast } from "react-hot-toast";

const SCOPE_LABELS: Record<string, string> = {
  all: "كل المخزون",
  zone: "منطقة",
  bin: "خانة",
  sku: "صنف",
  category: "فئة",
  abc: "تصنيف ABC",
};

export default function CycleCountsPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useCycleCounts({ limit: 25 });
  const abc = useRunAbcAnalysis();

  if (openId) return <CountDetail countId={openId} onBack={() => setOpenId(null)} />;

  const counts = data?.data ?? [];
  const open = counts.filter((c) => c.status === "IN_PROGRESS" || c.status === "REVIEW").length;

  return (
    <WmsPageShell
      group="inventory"
      title="الجرد الدوري ومعالجة التباين"
      subtitle="جرد أجزاء من المخزن دون إيقاف العمل، مقارنة الفعلي بالدفتري، وتسوية الفروقات بقيد موثّق."
      actions={
        <>
          <Button variant="ghost" onClick={() => abc.mutate(90)} loading={abc.isPending}>
            <BarChart3 size={16} />
            تحديث تصنيف ABC
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            جرد جديد
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="عمليات الجرد" value={fmtInt(data?.total)} icon={<ClipboardCheck size={16} />} />
        <Stat label="جارية الآن" value={fmtInt(open)} tone={open > 0 ? "info" : "neutral"} />
        <Stat
          label="مكتملة"
          value={fmtInt(counts.filter((c) => c.status === "COMPLETED").length)}
          tone="success"
        />
        <Stat
          label="صافي الفروقات (المعروض)"
          value={fmtMoney(counts.reduce((s, c) => s + toNum(c.varianceValue), 0), 0)}
          tone="warning"
        />
      </div>

      <Panel title="سجل الجرد" icon={<ClipboardCheck size={20} />}>
        {isLoading ? (
          <Loading />
        ) : counts.length === 0 ? (
          <Empty message="لم يُجرَ أي جرد بعد. ابدأ بجرد منطقة أو تصنيف A." />
        ) : (
          <TableFrame
            head={
              <>
                <th>الرقم</th>
                <th>النطاق</th>
                <th>الأسطر</th>
                <th>المجرود</th>
                <th>فروقات</th>
                <th>قيمة الفروقات</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th />
              </>
            }
          >
            {counts.map((count) => (
              <tr
                key={count.id}
                onClick={() => setOpenId(count.id)}
                className="bg-white/50 hover:bg-white/90 transition-colors cursor-pointer [&>td]:px-4 [&>td]:py-3"
              >
                <td className="font-black text-[#263544]">{count.countNumber}</td>
                <td className="text-xs font-bold">
                  {SCOPE_LABELS[count.scope] ?? count.scope}
                  {count.scopeValue ? `: ${count.scopeValue}` : ""}
                </td>
                <td className="tabular-nums">{fmtInt(count.totalLines)}</td>
                <td className="tabular-nums">{fmtInt(count.countedLines)}</td>
                <td className="tabular-nums font-bold">
                  {count.varianceLines > 0 ? (
                    <span className="text-amber-700">{fmtInt(count.varianceLines)}</span>
                  ) : (
                    "0"
                  )}
                </td>
                <td className="tabular-nums font-bold">{fmtMoney(count.varianceValue)}</td>
                <td>
                  <StatusPill status={count.status} />
                </td>
                <td className="text-xs font-bold">{fmtDate(count.createdAt)}</td>
                <td>
                  <ChevronLeft size={16} className="text-[#C89355]" />
                </td>
              </tr>
            ))}
          </TableFrame>
        )}
      </Panel>

      {showCreate ? <CreateCountModal onClose={() => setShowCreate(false)} /> : null}
    </WmsPageShell>
  );
}

// -------------------------------------------------------------------- detail

function CountDetail({ countId, onBack }: { countId: string; onBack: () => void }) {
  const { data: count, isLoading } = useCycleCount(countId);
  const { data: variances } = useVarianceReport(countId);
  const start = useStartCycleCount();
  const record = useRecordCount();
  const approve = useApproveCycleCount();

  const [entries, setEntries] = useState<Record<string, string>>({});

  const inProgress = count?.status === "IN_PROGRESS";
  const canApprove = count?.status === "REVIEW" || count?.status === "IN_PROGRESS";

  const dirty = useMemo(() => Object.keys(entries).length > 0, [entries]);

  return (
    <WmsPageShell
      group="inventory"
      title={count?.countNumber ?? "جرد"}
      subtitle={
        count
          ? `${SCOPE_LABELS[count.scope] ?? count.scope}${count.scopeValue ? `: ${count.scopeValue}` : ""} — ${fmtInt(count.totalLines)} سطر`
          : ""
      }
      actions={
        <>
          <Button variant="ghost" onClick={onBack}>
            رجوع
          </Button>
          {count?.status === "DRAFT" ? (
            <Button onClick={() => start.mutate(countId)} loading={start.isPending}>
              <Play size={16} />
              بدء الجرد
            </Button>
          ) : null}
          {inProgress && dirty ? (
            <Button
              onClick={async () => {
                const lines = Object.entries(entries)
                  .filter(([, value]) => value !== "")
                  .map(([itemId, value]) => ({ itemId, countedQuantity: Number(value) }));
                if (lines.length === 0) return;
                await record.mutateAsync({ countId, lines });
                setEntries({});
              }}
              loading={record.isPending}
            >
              <Save size={16} />
              حفظ {Object.keys(entries).length} سطر
            </Button>
          ) : null}
          {canApprove ? (
            <Button
              variant="danger"
              onClick={() => {
                const pending = variances?.pendingRecounts ?? 0;
                const force = pending > 0 || count?.countedLines !== count?.totalLines;
                const warning = force
                  ? "هناك أسطر غير مجرودة أو تحتاج إعادة جرد. الإقفال القسري يعتبرها كما هي. متابعة؟"
                  : "سيُقفل الجرد وتُرحَّل التسويات إلى دفتر المخزون. العملية لا تُلغى. متابعة؟";
                if (window.confirm(warning)) approve.mutate({ countId, force });
              }}
              loading={approve.isPending}
            >
              <CheckCircle2 size={16} />
              إقفال وترحيل التسويات
            </Button>
          ) : null}
        </>
      }
    >
      {isLoading || !count ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Stat label="الحالة" value={<StatusPill status={count.status} />} />
            <Stat label="مجرود" value={`${fmtInt(count.countedLines)} / ${fmtInt(count.totalLines)}`} />
            <Stat
              label="دقة الجرد"
              value={fmtPercent(variances?.accuracyPercent ?? null)}
              tone={
                (variances?.accuracyPercent ?? 100) >= 98
                  ? "success"
                  : (variances?.accuracyPercent ?? 100) >= 90
                    ? "warning"
                    : "danger"
              }
            />
            <Stat
              label="عجز"
              value={fmtMoney(variances?.shortages.value ?? 0, 0)}
              hint={`${fmtInt(variances?.shortages.count ?? 0)} سطر`}
              tone="danger"
            />
            <Stat
              label="زيادة"
              value={fmtMoney(variances?.overages.value ?? 0, 0)}
              hint={`${fmtInt(variances?.overages.count ?? 0)} سطر`}
              tone="info"
            />
          </div>

          <Panel
            title="أسطر الجرد"
            icon={<ClipboardCheck size={20} />}
            badge={
              (variances?.pendingRecounts ?? 0) > 0 ? (
                <Pill tone="amber">
                  <AlertTriangle size={12} />
                  {variances?.pendingRecounts} سطر يحتاج إعادة جرد
                </Pill>
              ) : null
            }
          >
            <TableFrame
              head={
                <>
                  <th>الصنف</th>
                  <th>الدفعة</th>
                  <th>الموقع</th>
                  <th>الدفتري</th>
                  <th>المعدود</th>
                  <th>الفرق</th>
                  <th>قيمة الفرق</th>
                  <th>الحالة</th>
                </>
              }
            >
              {(count.items ?? []).map((item) => {
                const pending = entries[item.id];
                const shown = pending !== undefined ? pending : (item.countedQuantity ?? "");
                const variance =
                  shown === "" ? null : Number(shown) - item.systemQuantity;

                return (
                  <tr
                    key={item.id}
                    className={`[&>td]:px-4 [&>td]:py-3 ${
                      item.recountRequired ? "bg-amber-50/70" : "bg-white/50"
                    }`}
                  >
                    <td>
                      <p className="font-black text-[#263544]">{item.productName ?? item.sku}</p>
                      <p className="text-[11px] font-bold text-[#263544]/50">{item.sku}</p>
                    </td>
                    <td className="font-mono text-xs">{item.batch?.batchNumber ?? "—"}</td>
                    <td className="font-mono text-xs font-bold">{item.location}</td>
                    <td className="tabular-nums font-bold">{fmtInt(item.systemQuantity)}</td>
                    <td>
                      {inProgress ? (
                        <input
                          type="number"
                          min={0}
                          value={shown}
                          onChange={(e) =>
                            setEntries((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-sm font-black tabular-nums outline-none focus:border-[#C89355]"
                        />
                      ) : (
                        <span className="tabular-nums font-black">
                          {item.countedQuantity === null ? "—" : fmtInt(item.countedQuantity)}
                        </span>
                      )}
                    </td>
                    <td className="tabular-nums font-black">
                      {variance === null ? (
                        "—"
                      ) : variance === 0 ? (
                        <Pill tone="green">مطابق</Pill>
                      ) : (
                        <Pill tone={variance < 0 ? "red" : "blue"}>
                          {variance > 0 ? "+" : ""}
                          {fmtInt(variance)}
                        </Pill>
                      )}
                    </td>
                    <td className="tabular-nums text-xs font-bold">
                      {item.countedQuantity === null ? "—" : fmtMoney(item.varianceValue)}
                    </td>
                    <td>
                      {item.recountRequired ? (
                        <Pill tone="amber">إعادة جرد</Pill>
                      ) : (
                        <StatusPill status={item.status} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </TableFrame>

            <p className="px-6 py-4 text-[11px] font-bold text-[#263544]/50 bg-white/30 border-t border-white/70">
              «الدفتري» هو الرصيد لحظة فتح الجرد، لا الرصيد الحالي — لذلك لا تظهر الشحنات التي خرجت أثناء
              الجرد كفروقات. الأسطر بفارق ≥ 5 وحدات أو ≥ 10% تُعلَّم تلقائياً لإعادة الجرد.
            </p>
          </Panel>
        </>
      )}
    </WmsPageShell>
  );
}

// -------------------------------------------------------------- create modal

function CreateCountModal({ onClose }: { onClose: () => void }) {
  const create = useCreateCycleCount();
  const [form, setForm] = useState({ type: "cycle", scope: "zone", scopeValue: "", notes: "" });

  const needsValue = form.scope !== "all";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-[2rem] max-w-lg w-full p-8" dir="rtl">
        <h3 className="text-xl font-black text-[#263544] mb-6">جرد جديد</h3>

        <form
          className="grid grid-cols-2 gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (needsValue && !form.scopeValue.trim()) {
              toast.error("حدّد قيمة النطاق");
              return;
            }
            await create.mutateAsync({
              type: form.type,
              scope: form.scope,
              scopeValue: needsValue ? form.scopeValue.trim() : undefined,
              notes: form.notes || undefined,
            });
            onClose();
          }}
        >
          <Field label="نوع الجرد">
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              className={inputClass}
            >
              <option value="cycle">دوري</option>
              <option value="full">شامل</option>
              <option value="spot">مفاجئ</option>
            </select>
          </Field>

          <Field label="النطاق">
            <select
              value={form.scope}
              onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value }))}
              className={inputClass}
            >
              {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          {needsValue ? (
            <div className="col-span-2">
              <Field
                label={
                  form.scope === "abc"
                    ? "التصنيف (A / B / C)"
                    : form.scope === "zone"
                      ? "كود المنطقة"
                      : form.scope === "bin"
                        ? "كود الخانة"
                        : form.scope === "sku"
                          ? "SKU"
                          : "اسم الفئة"
                }
              >
                <input
                  value={form.scopeValue}
                  onChange={(e) => setForm((p) => ({ ...p, scopeValue: e.target.value }))}
                  className={inputClass}
                />
              </Field>
            </div>
          ) : null}

          <div className="col-span-2">
            <Field label="ملاحظات">
              <input
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className={inputClass}
              />
            </Field>
          </div>

          <p className="col-span-2 text-[11px] font-bold text-[#263544]/50">
            عند الإنشاء تُجمَّد الأرصدة الدفترية في أسطر الجرد. الأصناف المتتبَّعة بالدفعات تُجرَد لكل دفعة على
            حدة، لأن «40 صندوقاً» ليست إجابة حين تتشارك ثلاث دفعات نفس الخانة.
          </p>

          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" loading={create.isPending}>
              فتح الجرد
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
