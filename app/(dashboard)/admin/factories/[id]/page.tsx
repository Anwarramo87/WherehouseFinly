"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  KeyRound,
  Loader2,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useFactories } from "@/hooks/useSuperAdmin";
import FactoryUsersPanel from "@/components/admin/FactoryUsersPanel";
import { FactoryEmployeesTab } from "@/components/admin/FactoryEmployeesTab";

type Tab = "employees" | "accounts";

const tabs = [
  { key: "employees", label: "الموظفون", icon: Users },
  { key: "accounts", label: "الحسابات والاشتراكات", icon: KeyRound },
] as const;

/**
 * صفحة مصنع واحد: الكبس على مصنع من /admin/factories يفتحها.
 * تبويب الموظفون = بليست موظفي هذا المصنع فقط.
 * تبويب الحسابات = حسابات الآدمن + اشتراك كل حساب لحاله (أشهر/أيام مخصصة).
 * الاشتراك هنا لكل حساب آدمن فقط — لا يوجد اشتراك موحّد للمصنع كله.
 */
export default function FactoryDetailsPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params?.id ?? "";

  const roles = useAuthStore((state) => state.user?.roles);
  const role = useAuthStore((state) => state.user?.role);
  const isSuperAdmin = roles?.includes("superadmin") || role === "superadmin";

  const [tab, setTab] = useState<Tab>("employees");
  const { data: factories = [], isLoading, isError } = useFactories();
  const factory = factories.find((f) => f.id === tenantId) ?? null;

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

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 md:p-8" dir="rtl">
      <Link
        href="/admin/factories"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-[#263544]"
      >
        <ArrowRight size={15} aria-hidden="true" />
        عودة للمصانع
      </Link>

      {isLoading && (
        <p className="flex items-center gap-2 py-8 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          جارٍ تحميل المصنع…
        </p>
      )}

      {isError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700"
        >
          تعذّر تحميل بيانات المصنع.
        </div>
      )}

      {!isLoading && !isError && !factory && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          المصنع غير موجود.
        </p>
      )}

      {!isLoading && !isError && factory && (
        <>
          <header className="relative mb-5 overflow-hidden rounded-3xl bg-[#263544] p-5 text-white shadow-lg sm:p-6">
            <div className="relative flex flex-wrap items-center gap-4">
              <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#C89355]/15 p-3 text-[#C89355]">
                <Building2 size={24} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-black sm:text-2xl">{factory.name}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                  <span className="font-mono">{factory.code}</span>
                  <span>
                    {factory.employees} موظف · {factory.users} حساب
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock size={12} aria-hidden="true" />
                    الاشتراك لكل حساب آدمن لحاله — لا اشتراك موحّد للمصنع
                  </span>
                </p>
              </div>
            </div>
          </header>

          <nav aria-label="أقسام المصنع" className="mb-5 flex gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-current={tab === t.key ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold ring-1 transition-all ${
                  tab === t.key
                    ? "bg-[#263544] text-[#C89355] ring-[#263544]"
                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <t.icon size={15} aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </nav>

          {tab === "employees" && (
            <section aria-label="موظفو المصنع">
              <FactoryEmployeesTab tenantId={factory.id} />
            </section>
          )}

          {tab === "accounts" && (
            <section aria-label="حسابات المصنع واشتراكاتها">
              <FactoryUsersPanel tenantId={factory.id} factoryName={factory.name} />
            </section>
          )}
        </>
      )}
    </main>
  );
}
