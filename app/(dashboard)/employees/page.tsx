"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEmployees, getErrorMessage } from "@/hooks/useEmployees";
import { useSalaries } from "@/hooks/useSalaries";
import { toast } from "react-hot-toast";
import type { Employee } from "@/types/employee";
import type { AddEmployeeFormData } from "@/components/AddEmployeeModal";
import type { TerminationData } from "@/components/TerminateEmployeeModal";
import type { Salary } from "@/types/salary";
import { Plus, Edit2, Loader2, ChevronLeft, Users, Scissors, UserMinus, Eye, Lock } from "lucide-react";
import { PermissionGuard } from "@/components/PermissionGuard";

// استيراد المكونات المنفصلة
import FilterComponent from "@/components/Filter";

const AddEmployeeModal = dynamic(() => import("@/components/AddEmployeeModal"), { loading: () => null });
const TerminateEmployeeModal = dynamic(() => import("@/components/TerminateEmployeeModal"), { loading: () => null });

const normalizeNumericInput = (value: string) => {
  const arabicDigits: Record<string, string> = {
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };

  const normalized = value
    .replace(/[٠-٩]/g, (digit) => arabicDigits[digit] || digit)
    .replace(/[ ,]/g, "")
    .replace(/[^0-9.\-]/g, "");

  const dotCount = (normalized.match(/\./g) || []).length;
  const cleaned = dotCount > 1 ? normalized.replace(/\./g, "") : normalized;

  return cleaned.trim();
};

const toNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "object" && value && "$numberDecimal" in value) {
    const parsed = Number((value as { $numberDecimal?: string }).$numberDecimal || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value !== "string") return 0;
  const normalized = normalizeNumericInput(value);
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

type EmployeeRow = Employee & {
  monthlySalary?: number | string;
  jobTitle?: string;
};

type ModalInitialEmployee = Employee & {
  username?: string | null;
  birthDate?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  jobTitle?: string | null;
  baseSalary?: number | string | null;
  lumpSumSalary?: number | string | null;
  livingAllowance?: number | string | null;
};

const resolveDisplayedMonthlySalary = (employee: EmployeeRow, salaryMap: Map<string, Salary>) => {
  // أولاً: التحقق من وجود راتب في salaryMap
  const salaryRecord = salaryMap.get(employee.employeeId);
  if (salaryRecord?.baseSalary) {
    const parsed = toNumber(salaryRecord.baseSalary);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  
  // ثانياً: التحقق من monthlySalary في بيانات الموظف نفسه
  if (employee.monthlySalary !== undefined && employee.monthlySalary !== null && employee.monthlySalary !== "") {
    const parsed = toNumber(employee.monthlySalary);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  
  // Fallback: حساب من hourlyRate
  const hourly = toNumber(employee.hourlyRate);
  return Math.round(hourly * 8 * 26);
};

export default function EmployeesPage() {
  const { data: employees, isLoading, createEmployee, updateEmployee, terminateEmployee } = useEmployees({ includeTerminated: false });
  const { data: salaries = [], refetch: refetchSalaries } = useSalaries();

  const salaryMap = useMemo(() => {
    const m = new Map<string, Salary>();
    (salaries || []).forEach((s) => { if (s?.employeeId) m.set(s.employeeId, s); });
    return m;
  }, [salaries]);
  
  // Filter out terminated and resigned employees from the active list
  const visibleEmployees = useMemo(
    () => (employees || []).filter(emp => emp.status === 'active' || !emp.status),
    [employees],
  );
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
  const [employeeToTerminate, setEmployeeToTerminate] = useState<Employee | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("الكل");

  const selectedEmployeeForModal = useMemo<ModalInitialEmployee | undefined>(() => {
    if (!selectedEmployee) return undefined;

    const salary = salaryMap.get(selectedEmployee.employeeId) ?? null;

    const normalizeDecimal = (value: unknown): number | string | null | undefined => {
      if (value && typeof value === "object" && "$numberDecimal" in (value as Record<string, unknown>)) {
        return (value as { $numberDecimal?: string }).$numberDecimal ?? null;
      }
      if (typeof value === "number" || typeof value === "string" || value == null) {
        return value as number | string | null | undefined;
      }
      return undefined;
    };

    return {
      ...selectedEmployee,
      username: (selectedEmployee as Employee & { username?: string | null }).username || selectedEmployee.name,
      birthDate: selectedEmployee.birthDate || (selectedEmployee as Employee & { dateOfBirth?: string | null }).dateOfBirth || null,
      baseSalary: normalizeDecimal(selectedEmployee.baseSalary),
      lumpSumSalary: normalizeDecimal((selectedEmployee as Employee & { lumpSumSalary?: number | string | null }).lumpSumSalary ?? salary?.lumpSumSalary),
      livingAllowance: normalizeDecimal(selectedEmployee.livingAllowance ?? salary?.livingAllowance),
    };
  }, [selectedEmployee, salaryMap]);

  // الفلترة والأقسام
  const departments = useMemo(() => {
    if (!visibleEmployees.length) return ["الكل"];
    const depts = new Set(
      visibleEmployees
        .map((emp) => emp.department)
        .filter((department): department is string => Boolean(department && department.trim())),
    );
    return ["الكل", ...Array.from(depts)];
  }, [visibleEmployees]);

  const filteredEmployees = useMemo(() => {
    return visibleEmployees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            emp.employeeId.includes(searchTerm);
      const matchesDept = selectedDept === "الكل" || emp.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [visibleEmployees, searchTerm, selectedDept]);

  // --- حساب كود الموظف بطريقة آمنة جداً (البحث عن أكبر رقم مستخدم) ---
  const suggestedEmployeeId = useMemo(() => {
    if (!employees || employees.length === 0) return "EMP00001";
    
    // استخراج كل الأرقام من أكواد الموظفين الموجودة
    const existingIds = employees.map(e => e.employeeId);
    let maxNumber = 0;

    existingIds.forEach(id => {
      const match = id.match(/^EMP(\d+)$/i); // استخراج الرقم بغض النظر عن طوله
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    let nextNumber = maxNumber + 1;
    let nextId = `EMP${String(nextNumber).padStart(5, '0')}`;

    // حلقة تأكيدية: التأكد التام أن الـ ID الجديد غير موجود (للحماية من أي ثغرة)
    while (existingIds.includes(nextId)) {
      nextNumber++;
      nextId = `EMP${String(nextNumber).padStart(5, '0')}`;
    }

    return nextId;
  }, [employees]);

  // الإجراءات
  const handleEditClick = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsModalOpen(true);
  };

  const handleSaveEmployee = async (formData: AddEmployeeFormData) => {
    const normalizedEmployeeId = formData.employeeId.trim();
    const monthlySalary = toNumber(formData.baseSalary);
    const maxHourlyRate = 99999999.99;
    const maxMonthlySalary = maxHourlyRate * 26 * 8;

    if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) {
      toast.error("الراتب الأساسي مطلوب ويجب أن يكون رقمًا صالحًا");
      return;
    }

    if (monthlySalary > maxMonthlySalary) {
      toast.error("الراتب الأساسي كبير جدًا");
      return;
    }

    const payload: Partial<Employee> & { username?: string, dateOfBirth?: string, baseSalary?: number, lumpSumSalary?: number, livingAllowance?: number } = {
      employeeId: normalizedEmployeeId,
      name: formData.name.trim(),
      mobile: formData.mobile.trim() || undefined,
      dateOfBirth: formData.birthDate || undefined,
      gender: formData.gender || undefined,
      department: formData.department || undefined,
      profession: formData.jobTitle || undefined,
      jobTitle: formData.jobTitle || undefined,
      roleId: formData.roleId || undefined,
      scheduledStart: formData.scheduledStart || undefined,
      scheduledEnd: formData.scheduledEnd || undefined,
      baseSalary: monthlySalary || undefined,
    };

    if (formData.livingAllowance !== "") {
      payload.livingAllowance = toNumber(formData.livingAllowance);
    }

    if (formData.lumpSumSalary !== "") {
      payload.lumpSumSalary = toNumber(formData.lumpSumSalary);
    }

    if (!selectedEmployee) {
      payload.username = formData.username.trim() || normalizedEmployeeId;
    }

    try {
      if (selectedEmployee) {
        // في حال التعديل
        await updateEmployee.mutateAsync({ id: selectedEmployee.employeeId, data: payload });
        // Ensure salaries list reflects employeeSalary upsert performed by backend
        try { await refetchSalaries(); } catch { /* best-effort */ }
      } else {
        // في حال موظف جديد
        await createEmployee.mutateAsync(payload as Employee);
        try { await refetchSalaries(); } catch { /* best-effort */ }
      }
      setIsModalOpen(false);
      setSelectedEmployee(null);
    } catch (err) {
      const message = getErrorMessage(err, "فشل حفظ الموظف");
      toast.error(message);
      console.error("Error saving employee:", err);
    }
  };

  // الدالة المحدثة لاستقبال بيانات إنهاء الخدمة
  const handleConfirmTerminate = async (terminationData: TerminationData) => {
    if (!employeeToTerminate) return;
    
    try {
      await terminateEmployee.mutateAsync({
        id: employeeToTerminate.employeeId,
        data: {
          terminationDate: new Date(terminationData.terminationDate).toISOString(),
          terminationReason: terminationData.reason,
          notes: terminationData.notes,
          status: terminationData.terminationType === 'resignation' ? 'resigned' : 'terminated'
        }
      });
      setIsTerminateModalOpen(false);
      setEmployeeToTerminate(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "فشل في إنهاء الخدمة"));
    }
  };

  return (
    <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">
        
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`,
            backgroundSize: '24px 24px'
          }}
        />

        <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
                
          <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
            <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
            <span className="hover:text-[#263544] cursor-pointer transition-colors relative z-10">إدارة الموارد البشرية</span>
            <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
            <span className="text-[#263544] relative z-10">قائمة الموظفين</span>
          </nav>

          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#263544]/10 pb-6 relative">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4">
                  <Users size={22} className="text-[#C89355]" strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">
                  إدارة الموظفين
                </h1>
              </div>
              <p className="text-slate-600 text-sm font-bold pr-14 flex items-center gap-2">
                <Scissors size={14} className="text-[#C89355]" />
                البحث، الفلترة، وإدارة الكوادر
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-end gap-5 w-full md:w-auto">
              <FilterComponent 
                searchTerm={searchTerm} 
                onSearchChange={setSearchTerm} 
                selectedDept={selectedDept} 
                onDeptChange={setSelectedDept} 
                departments={departments} 
              />

              <div className="w-full md:w-auto flex justify-end">
                <button 
                  onClick={() => { setSelectedEmployee(null); setIsModalOpen(true); }}
                  className="relative overflow-hidden bg-[#1a2530] hover:bg-[#263544] text-[#C89355] px-5 py-3 rounded-2xl flex items-center gap-2 shadow-[0_10px_20px_rgba(38,53,68,0.3)] transition-all active:scale-95 text-sm font-black border border-[#C89355]/40 group"
                >
                  <div className="absolute inset-1.5 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
                  <Plus size={18} className="group-hover:animate-spin relative z-10" /> 
                  <span className="relative z-10 tracking-wide">إضافة موظف</span>
                </button>
              </div>
            </div>
          </header>

          <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50 z-0" />
            <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
              <table className="w-full text-right min-w-225">
                <thead className="bg-white/40 border-b border-white/80">
                  <tr>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center w-24">كود الموظف</th>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center ">الاسم</th>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">القسم / الوظيفة</th>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الراتب الشهري</th>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">رقم الموبايل</th>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="animate-spin text-[#C89355]" size={40} />
                          <span className="font-black text-[#263544] animate-pulse">جاري تحميل قائمة الموظفين...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-16 text-center text-[#263544]/60 font-black text-lg">
                        لا يوجد بيانات مطابقة للبحث.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const row = emp as EmployeeRow;

                      return (
                      <tr key={emp.employeeId} className="hover:bg-white/80 transition-all duration-300 group/row">
                        <td className="p-4 text-center font-mono font-bold text-slate-500 text-sm">
                          {emp.employeeId}
                        </td>
                        <td className="p-4 text-center">
                          <Link 
                            href={`/employees/${emp.employeeId}`} 
                            className="inline-flex items-center gap-1.5 font-black transition-all text-base group/link text-slate-800 hover:text-[#C89355]"
                            title="عرض بروفايل الموظف"
                          >
                            <span className="group-hover/link:underline underline-offset-4 decoration-2 decoration-[#C89355]/40">{emp.name}</span>
                          </Link>
                        </td>
                        <td className="p-4 text-center font-bold text-[#263544] text-sm">
                          {emp.department} <span className="text-[#C89355] mx-1">/</span> {row.jobTitle || 'موظف'}
                        </td>
                        <td className="p-4 text-center font-mono font-black text-[#263544] text-sm">
                          {resolveDisplayedMonthlySalary(row, salaryMap).toLocaleString()} <span className="text-[10px] text-[#C89355] mr-1">ل.س</span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-600 text-sm dir-ltr">
                          {emp.mobile || '—'}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2 opacity-60 group-hover/row:opacity-100 transition-opacity">
                            
                            <Link 
                              href={`/employees/${emp.employeeId}`}
                              className="text-[#1a2530] hover:bg-[#1a2530]/10 p-2.5 rounded-xl transition-all duration-300 hover:scale-110 shadow-sm border border-transparent hover:border-[#1a2530]/30"
                              title="عرض بروفايل الموظف"
                            >
                              <Eye size={16} />
                            </Link>

                            <button 
                              onClick={() => handleEditClick(emp)}
                              className="text-[#C89355] hover:bg-[#C89355]/10 p-2.5 rounded-xl transition-all duration-300 hover:scale-110 shadow-sm border border-transparent hover:border-[#C89355]/30"
                              title="تعديل بيانات الموظف"
                            >
                              <Edit2 size={16} />
                            </button>

                            <PermissionGuard
                              permission="termination:create"
                              fallback={
                                <button
                                  className="text-slate-300 cursor-not-allowed p-2.5 rounded-xl"
                                  title="ليس لديك صلاحية إنهاء الخدمة"
                                  disabled
                                >
                                  <Lock size={16} />
                                </button>
                              }
                            >
                              <button
                                onClick={() => { setEmployeeToTerminate(emp); setIsTerminateModalOpen(true); }}
                                className="text-rose-500 hover:bg-rose-500/10 p-2.5 rounded-xl transition-all duration-300 hover:scale-110 shadow-sm border border-transparent hover:border-rose-500/30"
                                title="إنهاء عمل الموظف"
                              >
                                <UserMinus size={16} />
                              </button>
                            </PermissionGuard>

                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {isModalOpen && (
            <AddEmployeeModal 
              key={`${isModalOpen}-${selectedEmployee?.employeeId ?? "new"}`}
              isOpen={isModalOpen} 
              onClose={() => { setIsModalOpen(false); setSelectedEmployee(null); }} 
              onSave={handleSaveEmployee}
              isPending={createEmployee.isPending || updateEmployee.isPending}
              initialData={selectedEmployeeForModal}
              nextSuggestedId={suggestedEmployeeId} // الكود الآمن المحسوب
            />
          )}

          {isTerminateModalOpen && employeeToTerminate && (
            <TerminateEmployeeModal 
               employee={employeeToTerminate}
               isOpen={isTerminateModalOpen}
               onClose={() => { setIsTerminateModalOpen(false); setEmployeeToTerminate(null); }}
               onConfirm={handleConfirmTerminate}
               isPending={terminateEmployee.isPending}
            />
          )}

        </div>
    </div>
  );
}