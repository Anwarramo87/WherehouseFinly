"use client";

import { Building2, Users, HandCoins, UserMinus, LayoutDashboard, Loader2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useFactories, type FactorySummary } from "@/hooks/useSuperAdmin";
import { useAuthStore } from "@/stores/auth-store";
import { useFactoryScopeStore } from "@/stores/factory-scope-store";

/**
 * The Super Admin's landing screen, supervision-first.
 *
 * No daily-management rows here. The overseer picks a factory and drills in:
 * the factory scope opens and the ordinary ERP pages render that factory's
 * data (the amber banner says which). Monitoring is the default; editing is
 * one click deeper.
 */
export default function SupervisionCenter() {
  const roles = useAuthStore((state) => state.user?.roles);
  const role = useAuthStore((state) => state.user?.role);
  const isSuperAdmin = roles?.includes("superadmin") || role === "superadmin";

  const enter = useFactoryScopeStore((state) => state.enter);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: factories = [], isLoading, isError } = useFactories();

  if (!isSuperAdmin) {
    return (
      <main className="p-8" dir="rtl">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <ShieldAlert className="mb-3" size={24} aria-hidden="true" />
          <h1 className="mb-1 text-lg font-bold">هذه الصفحة للمشرف العام فقط</h1>
          <p className="text-sm">لا تملك صلاحية الإشراف على المصانع.</p>
        </div>
      </main>
    );
  }

  /** Open a factory and land directly on the requested page. */
  const drillInto = (factory: FactorySummary, target: string) => {
    enter(factory.id, factory.name);
    // Rows fetched under the previous scope must not linger.
    queryClient.clear();
    router.push(target);
  };

  return (
    <main className="p-6 md:p-8" dir="rtl">
      <header className="mb-8">
        <h1 className="text-2xl font-black text-[#263544]">مركز الإشراف</h1>
        <p className="mt-1 text-sm text-slate-500">
          اختر مصنعاً للدخول إليه ومراقبة بياناته. التعديل متاح عند الحاجة فقط بعد الدخول.
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

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {factories.map((factory) => (
          <FactoryDrillCard
            key={factory.id}
            factory={factory}
            onEnter={(target) => drillInto(factory, target)}
          />
        ))}
      </div>
    </main>
  );
}

function FactoryDrillCard({
  factory,
  onEnter,
}: {
  factory: FactorySummary;
  onEnter: (target: string) => void;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#263544] text-[#C89355]">
            <Building2 size={22} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#263544]">{factory.name}</h2>
            <p className="font-mono text-xs text-slate-400">{factory.code}</p>
          </div>
        </div>
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

      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Users size={13} aria-hidden="true" />
          {factory.employees} موظف · {factory.users} حساب
        </span>
        <span>
          {factory.enabledPageCount} / {factory.totalPageCount} صفحة
        </span>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <DrillButton
          label="لوحة المصنع"
          icon={<LayoutDashboard size={15} aria-hidden="true" />}
          onClick={() => onEnter("/home")}
          primary
        />
        <DrillButton
          label="الموظفون"
          icon={<Users size={15} aria-hidden="true" />}
          onClick={() => onEnter("/employees")}
        />
        <DrillButton
          label="المكافآت"
          icon={<HandCoins size={15} aria-hidden="true" />}
          onClick={() => onEnter("/salaries/rewards")}
        />
        <DrillButton
          label="المستقيلون"
          icon={<UserMinus size={15} aria-hidden="true" />}
          onClick={() => onEnter("/resigned")}
        />
      </div>
    </article>
  );
}

function DrillButton({
  label,
  icon,
  onClick,
  primary = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
        primary
          ? "bg-[#263544] text-[#C89355] hover:bg-[#1a2530]"
          : "border border-slate-200 text-[#263544] hover:border-[#C89355] hover:bg-[#C89355]/10"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}