"use client";

import { useState } from "react";
import {
  CalendarClock,
  AlertOctagon,
  AlertTriangle,
  Bell,
  RefreshCw,
  Plus,
  Trash2,
  ShieldAlert,
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
  TableFrame,
  fmtDate,
  fmtInt,
  fmtMoney,
  inputClass,
} from "@/components/wms/primitives";
import {
  useDeleteExpiryRule,
  useExpiryDashboard,
  useExpiryRules,
  useRunExpiryScan,
  useSaveExpiryRule,
  useUpdateBatchStatus,
} from "@/hooks/useWms";
import type { ExpiryRow } from "@/types/wms";
import { toast } from "react-hot-toast";

const LEVELS = [
  { key: "expired" as const, label: "منتهية الصلاحية", tone: "red" as const, icon: AlertOctagon },
  { key: "critical" as const, label: "حرجة", tone: "red" as const, icon: AlertTriangle },
  { key: "warning" as const, label: "تحذير", tone: "amber" as const, icon: Bell },
];

export default function ExpiryPage() {
  const [horizon, setHorizon] = useState(180);
  const [tab, setTab] = useState<"expired" | "critical" | "warning">("critical");
  const [showRuleForm, setShowRuleForm] = useState(false);

  const { data, isLoading } = useExpiryDashboard(horizon);
  const { data: rules } = useExpiryRules();
  const runScan = useRunExpiryScan();
  const saveRule = useSaveExpiryRule();
  const deleteRule = useDeleteExpiryRule();
  const setBatchStatus = useUpdateBatchStatus();

  const rows: ExpiryRow[] = data ? data[tab] : [];

  return (
    <WmsPageShell
      group="inventory"
      title="لوحة الصلاحية والتنبيهات المبكرة"
      subtitle="ما يقترب من الانتهاء، وقيمته، وما سيُحجَر تلقائياً — مقسّماً حسب مستوى الخطورة."
      actions={
        <>
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className={`${inputClass} w-40`}
          >
            <option value={90}>أفق 90 يوم</option>
            <option value={180}>أفق 180 يوم</option>
            <option value={365}>أفق سنة</option>
          </select>
          <Button variant="ghost" onClick={() => runScan.mutate()} loading={runScan.isPending}>
            <RefreshCw size={16} />
            تشغيل الفحص الآن
          </Button>
          <Button onClick={() => setShowRuleForm((v) => !v)}>
            <Plus size={16} />
            قاعدة تنبيه
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat
          label="منتهية الصلاحية"
          value={fmtInt(data?.summary.expired.count)}
          hint={`بقيمة ${fmtMoney(data?.summary.expired.value, 0)}`}
          tone={(data?.summary.expired.count ?? 0) > 0 ? "danger" : "neutral"}
          icon={<AlertOctagon size={16} />}
        />
        <Stat
          label="حرجة"
          value={fmtInt(data?.summary.critical.count)}
          hint={`بقيمة ${fmtMoney(data?.summary.critical.value, 0)}`}
          tone={(data?.summary.critical.count ?? 0) > 0 ? "danger" : "neutral"}
          icon={<AlertTriangle size={16} />}
        />
        <Stat
          label="تحذير"
          value={fmtInt(data?.summary.warning.count)}
          hint={`بقيمة ${fmtMoney(data?.summary.warning.value, 0)}`}
          tone={(data?.summary.warning.count ?? 0) > 0 ? "warning" : "neutral"}
          icon={<Bell size={16} />}
        />
        <Stat
          label="إجمالي القيمة المعرّضة"
          value={fmtMoney(data?.summary.totalValueAtRisk, 0)}
          hint={`${fmtInt(data?.summary.totalAtRisk)} دفعة`}
          tone="info"
        />
      </div>

      {showRuleForm ? (
        <div className="mb-8">
          <RuleForm
            onSave={async (payload) => {
              await saveRule.mutateAsync(payload);
              setShowRuleForm(false);
            }}
            saving={saveRule.isPending}
            onCancel={() => setShowRuleForm(false)}
          />
        </div>
      ) : null}

      <Panel
        title="الدفعات المعرّضة"
        icon={<CalendarClock size={20} />}
        actions={
          <div className="flex gap-2">
            {LEVELS.map((level) => {
              const count = data?.summary[level.key].count ?? 0;
              const active = tab === level.key;
              return (
                <button
                  key={level.key}
                  onClick={() => setTab(level.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                    active
                      ? "bg-[#1a2530] text-[#C89355] border border-[#C89355]/40"
                      : "bg-white/70 text-[#263544]/70 border border-white hover:bg-white"
                  }`}
                >
                  <level.icon size={14} />
                  {level.label}
                  <span className="tabular-nums opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        }
      >
        {isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty message="لا توجد دفعات في هذا المستوى — المخزون سليم ضمن الأفق المحدد." />
        ) : (
          <TableFrame
            head={
              <>
                <th>الصنف</th>
                <th>الدفعة</th>
                <th>الصلاحية</th>
                <th>المتبقي</th>
                <th>الكمية</th>
                <th>القيمة</th>
                <th>المواقع</th>
                <th>القاعدة</th>
                <th>الحجر التلقائي</th>
                <th>إجراء</th>
              </>
            }
          >
            {rows.map((row) => (
              <tr
                key={row.batchId}
                className="bg-white/50 hover:bg-white/80 transition-colors [&>td]:px-4 [&>td]:py-3"
              >
                <td>
                  <p className="font-black text-[#263544]">{row.productName}</p>
                  <p className="text-[11px] font-bold text-[#263544]/50">{row.sku}</p>
                </td>
                <td className="font-mono text-xs font-bold">{row.batchNumber}</td>
                <td className="text-xs font-bold">{fmtDate(row.expiryDate)}</td>
                <td>
                  <Pill tone={row.daysLeft < 0 ? "red" : row.daysLeft <= 30 ? "red" : "amber"}>
                    {row.daysLeft < 0 ? `منذ ${Math.abs(row.daysLeft)} يوم` : `${row.daysLeft} يوم`}
                  </Pill>
                </td>
                <td className="font-black tabular-nums">
                  {fmtInt(row.quantity)} <span className="text-[11px] font-bold opacity-50">{row.unit}</span>
                </td>
                <td className="tabular-nums font-bold">{fmtMoney(row.value, 0)}</td>
                <td className="text-[11px] font-bold text-[#263544]/60">
                  {row.locations.map((l) => `${l.location} (${l.quantity})`).join("، ") || "—"}
                </td>
                <td className="text-[11px] font-mono text-[#263544]/50">{row.rule}</td>
                <td>
                  {row.willBlockInDays === null ? (
                    <span className="text-[11px] font-bold text-[#263544]/40">معطّل</span>
                  ) : row.willBlockInDays <= 0 ? (
                    <Pill tone="red">سيُحجَر الآن</Pill>
                  ) : (
                    <Pill tone="amber">بعد {row.willBlockInDays} يوم</Pill>
                  )}
                </td>
                <td>
                  {row.status !== "QUARANTINE" && row.status !== "EXPIRED" ? (
                    <button
                      onClick={() =>
                        setBatchStatus.mutate({
                          batchId: row.batchId,
                          status: "QUARANTINE",
                          reason: `حجر يدوي — تبقّى ${row.daysLeft} يوم على الانتهاء`,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-black text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      <ShieldAlert size={13} />
                      حجر
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-[#263544]/40">محجورة</span>
                  )}
                </td>
              </tr>
            ))}
          </TableFrame>
        )}
      </Panel>

      <div className="mt-8">
        <Panel title="قواعد التنبيه" icon={<Bell size={20} />}>
          {!rules || rules.length === 0 ? (
            <Empty message="لا توجد قواعد مخصّصة — يُطبَّق الافتراضي: تحذير قبل 60 يوماً، إنذار حرج قبل 30، بلا حجر تلقائي." />
          ) : (
            <TableFrame
              head={
                <>
                  <th>الاسم</th>
                  <th>النطاق</th>
                  <th>تحذير</th>
                  <th>حرج</th>
                  <th>حجر تلقائي</th>
                  <th>إخطار المبيعات</th>
                  <th>الحالة</th>
                  <th />
                </>
              }
            >
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="bg-white/50 hover:bg-white/80 transition-colors [&>td]:px-4 [&>td]:py-3"
                >
                  <td className="font-black text-[#263544]">{rule.name}</td>
                  <td className="text-xs font-bold text-[#263544]/70">
                    {rule.sku ? `صنف: ${rule.sku}` : rule.category ? `فئة: ${rule.category}` : "عام"}
                  </td>
                  <td className="tabular-nums font-bold">{rule.warnDays} يوم</td>
                  <td className="tabular-nums font-bold text-red-700">{rule.criticalDays} يوم</td>
                  <td>
                    {rule.blockDays > 0 ? (
                      <Pill tone="red">قبل {rule.blockDays} يوم</Pill>
                    ) : (
                      <span className="text-[11px] font-bold text-[#263544]/40">معطّل</span>
                    )}
                  </td>
                  <td>{rule.notifySales ? <Pill tone="green">نعم</Pill> : <Pill>لا</Pill>}</td>
                  <td>{rule.isActive ? <Pill tone="green">فعّالة</Pill> : <Pill>موقوفة</Pill>}</td>
                  <td>
                    <button
                      onClick={() => {
                        if (window.confirm(`حذف القاعدة "${rule.name}"؟`)) deleteRule.mutate(rule.id);
                      }}
                      className="p-2 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} className="text-red-700" />
                    </button>
                  </td>
                </tr>
              ))}
            </TableFrame>
          )}
        </Panel>
      </div>
    </WmsPageShell>
  );
}

function RuleForm({
  onSave,
  onCancel,
  saving,
}: {
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    scopeKind: "global" as "global" | "category" | "sku",
    scopeValue: "",
    warnDays: 60,
    criticalDays: 30,
    blockDays: 0,
    notifySales: true,
  });

  return (
    <Panel title="قاعدة تنبيه جديدة" icon={<Bell size={20} />}>
      <form
        className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!form.name.trim()) {
            toast.error("اسم القاعدة مطلوب");
            return;
          }
          if (form.criticalDays > form.warnDays) {
            toast.error("أيام الإنذار الحرج يجب أن تكون أقل من أيام التحذير");
            return;
          }
          await onSave({
            name: form.name.trim(),
            category: form.scopeKind === "category" ? form.scopeValue.trim() : undefined,
            sku: form.scopeKind === "sku" ? form.scopeValue.trim() : undefined,
            warnDays: form.warnDays,
            criticalDays: form.criticalDays,
            blockDays: form.blockDays,
            notifySales: form.notifySales,
          });
        }}
      >
        <Field label="اسم القاعدة">
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="مثال: منتجات طبية"
            className={inputClass}
          />
        </Field>

        <Field label="النطاق">
          <select
            value={form.scopeKind}
            onChange={(e) => setForm((p) => ({ ...p, scopeKind: e.target.value as typeof p.scopeKind }))}
            className={inputClass}
          >
            <option value="global">عام (كل الأصناف)</option>
            <option value="category">فئة محدّدة</option>
            <option value="sku">صنف محدّد</option>
          </select>
        </Field>

        <Field label={form.scopeKind === "sku" ? "SKU" : "اسم الفئة"}>
          <input
            value={form.scopeValue}
            onChange={(e) => setForm((p) => ({ ...p, scopeValue: e.target.value }))}
            disabled={form.scopeKind === "global"}
            className={`${inputClass} disabled:opacity-40`}
          />
        </Field>

        <Field label="تحذير قبل (يوم)">
          <input
            type="number"
            min={0}
            value={form.warnDays}
            onChange={(e) => setForm((p) => ({ ...p, warnDays: Number(e.target.value) }))}
            className={inputClass}
          />
        </Field>

        <Field label="إنذار حرج قبل (يوم)">
          <input
            type="number"
            min={0}
            value={form.criticalDays}
            onChange={(e) => setForm((p) => ({ ...p, criticalDays: Number(e.target.value) }))}
            className={inputClass}
          />
        </Field>

        <Field label="حجر تلقائي قبل (يوم)">
          <input
            type="number"
            min={0}
            value={form.blockDays}
            onChange={(e) => setForm((p) => ({ ...p, blockDays: Number(e.target.value) }))}
            className={inputClass}
          />
        </Field>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-xs font-black text-[#263544]/70 pb-3">
            <input
              type="checkbox"
              checked={form.notifySales}
              onChange={(e) => setForm((p) => ({ ...p, notifySales: e.target.checked }))}
              className="accent-[#C89355]"
            />
            إخطار فريق المبيعات للتصريف
          </label>
        </div>

        <div className="flex items-end gap-2">
          <Button type="submit" loading={saving}>
            حفظ
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            إلغاء
          </Button>
        </div>

        <p className="md:col-span-4 text-[11px] font-bold text-[#263544]/50">
          الحجر التلقائي بصفر يعني معطّل. حين يكون أكبر من صفر تتوقف الدفعة عن البيع فعلياً — لا تحذيراً فقط —
          عند بلوغ هذا العدد من الأيام قبل انتهاء الصلاحية.
        </p>
      </form>
    </Panel>
  );
}
