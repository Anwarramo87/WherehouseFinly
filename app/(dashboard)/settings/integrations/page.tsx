"use client";

import { useState } from "react";
import { Plug, Plus, RefreshCw, Trash2, Zap, Webhook, CheckCircle2, XCircle } from "lucide-react";
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
  inputClass,
} from "@/components/wms/primitives";
import {
  useDeleteIntegration,
  useDeleteWebhook,
  useIntegrations,
  usePushStock,
  useSaveIntegration,
  useSaveWebhook,
  useTestIntegration,
  useWebhooks,
} from "@/hooks/useWms";
import type { IntegrationProvider } from "@/types/wms";
import { toast } from "react-hot-toast";

const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  ODOO: "Odoo",
  SAP: "SAP",
  ORACLE: "Oracle",
  SHOPIFY: "Shopify",
  WOOCOMMERCE: "WooCommerce",
  CUSTOM: "نظام مخصّص",
};

const AVAILABLE_EVENTS = [
  { value: "stock.changed", label: "تغيّر المخزون" },
  { value: "batch.expiring", label: "اقتراب صلاحية دفعة" },
  { value: "shipment.dispatched", label: "خروج شحنة" },
  { value: "invoice.posted", label: "ترحيل فاتورة" },
];

export default function IntegrationsPage() {
  const { data: connections, isLoading } = useIntegrations();
  const { data: webhooks } = useWebhooks();
  const save = useSaveIntegration();
  const remove = useDeleteIntegration();
  const test = useTestIntegration();
  const push = usePushStock();
  const saveWebhook = useSaveWebhook();
  const deleteWebhook = useDeleteWebhook();

  const [showForm, setShowForm] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [form, setForm] = useState({
    provider: "SHOPIFY" as IntegrationProvider,
    name: "",
    baseUrl: "",
    apiKey: "",
    syncInterval: 15,
    isActive: false,
  });
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    events: ["stock.changed"] as string[],
  });

  const connected = (connections ?? []).filter((c) => c.status === "connected").length;
  const failing = (connections ?? []).filter((c) => c.status === "error").length;

  return (
    <WmsPageShell
      group="integrations"
      title="الربط والتكامل"
      subtitle="مزامنة المخزون مع أنظمة ERP والمتاجر الإلكترونية، و webhooks للأحداث الصادرة."
      actions={
        <>
          <Button variant="ghost" onClick={() => setShowWebhookForm((v) => !v)}>
            <Webhook size={16} />
            Webhook
          </Button>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} />
            اتصال جديد
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="الاتصالات" value={fmtInt(connections?.length ?? 0)} icon={<Plug size={16} />} />
        <Stat label="متصلة" value={fmtInt(connected)} tone={connected > 0 ? "success" : "neutral"} />
        <Stat label="متعثّرة" value={fmtInt(failing)} tone={failing > 0 ? "danger" : "neutral"} />
        <Stat label="Webhooks فعّالة" value={fmtInt((webhooks ?? []).filter((w) => w.isActive).length)} />
      </div>

      {showForm ? (
        <Panel title="اتصال جديد" icon={<Plug size={20} />} className="mb-6">
          <form
            className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!form.name.trim()) {
                toast.error("اسم الاتصال مطلوب");
                return;
              }
              await save.mutateAsync({
                provider: form.provider,
                name: form.name.trim(),
                baseUrl: form.baseUrl.trim() || undefined,
                apiKey: form.apiKey.trim() || undefined,
                syncInterval: form.syncInterval,
                isActive: form.isActive,
                syncEntities: ["products", "stock"],
              });
              setForm({ ...form, name: "", baseUrl: "", apiKey: "" });
              setShowForm(false);
            }}
          >
            <Field label="المزوّد">
              <select
                value={form.provider}
                onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value as IntegrationProvider }))}
                className={inputClass}
              >
                {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="اسم الاتصال">
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="متجرنا الرئيسي"
                className={inputClass}
              />
            </Field>
            <Field label="عنوان الـ API">
              <input
                value={form.baseUrl}
                onChange={(e) => setForm((p) => ({ ...p, baseUrl: e.target.value }))}
                placeholder="https://shop.example.com"
                className={inputClass}
              />
            </Field>
            <Field label="مفتاح الوصول">
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm((p) => ({ ...p, apiKey: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="فترة المزامنة (دقيقة)">
              <input
                type="number"
                min={5}
                max={1440}
                value={form.syncInterval}
                onChange={(e) => setForm((p) => ({ ...p, syncInterval: Number(e.target.value) }))}
                className={inputClass}
              />
            </Field>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-xs font-black text-[#263544]/70 pb-3">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="accent-[#C89355]"
                />
                تفعيل المزامنة التلقائية
              </label>
              <Button type="submit" loading={save.isPending}>
                حفظ
              </Button>
            </div>

            <p className="md:col-span-3 text-[11px] font-bold text-[#263544]/50">
              المفتاح يُخزَّن مشفّراً ولا يُعاد في أي استجابة — الواجهة تعرض فقط ما إذا كان مضبوطاً. المزامنة
              صادرة باتجاه واحد بقصد: هذا النظام هو مصدر الحقيقة للكميات، والسماح للمتجر بالكتابة عليها هو
              أقصر طريق للبيع المزدوج.
            </p>
          </form>
        </Panel>
      ) : null}

      {showWebhookForm ? (
        <Panel title="Webhook جديد" icon={<Webhook size={20} />} className="mb-6">
          <form
            className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!webhookForm.name.trim() || !webhookForm.url.trim()) {
                toast.error("الاسم والرابط مطلوبان");
                return;
              }
              await saveWebhook.mutateAsync({
                name: webhookForm.name.trim(),
                url: webhookForm.url.trim(),
                events: webhookForm.events,
              });
              setWebhookForm({ name: "", url: "", events: ["stock.changed"] });
              setShowWebhookForm(false);
            }}
          >
            <Field label="الاسم">
              <input
                value={webhookForm.name}
                onChange={(e) => setWebhookForm((p) => ({ ...p, name: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="الرابط">
              <input
                value={webhookForm.url}
                onChange={(e) => setWebhookForm((p) => ({ ...p, url: e.target.value }))}
                placeholder="https://example.com/hooks/wms"
                className={inputClass}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" loading={saveWebhook.isPending}>
                حفظ
              </Button>
            </div>

            <div className="md:col-span-3 flex flex-wrap gap-2">
              {AVAILABLE_EVENTS.map((event) => (
                <label
                  key={event.value}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 border border-white text-xs font-black cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={webhookForm.events.includes(event.value)}
                    onChange={(e) =>
                      setWebhookForm((p) => ({
                        ...p,
                        events: e.target.checked
                          ? [...p.events, event.value]
                          : p.events.filter((v) => v !== event.value),
                      }))
                    }
                    className="accent-[#C89355]"
                  />
                  {event.label}
                </label>
              ))}
            </div>

            <p className="md:col-span-3 text-[11px] font-bold text-[#263544]/50">
              كل استدعاء يحمل توقيع <span className="font-mono">X-WMS-Signature</span> بخوارزمية HMAC-SHA256
              على نصّ الرسالة نفسه، ليتحقّق المستقبِل من المصدر ويرفض أي إعادة إرسال معدّلة. عشرة إخفاقات
              متتالية توقف النقطة بدل إعادة المحاولة إلى ما لا نهاية.
            </p>
          </form>
        </Panel>
      ) : null}

      <Panel title="الاتصالات" icon={<Plug size={20} />} className="mb-6">
        {isLoading ? (
          <Loading />
        ) : (connections?.length ?? 0) === 0 ? (
          <Empty message="لا توجد اتصالات. أضف اتصالاً بمتجرك الإلكتروني أو نظام ERP." />
        ) : (
          <TableFrame
            head={
              <>
                <th>المزوّد</th>
                <th>الاسم</th>
                <th>العنوان</th>
                <th>المفتاح</th>
                <th>الفترة</th>
                <th>آخر مزامنة</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </>
            }
          >
            {(connections ?? []).map((connection) => (
              <tr key={connection.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                <td>
                  <Pill tone="gold">{PROVIDER_LABELS[connection.provider]}</Pill>
                </td>
                <td className="font-black text-[#263544]">{connection.name}</td>
                <td className="text-[11px] font-mono text-[#263544]/60 truncate max-w-[14rem]">
                  {connection.baseUrl ?? "—"}
                </td>
                <td>
                  {connection.hasApiKey ? (
                    <Pill tone="green">مضبوط</Pill>
                  ) : (
                    <Pill tone="amber">ناقص</Pill>
                  )}
                </td>
                <td className="tabular-nums text-xs">{connection.syncInterval} د</td>
                <td className="text-xs font-bold">{fmtDate(connection.lastSyncAt)}</td>
                <td>
                  {connection.status === "connected" ? (
                    <Pill tone="green">
                      <CheckCircle2 size={12} />
                      متصل
                    </Pill>
                  ) : connection.status === "error" ? (
                    <Pill tone="red">
                      <XCircle size={12} />
                      خطأ
                    </Pill>
                  ) : (
                    <Pill>غير متصل</Pill>
                  )}
                  {connection.isActive ? <Pill tone="blue">تلقائي</Pill> : null}
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => test.mutate(connection.id)}
                      title="اختبار الاتصال"
                      className="p-2 rounded-xl bg-white/70 border border-white hover:border-[#C89355]/40 transition-colors"
                    >
                      <Zap size={14} className="text-[#263544]/70" />
                    </button>
                    <button
                      onClick={() => push.mutate(connection.id)}
                      title="مزامنة المخزون الآن"
                      className="p-2 rounded-xl bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors"
                    >
                      <RefreshCw size={14} className="text-sky-700" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`حذف الاتصال "${connection.name}"؟`)) remove.mutate(connection.id);
                      }}
                      className="p-2 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} className="text-red-700" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </TableFrame>
        )}

        {(connections ?? []).some((c) => c.lastError) ? (
          <div className="px-6 py-4 bg-red-50/60 border-t border-red-100 space-y-1">
            {(connections ?? [])
              .filter((c) => c.lastError)
              .map((c) => (
                <p key={c.id} className="text-[11px] font-bold text-red-800">
                  <span className="font-black">{c.name}:</span> {c.lastError}
                </p>
              ))}
          </div>
        ) : null}
      </Panel>

      <Panel title="Webhooks الصادرة" icon={<Webhook size={20} />}>
        {(webhooks?.length ?? 0) === 0 ? (
          <Empty message="لا توجد نقاط webhook." />
        ) : (
          <TableFrame
            head={
              <>
                <th>الاسم</th>
                <th>الرابط</th>
                <th>الأحداث</th>
                <th>آخر إرسال</th>
                <th>إخفاقات</th>
                <th>الحالة</th>
                <th />
              </>
            }
          >
            {(webhooks ?? []).map((hook) => (
              <tr key={hook.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                <td className="font-black text-[#263544]">{hook.name}</td>
                <td className="text-[11px] font-mono text-[#263544]/60 truncate max-w-xs">{hook.url}</td>
                <td className="flex flex-wrap gap-1">
                  {hook.events.map((event) => (
                    <Pill key={event} tone="blue">
                      {AVAILABLE_EVENTS.find((e) => e.value === event)?.label ?? event}
                    </Pill>
                  ))}
                </td>
                <td className="text-xs font-bold">{fmtDate(hook.lastFiredAt)}</td>
                <td className="tabular-nums">
                  {hook.failureCount > 0 ? (
                    <span className="text-red-700 font-black">{hook.failureCount}</span>
                  ) : (
                    "0"
                  )}
                </td>
                <td>{hook.isActive ? <Pill tone="green">فعّال</Pill> : <Pill tone="red">موقوف</Pill>}</td>
                <td>
                  <button
                    onClick={() => {
                      if (window.confirm(`حذف "${hook.name}"؟`)) deleteWebhook.mutate(hook.id);
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
    </WmsPageShell>
  );
}
