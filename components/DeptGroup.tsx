"use client";
import { Building2, ChevronDown, Edit2, Eye, UserMinus, Users } from "lucide-react";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { resolveEmployeePhotoSrc } from "@/lib/employee-photo";
import Link from "next/link";
import type { Employee } from "@/types/employee";
import type { Salary } from "@/types/salary";
type Row = Employee & { jobTitle?: string; profession?: string };
export default function DeptGroup({ name, emps, open, salaryMap, salaryOf, onToggle, onEdit, onFire, onBulk }: { name: string; emps: Employee[]; open: boolean; salaryMap: Map<string, Salary>; salaryOf: (e: Row, m: Map<string, Salary>) => number; onToggle: () => void; onEdit: (e: Employee) => void; onFire: (e: Employee) => void; onBulk: () => void }) {
  return (
    <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2rem] border-2 border-white/90 overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 p-5 hover:bg-white/60 text-right">
        <span className="flex items-center gap-3">
          <span className="p-3 bg-[#1a2530] rounded-2xl border border-[#C89355]/40">
            <Building2 size={20} className="text-[#C89355]" />
          </span>
          <span>
            <span className="block text-lg font-black text-[#263544]">معمل {name}</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Users size={13} className="text-[#C89355]" />{emps.length} {emps.length === 1 ? "موظف" : "موظفين"}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onBulk(); }} onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onBulk(); } }} className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-black text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
            <UserMinus size={13} />إقالة الكل
          </span>
          <ChevronDown size={20} className={`text-[#C89355] transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <div className="overflow-x-auto rounded-2xl border border-white/80 bg-white/40">
            <table className="w-full text-right min-w-225">
              <thead className="bg-white/40 border-b border-white/80">
                <tr>
                  <th className="p-4 text-xs font-black text-center">الصورة</th>
                  <th className="p-4 text-xs font-black text-center">الكود</th>
                  <th className="p-4 text-xs font-black text-center">الاسم</th>
                  <th className="p-4 text-xs font-black text-center">الوظيفة</th>
                  <th className="p-4 text-xs font-black text-center">الراتب</th>
                  <th className="p-4 text-xs font-black text-center">الموبايل</th>
                  <th className="p-4 text-xs font-black text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {emps.map((emp) => {
                  const row = emp as Row;
                  return (
                    <tr key={emp.employeeId} className="hover:bg-white/80 group/row">
                      <td className="p-4 text-center"><span className="flex justify-center"><EmployeeAvatar src={resolveEmployeePhotoSrc(emp)} name={emp.name} gender={emp.gender} employeeId={emp.employeeId} size={42} href={`/employees/${emp.employeeId}`} /></span></td>
                      <td className="p-4 text-center font-mono text-sm font-bold text-slate-500">{emp.employeeId}</td>
                      <td className="p-4 text-center"><Link href={`/employees/${emp.employeeId}`} className="font-black hover:text-[#C89355]">{emp.name}</Link></td>
                      <td className="p-4 text-center text-sm font-bold">{row.jobTitle || row.profession || "موظف"}</td>
                      <td className="p-4 text-center font-mono text-sm font-black">{salaryOf(row, salaryMap).toLocaleString()} <span className="text-[10px] text-[#C89355]">ل.س</span></td>
                      <td className="p-4 text-center font-mono text-sm dir-ltr">{emp.mobile || "—"}</td>
                      <td className="p-4 text-center"><span className="flex justify-center gap-2 opacity-60 group-hover/row:opacity-100"><Link href={`/employees/${emp.employeeId}`} className="p-2.5 rounded-xl hover:bg-black/5"><Eye size={16} /></Link><button onClick={() => onEdit(emp)} className="p-2.5 rounded-xl text-[#C89355] hover:bg-[#C89355]/10"><Edit2 size={16} /></button><button onClick={() => onFire(emp)} className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10"><UserMinus size={16} /></button></span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

