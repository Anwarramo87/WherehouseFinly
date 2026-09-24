"use client";
import { useState } from "react";
import {
  Layers, Plus, ChevronDown, ChevronUp, Edit2, CheckCircle2,
  Package, Trash2, Calculator, AlertCircle,
} from "lucide-react";
import WmsPageShell from "@/components/wms/WmsPageShell";
import {
  Panel, Stat, Pill, TableFrame, Button, Field, Loading, Empty,
  fmtMoney, fmtInt, inputClass,
} from "@/components/wms/primitives";
import { useCreateBOM, useUpdateBOM, useBOMCost, type BOMItem, type CreateBOMPayload } from "@/hooks/useManufacturing";
import { useInventory } from "@/hooks/useInventory";
import apiClient from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "react-hot-toast";

// Fetch all finished products with their active BOM
function useFinishedProducts() {
  return useQuery({
    queryKey: [...queryKeys.inventory.products({ productType: "FINISHED" })],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Array<{
        id: string; sku: string; name: string; unit: string;
        costPrice: number; unitPrice: number; productType: string;
      }> }>("/inventory/products", { params: { productType: "FINISHED", limit: 100 } });
      return res.data.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useRawMaterials() {
  return useQuery({
    queryKey: [...queryKeys.inventory.products({ productType: "RAW_MATERIAL" })],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Array<{
        id: string; sku: string; name: string; unit: string; costPrice: number;
      }> }>("/inventory/products", { params: { productType: "RAW_MATERIAL", limit: 200 } });
      return res.data.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useBomForProduct(sku: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.bom(sku),
    queryFn: async () => {
      const res = await apiClient.get(`/manufacturing/bom/${sku}`);
      return res.data;
    },
    enabled: !!sku,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function BOMPage() {
  const { data: products, isLoading } = useFinishedProducts();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState<string | null>(null); // sku of product to build BOM for

  return (
    <WmsPageShell
      group="analytics"
      title="قوائم المواد (BOM)"
      subtitle="ربط المنتجات النهائية بمواد خامها — أساس حساب التكلفة والإنتاج"
      actions={
        <div className="text-xs font-bold text-[#263544]/50">
          {(products?.length ?? 0)} منتج نهائي
        </div>
      }
    >
      {isLoading ? <Loading /> : !products?.length ? (
        <Empty message="لا توجد منتجات نهائية — أضفها من المخزن أو من إعداد WMS" />
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <ProductBOMCard
              key={product.sku}
              product={product}
              expanded={expanded === product.sku}
              onToggle={() => setExpanded(expanded === product.sku ? null : product.sku)}
              onBuild={() => setShowBuilder(product.sku)}
            />
          ))}
        </div>
      )}

      {showBuilder && (
        <BOMBuilderModal
          productSku={showBuilder}
          productName={products?.find(p => p.sku === showBuilder)?.name ?? showBuilder}
          onClose={() => setShowBuilder(null)}
        />
      )}
    </WmsPageShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product BOM Card
// ─────────────────────────────────────────────────────────────────────────────

function ProductBOMCard({
  product, expanded, onToggle, onBuild,
}: {
  product: { sku: string; name: string; costPrice: number; unitPrice: number };
  expanded: boolean;
  onToggle: () => void;
  onBuild: () => void;
}) {
  const { data: bom, isLoading } = useBomForProduct(product.sku);
  const hasBom = !!bom;
  const margin = product.unitPrice > 0 && product.costPrice > 0
    ? (((product.unitPrice - product.costPrice) / product.unitPrice) * 100).toFixed(1)
    : null;

  return (
    <Panel className="overflow-visible">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between gap-4 text-right hover:bg-white/40 transition-colors rounded-[2.5rem]"
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${hasBom ? "bg-emerald-100" : "bg-amber-100"}`}>
            {hasBom ? <CheckCircle2 size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-amber-600" />}
          </div>
          <div className="text-right">
            <p className="font-black text-[#263544]">{product.name}</p>
            <p className="text-xs font-bold text-[#263544]/50">{product.sku}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hasBom ? (
            <Pill tone="green">BOM نشطة v{(bom as { version?: number }).version ?? 1}</Pill>
          ) : (
            <Pill tone="amber">لا توجد BOM</Pill>
          )}
          {margin && <Pill tone="gold">هامش {margin}%</Pill>}
          {expanded ? <ChevronUp size={16} className="text-[#263544]/40" /> : <ChevronDown size={16} className="text-[#263544]/40" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-white/80 p-6 space-y-4">
          {isLoading ? <Loading /> : hasBom ? (
            <BOMDetail bom={bom as BOMData} onEdit={onBuild} />
          ) : (
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-sm font-bold text-[#263544]/60">لا توجد BOM لهذا المنتج بعد</p>
              <Button onClick={onBuild}>
                <Plus size={16} /> إنشاء BOM
              </Button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

interface BOMData {
  id: string;
  version: number;
  items: Array<{ materialSku: string; quantity: number; unit: string; wastePercent: number }>;
  calculatedCost?: { materialCost: number; breakdown: Array<{ sku: string; name: string; quantity: number; unitCost: number; totalCost: number }> };
}

function BOMDetail({ bom, onEdit }: { bom: BOMData; onEdit: () => void }) {
  const { data: cost, isLoading } = useBOMCostData(bom.id);
  const breakdown = cost?.breakdown ?? bom.calculatedCost?.breakdown ?? [];
  const totalMaterialCost = cost?.materialCost ?? bom.calculatedCost?.materialCost ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[#263544]">مواد الإنتاج — إصدار {bom.version}</h3>
        <Button variant="ghost" onClick={onEdit}>
          <Edit2 size={14} /> تعديل BOM
        </Button>
      </div>
      <TableFrame
        head={<>
          <th>المادة الخام</th>
          <th>الكمية</th>
          <th>الوحدة</th>
          <th>هدر %</th>
          <th>سعر الوحدة</th>
          <th>الإجمالي</th>
        </>}
      >
        {bom.items.map((item) => {
          const b = breakdown.find(x => x.sku === item.materialSku);
          return (
            <tr key={item.materialSku} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
              <td className="font-bold text-[#263544]">{b?.name ?? item.materialSku}<br /><span className="text-[11px] text-[#263544]/40">{item.materialSku}</span></td>
              <td className="tabular-nums">{Number(item.quantity).toFixed(3)}</td>
              <td className="text-[#263544]/60">{item.unit}</td>
              <td>{Number(item.wastePercent) > 0 ? <Pill tone="amber">{item.wastePercent}%</Pill> : "—"}</td>
              <td className="tabular-nums">{b ? fmtMoney(b.unitCost, 0) : "—"}</td>
              <td className="tabular-nums font-black text-[#8a5f2a]">{b ? fmtMoney(b.totalCost, 0) : "—"}</td>
            </tr>
          );
        })}
      </TableFrame>
      {totalMaterialCost > 0 && (
        <div className="flex justify-end">
          <div className="bg-[#1a2530] text-[#C89355] rounded-2xl px-6 py-3 flex items-center gap-3">
            <Calculator size={16} />
            <span className="text-sm font-black">إجمالي تكلفة المواد:</span>
            <span className="text-lg font-black tabular-nums">{fmtMoney(totalMaterialCost, 0)} ل.س</span>
          </div>
        </div>
      )}
    </div>
  );
}

function useBOMCostData(bomId: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.bomCost(bomId),
    queryFn: async () => {
      const res = await apiClient.get<{ materialCost: number; breakdown: Array<{ sku: string; name: string; quantity: number; unitCost: number; totalCost: number }> }>(`/manufacturing/bom/cost/${bomId}`);
      return res.data;
    },
    enabled: !!bomId,
    staleTime: 5 * 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BOM Builder Modal
// ─────────────────────────────────────────────────────────────────────────────

function BOMBuilderModal({ productSku, productName, onClose }: { productSku: string; productName: string; onClose: () => void }) {
  const { data: rawMaterials, isLoading: loadingMaterials } = useRawMaterials();
  const createBOM = useCreateBOM();
  const [items, setItems] = useState<Array<{ materialSku: string; quantity: string; unit: string; wastePercent: string; notes: string }>>([
    { materialSku: "", quantity: "", unit: "قطعة", wastePercent: "0", notes: "" },
  ]);
  const [notes, setNotes] = useState("");

  const addItem = () => setItems(p => [...p, { materialSku: "", quantity: "", unit: "قطعة", wastePercent: "0", notes: "" }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, k: string, v: string) =>
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  const getMaterialUnit = (sku: string) => rawMaterials?.find(m => m.sku === sku)?.unit ?? "قطعة";
  const getMaterialCost = (sku: string) => rawMaterials?.find(m => m.sku === sku)?.costPrice ?? 0;

  const totalEstimate = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const waste = Number(item.wastePercent) || 0;
    const cost = getMaterialCost(item.materialSku);
    return sum + (qty * (1 + waste / 100) * cost);
  }, 0);

  const handleSave = async () => {
    const validItems = items.filter(i => i.materialSku && Number(i.quantity) > 0);
    if (validItems.length === 0) return toast.error("أضف مادة خام واحدة على الأقل");
    const payload: CreateBOMPayload = {
      productSku,
      notes,
      items: validItems.map(i => ({
        materialSku: i.materialSku,
        quantity: Number(i.quantity),
        unit: i.unit || getMaterialUnit(i.materialSku),
        wastePercent: Number(i.wastePercent) || 0,
        notes: i.notes || undefined,
      })),
    };
    await createBOM.mutateAsync(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1520]/70 backdrop-blur-md" dir="rtl">
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] border-2 border-white shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/80 flex items-center justify-between bg-white/50">
          <div>
            <h2 className="text-lg font-black text-[#263544] flex items-center gap-2">
              <Layers size={20} className="text-[#C89355]" /> قائمة مواد — {productName}
            </h2>
            <p className="text-xs font-bold text-[#263544]/50 mt-0.5">حدد المواد الخام وكمياتها لإنتاج وحدة واحدة</p>
          </div>
          <button onClick={onClose} className="text-[#263544]/40 hover:text-[#263544] text-2xl font-black">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {loadingMaterials ? <Loading /> : (
            <>
              {items.map((item, idx) => {
                const selectedMaterial = rawMaterials?.find(m => m.sku === item.materialSku);
                const lineEstimate = selectedMaterial
                  ? Number(item.quantity || 0) * (1 + Number(item.wastePercent || 0) / 100) * Number(selectedMaterial.costPrice)
                  : 0;
                return (
                  <div key={idx} className="bg-white/60 rounded-2xl border border-white/80 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#263544]/50">المادة {idx + 1}</span>
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <Field label="المادة الخام">
                          <select
                            value={item.materialSku}
                            onChange={e => {
                              const mat = rawMaterials?.find(m => m.sku === e.target.value);
                              updateItem(idx, "materialSku", e.target.value);
                              if (mat) updateItem(idx, "unit", mat.unit);
                            }}
                            className={inputClass}
                          >
                            <option value="">— اختر مادة —</option>
                            {(rawMaterials ?? []).map(m => (
                              <option key={m.sku} value={m.sku}>{m.name} ({m.sku})</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <Field label="الكمية / وحدة">
                        <input type="number" step="0.001" value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} className={inputClass} placeholder="1.80" />
                      </Field>
                      <Field label="هدر %">
                        <input type="number" step="0.1" value={item.wastePercent} onChange={e => updateItem(idx, "wastePercent", e.target.value)} className={inputClass} placeholder="0" />
                      </Field>
                    </div>
                    {lineEstimate > 0 && (
                      <p className="text-xs font-bold text-[#C89355]">
                        التكلفة التقديرية: {fmtMoney(lineEstimate, 0)} ل.س
                      </p>
                    )}
                  </div>
                );
              })}

              <button
                onClick={addItem}
                className="w-full py-3 border-2 border-dashed border-[#C89355]/40 rounded-2xl text-sm font-black text-[#C89355] hover:bg-[#C89355]/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} /> إضافة مادة خام
              </button>

              <Field label="ملاحظات (اختياري)">
                <input value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} />
              </Field>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/80 bg-white/40 flex items-center justify-between">
          <div>
            {totalEstimate > 0 && (
              <div className="flex items-center gap-2">
                <Calculator size={16} className="text-[#C89355]" />
                <span className="text-sm font-black text-[#263544]">إجمالي تقديري:</span>
                <span className="text-lg font-black text-[#C89355] tabular-nums">{fmtMoney(totalEstimate, 0)} ل.س</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button onClick={handleSave} loading={createBOM.isPending}>
              <CheckCircle2 size={16} /> حفظ BOM
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
