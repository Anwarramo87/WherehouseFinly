"use client";
import { useState } from "react";
import {
  Package, ShoppingCart, DollarSign, RotateCcw, FileText, MapPin, Store, Plus, Route as RouteIcon,
} from "lucide-react";
import { Panel, Pill, TableFrame, Button, Loading, Empty, fmtMoney, fmtInt, fmtDate } from "@/components/wms/primitives";
import {
  useRepStock, useRepSales, useRepCollections, useRepReturns,
  useRepSettlements, useRepRoutes, useRepShops,
} from "@/hooks/useRepresentatives";
import { SALE_STATUS, SETTLEMENT_STATUS, COLLECTION_METHODS } from "@/components/representatives-workspace/shared";
import { useRepWorkspace } from "@/components/representatives-workspace/shell";
import {
  CreateSaleModal, CreateCollectionModal, CreateReturnModal,
  CreateSettlementModal, CreateShopModal, CreateRouteModal,
} from "@/components/representatives-workspace/modals";

export function StockView({ repId }: { repId: string }) {
  const { data, isLoading } = useRepStock(repId);
  return (
    <Panel title="مخزوني الحالي" icon={<Package size={20} />}>
      {isLoading ? <Loading /> : !data?.length ? (
        <Empty message="لا يوجد مخزون حالياً — انتظر تسليم بضاعة من المسؤول" />
      ) : (
        <TableFrame head={<><th>المنتج</th><th>الكمية</th><th>تكلفة الوحدة</th><th>القيمة الإجمالية</th></>}>
          {data.map(item => (
            <tr key={item.sku} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
              <td>
                <p className="font-black text-[#263544]">{item.product?.name ?? item.sku}</p>
                <p className="text-[11px] font-bold text-[#263544]/40">{item.sku} · {item.product?.unit}</p>
              </td>
              <td>
                <span className={`text-lg font-black tabular-nums ${item.quantity <= 5 ? "text-red-600" : "text-[#263544]"}`}>
                  {fmtInt(item.quantity)}
                </span>
                {item.quantity <= 5 && <Pill tone="red">منخفض</Pill>}
              </td>
              <td className="tabular-nums">{fmtMoney(item.unitCost, 0)} ل.س</td>
              <td className="tabular-nums font-black text-[#C89355]">{fmtMoney(item.totalValue, 0)} ل.س</td>
            </tr>
          ))}
        </TableFrame>
      )}
    </Panel>
  );
}

export function SalesView({ repId }: { repId: string }) {
  const { repProfile } = useRepWorkspace();
  const { data, isLoading } = useRepSales(repId);
  const sales = data?.data ?? [];
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Prominent quick invoice entry */}
      <div className="bg-gradient-to-l from-[#C89355] to-[#b07a40] rounded-[2rem] p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg mb-5">
        <div>
          <h2 className="text-lg font-black">فاتورة جديدة — بضغطة وحدة</h2>
          <p className="text-xs font-bold text-white/80 mt-1">
            اختر المحل، المنتج، الكمية والسعر ثم «حفظ» — الفاتورة تفتح مرة تانية فوراً لتسجّل التالية
          </p>
        </div>
        <Button variant="ghost" onClick={() => setOpen(true)} className="bg-white text-[#8a5e28]">
          <Plus size={16} /> فاتورة جديدة
        </Button>
      </div>

      <Panel title="توزيعاتي (فواتير البيع)" icon={<ShoppingCart size={20} />} actions={
        <Button onClick={() => setOpen(true)}><Plus size={14} /> فاتورة جديدة</Button>
      }>
        {isLoading ? <Loading /> : !sales.length ? (
          <Empty message="لا توجد مبيعات/توزيعات بعد — وزّع بضاعة على محلاتك" />
        ) : (
          <TableFrame head={<><th>رقم الفاتورة</th><th>التاريخ</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></>}>
            {sales.map(s => {
              const sm = SALE_STATUS[s.status] ?? { label: s.status, tone: "slate" as const };
              const remaining = Number(s.totalAmount) - Number(s.paidAmount);
              return (
                <tr key={s.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-black font-mono text-sm text-[#263544]">{s.saleNumber}</td>
                  <td className="text-xs font-bold text-[#263544]/60">{fmtDate(s.saleDate)}</td>
                  <td className="tabular-nums font-black">{fmtMoney(s.totalAmount, 0)} ل.س</td>
                  <td className="tabular-nums text-emerald-700 font-bold">{fmtMoney(s.paidAmount, 0)} ل.س</td>
                  <td className={`tabular-nums font-black ${remaining > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {fmtMoney(remaining, 0)} ل.س
                  </td>
                  <td><Pill tone={sm.tone}>{sm.label}</Pill></td>
                </tr>
              );
            })}
          </TableFrame>
        )}
      </Panel>
      {open && <CreateSaleModal repId={repId} repProfile={repProfile} onClose={() => setOpen(false)} />}
    </>
  );
}

export function CollectionsView({ repId }: { repId: string }) {
  const { data, isLoading } = useRepCollections(repId);
  const cols = data?.data ?? [];
  const [open, setOpen] = useState(false);
  return (
    <>
      <Panel title="تحصيلاتي" icon={<DollarSign size={20} />} actions={
        <Button onClick={() => setOpen(true)}><Plus size={14} /> تحصيل جديد</Button>
      }>
        {isLoading ? <Loading /> : !cols.length ? (
          <Empty message="لا توجد تحصيلات بعد" />
        ) : (
          <TableFrame head={<><th>التاريخ</th><th>المبلغ</th><th>الطريقة</th><th>ملاحظات</th></>}>
            {cols.map(c => (
              <tr key={c.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                <td className="text-xs font-bold">{fmtDate(c.collectionDate)}</td>
                <td className="tabular-nums font-black text-emerald-700">{fmtMoney(c.amount, 0)} ل.س</td>
                <td><Pill tone="slate">{COLLECTION_METHODS[c.method] ?? c.method}</Pill></td>
                <td className="text-xs text-[#263544]/50">{c.notes ?? "—"}</td>
              </tr>
            ))}
          </TableFrame>
        )}
      </Panel>
      {open && <CreateCollectionModal repId={repId} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ReturnsView({ repId }: { repId: string }) {
  const { repProfile } = useRepWorkspace();
  const { data, isLoading } = useRepReturns(repId);
  const returns = data?.data ?? [];
  const [open, setOpen] = useState(false);
  return (
    <>
      <Panel title="مرتجعاتي" icon={<RotateCcw size={20} />} actions={
        <Button onClick={() => setOpen(true)}><Plus size={14} /> مرتجع جديد</Button>
      }>
        {isLoading ? <Loading /> : !returns.length ? (
          <Empty message="لا توجد مرتجعات" />
        ) : (
          <TableFrame head={<><th>التاريخ</th><th>المنتج</th><th>الكمية</th><th>القيمة</th><th>الحالة</th></>}>
            {returns.map(r => (
              <tr key={r.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                <td className="text-xs font-bold">{fmtDate(r.returnDate)}</td>
                <td className="font-bold">{r.sku}</td>
                <td className="tabular-nums">{fmtInt(r.quantity)}</td>
                <td className="tabular-nums font-bold">{fmtMoney(r.totalValue, 0)} ل.س</td>
                <td><Pill tone={r.status === "pending" ? "amber" : r.status === "approved" ? "green" : "red"}>
                  {r.status === "pending" ? "بانتظار الموافقة" : r.status === "approved" ? "مقبول" : "مرفوض"}
                </Pill></td>
              </tr>
            ))}
          </TableFrame>
        )}
      </Panel>
      {open && <CreateReturnModal repId={repId} repProfile={repProfile} onClose={() => setOpen(false)} />}
    </>
  );
}

export function SettlementView({ repId }: { repId: string }) {
  const { data, isLoading } = useRepSettlements(repId);
  const settlements = data ?? [];
  const [open, setOpen] = useState(false);
  return (
    <>
      <Panel title="تسوياتي" icon={<FileText size={20} />} actions={
        <Button onClick={() => setOpen(true)}><Plus size={14} /> إنشاء تسوية</Button>
      }>
        {isLoading ? <Loading /> : !settlements.length ? (
          <Empty message="لا توجد تسويات — أنشئ تسوية للفترة الحالية" />
        ) : (
          <TableFrame head={<><th>الفترة</th><th>المبيعات</th><th>المحصّل</th><th>المستحق</th><th>فرق المخزون</th><th>الحالة</th></>}>
            {settlements.map(s => {
              const sm = SETTLEMENT_STATUS[s.status] ?? { label: s.status, tone: "slate" as const };
              return (
                <tr key={s.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                  <td className="text-xs font-bold">
                    {fmtDate(s.periodStart)} — {fmtDate(s.periodEnd)}
                  </td>
                  <td className="tabular-nums font-bold">{fmtMoney(s.soldValue, 0)}</td>
                  <td className="tabular-nums font-bold text-emerald-700">{fmtMoney(s.collectedValue, 0)}</td>
                  <td className={`tabular-nums font-black ${Number(s.outstandingAmount) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {fmtMoney(s.outstandingAmount, 0)}
                  </td>
                  <td className={`tabular-nums font-bold ${Number(s.stockVarianceValue) > 0 ? "text-amber-700" : "text-emerald-600"}`}>
                    {fmtMoney(s.stockVarianceValue, 0)}
                  </td>
                  <td><Pill tone={sm.tone}>{sm.label}</Pill></td>
                </tr>
              );
            })}
          </TableFrame>
        )}
      </Panel>
      {open && <CreateSettlementModal repId={repId} onClose={() => setOpen(false)} />}
    </>
  );
}

export function RouteView({ repId }: { repId: string }) {
  const { data: routes, isLoading: routesLoading } = useRepRoutes(repId);
  const { data: shops, isLoading: shopsLoading } = useRepShops(repId);
  const [openShop, setOpenShop] = useState(false);
  const [openRoute, setOpenRoute] = useState(false);

  return (
    <>
      <div className="space-y-6">
        <Panel
          title="خطوطي (مسار العمل)"
          icon={<RouteIcon size={20} />}
          actions={<Button onClick={() => setOpenRoute(true)}><Plus size={14} /> خط جديد</Button>}
        >
          {routesLoading ? <Loading /> : !routes?.length ? (
            <Empty message="لا يوجد خط بعد — أنشئ خطك الأول الذي تعمل عليه" />
          ) : (
            <div className="space-y-3">
              {routes?.map(r => (
                <div key={r.id} className="bg-white/60 rounded-2xl border border-white/80 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-[#263544] flex items-center gap-2">
                      <MapPin size={15} className="text-[#C89355]" /> {r.name}
                    </p>
                    {r.isActive && <Pill tone="green">نشط</Pill>}
                  </div>
                  {r.areas?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {r.areas.map(a => <Pill key={a} tone="slate">{a}</Pill>)}
                    </div>
                  )}
                  {r.schedule && <p className="text-[11px] font-bold text-[#263544]/50 mt-2">{r.schedule}</p>}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="محلاتي في الخط (مع ذاكرة المشتريات)"
          icon={<Store size={20} />}
          actions={<Button onClick={() => setOpenShop(true)}><Plus size={14} /> أضف محلاً</Button>}
        >
          {shopsLoading ? <Loading /> : !shops?.length ? (
            <Empty message="لا توجد محلات — أضف المحلات التي تزورها في خطك" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shops?.map(s => (
                <div key={s.customerId} className="bg-white/60 rounded-2xl border border-white/80 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-[#263544]">{s.name}</p>
                    {s.phone && <p className="text-[11px] font-bold text-[#263544]/50" dir="ltr">{s.phone}</p>}
                  </div>
                  {s.address && <p className="text-[11px] font-bold text-[#263544]/60">{s.address}</p>}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/70">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-[#263544]/50">المشتريات</p>
                      <p className="text-sm font-black text-[#C89355] tabular-nums">{fmtMoney(s.memory?.totalBought ?? 0, 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-[#263544]/50">عدد الفواتير</p>
                      <p className="text-sm font-black text-[#263544] tabular-nums">{fmtInt(s.memory?.saleCount ?? 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-[#263544]/50">آخر شراء</p>
                      <p className="text-sm font-black text-[#263544] tabular-nums">
                        {s.memory?.lastSaleDate ? fmtDate(s.memory.lastSaleDate) : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      {openShop && <CreateShopModal repId={repId} onClose={() => setOpenShop(false)} />}
      {openRoute && <CreateRouteModal repId={repId} onClose={() => setOpenRoute(false)} />}
    </>
  );
}