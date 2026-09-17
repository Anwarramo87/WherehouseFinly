"use client";

import {
  Loader2,
  X,
  Layers,
  Check,
  ShieldCheck,
  Sparkles,
  LayoutGrid,
  Users,
  Calculator,
  Package,
  Truck,
  Clock,
  BadgeDollarSign,
  FileText,
  Settings2,
} from "lucide-react";
import {
  useFactoryUserEntitlements,
  useToggleUserEntitlement,
} from "@/hooks/useSuperAdmin";

type PageEntitlement = {
  key: string;
  name?: string | null;
  label?: string | null;
  enabled: boolean;
};

type ModuleEntitlement = {
  key: string;
  name?: string | null;
  label?: string | null;
  pages: PageEntitlement[];
};

function moduleIcon(key: string) {
  const k = key.toLowerCase();
  if (k.includes("hr") || k.includes("employee")) return Users;
  if (k.includes("account") || k.includes("finance") || k.includes("ledger")) return Calculator;
  if (k.includes("warehouse") || k.includes("wms") || k.includes("inventory") || k.includes("stock"))
    return Package;
  if (k.includes("transport") || k.includes("fleet")) return Truck;
  if (k.includes("attendance") || k.includes("time")) return Clock;
  if (k.includes("payroll") || k.includes("salary") || k.includes("wage")) return BadgeDollarSign;
  if (k.includes("report") || k.includes("doc")) return FileText;
  if (k.includes("setting") || k.includes("config")) return Settings2;
  return Layers;
}

function moduleLabel(mod: ModuleEntitlement) {
  return mod.label ?? mod.name ?? mod.key;
}

function pageLabel(page: PageEntitlement) {
  return page.label ?? page.name ?? page.key;
}

export function UserEntitlementsPanel({
  tenantId,
  userId,
  onClose,
}: {
  tenantId: string;
  userId: string;
  onClose: () => void;
}) {
  const { data: userEntitlements, isLoading } = useFactoryUserEntitlements(tenantId, userId);
  const toggle = useToggleUserEntitlement(tenantId, userId);

  const modules = (userEntitlements?.modules ?? []) as ModuleEntitlement[];
  const totalPages = modules.reduce((acc, m) => acc + m.pages.length, 0);
  const enabledPages = modules.reduce((acc, m) => acc + m.pages.filter((p) => p.enabled).length, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-l from-[#263544]/[0.06] via-slate-50 to-white px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#263544] text-[#C89355] shadow-sm">
            <ShieldCheck size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h4 className="flex items-center gap-1.5 text-sm font-black text-[#263544]">
              صلاحيات هذا الحساب
              <Sparkles size={12} className="text-[#C89355]" aria-hidden="true" />
            </h4>
            <p className="truncate text-xs text-slate-500">
              تفعيل الوحدات والصفحات لهذا الآدمن فقط — لا يؤثر على باقي آدمن المصنع
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          <X size={13} aria-hidden="true" />
          إغلاق
        </button>
      </div>

      {/* stats bar — only when loaded */}
      {!isLoading && modules.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs sm:px-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-bold text-slate-700 ring-1 ring-slate-200">
            <LayoutGrid size={12} className="text-slate-400" aria-hidden="true" />
            {modules.length} وحدة
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 ring-1 ring-emerald-200">
            <Check size={12} aria-hidden="true" />
            {enabledPages} / {totalPages} صفحة مفعّلة
          </span>
          <span className="ml-auto hidden items-center gap-1 text-[11px] text-slate-400 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C89355]" aria-hidden="true" />
            لكل آدمن على حدة
          </span>
        </div>
      )}

      <div className="p-3 sm:p-4">
        {isLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} aria-hidden="true" />
            جارٍ تحميل الصلاحيات…
          </div>
        )}

        {!isLoading &&
          modules.map((mod) => {
            const Icon = moduleIcon(mod.key);
            const enabledCount = mod.pages.filter((p) => p.enabled).length;
            const total = mod.pages.length;
            const allOn = total > 0 && enabledCount === total;
            const noneOn = enabledCount === 0;
            const progress = total ? (enabledCount / total) * 100 : 0;

            return (
              <div
                key={mod.key}
                className={`mb-3 overflow-hidden rounded-xl border bg-white shadow-sm transition-all ${
                  allOn
                    ? "border-emerald-200"
                    : noneOn
                      ? "border-slate-200"
                      : "border-amber-200"
                }`}
              >
                {/* module head */}
                <div className="flex items-center justify-between gap-3 bg-gradient-to-l from-slate-50 to-white px-3 py-2.5 sm:px-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${
                        allOn
                          ? "bg-emerald-50 text-emerald-600 ring-emerald-200"
                          : noneOn
                            ? "bg-slate-100 text-slate-500 ring-slate-200"
                            : "bg-amber-50 text-amber-600 ring-amber-200"
                      }`}
                      aria-hidden="true"
                    >
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[#263544]">
                        {moduleLabel(mod)}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500">
                        {enabledCount} / {total} صفحة
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={toggle.isPending}
                    onClick={() =>
                      toggle.mutate({
                        scope: "module",
                        key: mod.key,
                        enabled: !allOn,
                      })
                    }
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ring-1 transition-all disabled:opacity-50 ${
                      allOn
                        ? "bg-white text-amber-700 ring-amber-200 hover:bg-amber-50"
                        : "bg-[#263544] text-[#C89355] ring-[#263544] hover:bg-[#1e2a36]"
                    }`}
                  >
                    {allOn ? "تعطيل الكل" : "تفعيل الكل"}
                  </button>
                </div>

                {/* progress */}
                <div className="h-1 w-full bg-slate-100">
                  <div
                    className={`h-1 transition-all duration-500 ${
                      allOn ? "bg-emerald-500" : noneOn ? "bg-slate-300" : "bg-amber-500"
                    }`}
                    style={{ width: `${progress}%` }}
                    aria-hidden="true"
                  />
                </div>

                {/* pages */}
                <div className="flex flex-wrap gap-1.5 p-3">
                  {mod.pages.map((page) => (
                    <button
                      key={page.key}
                      type="button"
                      disabled={toggle.isPending}
                      onClick={() =>
                        toggle.mutate({
                          scope: "page",
                          key: page.key,
                          enabled: !page.enabled,
                        })
                      }
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-all disabled:opacity-50 ${
                        page.enabled
                          ? "bg-[#263544] text-white ring-[#263544] shadow-sm hover:bg-[#1e2a36]"
                          : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"
                      }`}
                      title={page.key}
                    >
                      {page.enabled && <Check size={11} aria-hidden="true" className="shrink-0" />}
                      {pageLabel(page)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

        {!isLoading && modules.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200">
              <Layers size={18} aria-hidden="true" />
            </div>
            <p className="text-sm font-bold text-slate-600">لا توجد صلاحيات محددة</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
              هذا الحساب يرث صلاحيات المصنع حالياً. فعّل وحدة أو صفحة أعلاه لتخصيصه.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
