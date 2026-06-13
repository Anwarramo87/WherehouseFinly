"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Clock, ChevronLeft, Search, Edit2, CalendarDays, Banknote, Loader2 } from "lucide-react";
import { SALARY_CONSTANTS } from "@/lib/salary-constants"; // eslint-disable-line @typescript-eslint/no-unused-vars

import { useEmployees } from "@/hooks/useEmployees";
import { usePayrollInputs, UpsertPayrollInputPayload, PayrollInputRecord } from "@/hooks/usePayrollInputs";
import { useAttendanceDeductions } from "@/hooks/useAttendanceDeductions";
import { useAttendance } from "@/hooks/useAttendance";
import { useLeaves } from "@/hooks/useLeaves";
import useSalaries from "@/hooks/useSalaries";
import type { AttendanceDeductionBreakdown } from "@/types/attendance-deduction";
import type { EditTotalsPayload } from "@/components/EditAttendanceTotalsModal";
import type { Salary } from "@/types/salary";
import { toNumber } from "@/lib/number-utils";

const EditAttendanceTotalsModal = dynamic(
  () => import("@/components/EditAttendanceTotalsModal"),
  { loading: () => null }
);
const EmployeeMonthlyCalendarModal = dynamic(
  () => import("@/components/EmployeeMonthlyCalendarModal"),
  { loading: () => null }
);

// عدد أيام العمل المعياري في الشهر
const STANDARD_WORK_DAYS = 26;
const HOURS_PER_DAY = 8;

// NOTE: we intentionally use the canonical converter from lib/number-utils.ts
// to avoid format/locale/Decimal128 mismatches.

const safeToNumber = (v: unknown): number => {
  const n = toNumber(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * حساب الراتب الشهري الكامل للموظف من مكونات الراتب
 * يستخدم سجل salary إن وُجد، وإلا يرجع للـ baseSalary/hourlyRate على الموظف
 */
const calcGrossSalary = (
  emp: { baseSalary?: unknown; hourlyRate?: unknown },
  salaryRecord: Salary | undefined
): number => {
  if (salaryRecord) {
    const gross =
      safeToNumber(salaryRecord.baseSalary) +
      safeToNumber(salaryRecord.lumpSumSalary) +
      safeToNumber(salaryRecord.livingAllowance) +
      safeToNumber(salaryRecord.responsibilityAllowance) +
      safeToNumber(salaryRecord.extraEffortAllowance) +
      safeToNumber(salaryRecord.productionIncentive) +
      safeToNumber(salaryRecord.transportAllowance);
    if (gross > 0) return gross;
  }

  const hourlyLike = safeToNumber(emp.hourlyRate);
  const baseLike = safeToNumber(emp.baseSalary);
  const base = baseLike || hourlyLike * HOURS_PER_DAY * STANDARD_WORK_DAYS;
  return base;
};

/**
 * حساب الراتب المستحق بناءً على الدوام الفعلي ودقائق التأخير
 * الصيغة: (grossSalary / STANDARD_WORK_DAYS) * actualWorkDays - خصم التأخير
 */
const calcEarnedSalary = (
  grossSalary: number,
  presentDays: number,
  paidLeaveDays: number,
  totalDelayMinutes: number,
  overtimeMinutes = 0,
): number => {
  if (grossSalary <= 0) return 0;
  // الأيام المدفوعة = حضور فعلي + إجازات مدفوعة
  const paidDays = Math.min(presentDays + paidLeaveDays, STANDARD_WORK_DAYS);
  const dailyRate = grossSalary / STANDARD_WORK_DAYS;
  const minuteRate = dailyRate / (HOURS_PER_DAY * 60);
  const salaryFromDays = dailyRate * paidDays;
  const delayDeduction = totalDelayMinutes * minuteRate;
  const overtimePay = overtimeMinutes * minuteRate * 1.5; // معامل 1.5× للإضافي
  return Math.max(0, salaryFromDays - delayDeduction + overtimePay);
};

/**
 * حساب دقائق التأخير لسجل يومي واحد (بالـ local time — نفس منطق صفحة attendance)
 * بعد طرح فترة السماح (15 دقيقة افتراضياً)
 */
const _calcLateMinutes = (checkIn: string, scheduledStart: string, gracePeriod = 15): number => {

  if (!checkIn) return 0;
  const toMins = (t: string) => {
    const s = t.slice(0, 5);
    const [h, m] = s.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };
  const ci = toMins(checkIn);
  const sc = toMins(scheduledStart || "08:00");
  if (ci === null || sc === null) return 0;
  const diff = ci - sc - gracePeriod;
  return diff > 0 ? diff : 0;
};

export default function TimeTablePage() {
  // FIX: نضمن أن employees دائماً مصفوفة بغض النظر عن شكل الـ response
  const { data: rawEmployees } = useEmployees({ limit: 200, status: "active" });
  const employees = useMemo(
    () => (Array.isArray(rawEmployees) ? rawEmployees : []),
    [rawEmployees]
  );

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [searchFilter, setSearchFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarEmployeeId, setCalendarEmployeeId] = useState("");
  const [calendarEmployeeName, setCalendarEmployeeName] = useState("");

  const { periodStart, periodEnd } = useMemo(() => {
    if (!selectedMonth) return { periodStart: undefined, periodEnd: undefined };
    const [year, month] = selectedMonth.split("-");
    const startDate = `${year}-${month}-01`;
    const endDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${month}-${String(endDay).padStart(2, "0")}`;
    return { periodStart: startDate, periodEnd: endDate };
  }, [selectedMonth]);

  const { data: payrollInputs = [], upsertPayrollInput } = usePayrollInputs(periodStart, periodEnd);

  const { data: salariesRaw = [] } = useSalaries();
  const salaryMap = useMemo(() => {
    const m = new Map<string, typeof salariesRaw[number]>();
    salariesRaw.forEach((s) => {
      if (s?.employeeId) m.set(s.employeeId, s);
    });
    return m;
  }, [salariesRaw]);

  const { data: deductionsResponse, isLoading: deductionsLoading } = useAttendanceDeductions({
    periodStart: periodStart ?? "",
    periodEnd: periodEnd ?? "",
  });

  // جلب سجلات الحضور الشهرية لحساب التأخير بـ local time
  const { data: monthlyAttendanceData } = useAttendance({
    startDate: periodStart,
    endDate: periodEnd,
    limit: 200,
  });

  // جلب الإجازات الشهرية لعرض حالتها وإضافة الإجازات المدفوعة للراتب
  const { data: monthlyLeaves = [] } = useLeaves({
    startDate: periodStart,
    endDate: periodEnd,
  });

  // NOTE: تم إلغاء أي fallback عشوائي لحساب أيام الدوام.
  // سيتم عرض presentDays/absentDays فقط القادمة من backend عبر useAttendanceDeductions
  // لتوحيد منطق CalendarModal مع جدول الدوام.

  /**
   * بناء map: employeeId → { leaveTypes, paidLeaveDays, unpaidLeaveDays }
   * نفكك الـ Range ونحسب فقط الأيام التي تقع داخل حدود الشهر المحدد (periodStart..periodEnd)
   * التواريخ كلها YYYY-MM-DD بعد إصلاح useLeaves — نستخدم string comparison
   */
  const employeeLeavesMap = useMemo(() => {
    const map = new Map<string, { leaveTypes: string[]; paidLeaveDays: number; unpaidLeaveDays: number }>();
    if (!periodStart || !periodEnd) return map;

    for (const leave of monthlyLeaves) {
      if (!leave.employeeId || !leave.leaveType) continue;

      const leaveStart = leave.startDate?.slice(0, 10);
      const leaveEnd = leave.endDate?.slice(0, 10);
      if (!leaveStart || !leaveEnd) continue;

      // intersection: نطاق الإجازة يجب أن يتقاطع مع الشهر
      const effectiveStart = leaveStart < periodStart ? periodStart : leaveStart;
      const effectiveEnd = leaveEnd > periodEnd ? periodEnd : leaveEnd;

      // لا تقاطع مع الشهر
      if (effectiveStart > effectiveEnd) continue;

      // حساب عدد الأيام الفعلية داخل الشهر
      const startMs = new Date(effectiveStart).getTime();
      const endMs = new Date(effectiveEnd).getTime();
      const days = Math.round((endMs - startMs) / 86400000) + 1;
      if (days <= 0) continue;

      if (!map.has(leave.employeeId)) {
        map.set(leave.employeeId, { leaveTypes: [], paidLeaveDays: 0, unpaidLeaveDays: 0 });
      }
      const entry = map.get(leave.employeeId)!;
      if (!entry.leaveTypes.includes(leave.leaveType)) entry.leaveTypes.push(leave.leaveType);

      if (leave.isPaid) {
        entry.paidLeaveDays += days;
      } else {
        entry.unpaidLeaveDays += days;
      }
    }
    return map;
  }, [monthlyLeaves, periodStart, periodEnd]);

  // نستخرج المصفوفة بأمان من الـ response
  const autoDeductions: AttendanceDeductionBreakdown[] = useMemo(() => {
    if (!deductionsResponse) return [];
    if (Array.isArray(deductionsResponse.data)) return deductionsResponse.data;
    return [];
  }, [deductionsResponse]);

  const recordsWithNames = useMemo(() => {

    return employees.map((emp) => {
      const manualInput = payrollInputs.find((pi) => pi.employeeId === emp.employeeId);
      const autoInput = autoDeductions.find(
        (d: AttendanceDeductionBreakdown) => d.employeeId === emp.employeeId
      );
      const leaveData = employeeLeavesMap.get(emp.employeeId);

      const hasManualInput = !!manualInput;

      // ── الإجازات من leaves API (المصدر الحقيقي) ──
      // إذا وُجد إدخال يدوي يستخدمه المدير، نأخذ منه — وإلا نأخذ من الـ leaves المحسوبة آلياً
      const sickLeaveDays = (hasManualInput && (manualInput.sickLeaveDays ?? 0) > 0)
        ? (manualInput.sickLeaveDays ?? 0)
        : 0; // الإجازة المرضية تأتي يدوياً فقط من payrollInput

      const adminLeaveDays = (hasManualInput && (manualInput.adminLeaveDays ?? 0) > 0)
        ? (manualInput.adminLeaveDays ?? 0)
        : 0;

      const deathLeaveDays = (hasManualInput && (manualInput.deathLeaveDays ?? 0) > 0)
        ? (manualInput.deathLeaveDays ?? 0)
        : 0;

      const unpaidLeaveDays = (hasManualInput && (manualInput.unpaidLeaveDays ?? 0) > 0)
        ? (manualInput.unpaidLeaveDays ?? 0)
        : (leaveData?.unpaidLeaveDays ?? 0); // بدون أجر: نأخذ من leaves API إن لم يوجد إدخال يدوي

      // الإجازات المدفوعة من leaves API (SICK+ADMIN+DEATH+PAID) تُستخدم في حساب الراتب
      // نأخذ أكبر قيمة بين اليدوي والآلي لتجنب الخصم المزدوج
      const paidLeaveDaysFromAPI = leaveData?.paidLeaveDays ?? 0;
      const paidLeaveDaysManual = sickLeaveDays + adminLeaveDays + deathLeaveDays;
      const paidLeaveDays = Math.max(paidLeaveDaysManual, paidLeaveDaysFromAPI);

      // أيام الغياب الصافية: نطرح الإجازات المدفوعة من القادمة من الباك إند
      // لأن backend قد يحسب أيام الإجازة كـ "absent" إذا لم يسجل الموظف بصمة
      const rawAbsentDays = (hasManualInput && (manualInput.absenceDays ?? 0) > 0)
        ? (manualInput.absenceDays ?? 0)
        : (autoInput?.absentDays ?? 0);

      // الغياب الصافي = مجموع الغياب - الإجازات المدفوعة (لا نخصم مرتين)
      const absenceDays = Math.max(0, rawAbsentDays - paidLeaveDays);

      const autoLateMinutes = autoInput?.delayMinutes ?? 0;
      const lateMinutes = (hasManualInput && (manualInput.lateMinutes ?? 0) > 0)
        ? (manualInput.lateMinutes ?? 0)
        : autoLateMinutes;

      const totalLeaves = sickLeaveDays + unpaidLeaveDays + adminLeaveDays + deathLeaveDays;
      // إجمالي الغياب والإجازات للعرض — نستخدم الغياب الصافي
      const totalAbsencesLeaves = absenceDays + totalLeaves;
      const totalDelayMinutes = lateMinutes + (manualInput?.earlyLeaveMinutes ?? 0);

      // أيام الحضور الفعلية من البصمة
      const actualWorkDays: number | null = autoInput !== undefined
        ? Math.max(0, autoInput.presentDays)
        : null;

      // دقائق الإضافي: يدوي إن وُجد، وإلا آلي من calculate-deductions
      const autoOvertimeMinutes = autoInput?.overtimeMinutes ?? 0;
      const totalOvertimeMinutes = (hasManualInput && (manualInput.overtimeRegularMinutes ?? 0) > 0)
        ? (manualInput.overtimeRegularMinutes ?? 0)
        : autoOvertimeMinutes;

      // أيام إضافي العطلة (الجمعة): يدوي إن وُجد، وإلا آلي
      const autoWeekendDays = autoInput?.overtimeWeekendDays ?? 0;
      const totalOvertimeDays = (hasManualInput && (manualInput.overtimeWeekendDays ?? 0) > 0)
        ? (manualInput.overtimeWeekendDays ?? 0)
        : autoWeekendDays;

      // الراتب الكامل
      const grossSalary = calcGrossSalary(emp, salaryMap.get(emp.employeeId));

      // الراتب المستحق بناءً على الدوام الفعلي + الإجازات المدفوعة
      const earnedSalary = actualWorkDays !== null
        ? calcEarnedSalary(grossSalary, actualWorkDays, paidLeaveDays, totalDelayMinutes, totalOvertimeMinutes)
        : null;

      return {
        ...emp,
        payrollInput: manualInput ?? null,
        totalAbsencesLeaves,
        actualWorkDays,
        totalDelayMinutes,
        totalOvertimeMinutes,
        totalOvertimeDays,
        grossSalary,
        earnedSalary,
        // بيانات الإجازات للعرض في الجدول — من leaves API
        leaveTypes: leaveData?.leaveTypes ?? [],
        paidLeaveDays,
        unpaidLeaveDays,
      };
    });
  }, [employees, payrollInputs, autoDeductions, salaryMap, employeeLeavesMap]);


  const filteredRecords = useMemo(() => {
    if (!searchFilter) return recordsWithNames;
    return recordsWithNames.filter(
      (r) => r.name.includes(searchFilter) || r.employeeId.includes(searchFilter)
    );
  }, [recordsWithNames, searchFilter]);

  const handleOpenEditModal = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setIsModalOpen(true);
  };

  const handleSaveRecord = (data: EditTotalsPayload) => {
    if (!periodStart || !periodEnd) return;

    // نبني الـ payload بشكل صريح وآمن:
    // 1. نبدأ بالحقول المالية المحفوظة مسبقاً (سلف، عقوبات، إلخ) من selectedInputData
    // 2. نُضيف بيانات المودال (دوام، تأخير، إضافي) فوقها
    // 3. نُحدد periodStart/periodEnd بشكل صريح
    // 4. نُحول جميع القيم الرقمية إلى integers صريحة لتجاوز @IsInt() validation
    // 5. نحذف id تماماً لأن الباك إند لا يقبله في POST /payroll/inputs
    const payload: UpsertPayrollInputPayload = {
      employeeId: data.employeeId,
      periodStart,
      periodEnd,
      // بيانات الدوام من المودال — مُحوَّلة إلى integer صريح
      absenceDays: Math.round(Number(data.absenceDays ?? 0)),
      sickLeaveDays: Math.round(Number(data.sickLeaveDays ?? 0)),
      unpaidLeaveDays: Math.round(Number(data.unpaidLeaveDays ?? 0)),
      adminLeaveDays: Math.round(Number(data.adminLeaveDays ?? 0)),
      lateMinutes: Math.round(Number(data.lateMinutes ?? 0)),
      earlyLeaveMinutes: Math.round(Number(data.earlyLeaveMinutes ?? 0)),
      overtimeRegularMinutes: Math.round(Number(data.overtimeRegularMinutes ?? 0)),
      overtimeWeekendDays: Number(data.overtimeWeekendDays ?? 0),
      unpaidHours: Number(data.unpaidHours ?? 0),
      // deathLeaveDays: نحافظ على القيمة القديمة إن وُجدت، ونسمح بتصفيرها
      deathLeaveDays: Math.round(Number(selectedInputData?.deathLeaveDays ?? 0)),
      // الحقول المالية: نحافظ عليها من السجل القديم حتى لا تُصفَّر
      penaltyAmount: Number(selectedInputData?.penaltyAmount ?? 0),
      clothingDeduction: Number(selectedInputData?.clothingDeduction ?? 0),
      bonusAdjustment: Number(selectedInputData?.bonusAdjustment ?? 0),
      advanceAmount: Number(selectedInputData?.advanceAmount ?? 0),
      insuranceAmount: selectedInputData?.insuranceAmount !== undefined
        ? Number(selectedInputData.insuranceAmount)
        : undefined,
      transportAllowanceOverride: selectedInputData?.transportAllowanceOverride !== undefined
        ? Number(selectedInputData.transportAllowanceOverride)
        : undefined,
      notes: selectedInputData?.notes ?? "",
    };

    upsertPayrollInput.mutate(payload, {
      onSuccess: () => setIsModalOpen(false),
    });
  };

  const getSelectedInputData = (): PayrollInputRecord | null => {
    if (!selectedEmployeeId || !periodStart || !periodEnd) return null;

    // إذا وُجد تعديل يدوي مسبق، نعرضه في المودال كما هو
    const manualInput = payrollInputs.find((pi) => pi.employeeId === selectedEmployeeId);
    if (manualInput) return manualInput;

    // FIX #5 — استخدام AttendanceDeductionBreakdown بدلاً من any
    const autoInput = autoDeductions.find(
      (d: AttendanceDeductionBreakdown) => d.employeeId === selectedEmployeeId
    );

    // نبني كائن افتراضي من البيانات الآلية ليراها المدير في المودال
    const defaultRecord: PayrollInputRecord = {
      employeeId: selectedEmployeeId,
      periodStart: periodStart!,
      periodEnd: periodEnd!,
      absenceDays: Number(autoInput?.absentDays ?? 0),
      lateMinutes: Number(autoInput?.delayMinutes ?? 0),
      earlyLeaveMinutes: 0,
      sickLeaveDays: 0,
      adminLeaveDays: 0,
      unpaidLeaveDays: 0,
      deathLeaveDays: 0,
      unpaidHours: 0,
      overtimeRegularMinutes: Number(autoInput?.overtimeMinutes ?? 0),
      overtimeWeekendDays: Number(autoInput?.overtimeWeekendDays ?? 0),
    };

    return defaultRecord;
  };

  const selectedInputData = getSelectedInputData();

  return (
    <div
      className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden"
      dir="rtl"
    >
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">

        <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
          <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
          <span className="hover:text-[#263544] cursor-pointer transition-colors relative z-10">المركز المالي</span>
          <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
          <span className="text-[#263544] relative z-10">سجل الدوام والعمليات</span>
        </nav>

        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#263544]/10 pb-6 relative">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4 group">
                <Clock size={22} className="text-[#C89355] group-hover:animate-bounce transition-all duration-300" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">سجل الدوام والعمليات</h1>
            </div>
            <p className="text-sm font-bold text-slate-500 max-w-xl leading-relaxed">
              إدارة ومتابعة الغيابات والإجازات وساعات العمل الإضافي للموظفين. يتم تجميع البيانات شهرياً. اضغط على اسم الموظف لرؤية التفاصيل اليومية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 hover:shadow-md transition-all group w-full sm:w-auto">
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
              <CalendarDays size={18} className="text-[#C89355] ml-2 shrink-0 relative z-10" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-bold text-[#263544] outline-none w-full relative z-10 font-mono"
              />
            </div>

            <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 hover:shadow-md w-full sm:w-64 transition-all z-10">
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
              <Search size={18} className="text-slate-400 ml-2 relative z-10" />
              <input
                type="text"
                placeholder="بحث عن موظف..."
                className="bg-transparent border-none outline-none w-full text-sm font-bold placeholder:text-slate-400 text-[#263544] relative z-10"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
          </div>
        </header>

        <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group">
          <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover:border-[#C89355]/50" />

          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-linear-to-l from-[#1a2530] to-[#263544] text-white">
                  <th className="px-6 py-5 text-sm font-black w-16">#</th>
                  <th className="px-6 py-5 text-sm font-black">الموظف</th>
                  <th className="px-6 py-5 text-sm font-black text-center">الدوام الفعلي</th>
                  <th className="px-6 py-5 text-sm font-black text-center">الغياب والإجازات</th>
                  <th className="px-6 py-5 text-sm font-black text-center">حالة الإجازة</th>
                  <th className="px-6 py-5 text-sm font-black text-center">إجمالي التأخير (دقائق)</th>
                  <th className="px-6 py-5 text-sm font-black text-center">إجمالي الإضافي</th>
                  <th className="px-6 py-5 text-sm font-black text-center">الراتب المستحق</th>
                  <th className="px-6 py-5 text-sm font-black text-center w-24">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record, index) => (
                    <tr key={record.employeeId} className="hover:bg-[#C89355]/5 transition-colors group/row">
                      <td className="px-6 py-4 text-sm font-bold text-slate-400">
                        {String(index + 1).padStart(2, "0")}
                      </td>

                      <td
                        className="px-6 py-4 cursor-pointer"
                        onClick={() => {
                          setCalendarEmployeeId(record.employeeId);
                          setCalendarEmployeeName(record.name);
                          setIsCalendarOpen(true);
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-[#1a2530] group-hover/row:text-[#C89355] transition-colors">
                            {record.name}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">{record.employeeId}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        {deductionsLoading && !record.payrollInput ? (
                          <Loader2 size={16} className="animate-spin text-[#C89355] mx-auto" />
                        ) : (
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            {record.actualWorkDays !== null ? `${record.actualWorkDays} يوم` : "—"}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${record.totalAbsencesLeaves > 0 ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-slate-100 text-slate-500"}`}>
                          {record.totalAbsencesLeaves} يوم
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        {record.leaveTypes && record.leaveTypes.length > 0 ? (
                          <div className="flex flex-col gap-1 items-center">
                            {record.leaveTypes.map((t) => (
                              <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {{ SICK: "مرضية", ADMIN: "إدارية", UNPAID: "بدون أجر", ANNUAL: "سنوية", DEATH: "وفاة", OTHER: "أخرى" }[t] ?? t}
                              </span>
                            ))}
                            {record.paidLeaveDays > 0 && (
                              <span className="text-[10px] text-emerald-600 font-bold">{record.paidLeaveDays} أيام مدفوعة</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {deductionsLoading && !record.payrollInput ? (
                          <Loader2 size={16} className="animate-spin text-[#C89355] mx-auto" />
                        ) : (
                          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${record.totalDelayMinutes > 0 ? "bg-orange-100 text-orange-700 border border-orange-200" : "bg-slate-100 text-slate-500"}`}>
                            {record.totalDelayMinutes} دقيقة
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {record.totalOvertimeDays > 0 && (
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                              {record.totalOvertimeDays} أيام عطلة
                            </span>
                          )}
                          {record.totalOvertimeMinutes > 0 && (
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700 border border-teal-200">
                              {record.totalOvertimeMinutes} دقيقة عادي
                            </span>
                          )}
                          {record.totalOvertimeDays === 0 && record.totalOvertimeMinutes === 0 && (
                            <span className="text-slate-400 text-sm font-bold">-</span>
                          )}
                        </div>
                      </td>

                      {/* الراتب المستحق */}
                      <td className="px-6 py-4 text-center">
                        {deductionsLoading && !record.payrollInput ? (
                          <Loader2 size={16} className="animate-spin text-[#C89355] mx-auto" />
                        ) : record.grossSalary > 0 && record.earnedSalary !== null ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-black bg-[#C89355]/10 text-[#C89355] border border-[#C89355]/30">
                              <Banknote size={14} />
                              {Math.round(record.earnedSalary).toLocaleString()} ل.س
                            </span>
                            {record.earnedSalary < record.grossSalary && (
                              <span className="text-[10px] text-slate-400 font-bold">
                                من {Math.round(record.grossSalary).toLocaleString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm font-bold">غير محدد</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleOpenEditModal(record.employeeId)}
                            className="p-2 text-[#C89355] hover:bg-[#C89355]/10 rounded-xl transition-all hover:scale-110 active:scale-95"
                            title="تعديل المجاميع"
                          >
                            <Edit2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="p-4 bg-slate-50 rounded-full">
                          <Search className="text-slate-300" size={32} />
                        </div>
                        <span className="text-slate-400 font-bold">لم يتم العثور على أي موظف</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <EditAttendanceTotalsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRecord}
          isPending={upsertPayrollInput.isPending}
          employees={employees}
          initialData={selectedInputData}
          selectedEmployeeId={selectedEmployeeId}
        />
      )}

      {isCalendarOpen && (
        <EmployeeMonthlyCalendarModal
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          employeeId={calendarEmployeeId}
          employeeName={calendarEmployeeName}
          initialMonth={selectedMonth}
        />
      )}
    </div>
  );
}
