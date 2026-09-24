"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, ChevronLeft, Loader2, Search, Users } from "lucide-react";
import apiClient from "@/lib/api-client";

interface RosterEmployee {
  id: string;
  employeeId: string;
  name: string;
  department: string | null;
  jobTitle: string | null;
  status: string;
  employmentStartDate: string | null;
}

interface RosterResponse {
  groups: Array<{
    tenant: { id: string | null; name: string; code: string };
    employees: RosterEmployee[];
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * بليست موظفي مصنع واحد فقط — تُعرض في صفحة تفاصيل المصنع
 * (/admin/factories/[id]) وليس داخل صفحة المصانع.
 */
export function FactoryEmployeesTab({ tenantId }: { tenantId: string }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading, isError } = useQuery<RosterResponse>({
    queryKey: ["super-admin", "factory-employees", tenantId, page, submitted],
    queryFn: async () =>
      (
        await apiClient.get("/admin/tenants/employees", {
          params: {
            page,
            limit: 50,
            tenantId,
            ...(submitted ? { search: submitted } : {}),
          },
        })
      ).data as RosterResponse,
  });

  const employees = data?.groups.flatMap((g) => g.employees) ?? [];
  const pagination = data?.pagination;

  // تجميع موظفي الصفحة الحالية حسب القسم.
  // ملاحظة: التجميع يتم على نتائج الصفحة الحالية فقط لأن الـ API مرقّم (50 لكل صفحة).
  const deptGroups = useMemo(() => {
    const map = new Map<string, RosterEmployee[]>();
    for (const emp of employees) {
      const key = (emp.department || "بدون قسم").trim() || "بدون قسم";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(emp);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === "بدون قسم") return 1;
      if (b[0] === "بدون قسم") return -1;
      return a[0].localeCompare(b[0], "ar");
    });
  }, [employees]);

  // القسم المفتوح حالياً — null يعني عرض شبكة الأقسام (مقفلة)، اسم يعني عرض موظفي ذلك القسم
  const [openDept, setOpenDept] = useState<string | null>(null);
  const openEmployees = useMemo(
    () => deptGroups.find(([name]) => name === openDept)?.[1] ?? [],
    [deptGroups, openDept],
  );

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
        <label htmlFor="factory-employees-search" className="sr-only">
          بحث بالاسم أو رقم الموظف
        </label>
        <input
          id="factory-employees-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="بحث بالاسم أو رقم الموظف…"
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
          جارٍ تحميل الموظفين…
        </p>
      )}

      {isError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700"
        >
          تعذّر تحميل موظفي هذا المصنع.
        </div>
      )}

      {!isLoading && !isError && employees.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          لا يوجد موظفون في هذا المصنع
          {submitted ? " مطابقون للبحث." : "."}
        </p>
      )}

      {employees.length > 0 && openDept === null && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deptGroups.map(([deptName, emps]) => (
            <button
              key={deptName}
              type="button"
              onClick={() => setOpenDept(deptName)}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition-all hover:border-[#C89355]/60 hover:shadow-md active:scale-[0.99]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#263544] text-[#C89355]">
                  <Building2 size={20} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                       <span className="block truncate text-base font-black text-[#263544]">
                     قسم {deptName}
                   </span>
                   <span className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                     <Users size={13} className="text-[#C89355]" aria-hidden="true" />
                     {emps.length} {emps.length === 1 ? "موظف" : "موظفين"}
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

      {employees.length > 0 && openDept !== null && (
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
               قسم {openDept} · {openEmployees.length} {openEmployees.length === 1 ? "موظف" : "موظفين"}
             </h3>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-right">الرقم</th>
                  <th className="px-4 py-2 text-right">الاسم</th>
                  <th className="px-4 py-2 text-right">المسمى</th>
                  <th className="px-4 py-2 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {openEmployees.map((employee) => (
                  <tr key={employee.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-mono text-xs">{employee.employeeId}</td>
                    <td className="px-4 py-2 font-bold text-[#263544]">{employee.name}</td>
                    <td className="px-4 py-2 text-slate-600">{employee.jobTitle ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                          employee.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {employee.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-3" aria-label="التنقل بين الصفحات">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((c) => Math.max(1, c - 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold disabled:opacity-40"
          >
            السابق
          </button>
          <span className="text-sm text-slate-500">
            صفحة {pagination.page} من {pagination.totalPages} · {pagination.total} موظف
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((c) => c + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold disabled:opacity-40"
          >
            التالي
          </button>
        </nav>
      )}
    </div>
  );
}
