"use client";

import { useState } from "react";
import { Tags, Percent, Plus, Sparkles, Layers3 } from "lucide-react";
import WmsPageShell from "@/components/wms/WmsPageShell";
import {
  Button,
  Empty,
  Field,
  Loading,
  Panel,
  Pill,
  TableFrame,
  fmtDate,
  fmtInt,
  fmtMoney,
  inputClass,
} from "@/components/wms/primitives";
import {
  usePriceTiers,
  useProductPrices,
  useSavePriceTier,
  useSaveTaxRate,
  useSeedPricingDefaults,
  useTaxRates,
  useUpsertProductPrice,
} from "@/hooks/useWms";
import { toNum } from "@/types/wms";
import { toast } from "react-hot-toast";

export default function PricingPage() {
  const { data: tiers, isLoading: tiersLoading } = usePriceTiers();
  const { data: taxes, isLoading: taxesLoading } = useTaxRates();
  const [skuFilter, setSkuFilter] = useState("");
  const { data: prices } = useProductPrices(skuFilter ? { sku: skuFilter } : undefined);

  const saveTier = useSavePriceTier();
  const saveTax = useSaveTaxRate();
  const upsertPrice = useUpsertProductPrice();
  const seed = useSeedPricingDefaults();

  const [tierForm, setTierForm] = useState({ code: "", name: "", discountPercent: 0 });
  const [taxForm, setTaxForm] = useState({ code: "", name: "", rate: 0 });
  const [priceForm, setPriceForm] = useState({ sku: "", priceTierId: "", price: "", minQuantity: 1 });

  const hasNothing = (tiers?.length ?? 0) === 0 && (taxes?.length ?? 0) === 0;

  return (
    <WmsPageShell
      group="sales"
      title="التسعير والضرائب"
      subtitle="فئات التسعير (جملة/مفرق)، نسب الضريبة، وأسعار الأصناف مع كسور الكمية."
      actions={
        hasNothing ? (
          <Button onClick={() => seed.mutate()} loading={seed.isPending}>
            <Sparkles size={16} />
            إنشاء الإعدادات الافتراضية
          </Button>
        ) : null
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Panel
          title="فئات التسعير"
          icon={<Layers3 size={20} />}
          badge={<Pill tone="gold">{fmtInt(tiers?.length ?? 0)}</Pill>}
        >
          {tiersLoading ? (
            <Loading />
          ) : (tiers?.length ?? 0) === 0 ? (
            <Empty message="لا توجد فئات تسعير. الافتراضية تنشئ: مفرق، جملة، موزّع." />
          ) : (
            <TableFrame
              head={
                <>
                  <th>الكود</th>
                  <th>الاسم</th>
                  <th>الخصم الافتراضي</th>
                  <th>أسعار خاصة</th>
                  <th>عملاء</th>
                  <th>الحالة</th>
                </>
              }
            >
              {(tiers ?? []).map((tier) => (
                <tr key={tier.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-mono text-xs font-black">{tier.code}</td>
                  <td className="font-black text-[#263544]">{tier.name}</td>
                  <td className="tabular-nums font-bold">{toNum(tier.discountPercent)}%</td>
                  <td className="tabular-nums">{tier._count?.prices ?? 0}</td>
                  <td className="tabular-nums">{tier._count?.customers ?? 0}</td>
                  <td>
                    {tier.isDefault ? <Pill tone="gold">افتراضية</Pill> : null}
                    {tier.isActive ? <Pill tone="green">فعّالة</Pill> : <Pill>موقوفة</Pill>}
                  </td>
                </tr>
              ))}
            </TableFrame>
          )}

          <form
            className="p-6 grid grid-cols-4 gap-3 border-t border-white/70 bg-white/30"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!tierForm.code.trim() || !tierForm.name.trim()) {
                toast.error("الكود والاسم مطلوبان");
                return;
              }
              await saveTier.mutateAsync({
                code: tierForm.code.trim().toUpperCase(),
                name: tierForm.name.trim(),
                discountPercent: tierForm.discountPercent,
              });
              setTierForm({ code: "", name: "", discountPercent: 0 });
            }}
          >
            <Field label="الكود">
              <input
                value={tierForm.code}
                onChange={(e) => setTierForm((p) => ({ ...p, code: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="الاسم">
              <input
                value={tierForm.name}
                onChange={(e) => setTierForm((p) => ({ ...p, name: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="خصم %">
              <input
                type="number"
                step="0.1"
                value={tierForm.discountPercent}
                onChange={(e) => setTierForm((p) => ({ ...p, discountPercent: Number(e.target.value) }))}
                className={inputClass}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" loading={saveTier.isPending}>
                <Plus size={16} />
                إضافة
              </Button>
            </div>
          </form>
        </Panel>

        <Panel
          title="نسب الضريبة"
          icon={<Percent size={20} />}
          badge={<Pill tone="gold">{fmtInt(taxes?.length ?? 0)}</Pill>}
        >
          {taxesLoading ? (
            <Loading />
          ) : (taxes?.length ?? 0) === 0 ? (
            <Empty message="لا توجد نسب ضريبة معرّفة." />
          ) : (
            <TableFrame
              head={
                <>
                  <th>الكود</th>
                  <th>الاسم</th>
                  <th>النسبة</th>
                  <th>الحالة</th>
                </>
              }
            >
              {(taxes ?? []).map((tax) => (
                <tr key={tax.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-mono text-xs font-black">{tax.code}</td>
                  <td className="font-black text-[#263544]">{tax.name}</td>
                  <td className="tabular-nums font-bold">{toNum(tax.rate)}%</td>
                  <td>
                    {tax.isDefault ? <Pill tone="gold">افتراضية</Pill> : null}
                    {tax.isActive ? <Pill tone="green">فعّالة</Pill> : <Pill>موقوفة</Pill>}
                  </td>
                </tr>
              ))}
            </TableFrame>
          )}

          <form
            className="p-6 grid grid-cols-4 gap-3 border-t border-white/70 bg-white/30"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!taxForm.code.trim() || !taxForm.name.trim()) {
                toast.error("الكود والاسم مطلوبان");
                return;
              }
              await saveTax.mutateAsync({
                code: taxForm.code.trim().toUpperCase(),
                name: taxForm.name.trim(),
                rate: taxForm.rate,
              });
              setTaxForm({ code: "", name: "", rate: 0 });
            }}
          >
            <Field label="الكود">
              <input
                value={taxForm.code}
                onChange={(e) => setTaxForm((p) => ({ ...p, code: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="الاسم">
              <input
                value={taxForm.name}
                onChange={(e) => setTaxForm((p) => ({ ...p, name: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="النسبة %">
              <input
                type="number"
                step="0.001"
                value={taxForm.rate}
                onChange={(e) => setTaxForm((p) => ({ ...p, rate: Number(e.target.value) }))}
                className={inputClass}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" loading={saveTax.isPending}>
                <Plus size={16} />
                إضافة
              </Button>
            </div>
          </form>
        </Panel>
      </div>

      <Panel
        title="أسعار الأصناف حسب الفئة"
        icon={<Tags size={20} />}
        actions={
          <input
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
            placeholder="تصفية بـ SKU"
            className={`${inputClass} w-48`}
          />
        }
      >
        {(prices?.length ?? 0) === 0 ? (
          <Empty message="لا توجد أسعار خاصة. بدونها يُطبَّق سعر القائمة ناقصاً خصم الفئة." />
        ) : (
          <TableFrame
            head={
              <>
                <th>الصنف</th>
                <th>الفئة</th>
                <th>السعر</th>
                <th>ابتداءً من كمية</th>
                <th>من تاريخ</th>
                <th>إلى تاريخ</th>
              </>
            }
          >
            {(prices ?? []).map((price) => (
              <tr key={price.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                <td className="font-black text-[#263544]">{price.sku}</td>
                <td className="font-bold">{price.priceTier?.name ?? "—"}</td>
                <td className="tabular-nums font-black">{fmtMoney(price.price)}</td>
                <td className="tabular-nums">{fmtInt(price.minQuantity)}</td>
                <td className="text-xs font-bold">{fmtDate(price.validFrom)}</td>
                <td className="text-xs font-bold">{fmtDate(price.validTo)}</td>
              </tr>
            ))}
          </TableFrame>
        )}

        <form
          className="p-6 grid grid-cols-1 md:grid-cols-5 gap-3 border-t border-white/70 bg-white/30"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!priceForm.sku.trim() || !priceForm.priceTierId || !priceForm.price) {
              toast.error("الصنف والفئة والسعر مطلوبة");
              return;
            }
            await upsertPrice.mutateAsync({
              sku: priceForm.sku.trim(),
              priceTierId: priceForm.priceTierId,
              price: Number(priceForm.price),
              minQuantity: priceForm.minQuantity,
            });
            setPriceForm({ sku: "", priceTierId: "", price: "", minQuantity: 1 });
          }}
        >
          <Field label="SKU">
            <input
              value={priceForm.sku}
              onChange={(e) => setPriceForm((p) => ({ ...p, sku: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="الفئة">
            <select
              value={priceForm.priceTierId}
              onChange={(e) => setPriceForm((p) => ({ ...p, priceTierId: e.target.value }))}
              className={inputClass}
            >
              <option value="">— اختر —</option>
              {(tiers ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="السعر">
            <input
              type="number"
              step="0.01"
              value={priceForm.price}
              onChange={(e) => setPriceForm((p) => ({ ...p, price: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="ابتداءً من كمية">
            <input
              type="number"
              min={1}
              value={priceForm.minQuantity}
              onChange={(e) => setPriceForm((p) => ({ ...p, minQuantity: Number(e.target.value) }))}
              className={inputClass}
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" loading={upsertPrice.isPending}>
              <Plus size={16} />
              حفظ السعر
            </Button>
          </div>

          <p className="md:col-span-5 text-[11px] font-bold text-[#263544]/50">
            «ابتداءً من كمية» يبني كسور الكمية: صفّان لنفس الصنف والفئة بحدّين مختلفين يعنيان سعرين، ويُطبَّق
            أعمق حدّ تبلغه كمية البند.
          </p>
        </form>
      </Panel>
    </WmsPageShell>
  );
}
