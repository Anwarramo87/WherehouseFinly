"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, ChevronLeft, Loader2, Search, Users } from "lucide-react";
import apiClient from "@/lib/api-client";

interface DepartmentRow {
  id: string;
  name: string;
  tenantId: string;
  manager: string | null;
  establishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { employees: number };
}

interface DeptResponse {
  departments: DepartmentRow[];
}

export function FactoryDepartmentsTab({ tenantId }: { tenantId: string }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [openDept, setOpenDept] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<DeptResponse>({
    queryKey: ["super-admin", "factory-departments", tenantId, page, submitted],
    queryFn: async () =>
      (await apiClient.get("/departments", { params: { tenantId, page, limit: 50, search: submitted || undefined } })).data as DeptResponse,
  });

  const departments = data?.departments ?? [];

  const openEmployees = openDept
    ? departments.find((d) => d.name === openDept)?._count.employees ?? 0
    : 0;

  return (
    <div>
      <form
        className="mb-4 flex max-w-md gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setOpenDept(null);
          setSubmitted(search.trim());
        }}
      >
        <label htmlFor="factory-departments-search" className="sr-only">
          بحث بالاسم
        </label>
        <input
          id="factory-departments-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="بحث بالاسم…"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-[#263544]"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-xl bg-[#263544] px-4 py-2 text-sm font-bold text-[#C89355]"
        >
          <Search size={14} aria-hidden="true" />
          بحث
        </button>
      </form>

      {isLoading && (
        <p className="flex items-center gap-2 py-6 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          جارٍ تحميل الأقسام…
        </p>
      )}

      {isError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700"
        >
          تعذّر تحميل أقسام هذا المصنع.
        </div>
      )}

      {!isLoading && !isError && departments.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          لا توجد أقسام في هذا المصنع
          {submitted ? " مطابقة للبحث." : "."}
        </p>
      )}

      {departments.length > 0 && openDept === null && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <button
              key={dept.id}
              type="button"
              onClick={() => setOpenDept(dept.name)}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition-all hover:border-[#C89355]/60 hover:shadow-md active:scale-[0.99]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#263544] text-[#C89355]">
                  <Building2 size={20} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-black text-[#263544]">
                    قسم {dept.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Users size={13} className="text-[#C89355]" aria-hidden="true" />
                    {dept._count.employees} {dept._count.employees === 1 ? "موظف" : "موظفين"}
                  </span>
                </span>
              </span>
              <ChevronLeft
                size={18}
                className="shrink-0 text-slate-300 transition-transform group-hover:-translate-x-0.5 group-hover:text-[#C89355]"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      )}

      {departments.length > 0 && openDept !== null && (
        <div>
          <button
            type="button"
            onClick={() => setOpenDept(null)}
            className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:text-[#263544]"
          >
            <ArrowRight size={15} aria-hidden="true" />
            عودة للأقسام
          </button>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#263544] text-[#C89355]">
              <Building2 size={18} aria-hidden="true" />
            </span>
            <h3 className="text-base font-black text-[#263544]">
              قسم {openDept} · {openEmployees} {openEmployees === 1 ? "موظف" : "موظفين"}
            </h3>
          </div>
        </div>
      )}
    </div>
  );
}
