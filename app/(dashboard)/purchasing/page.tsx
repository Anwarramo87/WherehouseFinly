"use client";

import { useState } from "react";
import { ShoppingCart, Users, Plus, PackageCheck } from "lucide-react";
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
import { usePurchaseOrders, useSuppliers } from "@/hooks/useWms";
import apiClient from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { toNum } from "@/types/wms";
import { toast } from "react-hot-toast";

const PO_STATUS: Record<string, { label: string; tone: "slate" | "blue" | "green" | "red" }> = {
  draft: { label: "مسودة", tone: "slate" },
  sent: { label: "مُرسَل", tone: "blue" },
  received: { label: "مُستلَم", tone: "green" },
  cancelled: { label: "ملغى", tone: "red" },
};

interface PurchaseOrderRow {
  id: string;
  poNumber: string;
  supplierId: string;
  status: string;
  orderDate: string;
  expectedDate: string | null;
  totalAmount: string;
  supplier?: { name: string };
  items?: Array<{ id: string; sku: string; quantity: number; receivedQuantity: number; unitCost: string }>;
}

export default function PurchasingPage() {
  const [tab, setTab] = useState<"orders" | "suppliers">("orders");
  const [status, setStatus] = useState("");
  const { data: orders, isLoading } = usePurchaseOrders({ limit: 50, status: status || undefined });
  const { data: suppliers } = useSuppliers();
  const qc = useQueryClient();

  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "", email: "", taxNumber: "" });
  const [saving, setSaving] = useState(false);

  const rows = (orders?.data ?? []) as unknown as PurchaseOrderRow[];

  return (
    <WmsPageShell
      group="purchasing"
      title="المشتريات"
      subtitle="الموردون وأوامر الشراء ومتابعة الاستلام — ومنها تُنشأ فواتير الشراء."
      actions={
        <div className="flex gap-2">
          {(
            [
              { key: "orders", label: "أوامر الشراء", icon: ShoppingCart },
              { key: "suppliers", label: "الموردون", icon: Users },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                tab === t.key
                  ? "bg-[#1a2530] text-[#C89355] border border-[#C89355]/40"
                  : "bg-white/70 text-[#263544]/70 border border-white hover:bg-white"
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="أوامر الشراء" value={fmtInt(orders?.total)} icon={<ShoppingCart size={16} />} />
        <Stat
          label="بانتظار الاستلام"
          value={fmtInt(rows.filter((o) => o.status === "sent").length)}
          tone="warning"
        />
        <Stat
          label="مُستلَمة"
          value={fmtInt(rows.filter((o) => o.status === "received").length)}
          tone="success"
          icon={<PackageCheck size={16} />}
        />
        <Stat label="الموردون" value={fmtInt(suppliers?.total)} tone="info" icon={<Users size={16} />} />
      </div>

      {tab === "orders" ? (
        <Panel
          title="أوامر الشراء"
          icon={<ShoppingCart size={20} />}
          actions={
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${inputClass} w-40`}
            >
              <option value="">كل الحالات</option>
              {Object.entries(PO_STATUS).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          }
        >
          {isLoading ? (
            <Loading />
          ) : rows.length === 0 ? (
            <Empty message="لا توجد أوامر شراء." />
          ) : (
            <TableFrame
              head={
                <>
                  <th>رقم الأمر</th>
                  <th>المورد</th>
                  <th>تاريخ الأمر</th>
                  <th>التاريخ المتوقّع</th>
                  <th>البنود</th>
                  <th>نسبة الاستلام</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                </>
              }
            >
              {rows.map((order) => {
                const items = order.items ?? [];
                const ordered = items.reduce((s, i) => s + i.quantity, 0);
                const received = items.reduce((s, i) => s + i.receivedQuantity, 0);
                const pct = ordered > 0 ? Math.round((received / ordered) * 100) : 0;
                const meta = PO_STATUS[order.status] ?? { label: order.status, tone: "slate" as const };

                return (
                  <tr key={order.id} className="bg-white/50 hover:bg-white/80 [&>td]:px-4 [&>td]:py-3">
                    <td className="font-black text-[#263544]">{order.poNumber}</td>
                    <td className="font-bold">{order.supplier?.name ?? "—"}</td>
                    <td className="text-xs font-bold">{fmtDate(order.orderDate)}</td>
                    <td className="text-xs font-bold">{fmtDate(order.expectedDate)}</td>
                    <td className="tabular-nums">{fmtInt(items.length)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full ${pct >= 100 ? "bg-emerald-500" : "bg-[#C89355]"}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-black tabular-nums">{pct}%</span>
                      </div>
                    </td>
                    <td className="tabular-nums font-black">{fmtMoney(order.totalAmount)}</td>
                    <td>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                    </td>
                  </tr>
                );
              })}
            </TableFrame>
          )}
          <p className="px-6 py-4 text-[11px] font-bold text-[#263544]/50 bg-white/30 border-t border-white/70">
            لتحويل أمر شراء إلى فاتورة، افتح تبويب «فواتير الشراء» — الفاتورة تُملأ تلقائياً بالكميات
            المستلمة فعلياً لا بالمطلوبة.
          </p>
        </Panel>
      ) : (
        <Panel title="الموردون" icon={<Users size={20} />}>
          {(suppliers?.data.length ?? 0) === 0 ? (
            <Empty message="لا يوجد موردون." />
          ) : (
            <TableFrame
              head={
                <>
                  <th>الاسم</th>
                  <th>الهاتف</th>
                  <th>الحالة</th>
                </>
              }
            >
              {(suppliers?.data ?? []).map((supplier) => (
                <tr key={supplier.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-black text-[#263544]">{supplier.name}</td>
                  <td className="text-xs font-bold">{supplier.phone ?? "—"}</td>
                  <td>
                    {supplier.status === "active" ? (
                      <Pill tone="green">فعّال</Pill>
                    ) : (
                      <Pill>موقوف</Pill>
                    )}
                  </td>
                </tr>
              ))}
            </TableFrame>
          )}

          <form
            className="p-6 grid grid-cols-1 md:grid-cols-5 gap-3 border-t border-white/70 bg-white/30"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!supplierForm.name.trim()) {
                toast.error("اسم المورد مطلوب");
                return;
              }
              setSaving(true);
              try {
                await apiClient.post("/purchasing/suppliers", {
                  name: supplierForm.name.trim(),
                  phone: supplierForm.phone || undefined,
                  email: supplierForm.email || undefined,
                  taxNumber: supplierForm.taxNumber || undefined,
                });
                toast.success("تمت إضافة المورد");
                setSupplierForm({ name: "", phone: "", email: "", taxNumber: "" });
                void qc.invalidateQueries({ queryKey: queryKeys.purchasing.all });
              } catch {
                toast.error("فشل إضافة المورد");
              } finally {
                setSaving(false);
              }
            }}
          >
            <Field label="اسم المورد">
              <input
                value={supplierForm.name}
                onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="الهاتف">
              <input
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="البريد">
              <input
                value={supplierForm.email}
                onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="الرقم الضريبي">
              <input
                value={supplierForm.taxNumber}
                onChange={(e) => setSupplierForm((p) => ({ ...p, taxNumber: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" loading={saving}>
                <Plus size={16} />
                إضافة
              </Button>
            </div>
          </form>
        </Panel>
      )}
    </WmsPageShell>
  );
}
