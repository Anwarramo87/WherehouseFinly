"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Loader2, Search, ShieldAlert } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

interface RosterEmployee {
  id: string;
  employeeId: string;
  name: string;
  department: string | null;
  jobTitle: string | null;
  status: string;
  employmentStartDate: string | null;
}

interface RosterGroup {
  tenant: { id: string | null; name: string; code: string };
  employees: RosterEmployee[];
}

interface RosterResponse {
  groups: RosterGroup[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Every employee, across every factory, grouped by factory.
 *
 * Deliberately its own endpoint rather than the per-factory employees list:
 * that one carries pay fields and photo URLs and is built for a single factory's
 * table. This is a roster — name, number, department, status — paginated at the
 * server and capped at 200 rows a page, so it stays a couple of queries however
 * many factories exist.
 */
export default function AllEmployeesPage() {
  const roles = useAuthStore((state) => state.user?.roles);
  const role = useAuthStore((state) => state.user?.role);
  const isSuperAdmin = roles?.includes("superadmin") || role === "superadmin";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading, isError } = useQuery<RosterResponse>({
    queryKey: ["super-admin", "all-employees", page, submitted],
    enabled: isSuperAdmin,
    queryFn: async () =>
      (
        await apiClient.get("/admin/tenants/employees", {
          params: { page, limit: 50, ...(submitted ? { search: submitted } : {}) },
        })
      ).data as RosterResponse,
  });

  if (!isSuperAdmin) {
    return (
      <main className="p-8" dir="rtl">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <ShieldAlert className="mb-3" size={24} aria-hidden="true" />
          <h1 className="mb-1 text-lg font-bold">هذه الصفحة للمشرف العام فقط</h1>
        </div>
      </main>
    );
  }

  const pagination = data?.pagination;

  return (
    <main className="p-6 md:p-8" dir="rtl">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-[#263544]">جميع الموظفين</h1>
        <p className="mt-1 text-sm text-slate-500">
          كل الموظفين في جميع المصانع، مجمّعين حسب المصنع.
          {pagination ? ` ${pagination.total} موظف.` : ""}
        </p>
      </header>

      <form
        className="mb-6 flex max-w-md gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSubmitted(search.trim());
        }}
      >
        <label htmlFor="roster-search" className="sr-only">
          بحث بالاسم أو رقم الموظف
        </label>
        <input
          id="roster-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="بحث بالاسم أو رقم الموظف"
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-[#263544]"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-xl bg-[#263544] px-4 py-2 text-sm font-bold text-[#C89355]"
        >
          <Search size={15} aria-hidden="true" />
          بحث
        </button>
      </form>

      {isLoading && (
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin" size={18} aria-hidden="true" />
          <span>جارٍ التحميل…</span>
        </div>
      )}

      {isError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          تعذّر تحميل قائمة الموظفين.
        </div>
      )}

      {data && data.groups.length === 0 && (
        <p className="text-slate-500">لا توجد نتائج مطابقة.</p>
      )}

      <div className="flex flex-col gap-6">
        {data?.groups.map((group) => (
          <section key={group.tenant.id ?? "unassigned"}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-black text-[#263544]">
              <Building2 size={16} aria-hidden="true" className="text-[#C89355]" />
              {group.tenant.name}
              <span className="font-mono text-xs font-normal text-slate-400">
                {group.tenant.code}
              </span>
              <span className="text-xs font-normal text-slate-500">
                ({group.employees.length})
              </span>
            </h2>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-right">الرقم</th>
                    <th className="px-4 py-2 text-right">الاسم</th>
                    <th className="px-4 py-2 text-right">القسم</th>
                    <th className="px-4 py-2 text-right">المسمى</th>
                    <th className="px-4 py-2 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {group.employees.map((employee) => (
                    <tr key={employee.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-mono text-xs">{employee.employeeId}</td>
                      <td className="px-4 py-2 font-bold text-[#263544]">{employee.name}</td>
                      <td className="px-4 py-2 text-slate-600">{employee.department ?? "—"}</td>
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
          </section>
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-3" aria-label="التنقل بين الصفحات">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold disabled:opacity-40"
          >
            السابق
          </button>
          <span className="text-sm text-slate-500">
            صفحة {pagination.page} من {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold disabled:opacity-40"
          >
            التالي
          </button>
        </nav>
      )}
    </main>
  );
}
