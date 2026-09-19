"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  ChevronLeft,
  Layers,
  Loader2,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useFactories, type FactorySummary } from "@/hooks/useSuperAdmin";
import { useAuthStore } from "@/stores/auth-store";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useFactoryScopeStore } from "@/stores/factory-scope-store";

export default function FactoriesPage() {
  const roles = useAuthStore((state) => state.user?.roles);
  const role = useAuthStore((state) => state.user?.role);
  const isSuperAdmin = roles?.includes("superadmin") || role === "superadmin";

  const [query, setQuery] = useState("");
  const { data: factories = [], isLoading, isError } = useFactories();
  const queryClient = useQueryClient();
  const router = useRouter();
  const enterFactory = useFactoryScopeStore((s) => s.enter);

  const openData = (id: string, name: string) => {
    enterFactory(id, name);
    queryClient.clear();
    router.push("/home");
  };

  const openDetails = (id: string) => router.push(`/admin/factories/${id}`);

  const stats = useMemo(() => {
    const total = factories.length;
    const active = factories.filter((f) => f.status === "active").length;
    return { total, active };
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
          <ShieldAlert size={26} aria-hidden="true" className="mx-auto mb-4 text-rose-500" />
          <h1 className="mb-1 text-lg font-black text-[#263544]">هذه الصفحة للمشرف العام فقط</h1>
          <p className="text-sm text-slate-500">لا تملك صلاحية إدارة المصانع.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 md:p-8" dir="rtl">
      <header className="relative mb-6 overflow-hidden rounded-3xl bg-[#263544] p-5 text-white shadow-lg sm:p-6">
        <h1 className="flex items-center gap-2 text-xl font-black sm:text-2xl">
          <Building2 size={22} aria-hidden="true" className="text-[#C89355]" />
          المصانع
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          {stats.total} مصنع · {stats.active} نشط — اضغط على أي مصنع لفتح صفحته.
        </p>
      </header>

      {isLoading && (
        <p className="flex items-center gap-2 py-8 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          جارٍ تحميل المصانع…
        </p>
      )}

      {isError && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          تعذّر تحميل المصانع.
        </div>
      )}

      {!isLoading && !isError && factories.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          لا توجد مصانع بعد.
        </p>
      )}

      {!isLoading && !isError && factories.length > 0 && (
        <>
          <label className="relative mb-4 block max-w-md">
            <span className="sr-only">بحث عن مصنع</span>
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم أو الكود…"
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-[#C89355]"
            />
          </label>

          {visible.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              لا يوجد مصنع يطابق «{query.trim()}».
            </p>
          )}

          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((factory) => (
              <li key={factory.id}>
                <FactoryCard
                  factory={factory}
                  onSelect={() => openDetails(factory.id)}
                  onOpenData={() => openData(factory.id, factory.name)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

function FactoryCard({
  factory,
  onSelect,
  onOpenData,
}: {
  factory: FactorySummary;
  onSelect: () => void;
  onOpenData: () => void;
}) {
  const active = factory.status === "active";
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#C89355]/50 hover:shadow-md">
      <button type="button" onClick={onSelect} className="group block w-full text-right">
        <span className="flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#263544] text-xl font-black text-[#C89355]">
            {factory.name.trim() ? factory.name.trim()[0] : "م"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-[15px] font-black text-[#263544]">{factory.name}</span>
              <ChevronLeft size={14} aria-hidden="true" className="shrink-0 text-slate-300 group-hover:text-[#C89355]" />
            </span>
            <span className="mt-0.5 block truncate font-mono text-[11px] font-bold text-slate-400">
              {factory.code}
            </span>
          </span>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />
            {active ? "نشط" : factory.status}
          </span>
        </span>
        <span className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-center">
          <span>
            <span className="flex items-center justify-center gap-1 text-base font-black text-[#263544] tabular-nums">
              <Users size={13} aria-hidden="true" className="text-slate-400" />
              {factory.employees}
            </span>
            <span className="text-[11px] font-bold text-slate-400">موظف</span>
          </span>
          <span>
            <span className="flex items-center justify-center gap-1 text-base font-black text-[#263544] tabular-nums">
              <ShieldAlert size={13} aria-hidden="true" className="text-slate-400" />
              {factory.users}
            </span>
            <span className="text-[11px] font-bold text-slate-400">حساب</span>
          </span>
          <span>
            <span className="flex items-center justify-center gap-1 text-base font-black text-[#263544] tabular-nums">
              <Layers size={13} aria-hidden="true" className="text-slate-400" />
              {factory.enabledPageCount}/{factory.totalPageCount}
            </span>
            <span className="text-[11px] font-bold text-slate-400">صفحة</span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onOpenData}
        className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
      >
        فتح بيانات هذا المصنع
      </button>
    </div>
  );
}

