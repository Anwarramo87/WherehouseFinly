"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
const RewardsTab = dynamic(() => import("../rewards/page"), { ssr: false, loading: () => null });
import { useSearchParams } from "next/navigation";
import useSalaries from "@/hooks/useSalaries";
import { useEmployees } from "@/hooks/useEmployees";
import { useBonuses } from "@/hooks/useBonuses";
import { useAdvances } from "@/hooks/useAdvances";
import type { Advance } from "@/types/advance";
import { Edit, Trash, Gift, Plus, Sparkles, Loader2, HandCoins, Wallet, ChevronLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import type { Salary } from "@/types/salary";
import type { Employee } from "@/types/employee";
import type { Bonus } from "@/types/bonus";

export type FinancialTabKey = "salary-config" | "advances" | "bonuses" | "final-payroll";

const ManageSalaryModal = dynamic(() => import("@/components/ManageSalaryModal"), { loading: () => null });
const AddBonusModal = dynamic(() => import("@/components/AddBonusModal"), { loading: () => null });
const AddAdvanceModal = dynamic(() => import("@/components/AddAdvanceModal"), { loading: () => null });

const toNumber = (value: unknown) => {
  if (value && typeof value === "object" && "$numberDecimal" in (value as Record<string, unknown>)) {
    return Number((value as { $numberDecimal: string }).$numberDecimal || 0);
  }
  return Number(value || 0);
};

const getLocalMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const getTabFromQuery = (tabParam: string | null): FinancialTabKey => {
  if (tabParam === "bonuses") return "bonuses";
  if (tabParam === "final-payroll" || tabParam === "payroll") return "final-payroll";
  return "salary-config";
};

// Payload must match UpsertSalaryDto — canonical field names only
type SalaryPayload = {
  profession?: string;
  baseSalary: number;
  lumpSumSalary: number;
  livingAllowance: number;
  transportAllowance: number;
  insuranceAmount: number;        // canonical (NOT insurances)
};

const SkeletonRows = () => (
  <div className="space-y-3 p-6 bg-white/50 rounded-3xl">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-12 rounded-xl bg-slate-200/50 animate-pulse" />
    ))}
  </div>
);

const tabLabels: Record<FinancialTabKey, string> = {
  "salary-config": "إعداد الرواتب",
  "bonuses": "المكافآت والخصومات",
  "advances": "السلف",
  "final-payroll": "المسير النهائي",
};

export default function SalariesSettingClient() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = getTabFromQuery(requestedTab);

  const { data: salaries = [], isLoading, isError, error, updateSalary, deleteSalary } = useSalaries();
  // نجلب الموظفين مع المتقاعدين كي لا يظهر الاسم كـ "غير معروف" في الرواتب
  const { data: employees = [], isLoading: employeesLoading, refetch: refetchEmployees } = useEmployees({ includeTerminated: true, limit: 500, fetchAll: false });
  const { data: advances = [] } = useAdvances();

  const period = useMemo(() => getLocalMonth(), []);
  const { data: bonuses = [] } = useBonuses({ period });

  const employeeNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (Array.isArray(employees)) {
      for (const emp of employees) {
        if (emp?.employeeId) map[emp.employeeId] = emp.name || emp.employeeId;
      }
    }
    return map;
  }, [employees]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Salary | null>(null);
  const [preselectedEmployeeId, setPreselectedEmployeeId] = useState<string | undefined>(undefined);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);

  const openFor = (salary: Salary | null = null, preselectId?: string) => {
    setSelected(salary);
    setPreselectedEmployeeId(preselectId);
    setIsModalOpen(true);
  };

  const employeeMap = useMemo(() => {
    const m = new Map<string, Employee>();
    (employees || []).forEach((e) => { if (e?.employeeId) m.set(e.employeeId, e); });
    return m;
  }, [employees]);

  // If there are salary records for IDs not present in `employees`, try refetching employees (best-effort).
  useEffect(() => {
    if (!refetchEmployees) return;
    try {
      const missing = (salaries || []).some((s) => !!s?.employeeId && !employeeMap.has(s.employeeId));
      if (missing) {
        // best-effort refetch to resolve any race where salary appears before employees list
        refetchEmployees().catch(() => {});
      }
    } catch {
      // swallow errors — this is a best-effort UX improvement
    }
  }, [salaries, employeeMap, refetchEmployees]);

  const salaryMap = useMemo(() => {
    const m = new Map<string, Salary>();
    (salaries || []).forEach((s) => { if (s?.employeeId) m.set(s.employeeId, s); });
    return m;
  }, [salaries]);

  const allIds = useMemo(() => {
    const set = new Set<string>();
    (employees || []).forEach((e) => e?.employeeId && set.add(e.employeeId));
    (salaries || []).forEach((s) => s?.employeeId && set.add(s.employeeId));
    return Array.from(set);
  }, [employees, salaries]);

  const employeesForFinanceModals = useMemo(
    () => (employees || []).map((emp) => ({ employeeId: emp.employeeId, name: emp.name })),
    [employees],
  );

  const tabStats = useMemo(() => {
    const totalAdvances = (advances || []).reduce((sum: number, item: Advance) => sum + toNumber(item.remainingAmount), 0);
    const totalBonus = (bonuses || []).reduce((sum: number, item: Bonus) => sum + toNumber(item.bonusAmount), 0);
    const totalDeductions = (bonuses || []).reduce((sum: number, item: Bonus) => sum + toNumber(item.assistanceAmount), 0);
    return { totalAdvances, totalBonus, totalDeductions };
  }, [advances, bonuses]);

  const handleSave = (employeeId: string, payload: SalaryPayload) => {
    if (!employeeId) return toast.error("يرجى إدخال كود الموظف");
    updateSalary.mutate({
      employeeId,
      data: {
        employeeId,
        profession: payload.profession ?? "",
        baseSalary: payload.baseSalary,
        lumpSumSalary: payload.lumpSumSalary,
        livingAllowance: payload.livingAllowance,
        transportAllowance: payload.transportAllowance,
        insuranceAmount: payload.insuranceAmount,
      },
    });
    setIsModalOpen(false);
  };

  const handleDelete = (employeeId: string) => {
    if (!confirm(`هل تريد حذف بيانات الراتب للموظف ${employeeId}؟`)) return;
    deleteSalary.mutate(employeeId);
  };

  const openFloatingAction = () => {
    if (activeTab === "salary-config") { openFor(null); return; }
    if (activeTab === "advances") { setIsAdvanceModalOpen(true); return; }
    if (activeTab === "bonuses") { setIsBonusModalOpen(true); }
  };

  const getActionButtonConfig = () => {
    switch (activeTab) {
      case "salary-config":
        return { text: "ضبط راتب جديد", icon: <Plus size={18} /> };
      case "advances":
        return { text: "إضافة سلفة", icon: <HandCoins size={18} /> };
      case "bonuses":
        return { text: "إضافة مكافأة / خصم", icon: <Gift size={18} /> };
      case "final-payroll":
        return null;
      default:
        return { text: "إضافة", icon: <Plus size={18} /> };
    }
  };

  const actionButtonConfig = getActionButtonConfig();

  return (
    <>
      <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">

        {/* نقشة الفايبر */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`, backgroundSize: '24px 24px' }} />

        <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">

          <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
            <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
            <span className="hover:text-[#263544] cursor-pointer relative z-10">المركز المالي</span>
            <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
            <span className="text-[#263544] relative z-10">{tabLabels[activeTab]}</span>
          </nav>

          <header className="mb-10 flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-[#263544]/10 pb-8 relative">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4 group">
                  <Sparkles size={22} className="text-[#C89355] group-hover:animate-bounce transition-all duration-300" strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">المركز المالي الذكي</h1>
              </div>
              <p className="text-slate-600 text-sm font-bold pr-14 mt-1">لوحة موحدة لإدارة الرواتب والسلف والمكافآت وحساب المسير النهائي.</p>
            </div>

            {/* Smart Header Button - Task 1 */}
            {actionButtonConfig && (
              <button
                onClick={openFloatingAction}
                className="bg-[#1a2530] text-[#C89355] hover:bg-[#263544] px-5 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-[0_8px_30px_rgba(38,53,68,0.1)] border border-[#C89355]/30 hover:scale-105"
              >
                {actionButtonConfig.icon}
                <span>{actionButtonConfig.text}</span>
              </button>
            )}
          </header>

          {/* تبويب إعداد الرواتب المعدل */}
          {activeTab === "salary-config" && (
            <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden mt-6 group">
              <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0" />
              {isLoading ? (
                <SkeletonRows />
              ) : isError ? (
                <div className="p-8 text-center font-bold text-rose-600">خطأ: {error?.message ?? "فشل تحميل البيانات"}</div>
              ) : (
                <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
                  <table className="w-full text-right min-w-250">
                    {/* Updated Table Header */}
                    <thead className="bg-[#1a2530] border-b-2 border-[#C89355]/30">
                      <tr>
                        <th className="p-5 text-white font-black text-xs uppercase tracking-wider text-center">الموظف (الاسم والكود)</th>
                        <th className="p-5 text-white font-black text-xs uppercase tracking-wider text-center">الراتب الأساسي</th>
                        <th className="p-5 text-white font-black text-xs uppercase tracking-wider text-center">بدل المعيشة</th>
                        <th className="p-5 text-white font-black text-xs uppercase tracking-wider text-center">بدل النقل</th>
                        <th className="p-5 text-rose-400 font-black text-xs uppercase tracking-wider text-center">التأمينات (خصم)</th>
                        <th className="p-5 text-[#C89355] font-black text-xs uppercase tracking-wider text-center bg-[#C89355]/20">الإجمالي الثابت</th>
                        <th className="p-5 text-white font-black text-xs uppercase tracking-wider text-center">إدارة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/40">
                      {allIds.length === 0 ? (
                        <tr><td colSpan={7} className="p-16 text-center text-[#263544]/60 font-black">لا توجد سجلات.</td></tr>
                      ) : (
                        allIds.map((id: string) => {
                          const s = salaryMap.get(id) ?? null;
                          const emp = employeeMap.get(id) ?? null;

                          // Defaults when no salary record exists yet
                          let base = toNumber(emp?.hourlyRate);
                          let lumpSum = 0;
                          let living = toNumber(emp?.livingAllowance);
                          let transport = 0;
                          let insurance = 0;

                          if (s) {
                            base = toNumber(s.baseSalary);
                            lumpSum = toNumber(s.lumpSumSalary);
                            living = toNumber(s.livingAllowance) || living;
                            transport = toNumber(s.transportAllowance);
                            insurance = toNumber(s.insuranceAmount);
                          }

                          // الإجمالي الثابت الشامل بدون أي تعويضات إضافية
                          const monthlyFixedTotal = base + lumpSum + living + transport - insurance;
                          const employeeName = employeesLoading ? "جارٍ التحميل..." : (emp?.name ?? employeeNameMap[id] ?? id);

                          return (
                            <tr key={id} className="hover:bg-white/80 transition-all duration-300 group/row">
                              {/* 1. اسم الموظف وتحته كود الموظف */}
                              <td className="p-4 text-center ">
                                <div className="font-black text-slate-800 group-hover/row:text-[#263544] text-base">{employeeName}</div>
                                <div className="font-mono font-bold text-[10px] text-slate-500 mt-0.5">{id}</div>
                              </td>

                              {/* 2. الراتب الأساسي */}
                              <td className="p-4 text-center font-mono font-black text-[#263544]">
                                {base > 0 ? base.toLocaleString() : "—"}
                              </td>

                              {/* 3. بدل المعيشة */}
                              <td className="p-4 text-center font-mono font-black text-[#263544]">
                                {living > 0 ? living.toLocaleString() : "—"}
                              </td>

                              {/* 4. بدل النقل */}
                              <td className="p-4 text-center font-mono font-black text-[#263544]">
                                {transport > 0 ? transport.toLocaleString() : "—"}
                              </td>

                              {/* 5. التأمينات (بالأحمر كخصم) */}
                              <td className="p-4 text-center font-mono font-black text-rose-500">
                                {insurance > 0 ? insurance.toLocaleString() : "—"}
                              </td>

                              {/* 6. الإجمالي الثابت */}
                              <td className="p-4 font-black text-center text-[#1a2530] bg-[#C89355]/5 border-x border-[#C89355]/10">
                                {monthlyFixedTotal > 0 ? monthlyFixedTotal.toLocaleString() : <span className="text-rose-500 text-[10px] bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">غير مضبوط</span>}
                              </td>

                              {/* 7. إدارة */}
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2 opacity-60 group-hover/row:opacity-100 transition-opacity">
                                  {!s ? (
                                    <button onClick={() => openFor(null, id)} className="px-4 py-1.5 rounded-xl bg-[#1a2530] text-[#C89355] hover:bg-[#263544] font-black text-[10px] transition-all shadow-sm border border-[#C89355]/30 whitespace-nowrap">
                                      ضبط الراتب
                                    </button>
                                  ) : (
                                    <>
                                      <button onClick={() => openFor(s)} className="text-[#C89355] hover:bg-[#1a2530] p-2.5 rounded-xl transition-all hover:scale-110 shadow-sm"><Edit size={16} /></button>
                                      <button onClick={() => handleDelete(s.employeeId)} className="text-rose-500 hover:bg-rose-500 hover:text-white p-2.5 rounded-xl transition-all hover:scale-110 shadow-sm">
                                        {deleteSalary.isPending ? <Loader2 className="animate-spin" size={16} /> : <Trash size={16} />}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Advances tab removed — advances are now managed inside الخصومات والسلف (discounts) page */}

          {/* تبويب المكافآت مع Contextual Stat Cards */}
          {activeTab === "bonuses" && (
            <>
              {/* Contextual Stat Cards for Bonuses */}
              <div className="flex gap-4 mb-6">
                <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-4 shadow-[0_8px_30px_rgba(38,53,68,0.04)] flex-1 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-2 mb-1.5 relative z-10">
                    <Gift size={14} className="text-[#C89355]" />
                    <p className="text-[11px] font-black text-slate-500">إجمالي المكافآت</p>
                  </div>
                  <p className="font-black text-xl text-[#263544]">{tabStats.totalBonus.toLocaleString()}</p>
                </div>
                <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-4 shadow-[0_8px_30px_rgba(38,53,68,0.04)] flex-1 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-2 mb-1.5 relative z-10">
                    <Wallet size={14} className="text-rose-500" />
                    <p className="text-[11px] font-black text-slate-500">إجمالي الخصومات</p>
                  </div>
                  <p className="font-black text-xl text-rose-600">{tabStats.totalDeductions.toLocaleString()}</p>
                </div>
              </div>
              {/* Render full rewards table via dynamic import to restore dashboard view */}
              <RewardsTab />
            </>
          )}

          {/* تبويب المسير النهائي */}
          {activeTab === "final-payroll" && (
            <div className="p-8 text-center text-slate-500 font-bold">جاري تحميل المسير...</div>
          )}

        </div>
      </div>

      {/* المودالات الخاصة بالرواتب والمكافآت */}
      {isModalOpen && <ManageSalaryModal key={`${isModalOpen}-${selected?.employeeId ?? preselectedEmployeeId ?? "new"}`} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={selected} preselectedEmployeeId={preselectedEmployeeId} employees={employees} isPending={updateSalary.isPending} onSave={handleSave} />}
      {isAdvanceModalOpen && <AddAdvanceModal isOpen={isAdvanceModalOpen} onClose={() => setIsAdvanceModalOpen(false)} employees={employeesForFinanceModals} isPending={false} onSave={() => { }} />}
      {isBonusModalOpen && <AddBonusModal isOpen={isBonusModalOpen} onClose={() => setIsBonusModalOpen(false)} employees={employees} salaries={salaries} isPending={false} onSave={() => { }} />}
    </>
  );
}
