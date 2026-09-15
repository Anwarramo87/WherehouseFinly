"use client";

import { useState } from "react";
import { Building2, Check, Loader2, Minus, ShieldAlert, Users } from "lucide-react";
import {
  useFactories,
  useFactoryEntitlements,
  useToggleEntitlement,
  type FactorySummary,
} from "@/hooks/useSuperAdmin";
import { useAuthStore } from "@/stores/auth-store";
import { useFactoryScopeStore } from "@/stores/factory-scope-store";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import FactoryUsersPanel from "@/components/admin/FactoryUsersPanel";

/**
 * The Super Admin's control panel: every factory, and what each one may use.
 *
 * The page is guarded three times over — the middleware keeps non-superadmins
 * off the route, this component refuses to render for them, and the API answers
 * 403 regardless. Only the last of those is a control; the first two are so the
 * UI does not lie.
 */
export default function FactoriesPage() {
  const roles = useAuthStore((state) => state.user?.roles);
  const role = useAuthStore((state) => state.user?.role);
  const isSuperAdmin = roles?.includes("superadmin") || role === "superadmin";

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: factories = [], isLoading, isError } = useFactories();
  const { data: detail, isLoading: detailLoading } = useFactoryEntitlements(selectedId);
  const toggle = useToggleEntitlement(selectedId);
  const enterFactory = useFactoryScopeStore((state) => state.enter);
  const queryClient = useQueryClient();
  const router = useRouter();

  /**
   * Drill into a factory: every subsequent request carries it, and the ordinary
   * ERP pages render that factory's data. The cache is cleared first because it
   * holds rows fetched under a different scope.
   */
  const openFactory = (id: string, name: string) => {
    enterFactory(id, name);
    queryClient.clear();
    router.push("/home");
  };

  if (!isSuperAdmin) {
    return (
      <main className="p-8" dir="rtl">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <ShieldAlert className="mb-3" size={24} aria-hidden="true" />
          <h1 className="mb-1 text-lg font-bold">هذه الصفحة للمشرف العام فقط</h1>
          <p className="text-sm">لا تملك صلاحية إدارة المصانع.</p>
        </div>
      </main>
    );
  }

  const selected = factories.find((f) => f.id === selectedId) ?? null;

  return (
    <main className="p-6 md:p-8" dir="rtl">
      <header className="mb-8">
        <h1 className="text-2xl font-black text-[#263544]">المصانع</h1>
        <p className="mt-1 text-sm text-slate-500">
          إدارة الوحدات والصفحات المتاحة لكل مصنع. التغيير يسري فوراً على الواجهة والـ API.
        </p>
      </header>

      {isLoading && (
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin" size={18} aria-hidden="true" />
          <span>جارٍ تحميل المصانع…</span>
        </div>
      )}

      {isError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          تعذّر تحميل قائمة المصانع.
        </div>
      )}

      {!isLoading && !isError && factories.length === 0 && (
        <p className="text-slate-500">لا توجد مصانع بعد.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* ── factory list ─────────────────────────────────────────── */}
        <ul className="flex flex-col gap-3">
          {factories.map((factory) => (
            <li key={factory.id}>
              <FactoryCard
                factory={factory}
                isSelected={factory.id === selectedId}
                onSelect={() => setSelectedId(factory.id)}
              />
            </li>
          ))}
        </ul>

        {/* ── entitlement editor ───────────────────────────────────── */}
        <section aria-live="polite">
          {!selected && factories.length > 0 && (
            <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              اختر مصنعاً لعرض وحداته.
            </p>
          )}

          {selected && detailLoading && (
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2 className="animate-spin" size={18} aria-hidden="true" />
              <span>جارٍ تحميل الوحدات…</span>
            </div>
          )}

          {selected && detail && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-[#263544]">{selected.name}</h2>
                <button
                  type="button"
                  onClick={() => openFactory(selected.id, selected.name)}
                  className="rounded-lg bg-[#263544] px-4 py-2 text-xs font-bold text-[#C89355] transition-colors hover:bg-[#1a2530]"
                >
                  فتح بيانات هذا المصنع
                </button>
              </div>

              <FactoryUsersPanel tenantId={selected.id} factoryName={selected.name} />

              {detail.modules.map((module) => (
                <article
                  key={module.key}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-[#263544]">{module.label}</h3>
                      <p className="text-xs text-slate-500">{module.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <StateBadge state={module.state} />
                      <button
                        type="button"
                        disabled={toggle.isPending}
                        onClick={() =>
                          toggle.mutate({
                            scope: "module",
                            key: module.key,
                            enabled: module.state !== "all",
                          })
                        }
                        className="rounded-lg border border-[#263544] px-3 py-1.5 text-xs font-bold text-[#263544] transition-colors hover:bg-[#263544] hover:text-white disabled:opacity-50"
                      >
                        {module.state === "all" ? "إيقاف الوحدة" : "تفعيل الوحدة"}
                      </button>
                    </div>
                  </div>

                  <ul className="flex flex-wrap gap-2">
                    {module.pages.map((page) => (
                      <li key={page.key}>
                        <button
                          type="button"
                          disabled={toggle.isPending}
                          aria-pressed={page.enabled}
                          onClick={() =>
                            toggle.mutate({
                              scope: "page",
                              key: page.key,
                              enabled: !page.enabled,
                            })
                          }
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                            page.enabled
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-slate-50 text-slate-400"
                          }`}
                        >
                          {page.enabled ? (
                            <Check size={13} aria-hidden="true" />
                          ) : (
                            <Minus size={13} aria-hidden="true" />
                          )}
                          {page.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function FactoryCard({
  factory,
  isSelected,
  onSelect,
}: {
  factory: FactorySummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`w-full rounded-2xl border p-4 text-right transition-colors ${
        isSelected
          ? "border-[#C89355] bg-[#263544] text-white"
          : "border-slate-200 bg-white hover:border-[#C89355]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-bold">
          <Building2 size={17} aria-hidden="true" />
          {factory.name}
        </span>
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
            factory.status === "active"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {factory.status}
        </span>
      </div>

      <div
        className={`flex flex-wrap gap-x-4 gap-y-1 text-xs ${
          isSelected ? "text-slate-300" : "text-slate-500"
        }`}
      >
        <span className="flex items-center gap-1">
          <Users size={13} aria-hidden="true" />
          {factory.employees} موظف · {factory.users} حساب
        </span>
        <span>
          {factory.enabledPageCount} / {factory.totalPageCount} صفحة
        </span>
      </div>
    </button>
  );
}

function StateBadge({ state }: { state: "all" | "none" | "partial" }) {
  const label = state === "all" ? "مفعّلة" : state === "none" ? "موقوفة" : "جزئية";
  const tone =
    state === "all"
      ? "bg-emerald-100 text-emerald-800"
      : state === "none"
        ? "bg-slate-100 text-slate-500"
        : "bg-amber-100 text-amber-800";

  return <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${tone}`}>{label}</span>;
}
