"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Package2,
  History,
  Warehouse as WarehouseIcon,
  Layers,
  CalendarClock,
  Map,
  ClipboardCheck,
  ShieldCheck,
  Truck,
  BarChart3,
  ReceiptText,
  ShoppingCart,
  Tags,
  Plug,
} from "lucide-react";

interface TabItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

/**
 * Tab groups, one per area of the warehouse.
 *
 * Kept as separate lists rather than one long strip: fifteen tabs in a row is
 * not navigation, it is a wall. The shell shows only the group the current
 * route belongs to.
 */
export const TAB_GROUPS: Record<string, TabItem[]> = {
  inventory: [
    { name: "الأصناف", href: "/inventory", icon: Package2 },
    { name: "الدفعات", href: "/inventory/batches", icon: Layers },
    { name: "الصلاحية", href: "/inventory/expiry", icon: CalendarClock },
    { name: "حركات المخزون", href: "/inventory/movements", icon: History },
    { name: "المخازن", href: "/inventory/warehouses", icon: WarehouseIcon },
    { name: "المواقع والخانات", href: "/inventory/locations", icon: Map },
    { name: "الجرد", href: "/inventory/counts", icon: ClipboardCheck },
    { name: "فحص الجودة", href: "/inventory/quality", icon: ShieldCheck },
  ],
  purchasing: [
    { name: "أوامر الشراء", href: "/purchasing", icon: ShoppingCart },
    { name: "فواتير الشراء", href: "/purchasing/invoices", icon: ReceiptText },
  ],
  sales: [
    { name: "طلبات البيع", href: "/sales", icon: ShoppingCart },
    { name: "فواتير البيع", href: "/sales/invoices", icon: ReceiptText },
    { name: "التسعير والضرائب", href: "/sales/pricing", icon: Tags },
  ],
  fulfillment: [
    { name: "جولات الالتقاط", href: "/fulfillment", icon: ClipboardCheck },
    { name: "الشحنات", href: "/fulfillment/shipments", icon: Truck },
  ],
  analytics: [{ name: "مؤشرات الأداء", href: "/wms/analytics", icon: BarChart3 }],
  integrations: [{ name: "الربط والتكامل", href: "/settings/integrations", icon: Plug }],
};

interface WmsPageShellProps {
  title: string;
  subtitle: string;
  /** Which tab strip to show. */
  group: keyof typeof TAB_GROUPS;
  actions?: ReactNode;
  children: ReactNode;
}

export default function WmsPageShell({ title, subtitle, group, actions, children }: WmsPageShellProps) {
  const pathname = usePathname();
  const tabs = TAB_GROUPS[group] ?? [];

  // Exact match for a group's root, prefix match for its children — otherwise
  // `/inventory` would light up on every page beneath it.
  const isActive = (href: string) => {
    const roots = ["/inventory", "/purchasing", "/sales", "/fulfillment"];
    return roots.includes(href) ? pathname === href : pathname.startsWith(href);
  };

  return (
    <div
      className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col"
      dir="rtl"
    >
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
        <header className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-[#263544]/10 pb-8 relative">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 -outline-offset-4 group">
                <Sparkles
                  size={22}
                  className="text-[#C89355] group-hover:animate-bounce transition-all duration-300"
                  strokeWidth={2.5}
                />
              </div>
              <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">{title}</h1>
            </div>
            <p className="text-slate-600 text-sm font-bold pr-14 mt-1">{subtitle}</p>
          </div>

          {actions ? (
            <div className="mt-4 xl:mt-0 flex flex-wrap items-center gap-3 w-full xl:w-auto">{actions}</div>
          ) : null}
        </header>

        {tabs.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {tabs.map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black transition-all active:scale-95 ${
                    active
                      ? "bg-[#1a2530] text-[#C89355] shadow-[0_10px_20px_rgba(38,53,68,0.4)] border border-[#C89355]/40"
                      : "bg-white/60 backdrop-blur-md text-[#263544]/70 border border-white/80 hover:bg-white hover:text-[#263544] hover:border-[#C89355]/30 shadow-sm"
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.name}
                </Link>
              );
            })}
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
