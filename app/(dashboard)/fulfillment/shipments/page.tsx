"use client";

import { useState } from "react";
import { Truck, Plus, Printer, X, Package, ExternalLink } from "lucide-react";
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
  useCarriers,
  useCreateShipment,
  useGenerateShippingLabel,
  useSaveCarrier,
  useShipments,
  useUpdateShipmentStatus,
} from "@/hooks/useWms";
import { toNum, type ShipmentStatus, type ShippingLabel } from "@/types/wms";
import { toast } from "react-hot-toast";

/** Which transitions the API will accept, mirrored so the UI offers only those. */
const NEXT_STATUS: Record<ShipmentStatus, ShipmentStatus[]> = {
  PENDING: ["LABELED", "CANCELLED"],
  LABELED: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["IN_TRANSIT", "DELIVERED", "RETURNED"],
  IN_TRANSIT: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  RETURNED: [],
  CANCELLED: [],
};

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  PENDING: "بالانتظار",
  LABELED: "مُلصَقة",
  DISPATCHED: "خرجت",
  IN_TRANSIT: "في الطريق",
  DELIVERED: "سُلّمت",
  RETURNED: "مرتجعة",
  CANCELLED: "ملغاة",
};

export default function ShipmentsPage() {
  const [status, setStatus] = useState("");
  const { data, isLoading } = useShipments({ limit: 50, status: status || undefined });
  const { data: carriers } = useCarriers();
  const updateStatus = useUpdateShipmentStatus();
  const generateLabel = useGenerateShippingLabel();
  const saveCarrier = useSaveCarrier();

  const [label, setLabel] = useState<ShippingLabel | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCarrier, setShowCarrier] = useState(false);
  const [carrierForm, setCarrierForm] = useState({ code: "", name: "", contactPhone: "", trackingUrlTemplate: "" });

  const shipments = data?.data ?? [];
  const inTransit = shipments.filter(
    (s) => s.status === "DISPATCHED" || s.status === "IN_TRANSIT",
  ).length;

  return (
    <WmsPageShell
      group="fulfillment"
      title="الشحنات وملصقات الشحن"
      subtitle="الطرود، أوزانها، شركات النقل، أرقام التتبّع، وتوليد ملصق الشحن."
      actions={
        <>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${inputClass} w-40`}
          >
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_LABELS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
          <Button variant="ghost" onClick={() => setShowCarrier((v) => !v)}>
            شركات الشحن ({carriers?.length ?? 0})
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            شحنة جديدة
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="الشحنات" value={fmtInt(data?.total)} icon={<Truck size={16} />} />
        <Stat label="في الطريق" value={fmtInt(inTransit)} tone={inTransit > 0 ? "info" : "neutral"} />
        <Stat
          label="سُلّمت"
          value={fmtInt(shipments.filter((s) => s.status === "DELIVERED").length)}
          tone="success"
        />
        <Stat
          label="إجمالي كلفة الشحن (المعروض)"
          value={fmtMoney(shipments.reduce((s, x) => s + toNum(x.shippingCost), 0), 0)}
          tone="warning"
        />
      </div>

      {showCarrier ? (
        <Panel title="شركات الشحن" icon={<Truck size={20} />} className="mb-6">
          {(carriers?.length ?? 0) === 0 ? (
            <Empty message="لا توجد شركات شحن معرّفة." />
          ) : (
            <TableFrame
              head={
                <>
                  <th>الكود</th>
                  <th>الاسم</th>
                  <th>الهاتف</th>
                  <th>قالب رابط التتبّع</th>
                  <th>الحالة</th>
                </>
              }
            >
              {(carriers ?? []).map((carrier) => (
                <tr key={carrier.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-mono text-xs font-black">{carrier.code}</td>
                  <td className="font-black text-[#263544]">{carrier.name}</td>
                  <td className="text-xs font-bold">{carrier.contactPhone ?? "—"}</td>
                  <td className="text-[11px] font-mono text-[#263544]/60 truncate max-w-xs">
                    {carrier.trackingUrlTemplate ?? "—"}
                  </td>
                  <td>{carrier.isActive ? <Pill tone="green">فعّالة</Pill> : <Pill>موقوفة</Pill>}</td>
                </tr>
              ))}
            </TableFrame>
          )}

          <form
            className="p-6 grid grid-cols-1 md:grid-cols-5 gap-3 border-t border-white/70 bg-white/30"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!carrierForm.code.trim() || !carrierForm.name.trim()) {
                toast.error("الكود والاسم مطلوبان");
                return;
              }
              await saveCarrier.mutateAsync({
                code: carrierForm.code.trim().toUpperCase(),
                name: carrierForm.name.trim(),
                contactPhone: carrierForm.contactPhone || undefined,
                trackingUrlTemplate: carrierForm.trackingUrlTemplate || undefined,
              });
              setCarrierForm({ code: "", name: "", contactPhone: "", trackingUrlTemplate: "" });
            }}
          >
            <Field label="الكود">
              <input
                value={carrierForm.code}
                onChange={(e) => setCarrierForm((p) => ({ ...p, code: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="الاسم">
              <input
                value={carrierForm.name}
                onChange={(e) => setCarrierForm((p) => ({ ...p, name: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="الهاتف">
              <input
                value={carrierForm.contactPhone}
                onChange={(e) => setCarrierForm((p) => ({ ...p, contactPhone: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="قالب التتبّع">
              <input
                value={carrierForm.trackingUrlTemplate}
                onChange={(e) => setCarrierForm((p) => ({ ...p, trackingUrlTemplate: e.target.value }))}
                placeholder="https://.../track/{tracking}"
                className={inputClass}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" loading={saveCarrier.isPending}>
                <Plus size={16} />
                إضافة
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel title="الشحنات" icon={<Truck size={20} />}>
        {isLoading ? (
          <Loading />
        ) : shipments.length === 0 ? (
          <Empty message="لا توجد شحنات." />
        ) : (
          <TableFrame
            head={
              <>
                <th>الرقم</th>
                <th>الفاتورة</th>
                <th>شركة الشحن</th>
                <th>رقم التتبّع</th>
                <th>الطرود</th>
                <th>الوزن</th>
                <th>الكلفة</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </>
            }
          >
            {shipments.map((shipment) => (
              <tr key={shipment.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                <td className="font-black text-[#263544]">{shipment.shipmentNumber}</td>
                <td className="font-mono text-xs">{shipment.salesInvoice?.invoiceNumber ?? "—"}</td>
                <td className="text-xs font-bold">{shipment.carrier?.name ?? "—"}</td>
                <td className="font-mono text-xs">
                  {shipment.trackingUrl ? (
                    <a
                      href={shipment.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                    >
                      {shipment.trackingNumber}
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    (shipment.trackingNumber ?? "—")
                  )}
                </td>
                <td className="tabular-nums">{fmtInt(shipment.packageCount)}</td>
                <td className="tabular-nums text-xs">{fmtMoney(shipment.totalWeightKg, 3)} كغ</td>
                <td className="tabular-nums text-xs">{fmtMoney(shipment.shippingCost)}</td>
                <td>
                  <StatusPill status={shipment.status} />
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={async () => setLabel(await generateLabel.mutateAsync(shipment.id))}
                      title="توليد ملصق"
                      className="p-2 rounded-xl bg-white/70 border border-white hover:border-[#C89355]/40 transition-colors"
                    >
                      <Printer size={14} className="text-[#263544]/70" />
                    </button>
                    {NEXT_STATUS[shipment.status].length > 0 ? (
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const next = e.target.value as ShipmentStatus;
                          const tracking =
                            next === "DISPATCHED" && !shipment.trackingNumber
                              ? window.prompt("رقم التتبّع (اختياري)") ?? undefined
                              : undefined;
                          updateStatus.mutate({
                            shipmentId: shipment.id,
                            status: next,
                            trackingNumber: tracking,
                          });
                        }}
                        className="px-2 py-1.5 rounded-xl bg-white/80 border border-white text-[11px] font-black outline-none"
                      >
                        <option value="">نقل إلى...</option>
                        {NEXT_STATUS[shipment.status].map((next) => (
                          <option key={next} value={next}>
                            {STATUS_LABELS[next]}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </TableFrame>
        )}
      </Panel>

      {label ? <LabelPreview label={label} onClose={() => setLabel(null)} /> : null}
      {showCreate ? <CreateShipmentModal onClose={() => setShowCreate(false)} /> : null}
    </WmsPageShell>
  );
}

function LabelPreview({ label, onClose }: { label: ShippingLabel; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 print:bg-white">
      <div className="bg-white rounded-[2rem] max-w-2xl w-full p-8 max-h-[85vh] overflow-y-auto print:rounded-none" dir="rtl">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <h3 className="text-xl font-black text-[#263544]">ملصق الشحن</h3>
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

        <div className="border-4 border-black rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4 pb-4 border-b-2 border-black">
            <div>
              <p className="text-2xl font-black">{label.shipmentNumber}</p>
              <p className="text-sm font-bold">{label.carrier ?? "بدون شركة شحن"}</p>
            </div>
            <div className="text-left">
              <p className="text-xs font-black">الطرود: {fmtInt(label.packageCount)}</p>
              <p className="text-xs font-black">الوزن: {fmtMoney(label.totalWeightKg, 3)} كغ</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-black text-slate-500 mb-1">المستلم</p>
            <p className="font-black">{label.recipient.name ?? "—"}</p>
            <p className="text-sm font-bold">{label.recipient.phone ?? ""}</p>
            <p className="text-sm">{label.recipient.address ?? ""}</p>
          </div>

          <div className="flex justify-center py-4" dangerouslySetInnerHTML={{ __html: label.svg }} />
          <p className="text-center text-[10px] font-mono text-slate-500">{label.payload}</p>
        </div>

        {label.packages.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {label.packages.map((pkg) => (
              <div key={pkg.packageNumber} className="border-2 border-dashed border-slate-300 rounded-xl p-3">
                <p className="flex items-center gap-1.5 font-black text-sm">
                  <Package size={14} />
                  {pkg.packageNumber}
                </p>
                <p className="text-xs font-bold text-slate-500 mb-2">{fmtMoney(pkg.weightKg, 3)} كغ</p>
                {pkg.svg ? <div dangerouslySetInnerHTML={{ __html: pkg.svg }} /> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CreateShipmentModal({ onClose }: { onClose: () => void }) {
  const create = useCreateShipment();
  const { data: carriers } = useCarriers();
  const [form, setForm] = useState({
    carrierId: "",
    trackingNumber: "",
    shippingCost: "",
    recipientName: "",
    recipientPhone: "",
    address: "",
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-[2rem] max-w-lg w-full p-8" dir="rtl">
        <h3 className="text-xl font-black text-[#263544] mb-6">شحنة جديدة</h3>
        <form
          className="grid grid-cols-2 gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await create.mutateAsync({
              carrierId: form.carrierId || undefined,
              trackingNumber: form.trackingNumber || undefined,
              shippingCost: form.shippingCost ? Number(form.shippingCost) : undefined,
              recipientName: form.recipientName || undefined,
              recipientPhone: form.recipientPhone || undefined,
              address: form.address || undefined,
            });
            onClose();
          }}
        >
          <Field label="شركة الشحن">
            <select
              value={form.carrierId}
              onChange={(e) => setForm((p) => ({ ...p, carrierId: e.target.value }))}
              className={inputClass}
            >
              <option value="">— بدون —</option>
              {(carriers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="رقم التتبّع">
            <input
              value={form.trackingNumber}
              onChange={(e) => setForm((p) => ({ ...p, trackingNumber: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="كلفة الشحن">
            <input
              type="number"
              step="0.01"
              value={form.shippingCost}
              onChange={(e) => setForm((p) => ({ ...p, shippingCost: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="اسم المستلم">
            <input
              value={form.recipientName}
              onChange={(e) => setForm((p) => ({ ...p, recipientName: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="هاتف المستلم">
            <input
              value={form.recipientPhone}
              onChange={(e) => setForm((p) => ({ ...p, recipientPhone: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <div className="col-span-2">
            <Field label="العنوان">
              <input
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" loading={create.isPending}>
              إنشاء
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
