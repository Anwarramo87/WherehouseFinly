"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, CalendarCheck, ChevronLeft, Clock,
  Coins, CreditCard, Loader2, Phone, TrendingDown,
  TrendingUp, Wallet, User, X, Briefcase, Bus, ShieldAlert,
  Hash, Cake
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useAdvances } from "@/hooks/useAdvances";
import { useAttendance } from "@/hooks/useAttendance";
import { useBonuses } from "@/hooks/useBonuses";
import useSalaries from "@/hooks/useSalaries";
import { toLocalDateString } from "@/lib/date-time";
import type { Employee } from "@/types/employee";
import type { Salary } from "@/types/salary";

import { DataDrilldownModal } from "@/components/DataDrilldownModal"; 

// ==========================================
// Utility Functions
// ==========================================
const toNumber = (value: unknown) => {
  if (value && typeof value === "object" && "$numberDecimal" in (value as Record<string, unknown>)) {
    return Number((value as { $numberDecimal: string }).$numberDecimal || 0);
  }
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toMinutes = (time?: string) => {
  if (!time) return null;
  const normalized = time.slice(0, 5);
  const [h, m] = normalized.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const formatMoney = (value: number) => Math.round(value).toLocaleString("en-US");

const toDateKey = (value?: string | Date) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toLocalDateString(date);
};

const daysBetweenInclusive = (start: string, end: string) => {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return 1;
  }
  const diff = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  return diff + 1;
};

const getMonthBoundsToDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const period = `${year}-${String(month + 1).padStart(2, "0")}`;

  return { start, end, period, elapsedDays: now.getDate() };
};

/**
 * يحسب العمر بالسنوات من تاريخ الميلاد حتى اليوم.
 * يأخذ بعين الاعتبار ما إذا كان عيد الميلاد قد مرّ هذا العام أم لا.
 */
const calculateAge = (birthDate?: string | null): number | null => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age >= 0 ? age : null;
};

// ==========================================
// Main Component
// ==========================================
export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: employeeId } = use(params);
  const month = useMemo(() => getMonthBoundsToDate(), []);
  const today = useMemo(() => toLocalDateString(), []);

  // --- Modal States ---
  type DrilldownType = 'bonuses' | 'deductions' | 'advances' | null;
  const [activeDrilldown, setActiveDrilldown] = useState<DrilldownType>(null);
  
  interface DrilldownItem {
    id: string;
    name: string;
    department: string;
    amount?: number;
    extraInfo?: string;
  }
  const [drilldownData, setDrilldownData] = useState<DrilldownItem[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // --- Data Fetching ---
  const {
    data: employee,
    isLoading: isEmployeeLoading,
    isError: isEmployeeError,
  } = useQuery<Employee | null>({
    queryKey: ["employee-profile", employeeId],
    enabled: Boolean(employeeId),
    queryFn: async () => {
      const res = await apiClient.get(`/employees/${employeeId}`);
      return (res.data?.employee ?? res.data ?? null) as Employee | null;
    },
    retry: false,
  });

  const { data: salaries = [] } = useSalaries();
  const { data: employeeAdvances = [], isLoading: isAdvancesLoading } = useAdvances(employeeId);
  const { data: employeeBonuses = [], isLoading: isBonusesLoading } = useBonuses({ employeeId, period: month.period });
  
  const salary = useMemo<Salary | null>(() => {
    if (!employeeId) return null;
    return (salaries || []).find((entry) => entry.employeeId === employeeId) || null;
  }, [employeeId, salaries]);

  const attendanceRange = useMemo(() => {
    const startFromEmployee = toDateKey(employee?.createdAt) || today;
    const tentativeEnd = employee?.status === "terminated" ? toDateKey(employee?.updatedAt) || today : today;
    const end = tentativeEnd < startFromEmployee ? startFromEmployee : tentativeEnd;
    return { startDate: startFromEmployee, endDate: end, totalDays: daysBetweenInclusive(startFromEmployee, end) };
  }, [employee?.createdAt, employee?.status, employee?.updatedAt, today]);

  const { data: attendanceData, isLoading: isAttendanceLoading } = useAttendance({
    employeeId, startDate: attendanceRange.startDate, endDate: attendanceRange.endDate, limit: 200,
  });

  const attendanceSummary = useMemo(() => {
    const dailyRecords = (attendanceData?.dailyRecords || []).filter((record) => record.employeeId === employeeId);
    const scheduledStart = employee?.scheduledStart || "08:00";
    const scheduledEnd = employee?.scheduledEnd || "16:00";
    const scheduledStartMinutes = toMinutes(scheduledStart);
    const scheduledEndMinutes = toMinutes(scheduledEnd);

    let daysAttended = 0; let lateMinutes = 0; let overtimeMinutes = 0;

    for (const record of dailyRecords) {
      if (!record?.checkIn) continue;
      daysAttended += 1;

      const checkInMinutes = toMinutes(record.checkIn);
      if (checkInMinutes !== null && scheduledStartMinutes !== null && checkInMinutes > scheduledStartMinutes + 15) {
        lateMinutes += checkInMinutes - scheduledStartMinutes;
      }

      const checkOutMinutes = toMinutes(record.checkOut);
      if (checkOutMinutes !== null && scheduledEndMinutes !== null && checkOutMinutes > scheduledEndMinutes) {
        overtimeMinutes += checkOutMinutes - scheduledEndMinutes;
      }
    }
    const absentDays = Math.max(attendanceRange.totalDays - daysAttended, 0);
    return { daysAttended, lateMinutes, overtimeMinutes, absentDays };
  }, [attendanceData?.dailyRecords, attendanceRange.totalDays, employee?.scheduledEnd, employee?.scheduledStart, employeeId]);

  type ExtendedEmployee = Employee & {
    baseSalary?: number;
    salary?: number;
    jobTitle?: string;
    busRoute?: string;
  };
  const extEmployee = employee as ExtendedEmployee;

  const salaryBreakdown = useMemo(() => {
    const fallbackBase = toNumber(extEmployee?.baseSalary) || toNumber(extEmployee?.salary) || toNumber(extEmployee?.hourlyRate);
    const baseSalary = (salary && toNumber(salary.baseSalary) > 0) ? toNumber(salary.baseSalary) : fallbackBase;
    const fixedEarnings = salary
      ? toNumber(salary.baseSalary) +
        toNumber(salary.lumpSumSalary) +
        toNumber(salary.livingAllowance) +
        toNumber(salary.responsibilityAllowance) +
        toNumber(salary.extraEffortAllowance ?? salary.extraEffort) +
        toNumber(salary.productionIncentive) +
        toNumber(salary.transportAllowance)
      : baseSalary;
    const bonusesList = employeeBonuses.map((record) => ({
      id: record.id,
      name: record.bonusReason || 'مكافأة',
      department: record.period || month.period,
      amount: toNumber(record.bonusAmount),
    }));

    const deductionsList = employeeBonuses
      .filter((record) => toNumber(record.assistanceAmount) > 0)
      .map((record) => ({
        id: record.id,
        name: record.bonusReason || 'خصم',
        department: record.period || month.period,
        amount: toNumber(record.assistanceAmount),
      }));

    const advancesList = employeeAdvances
      .filter((record) => (record.issueDate || '').slice(0, 7) === month.period)
      .map((record) => ({
        id: record.id,
        name: record.advanceType === 'clothing' ? 'سلفة ملابس' : record.advanceType === 'other' ? 'سلفة أخرى' : 'سلفة راتب',
        department: record.notes || record.issueDate.slice(0, 10),
        amount: toNumber(record.remainingAmount ?? record.totalAmount),
      }));

    const totalBonuses = bonusesList.reduce((sum, item) => sum + item.amount, 0);
    const totalDeductions = deductionsList.reduce((sum, item) => sum + item.amount, 0);
    const totalAdvances = advancesList.reduce((sum, item) => sum + item.amount, 0);

    const totalDues = fixedEarnings + totalBonuses - totalDeductions - totalAdvances;

    const formattedBonuses = bonusesList.map((bonus) => ({ ...bonus, extraInfo: `+${formatMoney(bonus.amount)} ل.س` }));
    const formattedDeductions = deductionsList.map((deduction) => ({ ...deduction, extraInfo: `-${formatMoney(deduction.amount)} ل.س` }));
    const formattedAdvances = advancesList.map((advance) => ({ ...advance, extraInfo: `-${formatMoney(advance.amount)} ل.س` }));

    return { 
      baseSalary, 
      fixedEarnings,
      extraAndBonuses: totalBonuses, 
      deductions: totalDeductions, 
      advances: totalAdvances, 
      totalDues,
      formattedBonuses,
      formattedDeductions,
      formattedAdvances,
    };
  }, [employeeAdvances, employeeBonuses, month.period, salary, extEmployee]);

  const handleOpenDrilldown = (type: DrilldownType) => {
    setActiveDrilldown(type);
    setIsModalLoading(true);
    setDrilldownData([]);

    setTimeout(() => {
      if (type === 'bonuses') {
        setDrilldownData(salaryBreakdown.formattedBonuses);
      } else if (type === 'deductions') {
        setDrilldownData(salaryBreakdown.formattedDeductions);
      } else if (type === 'advances') {
        setDrilldownData(salaryBreakdown.formattedAdvances);
      }
      setIsModalLoading(false);
    }, 600);
  };

  const getModalConfig = () => {
    if (activeDrilldown === 'bonuses') return { title: 'تفاصيل الإضافي والمكافآت والبدلات', icon: TrendingUp };
    if (activeDrilldown === 'deductions') return { title: 'تفاصيل الخصومات والعقوبات', icon: TrendingDown };
    if (activeDrilldown === 'advances') return { title: 'تفاصيل السلف', icon: CreditCard };
    return { title: '', icon: AlertTriangle };
  };

  const isSecondaryLoading = isAttendanceLoading || isAdvancesLoading || isBonusesLoading;

  if (isEmployeeLoading) return <div className="flex items-center justify-center min-h-[85vh]"><Loader2 className="animate-spin text-[#C89355]" size={40} /></div>;
  if (isEmployeeError) return <div className="flex items-center justify-center min-h-[85vh] text-rose-600 font-black" dir="rtl">حدث خطأ أثناء التحميل</div>;
  if (!employee) return <div className="flex items-center justify-center min-h-[85vh] text-[#263544]/60 font-black" dir="rtl">الموظف غير موجود</div>;

  const contactPhone = employee.mobile || employee.phone || "—";
  const modalConfig = getModalConfig();
  // يقرأ dateOfBirth (الاسم الفعلي في الباك إند) أو birthDate كـ fallback
  const age = calculateAge(employee.dateOfBirth ?? employee.birthDate);

  return (
    <>
      <DataDrilldownModal 
        isOpen={activeDrilldown !== null} 
        onClose={() => setActiveDrilldown(null)}
        title={modalConfig.title}
        icon={modalConfig.icon}
        isLoading={isModalLoading}
        data={drilldownData}
        renderItem={(item, index) => (
          <div key={item.id || index} className="flex items-center justify-between p-4 bg-white/50 border border-white hover:border-[#C89355]/30 hover:shadow-md rounded-2xl transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#263544] flex items-center justify-center text-sm font-black text-[#C89355] shadow-inner">
                {item.name?.[0] || '-'}
              </div>
              <div>
                <p className="text-sm font-black text-[#263544]">{item.name}</p>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">{item.department}</p>
              </div>
            </div>
            {item.extraInfo && (
              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm border ${
                activeDrilldown === 'deductions' 
                  ? 'bg-rose-50 text-rose-700 border-rose-100' 
                  : activeDrilldown === 'advances'
                    ? 'bg-orange-50 text-orange-700 border-orange-100'
                  : 'bg-[#1a2530] text-[#C89355] border-[#C89355]/30' 
              }`}>
                {item.extraInfo}
              </span>
            )}
          </div>
        )}
      />

      <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`, backgroundSize: '24px 24px' }} />

        <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
          
          <div className="flex justify-between items-center mb-8">
            <nav className="relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-sm group">
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
              <Link href="/employees" className="hover:text-[#263544] cursor-pointer transition-colors relative z-10">إدارة الموارد البشرية</Link>
              <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
              <Link href="/employees" className="hover:text-[#263544] cursor-pointer transition-colors relative z-10">قائمة الموظفين</Link>
              <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
              <span className="text-[#263544] relative z-10">بروفايل الموظف</span>
            </nav>
            <Link href="/employees" className="relative overflow-hidden p-2.5 bg-white/60 backdrop-blur-xl border border-white/80 shadow-sm rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all duration-300 group z-10">
              <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            </Link>
          </div>

          <div className="relative bg-gradient-to-l from-white/90 to-white/50 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group mb-8 p-6 md:p-8">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/60 z-0" />
            
            <div className="flex flex-col lg:flex-row justify-between items-center gap-8 relative z-10 w-full">
              
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full lg:w-auto text-center sm:text-right">
                <div className="flex flex-col items-center gap-3 shrink-0 group/avatar">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#1a2530] to-[#263544] text-[#C89355] rounded-3xl flex items-center justify-center text-4xl font-black shadow-[0_15px_30px_rgba(38,53,68,0.4)] border border-[#C89355]/40 outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4 relative transition-transform duration-500 group-hover/avatar:scale-105 group-hover/avatar:-rotate-2">
                    <div className="absolute inset-0 bg-[#C89355] opacity-0 group-hover/avatar:opacity-10 transition-opacity duration-300 rounded-3xl" />
                    {employee.name?.[0] || <User size={40} />}
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#1a2530] text-[#C89355] text-xs font-black px-3 py-1.5 rounded-xl border border-[#C89355]/30 shadow-inner tracking-widest font-mono">
                    <Hash size={12} className="opacity-70" />
                    {employee.employeeId}
                  </div>
                </div>

                <div className="mt-2 sm:mt-1">
                  <h1 className="text-3xl md:text-4xl font-black text-[#263544] mb-4 drop-shadow-sm">{employee.name}</h1>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <span className="bg-gradient-to-l from-[#263544] to-[#1a2530] text-white px-4 py-2 rounded-xl text-sm font-black shadow-md border border-[#263544] flex items-center gap-2">
                      <Briefcase size={14} className="text-[#C89355]" />
                      {extEmployee.jobTitle || "الوظيفة غير محددة"} 
                      <div className="w-1 h-1 rounded-full bg-[#C89355] mx-1" />
                      <span className="text-white/80 font-bold">{employee.department || "القسم غير محدد"}</span>
                    </span>
                    {age !== null && (
                      <span className="bg-violet-50 text-violet-700 border border-violet-200 px-4 py-2 rounded-xl text-sm font-black shadow-sm flex items-center gap-2">
                        <Cake size={14} className="text-violet-500" />
                        {age} سنة
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center lg:items-stretch gap-6 w-full lg:w-auto">
                <div className="flex flex-col justify-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-3 text-[#263544] text-sm font-bold bg-white/60 backdrop-blur-md px-4 py-3 rounded-2xl border border-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-2 bg-[#1a2530] rounded-xl text-[#C89355] shadow-inner"><Phone size={14} /></div>
                    <span dir="ltr" className="tracking-wider">{contactPhone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-emerald-700 text-sm font-bold bg-emerald-50 backdrop-blur-md px-4 py-3 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-inner"><Bus size={14} /></div>
                    <span>مشترك بالباص - {extEmployee.busRoute || "غير محدد"}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#1a2530] via-[#263544] to-[#1a2530] rounded-[1.5rem] p-6 text-center border border-[#C89355]/40 shadow-[0_20px_40px_rgba(38,53,68,0.4)] min-w-[240px] w-full sm:w-auto relative overflow-hidden group/dues transform hover:-translate-y-1 transition-all duration-500 flex flex-col justify-center">
                  <div className="absolute inset-1.5 rounded-[1.2rem] border border-dashed border-[#C89355]/20 pointer-events-none transition-colors group-hover/dues:border-[#C89355]/50 z-0" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C89355]/10 to-transparent -translate-x-full group-hover/dues:translate-x-full transition-transform duration-1000 ease-in-out" />
                  
                  <p className="text-[#C89355]/80 font-black mb-2 text-xs uppercase tracking-widest relative z-10 flex items-center justify-center gap-1.5">
                    <Wallet size={12} />
                    المستحقات الحالية
                  </p>
                  <div className="flex justify-center items-baseline gap-2 relative z-10">
                    <h2 className="text-4xl md:text-5xl font-black text-white drop-shadow-[0_2px_10px_rgba(200,147,85,0.3)]">{formatMoney(salaryBreakdown.totalDues)}</h2>
                    <span className="text-[#C89355] font-black text-sm">ل.س</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-sm border-2 border-white/90 p-6 md:p-8 group overflow-hidden">
              <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0" />
              
              <div className="flex items-center gap-3 mb-8 border-b border-white/80 pb-5 relative z-10">
                <div className="p-2.5 bg-[#1a2530] rounded-xl shadow-md border border-[#C89355]/40">
                  <Wallet size={20} className="text-[#C89355]" />
                </div>
                <h3 className="text-xl font-black text-[#263544]">تفاصيل الراتب</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
                <div className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-500 mb-1">الراتب الأساسي</p>
                    <p className="text-2xl font-black text-[#263544]">{formatMoney(salaryBreakdown.baseSalary)}</p>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-400"><Coins size={20} /></div>
                </div>

                <div 
                  onClick={() => handleOpenDrilldown('bonuses')}
                  className="bg-[#C89355]/10 p-5 rounded-2xl border border-[#C89355]/20 flex items-start justify-between group/box hover:shadow-[0_10px_20px_rgba(200,147,85,0.15)] hover:-translate-y-1 hover:border-[#C89355]/40 cursor-pointer transition-all duration-300"
                >
                  <div>
                    <p className="text-xs font-black text-[#C89355] mb-1">الإضافي والمكافآت والبدلات</p>
                    <p className="text-2xl font-black text-[#1a2530]">+{formatMoney(salaryBreakdown.extraAndBonuses)}</p>
                  </div>
                  <div className="p-2 bg-white/60 rounded-xl text-[#C89355] group-hover/box:bg-[#C89355] group-hover/box:text-white transition-colors shadow-sm"><TrendingUp size={20} /></div>
                </div>

                <div 
                  onClick={() => handleOpenDrilldown('deductions')}
                  className="bg-rose-50/80 p-5 rounded-2xl border border-rose-100 flex items-start justify-between group/box hover:shadow-[0_10px_20px_rgba(225,29,72,0.1)] hover:-translate-y-1 hover:border-rose-300 cursor-pointer transition-all duration-300"
                >
                  <div>
                    <p className="text-xs font-black text-rose-500 mb-1">الخصومات والعقوبات</p>
                    <p className="text-2xl font-black text-rose-700">-{formatMoney(salaryBreakdown.deductions)}</p>
                  </div>
                  <div className="p-2 bg-white/60 rounded-xl text-rose-400 group-hover/box:bg-rose-500 group-hover/box:text-white transition-colors shadow-sm"><ShieldAlert size={20} /></div>
                </div>

                <div
                  onClick={() => handleOpenDrilldown('advances')}
                  className="bg-orange-50/80 p-5 rounded-2xl border border-orange-100 flex items-start justify-between group/box hover:shadow-[0_10px_20px_rgba(249,115,22,0.1)] hover:-translate-y-1 hover:border-orange-300 cursor-pointer transition-all duration-300"
                >
                  <div>
                    <p className="text-xs font-black text-orange-600 mb-1">السلف المسحوبة هذا الشهر</p>
                    <p className="text-2xl font-black text-orange-700">{formatMoney(salaryBreakdown.advances)}</p>
                  </div>
                  <div className="p-2 bg-white/50 rounded-xl text-orange-400"><CreditCard size={20} /></div>
                </div>
              </div>
            </div>

            {/* سجل الدوام */}
            <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-sm border-2 border-white/90 p-6 md:p-8 group overflow-hidden">
              <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0" />
              <div className="flex items-center gap-3 mb-8 border-b border-white/80 pb-5 relative z-10">
                <div className="p-2.5 bg-[#1a2530] rounded-xl shadow-md border border-[#C89355]/40">
                  <Clock size={20} className="text-[#C89355]" />
                </div>
                <h3 className="text-xl font-black text-[#263544]">سجل الدوام (حتى اليوم)</h3>
                {isSecondaryLoading && <Loader2 size={16} className="animate-spin text-[#C89355] mr-auto" />}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
                <div className="bg-white/80 flex items-center gap-4 p-5 rounded-2xl border border-white shadow-sm">
                  <div className="p-3 bg-slate-100 rounded-xl text-[#263544]"><CalendarCheck size={22} /></div>
                  <div>
                    <p className="text-xs font-black text-slate-500 mb-0.5">أيام الحضور</p>
                    <p className="text-2xl font-black text-[#263544]">{attendanceSummary.daysAttended}</p>
                  </div>
                </div>
                <div className="bg-[#C89355]/10 flex items-center gap-4 p-5 rounded-2xl border border-[#C89355]/20">
                  <div className="p-3 bg-white/50 rounded-xl text-[#C89355]"><Clock size={22} /></div>
                  <div>
                    <p className="text-xs font-black text-[#C89355] mb-0.5">دقائق إضافية</p>
                    <p className="text-2xl font-black text-[#1a2530]">{attendanceSummary.overtimeMinutes}</p>
                  </div>
                </div>
                <div className="bg-orange-50/80 flex items-center gap-4 p-5 rounded-2xl border border-orange-100">
                  <div className="p-3 bg-white/50 rounded-xl text-orange-500"><AlertTriangle size={22} /></div>
                  <div>
                    <p className="text-xs font-black text-orange-600 mb-0.5">دقائق التأخير</p>
                    <p className="text-2xl font-black text-orange-800">{attendanceSummary.lateMinutes}</p>
                  </div>
                </div>
                <div className="bg-rose-50/80 flex items-center gap-4 p-5 rounded-2xl border border-rose-100">
                  <div className="p-3 bg-white/50 rounded-xl text-rose-500"><CalendarCheck size={22} /></div>
                  <div>
                    <p className="text-xs font-black text-rose-500 mb-0.5">أيام الغياب</p>
                    <p className="text-2xl font-black text-rose-800">{attendanceSummary.absentDays}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}