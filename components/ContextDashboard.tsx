"use client";
/**
 * Context-Aware Dashboard Sections
 *
 * Renders additional KPI sections on the home page based on which modules
 * are enabled for this factory. Each section is completely self-contained:
 * it fetches its own data and renders nothing if loading fails.
 *
 * Logic:
 *  - Uses entitlements to detect enabled modules
 *  - WMS section → inventory + manufacturing stats
 *  - Manufacturing section → BOM + production orders
 *  - Representatives section → rep stock value + outstanding
 *  - Admin Global → combined overview of everything
 */
import { useEntitlements } from "@/hooks/useEntitlements";
import { useManufacturingSummary } from "@/hooks/useManufacturing";
import { useRepresentatives, useSystemSettings } from "@/hooks/useRepresentatives";
import { useInventoryStats } from "@/hooks/useInventory";
import { useAuthStore } from "@/stores/auth-store";
import { Stat, Panel, Pill, fmtMoney, fmtInt, TableFrame, Loading, Empty } from "@/components/wms/primitives";
import {
  Package, Factory, Users, TrendingUp, DollarSign,
  AlertTriangle, BarChart3, ArrowRight, Layers, CheckCircle2,
} from "lucide-react";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// Main export — drops into home/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

export default function ContextDashboard() {
  const { data: ent } = useEntitlements();
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  if (!ent) return null;

  const enabled = new Set(ent.enabledPages ?? []);
  const hasWMS = enabled.has("inventory") || enabled.has("wms");
  const hasManufacturing = enabled.has("wms/production") || enabled.has("manufacturing");
  const hasReps = enabled.has("representatives") || enabled.has("representatives/workspace");

  if (!hasWMS && !hasManufacturing && !hasReps) return null;

  return (
    <div className="space-y-6 mt-8" dir="rtl">
      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#263544]/15 to-transparent" />
        <span className="text-xs font-black text-[#263544]/40 uppercase tracking-widest">لوحة التشغيل</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#263544]/15 to-transparent" />
      </div>

      {/* WMS Stock Section */}
      {hasWMS && <WMSSection />}

      {/* Manufacturing Section */}
      {hasManufacturing && <ManufacturingSection />}

      {/* Representatives Section — admin only or rep's own view */}
      {hasReps && isAdmin && <RepresentativesSection />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WMS Stock Section
// ─────────────────────────────────────────────────────────────────────────────

function WMSSection() {
  const { data: stats, isLoading } = useInventoryStats();
  const { data: settings } = useSystemSettings();
  const sym = settings?.currencySymbol ?? "ل.س";

  if (isLoading) return null;
  if (!stats) return null;

  const lowStockCount = (stats as { lowStock?: number }).lowStock ?? 0;
  const totalValue = (stats as { totalValue?: number }).totalValue ?? 0;
  const totalProducts = (stats as { totalProducts?: number }).totalProducts ?? 0;
  const outOfStock = (stats as { outOfStock?: number }).outOfStock ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-black text-[#263544] flex items-center gap-2">
          <Package size={18} className="text-[#C89355]" /> المخزن
        </h2>
        <Link href="/inventory" className="text-xs font-black text-[#C89355] flex items-center gap-1 hover:underline">
          عرض الكل <ArrowRight size={12} />
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="إجمالي الأصناف"
          value={fmtInt(totalProducts)}
          tone="neutral"
          icon={<Package size={16} />}
        />
        <Stat
          label="قيمة المخزون"
          value={`${fmtMoney(totalValue, 0)} ${sym}`}
          tone="info"
          icon={<TrendingUp size={16} />}
        />
        <Stat
          label="مخزون منخفض"
          value={fmtInt(lowStockCount)}
          tone={lowStockCount > 0 ? "warning" : "success"}
          icon={<AlertTriangle size={16} />}
        />
        <Stat
          label="نفد المخزون"
          value={fmtInt(outOfStock)}
          tone={outOfStock > 0 ? "danger" : "success"}
          icon={<AlertTriangle size={16} />}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Manufacturing Section
// ─────────────────────────────────────────────────────────────────────────────

function ManufacturingSection() {
  const { data: summary, isLoading } = useManufacturingSummary();
  const { data: settings } = useSystemSettings();
  const sym = settings?.currencySymbol ?? "ل.س";

  if (isLoading || !summary) return null;

  const byStatus = (summary.byStatus ?? []) as Array<{
    status: string;
    _count: { id: number };
    _sum: { totalCost: string | null };
  }>;
  const get = (s: string) => byStatus.find(x => x.status === s);
  const inProgress = get("IN_PROGRESS")?._count.id ?? 0;
  const completed = get("COMPLETED")?._count.id ?? 0;
  const planned = get("PLANNED")?._count.id ?? 0;
  const completedCost = Number(get("COMPLETED")?._sum.totalCost ?? 0);
  const totalBOMs = summary.totalActiveBOMs ?? 0;

  const recent = (summary.recentOrders ?? []) as Array<{
    orderNumber: string;
    productSku: string;
    status: string;
    plannedQty: number;
    actualQty: number;
    totalCost: number;
    createdAt: string;
  }>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-black text-[#263544] flex items-center gap-2">
          <Factory size={18} className="text-[#C89355]" /> الإنتاج
        </h2>
        <Link href="/wms/production" className="text-xs font-black text-[#C89355] flex items-center gap-1 hover:underline">
          إدارة الإنتاج <ArrowRight size={12} />
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat label="BOMs نشطة" value={fmtInt(totalBOMs)} tone="neutral" icon={<Layers size={16} />} />
        <Stat label="جارٍ تصنيعه" value={fmtInt(inProgress)} tone={inProgress > 0 ? "warning" : "neutral"} icon={<Factory size={16} />} />
        <Stat label="أوامر مخططة" value={fmtInt(planned)} tone="info" icon={<BarChart3 size={16} />} />
        <Stat label="تكلفة الإنتاج المنجز" value={`${fmtMoney(completedCost, 0)} ${sym}`} tone="success" icon={<CheckCircle2 size={16} />} />
      </div>

      {recent.length > 0 && (
        <Panel title="آخر أوامر الإنتاج" icon={<Factory size={18} />}>
          <TableFrame head={<><th>رقم الأمر</th><th>المنتج</th><th>الحالة</th><th>تكلفة الوحدة</th></>}>
            {recent.slice(0, 5).map(o => {
              const STATUS_COLORS: Record<string, string> = {
                COMPLETED: "green", IN_PROGRESS: "amber", PLANNED: "blue", DRAFT: "slate", CANCELLED: "red"
              };
              return (
                <tr key={o.orderNumber} className="bg-white/50 [&>td]:px-4 [&>td]:py-2.5">
                  <td className="font-mono text-xs font-bold text-[#263544]">{o.orderNumber}</td>
                  <td className="font-bold text-[#263544]">{o.productSku}</td>
                  <td>
                    <Pill tone={(STATUS_COLORS[o.status] ?? "slate") as "green"|"amber"|"blue"|"slate"|"red"}>
                      {{ COMPLETED: "مكتمل", IN_PROGRESS: "جارٍ", PLANNED: "مخطط", DRAFT: "مسودة", CANCELLED: "ملغى" }[o.status] ?? o.status}
                    </Pill>
                  </td>
                  <td className="tabular-nums text-sm font-bold">
                    {Number(o.totalCost) > 0 && o.actualQty > 0
                      ? `${fmtMoney(Number(o.totalCost) / o.actualQty, 0)} ${sym}`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </TableFrame>
        </Panel>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Representatives Section (Admin only)
// ─────────────────────────────────────────────────────────────────────────────

function RepresentativesSection() {
  const { data, isLoading } = useRepresentatives({ status: "active" });
  const { data: settings } = useSystemSettings();
  const sym = settings?.currencySymbol ?? "ل.س";

  if (isLoading || !data) return null;

  const reps = data.data ?? [];
  const totalStockValue = reps.reduce((s, r) => s + (r.summary?.stockValue ?? 0), 0);
  const totalSold = reps.reduce((s, r) => s + (r.summary?.totalSold ?? 0), 0);
  const totalCollected = reps.reduce((s, r) => s + (r.summary?.totalCollected ?? 0), 0);
  const totalOutstanding = reps.reduce((s, r) => s + (r.summary?.outstanding ?? 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-black text-[#263544] flex items-center gap-2">
          <Users size={18} className="text-[#C89355]" /> المندوبون
        </h2>
        <Link href="/representatives" className="text-xs font-black text-[#C89355] flex items-center gap-1 hover:underline">
          إدارة المندوبين <ArrowRight size={12} />
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat label="مندوبون نشطون" value={fmtInt(reps.length)} tone="success" icon={<Users size={16} />} />
        <Stat label="قيمة المخزون الموزع" value={`${fmtMoney(totalStockValue, 0)} ${sym}`} tone="info" icon={<Package size={16} />} />
        <Stat label="إجمالي المبيعات" value={`${fmtMoney(totalSold, 0)} ${sym}`} tone="neutral" icon={<TrendingUp size={16} />} />
        <Stat label="مستحق التحصيل" value={`${fmtMoney(totalOutstanding, 0)} ${sym}`} tone={totalOutstanding > 0 ? "warning" : "success"} icon={<DollarSign size={16} />} />
      </div>

      {reps.length > 0 && (
        <Panel title="أداء المندوبين" icon={<BarChart3 size={18} />}>
          <TableFrame head={<><th>المندوب</th><th>المخزون</th><th>المبيعات</th><th>المحصّل</th><th>المتبقي</th></>}>
            {reps.slice(0, 6).map(rep => (
              <tr key={rep.id} className="bg-white/50 hover:bg-white/80 [&>td]:px-4 [&>td]:py-2.5">
                <td>
                  <p className="font-black text-[#263544]">{rep.name}</p>
                  <p className="text-[11px] text-[#263544]/40">{rep.code}</p>
                </td>
                <td className="tabular-nums text-sm">{fmtMoney(rep.summary?.stockValue ?? 0, 0)}</td>
                <td className="tabular-nums text-sm font-bold">{fmtMoney(rep.summary?.totalSold ?? 0, 0)}</td>
                <td className="tabular-nums text-sm text-emerald-700">{fmtMoney(rep.summary?.totalCollected ?? 0, 0)}</td>
                <td className={`tabular-nums text-sm font-black ${(rep.summary?.outstanding ?? 0) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {fmtMoney(rep.summary?.outstanding ?? 0, 0)}
                </td>
              </tr>
            ))}
          </TableFrame>
        </Panel>
      )}
    </div>
  );
}
