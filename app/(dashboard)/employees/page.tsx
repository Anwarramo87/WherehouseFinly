"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEmployees, getErrorMessage } from "@/hooks/useEmployees";
import { useSalaries } from "@/hooks/useSalaries";
import useDepartments from "@/hooks/useDepartments";
import { toast } from "react-hot-toast";
import type { Employee } from "@/types/employee";
import type { AddEmployeeFormData } from "@/components/AddEmployeeModal";
import type { FireEmployeePayload } from "@/components/FireEmployeeModal";
import type { Salary } from "@/types/salary";
import { Plus, Edit2, Loader2, ChevronLeft, Users, Scissors, UserMinus, Eye, AlertTriangle, X } from "lucide-react";

// استيراد المكونات المنفصلة
import FilterComponent from "@/components/Filter";

const AddEmployeeModal = dynamic(() => import("@/components/AddEmployeeModal"), { loading: () => null });
const FireEmployeeModal = dynamic(() => import("@/components/FireEmployeeModal"), { loading: () => null });

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
  BaseSalary?: number | string;
  jobTitle?: string;
};

type ModalInitialEmployee = Employee & {
  username?: string | null;
  jobTitle?: string | null;
  baseSalary?: number | string | null;
  lumpSumSalary?: number | string | null;
  livingAllowance?: number | string | null;
  transportAllowance?: number | string | null;
  transportAllowanceOverride?: number | string | null;
  insuranceAmount?: number | string | null;
};

const resolveDisplayedMonthlySalary = (employee: EmployeeRow, salaryMap: Map<string, Salary>) => {
  const salaryRecord = salaryMap.get(employee.employeeId);
  if (salaryRecord) {
    const fixedTotal =
      toNumber(salaryRecord.baseSalary) +
      (toNumber(salaryRecord.livingAllowance) || 0) +
      (toNumber(salaryRecord.transportAllowance) || 0) -
      (toNumber(salaryRecord.insuranceAmount) || 0);

    if (Number.isFinite(fixedTotal) && fixedTotal > 0) return fixedTotal;

    const g3 = (toNumber(salaryRecord.baseSalary) || 0) + (toNumber(salaryRecord.livingAllowance) || 0) + (toNumber(salaryRecord.transportAllowance) || 0) - (toNumber(salaryRecord.insuranceAmount) || 0);
    if (g3 > 0) {
      return g3;
    }
  }

  const hourly = toNumber(employee.hourlyRate);
  return Math.round(hourly * 8 * 26);
};

export default function EmployeesPage() {
  const { data: employees, isLoading, isError, error, refetch, createEmployee, updateEmployee, terminateEmployee, bulkTerminateDepartment } = useEmployees({ includeTerminated: false });
  // Fetch ALL employees (including terminated/resigned) just for ID generation
  // so we never suggest an ID that already exists in the DB
  const { data: allEmployeesForId, refetch: refetchAllEmployees } = useEmployees({ includeTerminated: true, fetchAll: true, limit: 500 });
  const { data: salaries = [], refetch: refetchSalaries } = useSalaries();

  const salaryMap = useMemo(() => {
    const m = new Map<string, Salary>();
    (salaries || []).forEach((s) => { if (s?.employeeId) m.set(s.employeeId, s); });
    return m;
  }, [salaries]);
  
  const visibleEmployees = useMemo(
    () => Array.isArray(employees) ? employees : [],
    [employees],
  );
  
  const [mounted, setMounted] = useState(false); 
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  const [isFireModalOpen, setIsFireModalOpen] = useState(false);
  const [employeeToFire, setEmployeeToFire] = useState<Employee | null>(null);

  const [isBulkTerminateModalOpen, setIsBulkTerminateModalOpen] = useState(false);
  const [bulkTerminateDept, setBulkTerminateDept] = useState("");
  const [_bulkTerminateReason, _setBulkTerminateReason] = useState("");
  
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
      birthDate: selectedEmployee.dateOfBirth || null,
      baseSalary: normalizeDecimal(selectedEmployee.baseSalary),
      lumpSumSalary: normalizeDecimal((selectedEmployee as Employee & { lumpSumSalary?: number | string | null }).lumpSumSalary ?? salary?.lumpSumSalary),
      livingAllowance: normalizeDecimal(selectedEmployee.livingAllowance ?? salary?.livingAllowance),
    };
  }, [selectedEmployee, salaryMap]);

  // الفلترة والأقسام — نستخدم الأقسام الحقيقية المسجلة في النظام
  // (وليس النصوص الحرة لكل موظف) لتجنب ظهور أقسام وهمية/مكررة
  const { data: departmentsData } = useDepartments();
  const realDepartments = useMemo(
    () => (departmentsData?.departments ?? []).map((d) => d.name).filter(Boolean),
    [departmentsData],
  );
  const departments = useMemo(() => {
    return ["الكل", ...realDepartments];
  }, [realDepartments]);

  const filteredEmployees = useMemo(() => {
    return visibleEmployees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            emp.employeeId.includes(searchTerm);
      const matchesDept = selectedDept === "الكل" || emp.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [visibleEmployees, searchTerm, selectedDept]);

  const [suggestedEmployeeId, setSuggestedEmployeeId] = useState("EMP00001");

  const computeNextId = (empList: Employee[]) => {
    if (!empList.length) return "EMP00001";
    let max = 0;
    for (const e of empList) {
      const m = e.employeeId.match(/^EMP(\d+)$/i);
      if (m) { const n = parseInt(m[1], 10); if (n > max) max = n; }
    }
    const existingSet = new Set(empList.map(e => e.employeeId));
    let next = max + 1;
    let id = `EMP${String(next).padStart(5, "0")}`;
    while (existingSet.has(id)) { next++; id = `EMP${String(next).padStart(5, "0")}`; }
    return id;
  };

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
      residence: (formData as Record<string, unknown>).residence as string | undefined || undefined,
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

    if (formData.transportAllowance !== "") {
      payload.transportAllowance = toNumber(formData.transportAllowance);
    }

    if (formData.insuranceAmount !== "") {
      payload.insuranceAmount = toNumber(formData.insuranceAmount);
    }

    if (!selectedEmployee) {
      // Generate a safe username: use trimmed input OR fall back to employeeId (guaranteed unique)
      const rawUsername = formData.username.trim();
      // Auto-generate unique username to avoid conflicts
      const baseUsername = rawUsername || formData.name.trim().split(" ")[0] || normalizedEmployeeId;
      // Append employeeId suffix to ensure uniqueness
      payload.username = `${baseUsername}_${normalizedEmployeeId}`;
    }

    try {
      if (selectedEmployee) {
        await updateEmployee.mutateAsync({ id: selectedEmployee.employeeId, data: payload });
        await Promise.all([
          refetchSalaries().catch(() => {}),
        ]);
      } else {
        // منع POST ب employeeId موجود مسبقاً
        const allIds = (Array.isArray(allEmployeesForId) ? allEmployeesForId : [])
          .map((e) => e?.employeeId)
          .filter(Boolean) as string[];

        if (allIds.includes(normalizedEmployeeId)) {
          toast.error("كود الموظف موجود مسبقاً. اختر كود جديد (مثال: EMP + رقم مختلف). ");
          return;
        }

        // Create employee with auto-retry on duplicate ID (backend may have IDs not in our cache)
        let currentPayload = { ...payload } as Employee;
        let currentId = normalizedEmployeeId;
        let currentUsername = payload.username as string | undefined;
        const MAX_RETRIES = 5;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            const result = await createEmployee.mutateAsync(currentPayload);
            console.log('Employee created:', result);
            break; // success
          } catch (retryErr) {
            const errMsg = getErrorMessage(retryErr, "");
            const isDuplicateId = errMsg.includes("Employee ID already exists") || errMsg.includes("already exists");

            if (isDuplicateId && attempt < MAX_RETRIES) {
              // Extract number from current ID, increment, and retry
              const numMatch = currentId.match(/^EMP(\d+)$/i);
              const nextNum = numMatch ? parseInt(numMatch[1], 10) + 1 : attempt + 1;
              currentId = `EMP${String(nextNum).padStart(5, '0')}`;
              
              // Also generate a new unique username
              const baseUsername = (currentPayload.username as string | undefined)?.replace(/_EMP\d+$/, '') || formData.name.trim().split(" ")[0] || currentId;
              currentUsername = `${baseUsername}_${currentId}`;
              
              currentPayload = { ...currentPayload, employeeId: currentId, username: currentUsername };
              console.warn(`Employee ID ${currentId} exists in DB but not in cache. Retrying with ${currentPayload.employeeId}`);
              continue;
            }

            throw retryErr; // non-duplicate error or max retries reached
          }
        }

        // Force immediate refresh with a small delay to ensure backend has updated
        await new Promise(resolve => setTimeout(resolve, 100));
        await Promise.all([
          refetchSalaries().catch(err => console.error('Refetch salaries failed:', err)),
          refetchAllEmployees().catch(err => console.error('Refetch all employees failed:', err)),
          refetch().catch(err => console.error('Refetch employees failed:', err)),
        ]);
      }

      setIsModalOpen(false);
      setSelectedEmployee(null);
    } catch (err) {
      const message = getErrorMessage(err, "فشل حفظ الموظف");
      console.error("Error saving employee:", err);
      // Log the error message safely without exposing raw user input
      const responseData = (err as { response?: { data?: unknown; status?: number } })?.response;
      if (responseData) {
        console.error("Backend response status:", responseData.status);
        console.error("Backend error details: Failed to create employee");
      }
      toast.error(message, { duration: 8000 });
    }
  };

  // الدالة المحدثة لاستقبال حالة الاستقالة أو الإقالة
  const handleConfirmFire = async (fireData: FireEmployeePayload) => {
    try {
      await terminateEmployee.mutateAsync({
        id: fireData.employeeId,
        data: {
          terminationDate: new Date(fireData.fireDate).toISOString(),
          terminationReason: fireData.reason,
          notes: fireData.notes,
          status: fireData.status as "terminated" | "resigned"
        }
      });
      setIsFireModalOpen(false);
      setEmployeeToFire(null);
    } catch (err) {
      console.error("Error firing employee:", err);
    }
  };

  const handleBulkTerminateDepartment = async () => {
    if (!bulkTerminateDept || bulkTerminateDept === "الكل") {
      toast.error("يرجى اختيار قسم محدد");
      return;
    }

    try {
      await bulkTerminateDepartment.mutateAsync({
        department: bulkTerminateDept,
        status: "terminated",
        terminationDate: new Date().toISOString(),
        terminationReason: "إقالة جماعية",
      });
      setIsBulkTerminateModalOpen(false);
      setBulkTerminateDept("");
    } catch (err) {
      console.error("Error bulk terminating department:", err);
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
                  onClick={async () => {
                    setSelectedEmployee(null);
                    try {
                      const result = await refetchAllEmployees();
                      const freshList = Array.isArray(result.data) ? result.data : [];
                      setSuggestedEmployeeId(computeNextId(freshList));
                    } catch {
                      setSuggestedEmployeeId(computeNextId(Array.isArray(allEmployeesForId) ? allEmployeesForId : []));
                    }
                    setIsModalOpen(true);
                  }}
                  className="relative overflow-hidden bg-[#1a2530] hover:bg-[#263544] text-[#C89355] px-5 py-3 rounded-2xl flex items-center gap-2 shadow-[0_10px_20px_rgba(38,53,68,0.3)] transition-all active:scale-95 text-sm font-black border border-[#C89355]/40 group"
                >
                  <div className="absolute inset-1.5 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
                  <Plus size={18} className="group-hover:animate-spin relative z-10" /> 
                  <span className="relative z-10 tracking-wide">إضافة موظف</span>
                </button>
              </div>

              {selectedDept !== "الكل" && (
                <button
                  onClick={() => setIsBulkTerminateModalOpen(true)}
                  className="relative overflow-hidden bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-2xl flex items-center gap-2 shadow-[0_10px_20px_rgba(225,29,72,0.3)] transition-all active:scale-95 text-sm font-black border border-rose-500/40 group"
                >
                  <UserMinus size={18} className="relative z-10" />
                  <span className="relative z-10 tracking-wide">إقالة جميع موظفي {selectedDept}</span>
                </button>
              )}
            </div>
          </header>

          <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50 z-0" />
            <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
              {isError && (
                <div className="mx-5 mt-5 mb-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm font-bold flex items-center justify-between gap-4">
                  <span>
                    {getErrorMessage(error, "فشل جلب قائمة الموظفين")}
                  </span>
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    className="shrink-0 rounded-xl bg-rose-600 px-3 py-2 text-white text-xs font-black hover:bg-rose-700 transition-colors"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}
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
                  {!mounted || isLoading ? (
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
                      <tr key={emp.employeeId} className={`hover:bg-white/80 transition-all duration-300 group/row ${emp.status !== 'active' ? 'opacity-75 bg-rose-50/30' : ''}`}>
                        <td className="p-4 text-center font-mono font-bold text-slate-500 text-sm">
                          {emp.employeeId}
                        </td>
                        <td className="p-4 text-center">
                          <Link 
                            href={`/employees/${emp.employeeId}`} 
                            className={`inline-flex items-center gap-1.5 font-black transition-all text-base group/link ${emp.status === 'terminated' ? 'text-rose-500' : 'text-slate-800 hover:text-[#C89355]'}`}
                            title="عرض بروفايل الموظف"
                          >
                            <span className="group-hover/link:underline underline-offset-4 decoration-2 decoration-[#C89355]/40">{emp.name}</span>
                            {emp.status !== 'active' && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-black ${emp.status === 'terminated' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                                {emp.status === 'terminated' ? 'مقال' : 'مستقيل'}
                              </span>
                            )}
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

                            <button 
                              onClick={() => { setEmployeeToFire(emp); setIsFireModalOpen(true); }}
                              className="text-rose-500 hover:bg-rose-500/10 p-2.5 rounded-xl transition-all duration-300 hover:scale-110 shadow-sm border border-transparent hover:border-rose-500/30"
                              title="إنهاء خدمة موظف"
                            >
                              <UserMinus size={16} />
                            </button>

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
               key={`${isModalOpen}-${selectedEmployee?.employeeId ?? "new"}-${suggestedEmployeeId}`}
               isOpen={isModalOpen} 
               onClose={() => { setIsModalOpen(false); setSelectedEmployee(null); }} 
               onSave={handleSaveEmployee}
               isPending={createEmployee.isPending || updateEmployee.isPending}
               initialData={selectedEmployeeForModal}
               nextSuggestedId={suggestedEmployeeId}
               existingIds={Array.isArray(allEmployeesForId) ? allEmployeesForId.map(e => e.employeeId) : []}
             />
           )}

          {isFireModalOpen && employeeToFire && (
            <FireEmployeeModal 
               isOpen={isFireModalOpen}
               onClose={() => { setIsFireModalOpen(false); setEmployeeToFire(null); }}
               employee={employeeToFire}
               onConfirm={handleConfirmFire}
               isPending={terminateEmployee.isPending}
            />
          )}

          {isBulkTerminateModalOpen && (
            <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" dir="rtl">
              <div className="bg-[#101720] rounded-4xl shadow-[0_30px_90px_-15px_rgba(0,0,0,0.5)] w-full max-w-lg border border-rose-500/20">
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80">
                  <div className="flex items-center gap-3">
                    <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                      <AlertTriangle className="text-rose-500" size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white">إقالة جماعية للقسم</h2>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">القسم: {bulkTerminateDept || selectedDept}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsBulkTerminateModalOpen(false)} className="text-slate-500 hover:text-white bg-[#263544] p-2 rounded-xl transition-all">
                    <X size={18} />
                  </button>
                </div>

                <div className="p-5">
                  <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl flex items-start gap-3 mb-4">
                    <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-200 leading-relaxed font-bold">
                      أنت على وشك إنهاء خدمة **جميع الموظفين النشطين** في قسم &ldquo;{selectedDept}&rdquo;. هذا الإجراء لا يمكن التراجع عنه. يرجى التأكد قبل المتابعة.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-[#E7C873] mb-1.5 uppercase">القسم</label>
                      <select
                        value={bulkTerminateDept || selectedDept}
                        onChange={(e) => setBulkTerminateDept(e.target.value)}
                        className="w-full p-3 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 outline-none text-white font-bold text-sm"
                      >
                        {departments.filter(d => d !== "الكل").map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-[#E7C873] mb-1.5 uppercase">سبب الإقالة الجماعية</label>
                      <input
                        type="text"
                        placeholder="مثال: إعادة هيكلة القسم..."
                        className="w-full p-3 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 outline-none text-white font-bold text-sm placeholder:text-slate-600"
                        id="bulk-terminate-reason"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-white/5 flex justify-between shrink-0">
                  <button type="button" onClick={() => setIsBulkTerminateModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 bg-[#263544] hover:text-white transition-all active:scale-95">
                    إلغاء
                  </button>
                  <button
                    disabled={bulkTerminateDepartment.isPending}
                    onClick={handleBulkTerminateDepartment}
                    className="bg-rose-600 text-white px-6 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {bulkTerminateDepartment.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserMinus size={16} />}
                    تأكيد الإقالة الجماعية
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
    </div>
  );
}