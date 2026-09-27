"use client";

import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Boxes,
  Check,
  Factory,
  FileDown,
  LayoutGrid,
  Loader2,
  Package,
  PackageCheck,
  Search,
  Settings2,
  ShoppingCart,
  Tag,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import {
  useFactoryEntitlements,
  useSetFactoryEntitlements,
  useToggleEntitlement,
} from "@/hooks/useSuperAdmin";
import type { EntitlementModule, EntitlementPage } from "@/lib/entitlements";

function moduleIcon(key: string) {
  const k = key.toLowerCase();
  if (k === "hr") return Users;
  if (k === "payroll") return BadgeDollarSign;
  if (k === "inventory") return Package;
  if (k === "purchasing") return ShoppingCart;
  if (k === "sales") return Tag;
  if (k === "fulfillment") return PackageCheck;
  if (k === "production") return Factory;
  if (k === "reps") return UserRound;
  if (k === "wms") return Wrench;
  if (k === "imports") return FileDown;
  if (k === "administration") return Settings2;
  return Boxes;
}

/** Pre-set bundles, ordered from the smallest offer to the whole product. */
const PACKAGES: Array<{
  key: string;
  label: string;
  hint: string;
  modules: string[];
}> = [
  {
    key: "basic",
    label: "باقة أساسية",
    hint: "الموظفون والرواتب",
    modules: ["hr", "payroll"],
  },
  {
    key: "operations",
    label: "باقة التشغيل",
    hint: "المخزن والمشتريات والمبيعات والتجهيز",
    modules: ["inventory", "purchasing", "sales", "fulfillment"],
  },
  {
    key: "advanced",
    label: "باقة متقدمة",
    hint: "الإنتاج والمندوبون وWMS والاستيراد",
    modules: ["production", "reps", "wms", "imports"],
  },
  {
    key: "administration",
    label: "باقة الإدارة",
    hint: "الإعدادات والربط وسلة المهملات",
    modules: ["administration"],
  },
];

type FactoryModulesPanelProps = {
  tenantId: string;
  factoryName: string;
};

export function FactoryModulesPanel({
  tenantId,
  factoryName,
}: FactoryModulesPanelProps) {
  const entitlements = useFactoryEntitlements(tenantId);
  const { isLoading } = entitlements;
  const modules = useMemo(() => entitlements.data?.modules ?? [], [entitlements.data]);
  const toggle = useToggleEntitlement(tenantId);
  const saveAll = useSetFactoryEntitlements(tenantId);
  const [query, setQuery] = useState("");

  const totalPages = modules.reduce((acc, m) => acc + m.pages.length, 0);
  const enabledPages = modules.reduce(
    (acc, m) => acc + m.pages.filter((p) => p.enabled).length,
    0,
  );

  type SearchResult = { mod: EntitlementModule; pages: EntitlementPage[] };

  const filtered = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules.map((mod) => ({ mod, pages: mod.pages }));
    return modules
      .map((mod) => {
        const modHits = `${mod.label} ${mod.description}`.toLowerCase().includes(q);
        return {
          mod,
          pages: modHits
            ? mod.pages
            : mod.pages.filter(
                (page) =>
                  page.label.toLowerCase().includes(q) || page.key.toLowerCase().includes(q),
              ),
        };
      })
      .filter(
        ({ mod, pages }) =>
          `${mod.label} ${mod.description}`.toLowerCase().includes(q) || pages.length > 0,
      );
  }, [modules, query]);

  function applyPackage(pkgModules: string[]) {
    const keys: string[] = [];
    for (const mod of modules) {
      if (pkgModules.includes(mod.key)) {
        for (const page of mod.pages) keys.push(page.key);
      }
    }
    saveAll.mutate(keys);
  }

  function clearAll() {
    saveAll.mutate([]);
  }

  function enableAll() {
    const keys: string[] = [];
    for (const mod of modules) {
      for (const page of mod.pages) keys.push(page.key);
    }
    saveAll.mutate(keys);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-l from-[#263544]/[0.06] via-slate-50 to-white px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#263544] text-[#C89355] shadow-sm">
            <LayoutGrid size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h4 className="flex items-center gap-1.5 text-sm font-black text-[#263544]">
              وحدات مصنع «{factoryName}»
            </h4>
            <p className="truncate text-xs text-slate-500">
              الوحدات مرتبة بترتيب صفحات المصنع — تفعيل وحدة يفتح صفحاتها لكل آدمن بالمصنع
            </p>
          </div>
        </div>
      </div>

      {/* search + presets bar */}
      {!isLoading && modules.length > 0 && (
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-bold text-slate-700 ring-1 ring-slate-200">
              <LayoutGrid size={12} className="text-slate-400" aria-hidden="true" />
              {modules.length} وحدة
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 ring-1 ring-emerald-200">
              <Check size={12} aria-hidden="true" />
              {enabledPages} / {totalPages} صفحة مفعّلة
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-52 flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث عن وحدة أو صفحة…"
                aria-label="بحث في الوحدات"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-9 pl-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-[#C89355] focus:outline-none focus:ring-2 focus:ring-[#C89355]/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {PACKAGES.map((pkg) => (
                <button
                  key={pkg.key}
                  type="button"
                  disabled={saveAll.isPending || toggle.isPending}
                  onClick={() => applyPackage(pkg.modules)}
                  title={pkg.hint}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-[#263544] hover:text-[#C89355] hover:ring-[#263544] disabled:opacity-50"
                >
                  {pkg.label}
                </button>
              ))}
              <button
                type="button"
                disabled={saveAll.isPending || toggle.isPending}
                onClick={enableAll}
                className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50"
              >
                الكل
              </button>
              <button
                type="button"
                disabled={saveAll.isPending || toggle.isPending}
                onClick={clearAll}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-rose-600 shadow-sm ring-1 ring-rose-200 transition-all hover:bg-rose-50 disabled:opacity-50"
              >
                إيقاف الكل
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 sm:p-4">
        {isLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} aria-hidden="true" />
            جارٍ تحميل وحدات المصنع…
          </div>
        )}

        {!isLoading && query.trim() && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            لا توجد نتائج لـ «{query.trim()}».
          </div>
        )}

        {!isLoading &&
          filtered.map(({ mod, pages }) => {
            const Icon = moduleIcon(mod.key);
            const enabledCount = pages.filter((p) => p.enabled).length;
            const total = pages.length;
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
                        {mod.label}
                      </div>
                      <div className="max-w-sm truncate text-[11px] font-medium text-slate-500">
                        {mod.description}
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
                    {allOn ? "تعطيل الوحدة" : "تفعيل الوحدة"}
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
                  {pages.map((page) => (
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
                      title={`${page.label} · ${page.key}`}
                    >
                      {page.enabled && (
                        <Check size={11} aria-hidden="true" className="shrink-0" />
                      )}
                      {page.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

        {!isLoading && modules.length > 0 && (
          <p className="flex items-start gap-1.5 px-1 text-[11px] leading-5 text-slate-400">
            <Boxes size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            الحسابات ترث وحدات المصنع تلقائياً؛ ولتضييق أي حساب إضافي افتح «الحسابات والاشتراكات».
            الترتيب هنا مطابق لترتيب صفحات المصنع كي لا يضيع من يعمل على الموقع.
          </p>
        )}
      </div>
    </div>
  );
}