"use client";

import { useState } from "react";
import { ShoppingCart, Users, Plus, FileText } from "lucide-react";
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
import { useCustomers, useDeliveryNotes, usePriceTiers, useSalesOrders } from "@/hooks/useWms";
import apiClient from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { toNum } from "@/types/wms";
import { toast } from "react-hot-toast";

const SO_STATUS: Record<string, { label: string; tone: "slate" | "blue" | "green" | "red" }> = {
  draft: { label: "مسودة", tone: "slate" },
  confirmed: { label: "مؤكّد", tone: "blue" },
  delivered: { label: "مُسلَّم", tone: "green" },
  cancelled: { label: "ملغى", tone: "red" },
};

interface SalesOrderRow {
  id: string;
  soNumber: string;
  status: string;
  orderDate: string;
  totalAmount: string;
  paidAmount: string;
  customer?: { name: string };
  items?: Array<{ id: string }>;
}

interface DeliveryNoteRow {
  id: string;
  noteNumber: string;
  status: string;
  issuedAt: string | null;
  deliveredAt: string | null;
  salesInvoice?: { invoiceNumber: string };
  items?: Array<{ id: string; sku: string; quantity: number }>;
}

export default function SalesPage() {
  const [tab, setTab] = useState<"orders" | "customers" | "notes">("orders");
  const [status, setStatus] = useState("");
  const { data: orders, isLoading } = useSalesOrders({ limit: 50, status: status || undefined });
  const { data: customers } = useCustomers();
  const { data: notes } = useDeliveryNotes({ limit: 50 });
  const { data: tiers } = usePriceTiers();
  const qc = useQueryClient();

  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    priceTierId: "",
    creditLimit: "",
  });
  const [saving, setSaving] = useState(false);

  const rows = (orders?.data ?? []) as unknown as SalesOrderRow[];
  const noteRows = (notes?.data ?? []) as unknown as DeliveryNoteRow[];

  return (
    <WmsPageShell
      group="sales"
      title="المبيعات"
      subtitle="العملاء وطلبات البيع وأذون الخروج — ومنها تُصدر فواتير البيع."
      actions={
        <div className="flex gap-2">
          {(
            [
              { key: "orders", label: "طلبات البيع", icon: ShoppingCart },
              { key: "customers", label: "العملاء", icon: Users },
              { key: "notes", label: "أذون الخروج", icon: FileText },
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
        <Stat label="طلبات البيع" value={fmtInt(orders?.total)} icon={<ShoppingCart size={16} />} />
        <Stat
          label="مؤكّدة بانتظار التجهيز"
          value={fmtInt(rows.filter((o) => o.status === "confirmed").length)}
          tone="warning"
        />
        <Stat label="العملاء" value={fmtInt(customers?.total)} tone="info" icon={<Users size={16} />} />
        <Stat label="أذون الخروج" value={fmtInt(notes?.total)} icon={<FileText size={16} />} />
      </div>

      {tab === "orders" ? (
        <Panel
          title="طلبات البيع"
          icon={<ShoppingCart size={20} />}
          actions={
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${inputClass} w-40`}
            >
              <option value="">كل الحالات</option>
              {Object.entries(SO_STATUS).map(([value, meta]) => (
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
            <Empty message="لا توجد طلبات بيع." />
          ) : (
            <TableFrame
              head={
                <>
                  <th>رقم الطلب</th>
                  <th>العميل</th>
                  <th>التاريخ</th>
                  <th>البنود</th>
                  <th>الإجمالي</th>
                  <th>المدفوع</th>
                  <th>الحالة</th>
                </>
              }
            >
              {rows.map((order) => {
                const meta = SO_STATUS[order.status] ?? { label: order.status, tone: "slate" as const };
                return (
                  <tr key={order.id} className="bg-white/50 hover:bg-white/80 [&>td]:px-4 [&>td]:py-3">
                    <td className="font-black text-[#263544]">{order.soNumber}</td>
                    <td className="font-bold">{order.customer?.name ?? "—"}</td>
                    <td className="text-xs font-bold">{fmtDate(order.orderDate)}</td>
                    <td className="tabular-nums">{fmtInt(order.items?.length ?? 0)}</td>
                    <td className="tabular-nums font-black">{fmtMoney(order.totalAmount)}</td>
                    <td className="tabular-nums">{fmtMoney(order.paidAmount)}</td>
                    <td>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                    </td>
                  </tr>
                );
              })}
            </TableFrame>
          )}
          <p className="px-6 py-4 text-[11px] font-bold text-[#263544]/50 bg-white/30 border-t border-white/70">
            الطلبات المؤكّدة هي مدخل جولات الالتقاط. الخصم الفعلي من المخزون يتمّ عند ترحيل فاتورة البيع، لا
            عند تأكيد الطلب.
          </p>
        </Panel>
      ) : null}

      {tab === "customers" ? (
        <Panel title="العملاء" icon={<Users size={20} />}>
          {(customers?.data.length ?? 0) === 0 ? (
            <Empty message="لا يوجد عملاء." />
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
              {(customers?.data ?? []).map((customer) => (
                <tr key={customer.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-black text-[#263544]">{customer.name}</td>
                  <td className="text-xs font-bold">{customer.phone ?? "—"}</td>
                  <td>
                    {customer.status === "active" ? <Pill tone="green">فعّال</Pill> : <Pill>موقوف</Pill>}
                  </td>
                </tr>
              ))}
            </TableFrame>
          )}

          <form
            className="p-6 grid grid-cols-1 md:grid-cols-5 gap-3 border-t border-white/70 bg-white/30"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!customerForm.name.trim()) {
                toast.error("اسم العميل مطلوب");
                return;
              }
              setSaving(true);
              try {
                await apiClient.post("/sales/customers", {
                  name: customerForm.name.trim(),
                  phone: customerForm.phone || undefined,
                  priceTierId: customerForm.priceTierId || undefined,
                  creditLimit: customerForm.creditLimit ? Number(customerForm.creditLimit) : undefined,
                });
                toast.success("تمت إضافة العميل");
                setCustomerForm({ name: "", phone: "", priceTierId: "", creditLimit: "" });
                void qc.invalidateQueries({ queryKey: queryKeys.salesDomain.all });
              } catch {
                toast.error("فشل إضافة العميل");
              } finally {
                setSaving(false);
              }
            }}
          >
            <Field label="اسم العميل">
              <input
                value={customerForm.name}
                onChange={(e) => setCustomerForm((p) => ({ ...p, name: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="الهاتف">
              <input
                value={customerForm.phone}
                onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="فئة التسعير">
              <select
                value={customerForm.priceTierId}
                onChange={(e) => setCustomerForm((p) => ({ ...p, priceTierId: e.target.value }))}
                className={inputClass}
              >
                <option value="">الافتراضية</option>
                {(tiers ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="سقف الائتمان">
              <input
                type="number"
                step="0.01"
                value={customerForm.creditLimit}
                onChange={(e) => setCustomerForm((p) => ({ ...p, creditLimit: e.target.value }))}
                placeholder="0 = بلا سقف"
                className={inputClass}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" loading={saving}>
                <Plus size={16} />
                إضافة
              </Button>
            </div>

            <p className="md:col-span-5 text-[11px] font-bold text-[#263544]/50">
              سقف الائتمان يُفحَص عند ترحيل الفاتورة فقط — المسودة التي تتجاوزه تبقى عرض سعر مشروعاً، لكنها
              لا تصير ذمّة مدينة.
            </p>
          </form>
        </Panel>
      ) : null}

      {tab === "notes" ? (
        <Panel title="أذون الخروج" icon={<FileText size={20} />}>
          {noteRows.length === 0 ? (
            <Empty message="لا توجد أذون خروج — تصدر تلقائياً عند ترحيل فواتير البيع." />
          ) : (
            <TableFrame
              head={
                <>
                  <th>رقم الإذن</th>
                  <th>الفاتورة</th>
                  <th>البنود</th>
                  <th>تاريخ الإصدار</th>
                  <th>تاريخ التسليم</th>
                  <th>الحالة</th>
                </>
              }
            >
              {noteRows.map((note) => (
                <tr key={note.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-black text-[#263544]">{note.noteNumber}</td>
                  <td className="font-mono text-xs">{note.salesInvoice?.invoiceNumber ?? "—"}</td>
                  <td className="tabular-nums">{fmtInt(note.items?.length ?? 0)}</td>
                  <td className="text-xs font-bold">{fmtDate(note.issuedAt)}</td>
                  <td className="text-xs font-bold">{fmtDate(note.deliveredAt)}</td>
                  <td>
                    <Pill
                      tone={
                        note.status === "delivered"
                          ? "green"
                          : note.status === "cancelled"
                            ? "red"
                            : "blue"
                      }
                    >
                      {note.status === "delivered"
                        ? "مُسلَّم"
                        : note.status === "cancelled"
                          ? "ملغى"
                          : note.status === "issued"
                            ? "صادر"
                            : "مسودة"}
                    </Pill>
                  </td>
                </tr>
              ))}
            </TableFrame>
          )}
        </Panel>
      ) : null}
    </WmsPageShell>
  );
}
