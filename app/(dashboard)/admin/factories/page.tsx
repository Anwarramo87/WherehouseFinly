"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  ChevronLeft,
  ExternalLink,
  Layers,
  Loader2,
  Lock,
  Power,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  useFactories,
  useSetSubscription,
  useTenantSubscription,
  type FactorySummary,
  type SubscriptionView,
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
  const [query, setQuery] = useState("");
  const { data: factories = [], isLoading, isError } = useFactories();
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

  const stats = useMemo(() => {
    const total = factories.length;
    const active = factories.filter((f) => f.status === "active").length;
    const expired = factories.filter((f) => f.subscription?.status === "expired").length;
    const open = factories.filter((f) => !f.subscription).length;
    return { total, active, expired, open };
  }, [factories]);

  const visible = useMemo(() => {
    const needle = query.trim();
    if (!needle) return factories;
    return factories.filter(
      (f) =>
        f.name.includes(needle) ||
        (f.code ?? "").includes(needle) ||
        f.id.toLowerCase().includes(needle.toLowerCase()),
    );
  }, [factories, query]);

  if (!isSuperAdmin) {
    return (
      <main className="p-8" dir="rtl">
        <div className="mx-auto max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <ShieldAlert size={26} aria-hidden="true" />
          </div>
          <h1 className="mb-1 text-lg font-black text-[#263544]">هذه الصفحة للمشرف العام فقط</h1>
          <p className="text-sm text-slate-500">لا تملك صلاحية إدارة المصانع.</p>
        </div>
      </main>
    );
  }

  // First factory is pre-selected so the page never opens on an empty canvas.
  const selected = factories.find((f) => f.id === selectedId) ?? factories[0] ?? null;

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 md:p-8" dir="rtl">
      {/* ── hero banner ─────────────────────────────────────────────── */}
      <header className="relative mb-6 overflow-hidden rounded-3xl bg-[#263544] p-5 text-white shadow-lg shadow-[#263544]/20 sm:p-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(200,147,85,0.35), transparent 45%), radial-gradient(circle at 85% 90%, rgba(200,147,85,0.18), transparent 40%)",
          }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[#C89355]">
              <Building2 size={13} aria-hidden="true" />
              المشرف العام
            </p>
            <h1 className="text-2xl font-black sm:text-3xl">المصانع</h1>
            <p className="mt-1.5 max-w-[52ch] text-[13px] leading-6 text-slate-300">
              اشتراك زمني لكل مصنع، وحسابات دخول بصلاحيات منفصلة — كل آدمن له وحداته
              وصفحاته الخاصة.
            </p>
          </div>

          <dl className="flex flex-wrap gap-2.5">
            <HeroStat label="إجمالي المصانع" value={stats.total} />
            <HeroStat label="نشط" value={stats.active} tone="emerald" />
            <HeroStat label="اشتراك منتهٍ" value={stats.expired} tone={stats.expired > 0 ? "rose" : "muted"} />
            <HeroStat label="بلا اشتراك" value={stats.open} tone="muted" />
          </dl>
        </div>
      </header>

      {isLoading && (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70" />
        </div>
      )}

      {isError && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700"
        >
          <ShieldAlert size={18} aria-hidden="true" />
          تعذّر تحميل قائمة المصانع. حدّث الصفحة أو تحقق من اتصال الباكند.
        </div>
      )}

      {!isLoading && !isError && factories.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Building2 size={24} aria-hidden="true" />
          </div>
          <p className="font-black text-[#263544]">لا توجد مصانع بعد</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            أنشئ أول مصنع من الباكند ليظهر هنا مع اشتراكه وحساباته.
          </p>
        </div>
      )}

      {!isLoading && !isError && factories.length > 0 && (
        <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
          {/* ── factory list ───────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <label className="relative block">
              <span className="sr-only">بحث عن مصنع</span>
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالاسم أو الكود…"
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#C89355] focus:ring-2 focus:ring-[#C89355]/25"
              />
            </label>

            {visible.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                لا يوجد مصنع يطابق «{query.trim()}».
              </p>
            )}

            <ul className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pb-1 pl-1">
              {visible.map((factory) => (
                <li key={factory.id}>
                  <FactoryCard
                    factory={factory}
                    isSelected={factory.id === selected?.id}
                    onSelect={() => setSelectedId(factory.id)}
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* ── detail ─────────────────────────────────────────────── */}
          <section aria-live="polite" className="min-w-0">
            {selected && (
              <div className="flex min-w-0 flex-col gap-5">
                <FactoryHeader
                  factory={selected}
                  onOpen={() => openFactory(selected.id, selected.name)}
                />

                <FactorySubscriptionPanel
                  tenantId={selected.id}
                  factoryName={selected.name}
                />

                <FactoryUsersPanel tenantId={selected.id} factoryName={selected.name} />
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function HeroStat({
  label,
  value,
  tone = "gold",
}: {
  label: string;
  value: number;
  tone?: "gold" | "emerald" | "rose" | "muted";
}) {
  const valueClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "rose"
        ? "text-rose-300"
        : tone === "muted"
          ? "text-slate-300"
          : "text-[#C89355]";
  return (
    <div className="min-w-[92px] rounded-2xl bg-white/[0.07] px-4 py-2.5 text-center ring-1 ring-white/10 backdrop-blur-sm">
      <dd className={`text-xl font-black tabular-nums ${valueClass}`}>{value}</dd>
      <dt className="mt-0.5 text-[11px] font-bold text-slate-300">{label}</dt>
    </div>
  );
}

function planLabel(plan: string) {
  if (plan === "monthly") return "شهري";
  if (plan === "yearly") return "سنوي";
  return "مخصص";
}

function formatEndDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ar", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/** First letter avatar for a factory name (Arabic-safe). */
function initial(name: string) {
  const clean = name.trim();
  return clean ? clean[0] : "م";
}

/* ── detail header: identity + vitals + open action ─────────────────────── */

function FactoryHeader({
  factory,
  onOpen,
}: {
  factory: FactorySummary;
  onOpen: () => void;
}) {
  const active = factory.status === "active";
  const total = factory.totalPageCount > 0 ? factory.totalPageCount : 1;
  const pagesShare = Math.min(100, Math.round((factory.enabledPageCount / total) * 100));

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="h-1.5 bg-gradient-to-l from-[#C89355] via-[#C89355]/60 to-transparent" aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#263544] text-2xl font-black text-[#C89355] shadow-md shadow-[#263544]/20">
          {initial(factory.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-black text-[#263544]">{factory.name}</h2>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 tabular-nums">
              {factory.code}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${
                active
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-amber-50 text-amber-700 ring-amber-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-amber-500"}`}
                aria-hidden="true"
              />
              {active ? "نشط" : factory.status}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <Vital icon={<Users size={14} aria-hidden="true" />} value={factory.employees} label="موظف" />
            <Vital icon={<ShieldAlert size={14} aria-hidden="true" />} value={factory.users} label="حساب" />
            <Vital
              icon={<Layers size={14} aria-hidden="true" />}
              value={`${factory.enabledPageCount}/${factory.totalPageCount}`}
              label="صفحة"
            />
          </div>

          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-l from-[#C89355] to-[#263544] transition-all"
                style={{ width: `${pagesShare}%` }}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#263544] px-4 py-2.5 text-xs font-bold text-[#C89355] shadow-sm transition-all hover:bg-[#1e2a36] hover:shadow"
        >
          <ExternalLink size={14} aria-hidden="true" />
          فتح بيانات هذا المصنع
        </button>
      </div>
    </article>
  );
}

function Vital({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
      <div className="flex items-center gap-1.5 text-[#263544]">
        <span className="text-[#C89355]">{icon}</span>
        <span className="text-base font-black tabular-nums">{value}</span>
      </div>
      <div className="mt-0.5 text-[11px] font-bold text-slate-500">{label}</div>
    </div>
  );
}

/**
 * Time-boxed subscription of one factory. While expired, the factory holds no
 * pages: sidebar modules vanish and the API 403s, leaving only the
 * always-available routes. No row = legacy open (nothing taken away).
 */
function FactorySubscriptionPanel({
  tenantId,
  factoryName,
}: {
  tenantId: string;
  factoryName: string;
}) {
  const { data: subscription, isLoading } = useTenantSubscription(tenantId);
  const setSubscription = useSetSubscription(tenantId);

  const stopNow = () => setSubscription.mutate({ endsAt: new Date().toISOString() });

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* header — same rhythm as the users panel below it */}
      <div className="border-b border-slate-100 bg-gradient-to-l from-[#263544]/[0.04] via-white to-white px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#263544] text-[#C89355] shadow-sm">
              <CalendarClock size={18} aria-hidden="true" />
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-[15px] font-black text-[#263544]">
                الاشتراك الزمني
                {!isLoading && subscription && <SubscriptionChip subscription={subscription} />}
                {!isLoading && !subscription && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                    بلا اشتراك — مفتوح
                  </span>
                )}
              </h3>
              <p className="mt-0.5 max-w-[52ch] text-xs leading-5 text-slate-500">
                شهر أو سنة لـ<span className="font-bold text-[#263544]"> {factoryName}</span>.
                عند الانتهاء تُغلق كل الوحدات ويبقى للمصنع الصفحات المفتوحة دائماً فقط.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 sm:px-6">
        {isLoading && (
          <p className="flex items-center gap-2 py-2 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={15} aria-hidden="true" />
            جارٍ تحميل الاشتراك…
          </p>
        )}

        {!isLoading && !subscription && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
            <p className="text-xs leading-5 text-slate-500">
              هذا المصنع يعمل بنظام الوصول المفتوح. فعّل اشتراكاً زمنياً ليُغلق تلقائياً
              عند انتهاء مدته.
            </p>
            <span className="flex flex-wrap gap-2">
              <PlanButton
                icon={<CalendarPlus size={14} aria-hidden="true" />}
                label="اشتراك شهر"
                pending={setSubscription.isPending}
                onClick={() => setSubscription.mutate({ months: 1 })}
              />
              <PlanButton
                icon={<CalendarCheck size={14} aria-hidden="true" />}
                label="اشتراك سنة"
                pending={setSubscription.isPending}
                onClick={() => setSubscription.mutate({ months: 12 })}
              />
            </span>
          </div>
        )}

        {!isLoading && subscription && (
          <SubscriptionState
            subscription={subscription}
            pending={setSubscription.isPending}
            onMonth={() => setSubscription.mutate({ months: 1 })}
            onYear={() => setSubscription.mutate({ months: 12 })}
            onStop={stopNow}
          />
        )}
      </div>
    </article>
  );
}

function SubscriptionChip({ subscription }: { subscription: SubscriptionView }) {
  if (subscription.status === "expired") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">
        <Lock size={11} aria-hidden="true" />
        منتهٍ — المصنع مغلق
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">
      نشط · متبقي {subscription.daysLeft} يوم
    </span>
  );
}

function PlanButton({
  icon,
  label,
  pending,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl bg-[#263544] px-4 py-2 text-xs font-bold text-[#C89355] shadow-sm transition-all hover:bg-[#1e2a36] hover:shadow disabled:opacity-50 disabled:shadow-none"
    >
      {icon}
      {label}
    </button>
  );
}

/** Display-only window length of a plan, for the remaining-time bar. */
function planWindowDays(plan: string): number | null {
  if (plan === "monthly") return 30;
  if (plan === "yearly") return 365;
  return null;
}

function SubscriptionState({
  subscription,
  pending,
  onMonth,
  onYear,
  onStop,
}: {
  subscription: SubscriptionView;
  pending: boolean;
  onMonth: () => void;
  onYear: () => void;
  onStop: () => void;
}) {
  const expired = subscription.status === "expired";
  const windowDays = planWindowDays(subscription.plan);
  const share =
    windowDays && !expired
      ? Math.max(0, Math.min(100, Math.round((subscription.daysLeft / windowDays) * 100)))
      : 0;

  return (
    <div
      className={`rounded-2xl p-4 ring-1 ${
        expired ? "bg-rose-50/70 ring-rose-200" : "bg-emerald-50/60 ring-emerald-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm font-black text-[#263544]">
          {planLabel(subscription.plan)} · ينتهي {formatEndDate(subscription.endsAt)}
        </span>
        {!expired && (
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 tabular-nums">
            متبقي {subscription.daysLeft} يوم
          </span>
        )}
        {expired && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
            <Lock size={11} aria-hidden="true" />
            الوحدات مغلقة الآن
          </span>
        )}

        <span className="mr-auto flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onMonth}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-[#C89355]/50 hover:bg-[#C89355]/10 disabled:opacity-50"
          >
            <CalendarPlus size={13} aria-hidden="true" />
            تجديد شهر
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onYear}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-[#C89355]/50 hover:bg-[#C89355]/10 disabled:opacity-50"
          >
            <CalendarCheck size={13} aria-hidden="true" />
            تجديد سنة
          </button>
          {!expired && (
            <button
              type="button"
              disabled={pending}
              onClick={onStop}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 shadow-sm transition-all hover:bg-rose-50 disabled:opacity-50"
            >
              <Power size={13} aria-hidden="true" />
              إيقاف الآن
            </button>
          )}
        </span>
      </div>

      {windowDays && !expired && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-emerald-100">
          <div
            className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-emerald-400 transition-all"
            style={{ width: `${share}%` }}
          />
        </div>
      )}
    </div>
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
  const active = factory.status === "active";
  const expired = factory.subscription?.status === "expired";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`group w-full overflow-hidden rounded-3xl border text-right transition-all ${
        isSelected
          ? "border-[#C89355] bg-[#263544] text-white shadow-lg shadow-[#263544]/25 ring-1 ring-[#C89355]"
          : "border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-[#C89355]/60 hover:shadow-md"
      }`}
    >
      {/* status accent */}
      <div
        className={`h-1 ${
          expired
            ? "bg-rose-500"
            : active
              ? "bg-emerald-500"
              : "bg-amber-400"
        }`}
        aria-hidden="true"
      />

      <div className="p-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-black transition-colors ${
              isSelected
                ? "bg-[#C89355] text-[#263544]"
                : "bg-slate-100 text-[#263544] group-hover:bg-[#263544] group-hover:text-[#C89355]"
            }`}
            aria-hidden="true"
          >
            {initial(factory.name)}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-[15px] font-black">{factory.name}</span>
              <ChevronLeft
                size={14}
                aria-hidden="true"
                className={`shrink-0 transition-transform group-hover:-translate-x-0.5 ${
                  isSelected ? "text-[#C89355]" : "text-slate-300"
                }`}
              />
            </span>
            <span
              className={`mt-0.5 block truncate text-[11px] font-bold tabular-nums ${
                isSelected ? "text-slate-300" : "text-slate-400"
              }`}
            >
              {factory.code}
            </span>
          </span>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${
              active
                ? isSelected
                  ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30"
                  : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : isSelected
                  ? "bg-amber-400/15 text-amber-300 ring-amber-400/30"
                  : "bg-amber-50 text-amber-700 ring-amber-200"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-amber-500"}`}
              aria-hidden="true"
            />
            {active ? "نشط" : factory.status}
          </span>
        </div>

        <div
          className={`mt-3 flex items-center gap-4 border-t pt-3 text-xs font-bold tabular-nums ${
            isSelected ? "border-white/10 text-slate-200" : "border-slate-100 text-slate-500"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Users size={13} aria-hidden="true" className={isSelected ? "text-[#C89355]" : "text-slate-400"} />
            {factory.employees} موظف · {factory.users} حساب
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Layers size={13} aria-hidden="true" className={isSelected ? "text-[#C89355]" : "text-slate-400"} />
            {factory.enabledPageCount}/{factory.totalPageCount} صفحة
          </span>
        </div>

        {factory.subscription && (
          <div
            className={`mt-2.5 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold ${
              expired
                ? isSelected
                  ? "bg-rose-400/15 text-rose-200"
                  : "bg-rose-50 text-rose-700"
                : isSelected
                  ? "bg-white/10 text-slate-100"
                  : "bg-sky-50 text-sky-800"
            }`}
          >
            <CalendarClock size={12} aria-hidden="true" className="shrink-0" />
            {expired
              ? "اشتراك منتهٍ — المصنع مغلق"
              : `اشتراك حتى ${formatEndDate(factory.subscription.endsAt)}`}
          </div>
        )}
      </div>
    </button>
  );
}
