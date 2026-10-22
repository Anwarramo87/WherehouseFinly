"use client";

import { useState } from "react";
import {
  Warehouse as WarehouseIcon,
  ArrowRightLeft,
  Scissors,
  Shirt,
  Boxes,
  PackageCheck,
  Plus,
  X,
  Search,
} from "lucide-react";
import WmsPageShell from "@/components/wms/WmsPageShell";
import {
  Panel,
  Stat,
  Pill,
  Button,
  Field,
  Loading,
  Empty,
  fmtInt,
  inputClass,
} from "@/components/wms/primitives";
import {
  useProductionWarehouses,
  useProductionWarehouseBalances,
  useStockTransfers,
  useCreateStockTransfer,
  type ProductionStageType,
  type StockTransferRow,
} from "@/hooks/useProduction";
import { toast } from "react-hot-toast";

const STAGE_META: Record<
  ProductionStageType,
  { label: string; icon: typeof Scissors; tone: "gold" | "blue" | "amber" | "green" }
> = {
  CUTTING: { label: "مستودع القص", icon: Scissors, tone: "gold" },
  SEWING: { label: "مستودع الخياطة", icon: Shirt, tone: "blue" },
  ASSEMBLY: { label: "مستودع الأمبلاج", icon: Boxes, tone: "amber" },
  FINISHED: { label: "مستودع المنتج التام", icon: PackageCheck, tone: "green" },
};

/** One row of the transfer log, as the API returns it. */
interface TransferRow {
  id: string;
  transferNumber: string;
  sku: string;
  quantity: number;
  referenceType: string | null;
  createdAt: string;
  fromWarehouse?: { code: string; name: string } | null;
  toWarehouse?: { code: string; name: string } | null;
}

export default function ProductionWarehousesPage() {
  const [showTransfer, setShowTransfer] = useState(false);
  const [skuFilter, setSkuFilter] = useState("");

  const { data: warehouses, isLoading } = useProductionWarehouses();
  const { data: balances } = useProductionWarehouseBalances();
  const { data: transfers } = useStockTransfers({ sku: skuFilter || undefined });

  const totalQuantity = (warehouses ?? []).reduce((s, w) => s + w.totalQuantity, 0);
  const activeCount = (warehouses ?? []).filter((w) => w.isActive).length;

  return (
    <WmsPageShell
      group="production"
      title="مستودعات الإنتاج"
      subtitle="مستودع مستقل لكل مرحلة — القص، الخياطة، الأمبلاج، والمنتج التام"
      actions={
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#263544]/35 pointer-events-none"
            />
            <input
              value={skuFilter}
              onChange={(e) => setSkuFilter(e.target.value)}
              placeholder="بحث بالرمز…"
              className={`${inputClass} w-48 pr-9`}
            />
          </div>
          <Button onClick={() => setShowTransfer(true)}>
            <ArrowRightLeft size={15} /> نقل مخزون
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat
          label="المستودعات"
          value={fmtInt(warehouses?.length ?? 0)}
          tone="info"
          icon={<WarehouseIcon size={16} />}
        />
        <Stat
          label="نشطة"
          value={fmtInt(activeCount)}
          tone="success"
          icon={<WarehouseIcon size={16} />}
        />
        <Stat
          label="إجمالي القطع"
          value={fmtInt(totalQuantity)}
          tone="neutral"
          icon={<Boxes size={16} />}
        />
        <Stat
          label="حركات النقل"
          value={fmtInt(transfers?.length ?? 0)}
          tone="warning"
          icon={<ArrowRightLeft size={16} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {(warehouses ?? []).map((warehouse) => {
          const meta = warehouse.stageType ? STAGE_META[warehouse.stageType] : null;
          const Icon = meta?.icon ?? WarehouseIcon;
          const balance = balances?.find((b) => b.warehouseId === warehouse.id);

          return (
            <Panel key={warehouse.id} title={warehouse.name} icon={<Icon size={20} />}>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Pill tone="gold">{warehouse.code}</Pill>
                  {meta ? <Pill tone={meta.tone}>{meta.label}</Pill> : null}
                  {!warehouse.isActive ? <Pill tone="slate">غير نشط</Pill> : null}
                </div>

                {warehouse.balances.length === 0 ? (
                  <Empty message="لا توجد مواد في هذا المستودع" />
                ) : (
                  <div className="space-y-2">
                    {(balance?.items ?? warehouse.balances).map((item) => (
                      <div
                        key={item.sku}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2"
                      >
                        <span className="font-mono text-xs font-black text-[#263544]/80">
                          {item.sku}
                        </span>
                        <span className="text-xs font-black text-[#263544] tabular-nums">
                          {fmtInt(item.quantity)}
                          <span className="text-[#263544]/40 font-bold"> / متاح {fmtInt(item.available)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel title="سجل حركات النقل" icon={<ArrowRightLeft size={20} />}>
        {isLoading ? (
          <Loading />
        ) : (transfers?.length ?? 0) === 0 ? (
          <Empty message="لا توجد حركات نقل بعد" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-[#1a2530] text-[#C89355]">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-black [&>th]:text-xs">
                  <th>رقم الحركة</th>
                  <th>من</th>
                  <th>إلى</th>
                  <th>الرمز</th>
                  <th>الكمية</th>
                  <th>المرجع</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/70">
                {(transfers ?? []).map((t) => {
                  const row = t as TransferRow;
                  return (
                    <tr key={row.id} className="text-[#263544]/80">
                      <td className="px-4 py-3 font-mono text-xs font-black">
                        {row.transferNumber}
                      </td>
                      <td className="px-4 py-3">{row.fromWarehouse?.code ?? "—"}</td>
                      <td className="px-4 py-3">{row.toWarehouse?.code ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.sku}</td>
                      <td className="px-4 py-3 tabular-nums font-black">
                        {fmtInt(row.quantity)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#263544]/55">
                        {row.referenceType ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#263544]/55">
                        {new Date(row.createdAt).toLocaleDateString("ar-SY")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {showTransfer ? (
        <TransferModal
          warehouses={warehouses ?? []}
          onClose={() => setShowTransfer(false)}
        />
      ) : null}
    </WmsPageShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transfer modal
// ─────────────────────────────────────────────────────────────────────────────

function TransferModal({
  warehouses,
  onClose,
}: {
  warehouses: Array<{ id: string; name: string; code: string }>;
  onClose: () => void;
}) {
  const [fromWarehouseId, setFromWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [toWarehouseId, setToWarehouseId] = useState(warehouses[1]?.id ?? "");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const transfer = useCreateStockTransfer();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="bg-white rounded-[2rem] w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black text-[#263544] flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-[#C89355]" /> نقل مخزون بين المستودعات
          </h2>
          <button onClick={onClose} className="text-[#263544]/40">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="من مستودع">
            <select
              value={fromWarehouseId}
              onChange={(e) => setFromWarehouseId(e.target.value)}
              className={inputClass}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </Field>

          <Field label="إلى مستودع">
            <select
              value={toWarehouseId}
              onChange={(e) => setToWarehouseId(e.target.value)}
              className={inputClass}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </Field>

          <Field label="رمز المادة (SKU)">
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </Field>

          <Field label="الكمية">
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="ملاحظات">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <p className="text-[11px] font-bold text-[#263544]/55 mt-3">
          لا يمكن نقل كمية أكبر من رصيد مستودع المصدر. كل حركة تُسجَّل برقم مرجعي
          وتاريخ ومصدر ووجهة وكمية ومستخدم منفذ.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            loading={transfer.isPending}
            disabled={!fromWarehouseId || !toWarehouseId || !sku || !quantity}
            onClick={async () => {
              try {
                await transfer.mutateAsync({
                  fromWarehouseId,
                  toWarehouseId,
                  sku,
                  quantity: Number(quantity),
                  notes: notes || undefined,
                });
                onClose();
              } catch {
                toast.error("تعذّر نقل المخزون");
              }
            }}
          >
            <ArrowRightLeft size={15} /> تنفيذ النقل
          </Button>
        </div>
      </div>
    </div>
  );
}
