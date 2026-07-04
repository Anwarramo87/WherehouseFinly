"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, UserMinus, ChevronLeft, ChevronRight, AlertTriangle, Calendar, FileText, Calculator, Coins, AlertOctagon, UserX, LogOut } from "lucide-react";
import type { Employee } from "@/types/employee";
import apiClient from "@/lib/api-client";

export type FireEmployeePayload = {
  employeeId: string;
  fireDate: string;
  reason: string;
  notes: string;
  dueSalary: number;
  bonus: number;
  totalDues: number;
  status: "terminated" | "resigned";
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onConfirm: (data: FireEmployeePayload) => void;
  isPending: boolean;
}

const STANDARD_WORK_DAYS = 26;
const HOURS_PER_DAY = 8;

type AttendanceEventRecord = {
  employeeId?: string;
  timestamp?: string;
  date?: string;
  type?: string;
};

const toNum = (v: unknown): number => {
  if (v && typeof v === "object" && "$numberDecimal" in (v as object)) {
    return Number((v as { $numberDecimal: string }).$numberDecimal || 0);
  }
  const parsed = Number(v || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toMinutes = (value?: string): number | null => {
  if (!value) return null;
  const normalized = value.slice(0, 5);
  const [hours, minutes] = normalized.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
};

const toLocalDateKey = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toHHmm = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const calcLateMinutes = (checkIn: string, scheduledStart: string, gracePeriod = 5): number => {
  const checkInMinutes = toMinutes(checkIn);
  const scheduledStartMinutes = toMinutes(scheduledStart || "08:00");
  if (checkInMinutes === null || scheduledStartMinutes === null) return 0;
  return Math.max(0, checkInMinutes - scheduledStartMinutes - gracePeriod);
};

const extractArrayResponse = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const objectPayload = payload as {
    data?: unknown;
    records?: unknown;
    items?: unknown;
  };

  if (Array.isArray(objectPayload.data)) return objectPayload.data;
  if (Array.isArray(objectPayload.records)) return objectPayload.records;
  if (Array.isArray(objectPayload.items)) return objectPayload.items;

  return [];
};

const extractPaginationPages = (payload: unknown): number => {
  if (!payload || typeof payload !== "object") return 1;

  const objectPayload = payload as {
    pages?: unknown;
    pagination?: { pages?: unknown };
  };

  return Math.max(
    1,
    toNum(objectPayload.pagination?.pages ?? objectPayload.pages ?? 1),
  );
};

const fetchAllAttendanceRecords = async (
  employeeId: string,
  startDate: string,
  endDate: string,
  signal: AbortSignal,
): Promise<AttendanceEventRecord[]> => {
  const limit = 100;
  const requestPage = async (page?: number) => {
    const response = await apiClient.get("/attendance", {
      params: {
        employeeId,
        startDate,
        endDate,
        page,
        limit,
      },
      signal,
    });

    const payload = response.data;
    return {
      records: extractArrayResponse(payload) as AttendanceEventRecord[],
      pages: extractPaginationPages(payload),
    };
  };

  const firstPage = await requestPage(1);
  let records = firstPage.records;

  for (let page = 2; page <= firstPage.pages; page += 1) {
    const nextPage = await requestPage(page);
    records = records.concat(nextPage.records);
  }

  return records;
};

const summarizeAttendance = (
  records: AttendanceEventRecord[],
  employeeId: string,
  scheduledStart: string,
  scheduledEnd: string,
  gracePeriod = 5,
) => {
  const dailyMap = new Map<string, { ins: string[]; outs: string[] }>();

  records.forEach((record) => {
    if (record.employeeId !== employeeId) return;

    const dateKey = record.date || toLocalDateKey(record.timestamp);
    if (!dateKey) return;

    const current = dailyMap.get(dateKey) || { ins: [], outs: [] };
    const recordType = String(record.type || "").toUpperCase();

    if (recordType === "IN" && record.timestamp) current.ins.push(record.timestamp);
    if (recordType === "OUT" && record.timestamp) current.outs.push(record.timestamp);

    dailyMap.set(dateKey, current);
  });

  let presentDays = 0;
  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let overtimeMinutes = 0;
  let overtimeWeekendDays = 0;

  dailyMap.forEach((daily, dateKey) => {
    if (daily.ins.length === 0) return;

    presentDays += 1;

    const firstIn = [...daily.ins].sort()[0];
    const lastOut = [...daily.outs].sort().at(-1);

    if (firstIn) {
      lateMinutes += calcLateMinutes(toHHmm(firstIn), scheduledStart, gracePeriod);
    }

    if (lastOut) {
      const scheduledEndMinutes = toMinutes(scheduledEnd || "16:00");
      const checkOutMinutes = toMinutes(toHHmm(lastOut));

      if (scheduledEndMinutes !== null && checkOutMinutes !== null) {
        if (checkOutMinutes > scheduledEndMinutes) {
          overtimeMinutes += checkOutMinutes - scheduledEndMinutes;
        } else if (checkOutMinutes < scheduledEndMinutes) {
          earlyLeaveMinutes += scheduledEndMinutes - checkOutMinutes;
        }
      }
    }

    const weekDay = new Date(`${dateKey}T00:00:00`).getDay();
    if (weekDay === 5) {
      overtimeWeekendDays += 1;
    }
  });

  return {
    presentDays,
    lateMinutes,
    earlyLeaveMinutes,
    overtimeMinutes,
    overtimeWeekendDays,
  };
};

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function FireEmployeeModal({ isOpen, onClose, employee, onConfirm, isPending }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [departureType, setDepartureType] = useState<"terminated" | "resigned">("terminated");
  const [fireDate, setFireDate] = useState(getToday());
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [bonus, setBonus] = useState<string>("");
  const [provisionalData, setProvisionalData] = useState<{ earnedSalary: number; bonuses: number; deductions: number; hasData: boolean } | null>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const prevDateRef = useRef<string>("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
      setProvisionalData(null);
      prevDateRef.current = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !employee) return;
    if (fireDate === prevDateRef.current) return;
    prevDateRef.current = fireDate;

    const controller = new AbortController();
    const fetchSettlement = async () => {
      setSalaryLoading(true);
      try {
        const month = fireDate.substring(0, 7);
        const [yearStr, monthStr] = month.split('-');
        const periodStart = `${yearStr}-${monthStr}-01`;
        const periodEnd = fireDate;

        // جلب البيانات اللازمة من نفس مصادر صفحة سجل الدوام مع pagination للحضور
        const [provisionalRes, payrollInputsRes, deductionsRes, salariesRes, attendanceRes, leavesRes] = await Promise.allSettled([
          apiClient.get('/payroll/provisional-settlement', {
            params: { employeeId: employee.employeeId, terminationDate: fireDate },
            signal: controller.signal,
          }),
          apiClient.get('/payroll/inputs', {
            params: { periodStart, periodEnd },
            signal: controller.signal,
          }),
          apiClient.post('/attendance/calculate-deductions', {
            periodStart,
            periodEnd,
            employeeId: employee.employeeId,
          }, { signal: controller.signal }),
          apiClient.get('/salaries', { signal: controller.signal }),
          fetchAllAttendanceRecords(employee.employeeId, periodStart, periodEnd, controller.signal),
          apiClient.get('/leaves', {
            params: { startDate: periodStart, endDate: periodEnd },
            signal: controller.signal,
          }),
        ]);

        // bonuses + deductions من provisional فقط
        const provPayload = provisionalRes.status === 'fulfilled' ? (provisionalRes.value.data || {}) : {};
        console.log('[FireModal] provisional response:', provPayload);
        const bonusesFromAPI = parseFloat(String(provPayload.bonuses ?? 0)) || 0;
        const deductionsFromAPI = parseFloat(String(provPayload.deductions ?? 0)) || 0;

        // payrollInput اليدوي لهذا الموظف
        const inputsRaw = payrollInputsRes.status === 'fulfilled'
          ? (Array.isArray(payrollInputsRes.value.data) ? payrollInputsRes.value.data : (payrollInputsRes.value.data?.data || []))
          : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const manualInput = inputsRaw.find((i: any) => i.employeeId === employee.employeeId);

        // autoDeductions من calculate-deductions
        const deductionsRaw = deductionsRes.status === 'fulfilled'
          ? (deductionsRes.value.data?.data || deductionsRes.value.data || [])
          : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const autoInput = Array.isArray(deductionsRaw) ? deductionsRaw.find((d: any) => d.employeeId === employee.employeeId) : null;

        // salary record
        const salariesRaw = salariesRes.status === 'fulfilled'
          ? (Array.isArray(salariesRes.value.data) ? salariesRes.value.data : (salariesRes.value.data?.data || []))
          : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const salaryRecord = salariesRaw.find((s: any) => s.employeeId === employee.employeeId);

        // grossSalary - نفس calcGrossSalary في TimeTablePage
        let grossSalary = 0;
        if (salaryRecord) {
          grossSalary = toNum(salaryRecord.baseSalary) + toNum(salaryRecord.lumpSumSalary)
            + toNum(salaryRecord.livingAllowance) + toNum(salaryRecord.responsibilityAllowance)
            + toNum(salaryRecord.extraEffortAllowance) + toNum(salaryRecord.productionIncentive)
            + toNum(salaryRecord.transportAllowance);
        }
        if (grossSalary <= 0) {
          grossSalary = toNum((employee as Employee & { baseSalary?: unknown }).baseSalary)
            || toNum(employee.hourlyRate) * HOURS_PER_DAY * STANDARD_WORK_DAYS;
        }

        const attendanceRaw = attendanceRes.status === "fulfilled"
          ? attendanceRes.value
          : [];
        const attendanceSummary = summarizeAttendance(
          attendanceRaw,
          employee.employeeId,
          employee.scheduledStart || "08:00",
          employee.scheduledEnd || "16:00",
          typeof employee.gracePeriodMinutes === "number" ? employee.gracePeriodMinutes : 5,
        );

        // نفس لوجيك TimeTablePage مع fallback محلي من سجلات الحضور نفسها
        const hasManual = !!manualInput;
        const lateMinutes = (hasManual && (manualInput.lateMinutes ?? 0) > 0)
          ? Number(manualInput.lateMinutes)
          : Math.max(
              Number(autoInput?.delayMinutes ?? 0),
              attendanceSummary.lateMinutes,
            );
        const earlyLeaveMinutes = manualInput?.earlyLeaveMinutes ?? Math.max(
          Number(autoInput?.earlyLeaveMinutes ?? 0),
          attendanceSummary.earlyLeaveMinutes,
        );
        const overtimeMinutes = (hasManual && (manualInput.overtimeRegularMinutes ?? 0) > 0)
          ? Number(manualInput.overtimeRegularMinutes)
          : Math.max(
              Number(autoInput?.overtimeMinutes ?? 0),
              attendanceSummary.overtimeMinutes,
            );
        const overtimeWeekendDays = (hasManual && (manualInput.overtimeWeekendDays ?? 0) > 0)
          ? Number(manualInput.overtimeWeekendDays)
          : Math.max(
              Number(autoInput?.overtimeWeekendDays ?? 0),
              attendanceSummary.overtimeWeekendDays,
            );

        const backendPresentDays = autoInput?.presentDays ?? 0;
        const presentDays = Math.max(backendPresentDays, attendanceSummary.presentDays);

        // leaves records
        const leavesRaw = leavesRes.status === 'fulfilled'
          ? (Array.isArray(leavesRes.value.data) ? leavesRes.value.data : (leavesRes.value.data?.data || []))
          : [];
        
        let paidLeaveDaysFromAPI = 0;
        let adminLeaveFromAPI = 0;
        let deathLeaveFromAPI = 0;
        let sickLeaveFromAPI = 0;
        const countedDates = new Set<string>();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        leavesRaw.forEach((leave: any) => {
          if (leave.employeeId !== employee.employeeId) return;
          if (leave.status && leave.status !== "APPROVED") return;

          const leaveStart = leave.startDate?.slice(0, 10);
          const leaveEnd = leave.endDate?.slice(0, 10);
          if (!leaveStart || !leaveEnd) return;

          const effectiveStart = leaveStart < periodStart ? periodStart : leaveStart;
          const effectiveEnd = leaveEnd > periodEnd ? periodEnd : leaveEnd;
          if (effectiveStart > effectiveEnd) return;

          const cur = new Date(effectiveStart);
          const endD = new Date(effectiveEnd);
          while (cur <= endD) {
            const dateStr = cur.toISOString().slice(0, 10);
            if (!countedDates.has(dateStr)) {
              countedDates.add(dateStr);
              if (leave.leaveType === "SICK") {
                sickLeaveFromAPI++;
              } else if (leave.isPaid) {
                paidLeaveDaysFromAPI++;
              }
              if (leave.leaveType === "ADMIN") {
                adminLeaveFromAPI++;
              } else if (leave.leaveType === "DEATH") {
                deathLeaveFromAPI++;
              }
            }
            cur.setDate(cur.getDate() + 1);
          }
        });

        const sickLeaveDays = Math.max(
          hasManual ? (manualInput.sickLeaveDays ?? 0) : 0,
          sickLeaveFromAPI
        );
        const adminLeaveDays = Math.max(
          hasManual ? (manualInput.adminLeaveDays ?? 0) : 0,
          adminLeaveFromAPI
        );
        const deathLeaveDays = Math.max(
          hasManual ? (manualInput.deathLeaveDays ?? 0) : 0,
          deathLeaveFromAPI
        );
        const paidLeaveDaysManual = adminLeaveDays + deathLeaveDays;
        const paidLeaveDays = Math.max(paidLeaveDaysManual, paidLeaveDaysFromAPI);
        const effectivePaidLeaveDays = paidLeaveDays + (sickLeaveDays * 0.5);

        const insuranceAmount = salaryRecord ? toNum(salaryRecord.insuranceAmount) : 0;

        // نفس calcEarnedSalary في TimeTablePage
        let earnedSalary = 0;
        if (grossSalary > 0) {
          const dailyRate = grossSalary / STANDARD_WORK_DAYS;
          const minuteRate = dailyRate / (HOURS_PER_DAY * 60);
          const paidDays = Math.min(presentDays + effectivePaidLeaveDays, STANDARD_WORK_DAYS);
          earnedSalary = Math.max(0,
            dailyRate * paidDays
            - lateMinutes * minuteRate * 1.5
            - earlyLeaveMinutes * minuteRate
            + overtimeMinutes * minuteRate * 1.5
            + dailyRate * overtimeWeekendDays * 1.5
            - insuranceAmount
          );
        }

        setProvisionalData({
          earnedSalary,
          bonuses: bonusesFromAPI,
          deductions: deductionsFromAPI,
          hasData: grossSalary > 0,
        });

      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'CanceledError' || (err as { name?: string })?.name === 'AbortError') return;
        console.error('[FireModal] fetch error:', err);
        setProvisionalData(null);
      } finally {
        setSalaryLoading(false);
      }
    };
    fetchSettlement();
    return () => controller.abort();
  }, [isOpen, employee, fireDate]);

  if (!isOpen || typeof document === "undefined" || !employee) return null;

  const dueSalary = Math.round((provisionalData?.earnedSalary ?? 0) / 1000) * 1000;
  const apiDeductions = Math.round(provisionalData?.deductions ?? 0);
  const apiBonuses = Math.round(provisionalData?.bonuses ?? 0);
  const totalDues = Math.round(dueSalary + apiBonuses + (Number(bonus) || 0) - apiDeductions);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("الرجاء كتابة سبب الإقالة / الاستقالة");
      return;
    }
    setStep(2);
  };

  const handleConfirm = () => {
    onConfirm({
      employeeId: employee.employeeId,
      fireDate,
      reason,
      notes,
      dueSalary,
      bonus: Number(bonus) || 0,
      totalDues,
      status: departureType
    });
  };

  const isResigned = departureType === "resigned";
  const themeColor = isResigned ? "amber" : "rose";

  return createPortal(
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-300" dir="rtl">
      <div className={`bg-[#101720] rounded-4xl sm:rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.5)] w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-${themeColor}-500/20 outline-dashed outline-1 outline-${themeColor}-500/30 -outline-offset-8`}>
        
        <div className="p-4 sm:p-5 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`bg-${themeColor}-500/10 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-${themeColor}-500/20 shadow-[0_0_20px_rgba(0,0,0,0.2)]`}>
               {isResigned ? <LogOut className={`text-${themeColor}-500`} size={24} /> : <UserX className="text-rose-500" size={24} />}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                {isResigned ? "تسجيل استقالة وتصفية حساب" : "إقالة موظف وتصفية حساب"}
              </h2>
              <p className={`text-xs sm:text-sm font-bold text-${themeColor}-400 mt-1`}>{employee.name} - {employee.employeeId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white bg-[#263544] p-2 rounded-xl transition-all active:scale-90">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto relative flex-1 custom-scrollbar">
          
          <form onSubmit={handleNext} className={`grid grid-cols-1 gap-4 transition-all duration-500 ${step === 1 ? 'block animate-in slide-in-from-right-10' : 'hidden'}`}>
            
            <div>
              <label className="block text-[11px] sm:text-xs font-black text-[#E7C873] mb-1.5 uppercase">نوع إنهاء الخدمة</label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <button type="button" onClick={() => setDepartureType("terminated")} className={`flex-1 py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2 text-sm ${!isResigned ? "bg-rose-500/20 text-rose-500 border-2 border-rose-500" : "bg-[#1a2530] text-slate-500 border-2 border-transparent hover:bg-[#263544]"}`}>
                  <UserX size={16}/> إقالة (قرار إدارة)
                </button>
                <button type="button" onClick={() => setDepartureType("resigned")} className={`flex-1 py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2 text-sm ${isResigned ? "bg-amber-500/20 text-amber-500 border-2 border-amber-500" : "bg-[#1a2530] text-slate-500 border-2 border-transparent hover:bg-[#263544]"}`}>
                  <LogOut size={16}/> استقالة (طوعية)
                </button>
              </div>
            </div>

            <div className={`bg-${themeColor}-500/5 border border-${themeColor}-500/10 p-3 rounded-xl flex items-start gap-3`}>
              <AlertOctagon size={18} className={`text-${themeColor}-500 shrink-0 mt-0.5`} />
              <p className={`text-[11px] sm:text-xs text-${themeColor}-200 leading-relaxed font-bold`}>
                أنت على وشك {isResigned ? "تسجيل استقالة" : "إنهاء خدمة"} الموظف المختار. يرجى إدخال التفاصيل بدقة ليتم حفظها في الأرشيف وحساب المستحقات النهائية.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-black text-[#E7C873] mb-1.5 uppercase">تاريخ ترك العمل</label>
                <div className="relative group">
                  <input type="date" required className="w-full p-3 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#E7C873]/30 focus:border-[#E7C873] outline-none text-white font-mono font-bold pr-10 text-sm scheme:dark" value={fireDate} onChange={(e) => setFireDate(e.target.value)} />
                  <Calendar className="absolute right-3 top-3 text-slate-500" size={18} />
                </div>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-black text-[#E7C873] mb-1.5 uppercase">السبب</label>
                <div className="relative group">
                  <input type="text" required placeholder={isResigned ? "مثال: ظروف شخصية، سفر..." : "مثال: انتهاء العقد، غياب متكرر..."} className="w-full p-3 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#E7C873]/30 focus:border-[#E7C873] outline-none text-white font-bold pr-10 text-sm placeholder:text-slate-600" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <AlertTriangle className="absolute right-3 top-3 text-slate-500" size={18} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-black text-[#E7C873] mb-1.5 uppercase">ملاحظات إضافية (اختياري)</label>
              <div className="relative group">
                <textarea rows={2} placeholder="أي تفاصيل أخرى..." className="w-full p-3 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#E7C873]/30 focus:border-[#E7C873] outline-none text-white font-bold pr-10 text-sm placeholder:text-slate-600 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <FileText className="absolute right-3 top-3 text-slate-500" size={18} />
              </div>
            </div>
          </form>

          <div className={`flex flex-col gap-4 transition-all duration-500 ${step === 2 ? 'block animate-in slide-in-from-left-10' : 'hidden'}`}>
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Calculator className="text-[#E7C873]" size={20} />
              <h3 className="text-base sm:text-lg font-black text-white">تصفية المستحقات المالية</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-[#1a2530] p-3 rounded-xl border border-[#263544] sm:col-span-2">
                <p className="text-[11px] sm:text-xs font-bold text-[#E7C873] mb-1">الراتب المستحق</p>
                {salaryLoading ? (
                  <p className="text-lg sm:text-xl font-black text-slate-400">جاري التحميل...</p>
                ) : provisionalData !== null ? (
                  <>
                    <p className="text-lg sm:text-xl font-mono font-black text-[#E7C873]">{dueSalary.toLocaleString()} <span className="text-[10px] sm:text-xs text-slate-500">ل.س</span></p>
                    <p className="text-[9px] text-emerald-500 font-bold mt-0.5">من التسوية المؤقتة ✓</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg sm:text-xl font-mono font-black text-amber-400">0 <span className="text-[10px] sm:text-xs text-slate-500">ل.س</span></p>
                    <p className="text-[9px] text-amber-500 font-bold mt-0.5">لا يوجد بيانات</p>
                  </>
                )}
              </div>

              {provisionalData && apiBonuses > 0 && (
                <div className="bg-[#1a2530] p-3 rounded-xl border border-emerald-500/20">
                  <p className="text-[11px] font-bold text-emerald-400 mb-1">مكافآت</p>
                  <p className="text-base font-mono font-black text-emerald-400">+{apiBonuses.toLocaleString()} <span className="text-[10px] text-slate-500">ل.س</span></p>
                </div>
              )}
            </div>

            {provisionalData && apiDeductions > 0 && (
              <div className="mt-3 sm:mt-4">
                <div className="bg-[#1a2530] p-3 rounded-xl border border-rose-500/20">
                  <p className="text-[11px] font-bold text-rose-400 mb-1">خصومات</p>
                  <p className="text-base font-mono font-black text-rose-400">-{apiDeductions.toLocaleString()} <span className="text-[10px] text-slate-500">ل.س</span></p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] sm:text-xs font-black text-[#E7C873] mb-1.5 uppercase">مكافأة أو خصم إضافي</label>
              <div className="relative group">
                <input type="number" placeholder="0" className="w-full p-3 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#E7C873]/30 focus:border-[#E7C873] outline-none text-white font-mono text-base font-bold pr-10 placeholder:text-slate-600" value={bonus} onChange={(e) => setBonus(e.target.value)} />
                <Coins className="absolute right-3 top-3 text-slate-500" size={20} />
              </div>
            </div>

            <div className={`bg-${themeColor}-500/10 p-4 sm:p-5 rounded-xl border border-${themeColor}-500/30 text-center shadow-inner`}>
              <p className={`text-[11px] sm:text-xs font-black text-${themeColor}-300 mb-1 uppercase tracking-widest`}>إجمالي المستحقات النهائية للصرف</p>
              <p className={`text-2xl sm:text-3xl font-mono font-black text-${themeColor}-500`}>{totalDues.toLocaleString()} <span className={`text-xs sm:text-sm font-bold text-${themeColor}-500/50`}>ل.س</span></p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-[#1a2530]/80 border-t border-white/5 flex justify-between shrink-0 relative z-10">
          <button type="button" onClick={step === 1 ? onClose : () => setStep(1)} className="px-4 sm:px-6 py-2.5 rounded-xl text-sm sm:text-base font-bold text-slate-400 bg-[#263544] hover:text-white transition-all active:scale-95 flex items-center gap-2">
            {step === 2 && <ChevronRight size={16}/>} {step === 1 ? "إلغاء" : "رجوع"}
          </button>

          {step === 1 ? (
            <button type="submit" onClick={handleNext} className="bg-[#E7C873] text-[#101720] px-6 sm:px-8 py-2.5 rounded-xl text-sm sm:text-base font-black flex items-center gap-2 hover:bg-[#d0b468] active:scale-95 transition-all">
               المستحقات <ChevronLeft size={16}/>
            </button>
          ) : (
            <button disabled={isPending} onClick={handleConfirm} className={`bg-${themeColor}-600 text-white px-6 sm:px-8 py-2.5 rounded-xl text-sm sm:text-base font-black flex items-center gap-2 hover:bg-${themeColor}-700 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,0,0,0.4)] disabled:opacity-50`}>
              {isResigned ? <LogOut size={18}/> : <UserMinus size={18}/>}
              {isResigned ? "تأكيد" : "تأكيد"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
