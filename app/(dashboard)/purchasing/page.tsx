"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ShoppingCart, Users, Plus, PackageCheck, PackagePlus, Trash2, Send, X } from "lucide-react";
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
  useChangePurchaseOrderStatus,
  useCreatePurchaseOrder,
  usePurchaseOrders,
  useReceivePurchaseOrder,
  useSuppliers,
  type CreatePurchaseOrderInput,
} from "@/hooks/useWms";
import apiClient from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import EntityCustomFieldsForm from "@/components/EntityCustomFieldsForm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

  const [showCreate, setShowCreate] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<PurchaseOrderRow | null>(null);

  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "", email: "", taxNumber: "" });
  const [supplierCustomFields, setSupplierCustomFields] = useState<Record<string, unknown>>({});
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
          {tab === "orders" && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={15} />
              أمر شراء جديد
            </Button>
          )}
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
                  <th>إجراء</th>
                </>
              }
            >
              {rows.map((order) => {
                const items = order.items ?? [];
                const ordered = items.reduce((s, i) => s + i.quantity, 0);
                const received = items.reduce((s, i) => s + i.receivedQuantity, 0);
                const pct = ordered > 0 ? Math.round((received / ordered) * 100) : 0;
                const meta = PO_STATUS[order.status] ?? { label: order.status, tone: "slate" as const };
                const hasRemaining = items.some((i) => i.receivedQuantity < i.quantity);
                const canReceive = order.status !== "cancelled" && hasRemaining;

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
                    <td>
                      <div className="flex items-center gap-2">
                        {order.status === "draft" && (
                          <SendOrderButton orderId={order.id} />
                        )}
                        {canReceive && (
                          <button
                            type="button"
                            onClick={() => setReceiveTarget(order)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 flex items-center gap-1"
                          >
                            <PackageCheck size={12} />
                            استلام
                          </button>
                        )}
                      </div>
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
                const response = await apiClient.post("/purchasing/suppliers", {
                  name: supplierForm.name.trim(),
                  phone: supplierForm.phone || undefined,
                  email: supplierForm.email || undefined,
                  taxNumber: supplierForm.taxNumber || undefined,
                });
                const createdId = response?.data?.id ?? response?.data?.supplier?.id ?? "";
                if (createdId && Object.keys(supplierCustomFields).length > 0) {
                  await apiClient.post(`/customization/tenant/custom-field-values/supplier/${createdId}`, supplierCustomFields);
                }
                toast.success("تمت إضافة المورد");
                setSupplierForm({ name: "", phone: "", email: "", taxNumber: "" });
                setSupplierCustomFields({});
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
            <div className="md:col-span-5">
              <EntityCustomFieldsForm entity="supplier" onChange={setSupplierCustomFields} />
            </div>

            <div className="flex items-end">
              <Button type="submit" loading={saving}>
                <Plus size={16} />
                إضافة
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {showCreate && <CreatePurchaseOrderModal onClose={() => setShowCreate(false)} />}
      {receiveTarget && (
        <ReceiveGoodsModal target={receiveTarget} onClose={() => setReceiveTarget(null)} />
      )}
    </WmsPageShell>
  );
}

// ------------------------------------------------------------------ helpers

const PRODUCT_OPTIONS_ID = "purchasing-product-options";

function useProductOptions() {
  return useQuery({
    queryKey: [...queryKeys.inventory.products({ forPurchase: true })],
    queryFn: async () => {
      try {
        const res = await apiClient.get<{
          data: Array<{ id: string; sku: string; name: string; unit: string; costPrice: number; productType: string }>;
        }>("/inventory/products", { params: { limit: 500 } });
        return res.data.data ?? [];
      } catch {
        // A purchasing-only user may lack view_inventory. The SKU field still
        // works as free text, so an empty suggestion list is not fatal.
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

function SendOrderButton({ orderId }: { orderId: string }) {
  const changeStatus = useChangePurchaseOrderStatus();
  return (
    <button
      type="button"
      onClick={() => changeStatus.mutate({ orderId, status: "sent" })}
      disabled={changeStatus.isPending}
      className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-black hover:bg-sky-700 disabled:opacity-50 flex items-center gap-1"
    >
      <Send size={12} />
      إرسال
    </button>
  );
}

// ------------------------------------------------------- create order modal

interface DraftPoLine {
  sku: string;
  quantity: string;
  unitCost: string;
}

function CreatePurchaseOrderModal({ onClose }: { onClose: () => void }) {
  const { data: suppliers } = useSuppliers();
  const { data: products, isLoading } = useProductOptions();
  const createOrder = useCreatePurchaseOrder();
  const qc = useQueryClient();

  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState("");
  const [lines, setLines] = useState<DraftPoLine[]>([{ sku: "", quantity: "1", unitCost: "0" }]);
  // Line the "add new material" form targets: a row index, or -1 = append a new row.
  const [quickAddFor, setQuickAddFor] = useState<number | null>(null);

  const total = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0),
    [lines],
  );

  const setLine = (index: number, patch: Partial<DraftPoLine>) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  // After a material is created we drop it straight into the current order so the
  // employee never loses what they already typed and never leaves the screen.
  // Price is entered on the order line, not on the material, so a material with
  // no cost must NOT wipe a price the employee already typed into the line.
  const selectCreatedProduct = (product: { sku: string; costPrice?: number | string }) => {
    const target = quickAddFor;
    const hasCost = product?.costPrice !== undefined && Number(product.costPrice) > 0;
    const productCost = hasCost ? String(Number(product.costPrice)) : undefined;
    if (target !== null) {
      setLines((prev) =>
        target < 0
          ? [...prev, { sku: product.sku, quantity: "1", unitCost: productCost ?? "0" }]
          : prev.map((l, i) => (i === target ? { ...l, sku: product.sku, unitCost: productCost ?? l.unitCost } : l)),
      );
    }
    void qc.invalidateQueries({ queryKey: queryKeys.inventory.all, exact: false });
    setQuickAddFor(null);
  };

  const handleSubmit = async () => {
    if (!supplierId) return toast.error("اختر المورد");
    const items = lines
      .filter((l) => l.sku.trim() && Number(l.quantity) > 0)
      .map((l) => ({ sku: l.sku.trim(), quantity: Number(l.quantity), unitCost: Number(l.unitCost) || 0 }));
    if (items.length === 0) return toast.error("أضف مادة واحدة على الأقل");
    const payload: CreatePurchaseOrderInput = {
      supplierId,
      orderDate,
      expectedDate: expectedDate || undefined,
      items,
    };
    await createOrder.mutateAsync(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-[2rem] w-full max-w-3xl p-6 my-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-[#263544] flex items-center gap-2">
            <ShoppingCart size={20} className="text-[#C89355]" /> أمر شراء جديد
          </h2>
          <button onClick={onClose} className="text-[#263544]/40 hover:text-[#263544]">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <Field label="المورد">
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass}>
              <option value="">— اختر مورداً —</option>
              {(suppliers?.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="تاريخ الأمر">
            <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={inputClass} />
          </Field>
          <Field label="التاريخ المتوقّع (اختياري)">
            <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className={inputClass} />
          </Field>
        </div>

        <div className="space-y-3">
          <datalist id={PRODUCT_OPTIONS_ID}>
            {(products ?? []).map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.name} — {p.productType === "RAW_MATERIAL" ? "مادة خام" : "منتج"}
              </option>
            ))}
          </datalist>
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-6">
                <Field label="المادة (SKU)">
                  <div className="flex gap-1.5">
                    <input
                      list={PRODUCT_OPTIONS_ID}
                      value={line.sku}
                      placeholder={isLoading ? "جارٍ تحميل المواد…" : "اكتب SKU أو اختر مادة"}
                      onChange={(e) => {
                        const p = products?.find((x) => x.sku === e.target.value);
                        setLine(index, {
                          sku: e.target.value,
                          unitCost: p ? String(Number(p.costPrice) || 0) : line.unitCost,
                        });
                      }}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setQuickAddFor(index)}
                      title="إضافة مادة جديدة وتعبئتها في هذا السطر"
                      className="shrink-0 px-2.5 rounded-xl border border-[#C89355]/50 text-[#8a5f2a] text-xs font-black hover:bg-[#C89355]/10 flex items-center gap-1"
                    >
                      <Plus size={13} /> جديد
                    </button>
                  </div>
                </Field>
              </div>
                <div className="col-span-2">
                  <Field label="الكمية">
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => setLine(index, { quantity: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="col-span-3">
                  <Field label="سعر الوحدة">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={line.unitCost}
                      onChange={(e) => setLine(index, { unitCost: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                    disabled={lines.length === 1}
                    className="p-2 rounded-xl bg-red-50 border border-red-200 disabled:opacity-30"
                  >
                    <Trash2 size={14} className="text-red-700" />
                  </button>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLines((prev) => [...prev, { sku: "", quantity: "1", unitCost: "0" }])}
                className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-2xl text-sm font-black text-[#263544]/70 hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <Plus size={15} /> إضافة سطر
              </button>
              <button
                type="button"
                onClick={() => setQuickAddFor(-1)}
                className="w-full py-2.5 border-2 border-dashed border-[#C89355]/50 rounded-2xl text-sm font-black text-[#8a5f2a] hover:bg-[#C89355]/5 flex items-center justify-center gap-2"
              >
                <PackagePlus size={15} /> إضافة مادة جديدة
              </button>
            </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
          <div className="text-sm font-black text-[#263544]">
            الإجمالي: <span className="tabular-nums text-[#8a5f2a]">{fmtMoney(total)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} loading={createOrder.isPending}>
              <Plus size={16} /> إنشاء الأمر
            </Button>
          </div>
        </div>
      </div>

      {quickAddFor !== null && (
        <QuickAddProductModal
          existingSkus={(products ?? []).map((p) => p.sku)}
          onClose={() => setQuickAddFor(null)}
          onCreated={selectCreatedProduct}
        />
      )}
    </div>
  );
}

// ------------------------------------------------ quick add product modal

const PRODUCT_TYPE_OPTIONS = [
  { value: "RAW_MATERIAL", label: "مادة خام" },
  { value: "SEMI_FINISHED", label: "منتج نصف مصنّع" },
  { value: "FINISHED", label: "منتج جاهز" },
] as const;

const UNIT_OPTIONS = ["قطعة", "علبة", "كرتون", "لتر", "كيلوغرام"];

interface QuickAddProductForm {
  name: string;
  productType: "RAW_MATERIAL" | "SEMI_FINISHED" | "FINISHED";
  category: string;
  unit: string;
  sku: string;
}

const extractApiMessage = (error: unknown): string => {
  const err = error as {
    response?: { status?: number; data?: { message?: string; error?: { message?: string } } };
  };
  return err?.response?.data?.error?.message || err?.response?.data?.message || "";
};

/**
 * Small "add new material" form shown while building a purchase order.
 * It reuses the very same creation payload/endpoint as the inventory screen
 * (backend delegates to InventoryService.createProduct). Saving never touches
 * stock — stock only moves when goods are actually received.
 */
function QuickAddProductModal({
  existingSkus,
  onClose,
  onCreated,
}: {
  existingSkus: string[];
  onClose: () => void;
  onCreated: (product: { sku: string; costPrice?: number | string }) => void;
}) {
  const [form, setForm] = useState<QuickAddProductForm>({
    name: "",
    productType: "RAW_MATERIAL",
    category: "",
    unit: "قطعة",
    sku: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<QuickAddProductForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const sku = form.sku.trim();
    const name = form.name.trim();
    const category = form.category.trim();
    if (!name) return toast.error("اسم الصنف مطلوب");
    if (!category) return toast.error("الفئة مطلوبة");
    if (!sku) return toast.error("كود الصنف (SKU) مطلوب");
    if (existingSkus.some((s) => s.toLowerCase() === sku.toLowerCase())) {
      return toast.error("كود الصنف موجود مسبقاً — اختر كوداً مختلفاً");
    }

    // No prices: a raw material is bought, not sold, so it is created without
    // cost or sale price. The purchase price is entered on the order line below
    // (and revalues the product cost when the goods are received).
    const payload = {
      sku,
      name,
      category,
      productType: form.productType,
      unit: form.unit,
      reorderLevel: 10,
    };

    setSaving(true);
    try {
      let product: { sku: string; costPrice?: number | string } | undefined;
      try {
        product = (await apiClient.post("/purchasing/products", payload)).data?.product;
      } catch (err) {
        // Backend build without the purchasing wrapper: reuse the canonical
        // inventory endpoint instead.
        if ((err as { response?: { status?: number } })?.response?.status !== 404) throw err;
        product = (await apiClient.post("/inventory/products", payload)).data?.product;
      }
      toast.success("تمت إضافة المادة");
      onCreated({ sku: product?.sku ?? sku, costPrice: product?.costPrice });
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = extractApiMessage(err);
      if (status === 409 || /already exists/i.test(msg)) {
        toast.error("كود الصنف موجود مسبقاً — اختر كوداً مختلفاً");
      } else if (status === 403) {
        toast.error("ليس لديك صلاحية إضافة مواد");
      } else {
        toast.error(msg || "فشل إضافة المادة");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-[2rem] w-full max-w-lg p-6 my-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-[#263544] flex items-center gap-2">
            <PackagePlus size={20} className="text-[#C89355]" /> إضافة مادة جديدة
          </h2>
          <button onClick={onClose} className="text-[#263544]/40 hover:text-[#263544]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="اسم الصنف">
              <input
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                className={inputClass}
                placeholder="مثال: قطن خام"
              />
            </Field>
          </div>

          <Field label="نوع الصنف">
            <select
              value={form.productType}
              onChange={(e) => set({ productType: e.target.value as QuickAddProductForm["productType"] })}
              className={inputClass}
            >
              {PRODUCT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="الفئة">
            <input
              value={form.category}
              onChange={(e) => set({ category: e.target.value })}
              className={inputClass}
              placeholder="مثال: مواد خام"
            />
          </Field>

          <Field label="وحدة القياس">
            <select value={form.unit} onChange={(e) => set({ unit: e.target.value })} className={inputClass}>
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>

          <Field label="كود الصنف (SKU)">
            <input
              value={form.sku}
              onChange={(e) => set({ sku: e.target.value })}
              className={`${inputClass} font-mono`}
              placeholder="RAW-001"
            />
          </Field>

          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" loading={saving}>
              <PackagePlus size={16} /> حفظ واختيار المادة
            </Button>
          </div>
        </form>

        <p className="mt-4 text-[11px] font-bold text-[#263544]/50">
          لا حاجة لإدخال السعر عند تعريف المادة — أدخل سعر الشراء في سطر الأمر أدناه.
          إضافة المادة لا تزيد المخزون — يزيد المخزون فقط عند تسجيل استلام المواد.
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------ receive goods modal

function ReceiveGoodsModal({ target, onClose }: { target: PurchaseOrderRow; onClose: () => void }) {
  const receive = useReceivePurchaseOrder();
  const items = (target.items ?? []).filter((i) => i.receivedQuantity < i.quantity);

  // Stable per-modal-open receipt number. The backend treats it as an
  // idempotency key, so a double-click / retry can't add the same quantities
  // to stock twice.
  const [receiptNumber] = useState(
    () => `GR-${target.id.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );

  const [lines, setLines] = useState(
    items.map((i) => ({
      purchaseOrderItemId: i.id,
      sku: i.sku,
      remaining: i.quantity - i.receivedQuantity,
      quantity: String(i.quantity - i.receivedQuantity),
      location: "MAIN",
    })),
  );

  const handleSubmit = async () => {
    const payloadItems = lines
      .filter((l) => Number(l.quantity) > 0)
      .map((l) => ({
        purchaseOrderItemId: l.purchaseOrderItemId,
        quantity: Number(l.quantity),
        location: l.location.trim() || "MAIN",
      }));
    if (payloadItems.length === 0) return toast.error("أدخل كمية استلام واحدة على الأقل");
    await receive.mutateAsync({ orderId: target.id, items: payloadItems, receiptNumber });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-black text-[#263544] flex items-center gap-2">
              <PackageCheck size={20} className="text-emerald-600" /> استلام المواد — {target.poNumber}
            </h2>
            <p className="text-xs font-bold text-[#263544]/50 mt-0.5">
              الاستلام يُدخل الكمية إلى المخزون ويحدّث تكلفتها.
            </p>
          </div>
          <button onClick={onClose} className="text-[#263544]/40 hover:text-[#263544]">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {lines.map((line, index) => (
            <div key={line.purchaseOrderItemId} className="grid grid-cols-12 gap-2 items-end bg-white/60 rounded-2xl border border-white/80 p-3">
              <div className="col-span-5">
                <p className="text-sm font-black text-[#263544]">{line.sku}</p>
                <p className="text-[11px] font-bold text-[#263544]/50">المتبقي: {fmtInt(line.remaining)}</p>
              </div>
              <div className="col-span-3">
                <Field label="الكمية المستلمة">
                  <input
                    type="number"
                    min={1}
                    max={line.remaining}
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l, i) => (i === index ? { ...l, quantity: e.target.value } : l)))
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="col-span-4">
                <Field label="الموقع">
                  <input
                    value={line.location}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l, i) => (i === index ? { ...l, location: e.target.value } : l)))
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-200">
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} loading={receive.isPending}>
            <PackageCheck size={16} /> تأكيد الاستلام
          </Button>
        </div>
      </div>
    </div>
  );
}
