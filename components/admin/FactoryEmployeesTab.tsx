"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
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

  return (
    <div>
      <form
        className="mb-4 flex max-w-md gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
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

      {employees.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 text-right">الرقم</th>
                <th className="px-4 py-2 text-right">الاسم</th>
                <th className="px-4 py-2 text-right">القسم</th>
                <th className="px-4 py-2 text-right">المسمى</th>
                <th className="px-4 py-2 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
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
