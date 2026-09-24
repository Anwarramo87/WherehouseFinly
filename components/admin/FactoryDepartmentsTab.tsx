"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Loader2, Search, Users, Phone, Briefcase, Hash } from "lucide-react";
import apiClient from "@/lib/api-client";

interface DepartmentRow {
  id: string;
  name: string;
  manager: string | null;
  _count: { employees: number };
}

interface EmployeeRow {
  id: string;
  employeeId: string;
  name: string;
  jobTitle: string | null;
  mobile: string | null;
  status: string;
  department: string;
}

export function FactoryDepartmentsTab({ tenantId }: { tenantId: string }) {
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [openDept, setOpenDept] = useState<DepartmentRow | null>(null);

  const { data, isLoading, isError } = useQuery<{ departments: DepartmentRow[] }>({
    queryKey: ["super-admin", "factory-departments", tenantId, submitted],
    queryFn: async () =>
      (await apiClient.get(`/admin/tenants/${tenantId}/departments`, {
        params: { search: submitted || undefined },
      })).data as { departments: DepartmentRow[] },
  });

  const { data: empData, isLoading: empLoading } = useQuery<{ employees: EmployeeRow[] }>({
    queryKey: ["super-admin", "dept-employees", tenantId, openDept?.id],
    queryFn: async () =>
      (await apiClient.get(`/admin/tenants/${tenantId}/departments/${openDept!.id}/employees`)).data as { employees: EmployeeRow[] },
    enabled: !!openDept,
  });

  const departments = data?.departments ?? [];
  const employees = empData?.employees ?? [];

  if (openDept) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpenDept(null)}
          className="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:text-[#263544]"
        >
          <ArrowRight size={15} aria-hidden="true" />
          عودة للأقسام
        </button>

        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#263544] text-[#C89355]">
            <Building2 size={18} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-black text-[#263544]">قسم {openDept.name}</h3>
            <p className="text-xs text-slate-500">{openDept._count.employees} موظف نشط</p>
          </div>
        </div>

        {empLoading && (
          <p className="flex items-center gap-2 py-6 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            جارٍ تحميل الموظفين…
          </p>
        )}

        {!empLoading && employees.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            لا يوجد موظفون نشطون في هذا القسم.
          </p>
        )}

        {employees.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-right">الموظف</th>
                  <th className="px-4 py-3 text-right">الرقم الوظيفي</th>
                  <th className="px-4 py-3 text-right">المسمى الوظيفي</th>
                  <th className="px-4 py-3 text-right">الهاتف</th>
                  <th className="px-4 py-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#263544] text-[10px] font-black text-[#C89355]">
                          {emp.name.trim()[0]}
                        </span>
                        <span className="font-bold text-[#263544]">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-600">
                        <Hash size={11} className="text-slate-400" aria-hidden="true" />
                        {emp.employeeId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <Briefcase size={11} className="text-slate-400" aria-hidden="true" />
                        {emp.jobTitle ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <Phone size={11} className="text-slate-400" aria-hidden="true" />
                        {emp.mobile ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${
                        emp.status === "active"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-slate-100 text-slate-600 ring-slate-200"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${emp.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} aria-hidden="true" />
                        {emp.status === "active" ? "نشط" : emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <form
        className="mb-4 flex max-w-md gap-2"
        onSubmit={(e) => { e.preventDefault(); setSubmitted(search.trim()); }}
      >
        <label htmlFor="factory-departments-search" className="sr-only">بحث بالاسم</label>
        <input
          id="factory-departments-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          تعذّر تحميل أقسام هذا المصنع.
        </div>
      )}

      {!isLoading && !isError && departments.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          لا توجد أقسام في هذا المصنع{submitted ? " مطابقة للبحث." : "."}
        </p>
      )}

      {departments.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <button
              key={dept.id}
              type="button"
              onClick={() => setOpenDept(dept)}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition-all hover:border-[#C89355]/60 hover:shadow-md active:scale-[0.99]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#263544] text-[#C89355]">
                  <Building2 size={20} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-black text-[#263544]">{dept.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Users size={13} className="text-[#C89355]" aria-hidden="true" />
                    {dept._count.employees} {dept._count.employees === 1 ? "موظف" : "موظفين"}
                  </span>
                </span>
              </span>
              <ArrowRight size={18} className="shrink-0 rotate-180 text-slate-300 transition-transform group-hover:text-[#C89355]" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
