"use client";
import Link from "next/link";
import {
  Package, ShoppingCart, DollarSign, RotateCcw, FileText, MapPin, Store,
  TrendingUp, CheckCircle2, ChevronLeft,
} from "lucide-react";
import { Stat, Panel, Pill, TableFrame, Empty, Loading, fmtMoney, fmtInt, fmtDate } from "@/components/wms/primitives";
import { useRepSummary, useRepSales, useRepRoutes, useRepShops } from "@/hooks/useRepresentatives";
import { useRepWorkspace } from "@/components/representatives-workspace/shell";
import { SALE_STATUS } from "@/components/representatives-workspace/shared";

export default function RepDashboard() {
  const { repId, repProfile } = useRepWorkspace();
  const { data: summary } = useRepSummary(repId);
  const { data: recentSales } = useRepSales(repId);
  const { data: routes, isLoading: routesLoading } = useRepRoutes(repId);
  const { data: shops } = useRepShops(repId);
  const sales = (recentSales?.data ?? []).slice(0, 5);
  const activeRoute = (routes ?? []).find(r => r.isActive) ?? (routes ?? [])[0];
  const routeShops = (shops ?? []).slice(0, 3);

  const quickActions = [
    { href: "/representatives/workspace/sales", label: "فاتورة جديدة", desc: "سجّل بيع بضاعة على محل بسرعة", icon: ShoppingCart, tone: "success" as const },
    { href: "/representatives/workspace/stock", label: "مخزوني", desc: "الكميات والقيم المتاحة", icon: Package, tone: "neutral" as const },
    { href: "/representatives/workspace/collections", label: "تحصيل جديد", desc: "سجّل قبض من المحلات", icon: DollarSign, tone: "info" as const },
    { href: "/representatives/workspace/returns", label: "مرتجع جديد", desc: "أعد بضاعة للمستودع", icon: RotateCcw, tone: "danger" as const },
    { href: "/representatives/workspace/route", label: "خطي ومحلاتي", desc: "أضف محلاً أو خطاً جديداً", icon: MapPin, tone: "warning" as const },
    { href: "/representatives/workspace/settlement", label: "تسوية", desc: "سوِّ حسابك عن الفترة", icon: FileText, tone: "slate" as const },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-l from-[#1a2530] to-[#263544] rounded-[2rem] border border-white/60 p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">مرحباً، {repProfile.name}</h2>
          <p className="text-xs font-bold text-white/60 mt-1">
            هذه لوحة أدائك — من هنا تبدأ توزيعاتك وتتابع تحصيلاتك بكل سهولة.
          </p>
        </div>
        <Link
          href="/representatives/workspace/sales"
          className="inline-flex items-center gap-2 bg-[#C89355] hover:bg-[#b9844e] text-white text-sm font-black px-5 py-3 rounded-2xl transition-colors"
        >
          <ShoppingCart size={16} /> فاتورة جديدة
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="قيمة المخزون" value={`${fmtMoney(summary?.stockValue ?? 0, 0)}`} tone="neutral" icon={<Package size={16} />} />
        <Stat label="إجمالي التوزيعات" value={`${fmtMoney(summary?.totalSold ?? 0, 0)}`} tone="info" icon={<TrendingUp size={16} />} />
        <Stat label="المحصّل" value={`${fmtMoney(summary?.totalCollected ?? 0, 0)}`} tone="success" icon={<CheckCircle2 size={16} />} />
        <Stat label="المتبقي" value={`${fmtMoney(summary?.outstanding ?? 0, 0)}`} tone={(summary?.outstanding ?? 0) > 0 ? "warning" : "success"} icon={<DollarSign size={16} />} />
        <Stat label="مرتجعات معلقة" value={fmtInt(summary?.pendingReturns ?? 0)} tone={(summary?.pendingReturns ?? 0) > 0 ? "danger" : "neutral"} icon={<RotateCcw size={16} />} />
      </div>

      {/* Where am I going — route panel */}
      <Panel
        title="وين رايح اليوم؟"
        icon={<MapPin size={20} />}
        actions={
          <Link href="/representatives/workspace/route" className="text-xs font-black text-[#C89355] hover:underline">
            إدارة خطي ومحلاتي
          </Link>
        }
      >
        {routesLoading ? <Loading /> : !activeRoute ? (
          <Empty message="ما حطيت خطّك بعد — ضع خطك (المسار) بنفسك لأنك أعرف بالطريق، وهو اختياري" />
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-black text-[#263544] text-lg">{activeRoute.name}</p>
                {activeRoute.isActive && <Pill tone="green">نشط</Pill>}
              </div>
              {activeRoute.areas?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {activeRoute.areas.map(a => <Pill key={a} tone="slate">{a}</Pill>)}
                </div>
              )}
              {activeRoute.schedule && (
                <p className="text-xs font-bold text-[#263544]/50 mt-2">{activeRoute.schedule}</p>
              )}
            </div>
            <div className="shrink-0">
              {routeShops.length > 0 ? (
                <div className="text-left">
                  <p className="text-[11px] font-black text-[#263544]/50 mb-1">محلاتي في الخط</p>
                  <div className="flex flex-col gap-1">
                    {routeShops.map(s => (
                      <span key={s.customerId} className="text-sm font-bold text-[#263544] flex items-center gap-1.5">
                        <Store size={13} className="text-[#C89355]" /> {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <Link href="/representatives/workspace/route" className="text-xs font-black text-[#C89355] hover:underline">
                  أضف محلاتي
                </Link>
              )}
            </div>
          </div>
        )}
      </Panel>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map(a => (
          <Link
            key={a.href}
            href={a.href}
            className="bg-white/70 rounded-2xl border border-white/80 p-5 flex items-center gap-4 hover:bg-white hover:shadow-lg hover:border-[#C89355]/40 transition-all group"
          >
            <div className="w-11 h-11 rounded-xl bg-[#c89355]/10 flex items-center justify-center shrink-0">
              <a.icon size={20} className="text-[#C89355]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[#263544]"> {a.label}</p>
              <p className="text-[11px] font-bold text-[#263544]/50 mt-0.5 truncate">{a.desc}</p>
            </div>
            <ChevronLeft size={18} className="text-[#263544]/30 group-hover:text-[#C89355] transition-colors shrink-0" />
          </Link>
        ))}
      </div>

      {/* Recent sales */}
      <Panel
        title="آخر التوزيعات"
        icon={<ShoppingCart size={20} />}
        actions={
          <Link href="/representatives/workspace/sales" className="text-xs font-black text-[#C89355] hover:underline">
            عرض الكل
          </Link>
        }
      >
        {!sales.length ? (
          <Empty message="لا توجد توزيعات بعد — ابدأ بتوزيع بضاعة على محلاتك" />
        ) : (
          <TableFrame head={<><th>رقم الفاتورة</th><th>التاريخ</th><th>الإجمالي</th><th>المتبقي</th><th>الحالة</th></>}>
            {sales.map(s => {
              const sm = SALE_STATUS[s.status] ?? { label: s.status, tone: "slate" as const };
              const remaining = Number(s.totalAmount) - Number(s.paidAmount);
              return (
                <tr key={s.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-black font-mono text-sm text-[#263544]">{s.saleNumber}</td>
                  <td className="text-xs font-bold text-[#263544]/60">{fmtDate(s.saleDate)}</td>
                  <td className="tabular-nums font-black">{fmtMoney(s.totalAmount, 0)} ل.س</td>
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
    </div>
  );
}