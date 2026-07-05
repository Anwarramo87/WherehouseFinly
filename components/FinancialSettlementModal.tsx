"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, DollarSign, Calendar, MessageSquare, TrendingUp, TrendingDown, Coins, Info, User } from "lucide-react";
import apiClient from "@/lib/api-client";
import type { Employee } from "@/types/employee";
import type { PayrollInput } from "@/types/payroll";
import type { AttendanceDeductionBreakdown } from "@/types/attendance-deduction";
import type { Salary } from "@/types/salary";
import type { Leave } from "../types/leave";

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

export interface SettlementData {
  settlementDate: string;
  finalSalaryAmount: number;
  deductions: number;
  bonuses: number;
  notes?: string;
}

interface Props {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: SettlementData) => void;
  isPending: boolean;
  employeeId?: string;
  initialSettlementDate?: string;
}

const defaultFormState: SettlementData = {
  settlementDate: getToday(),
  finalSalaryAmount: 0,
  deductions: 0,
  bonuses: 0,
  notes: '',
};

const parseArabicNumber = (value: string): number => {
  const arabicToWestern: { [key: string]: string } = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  
  const westernValue = value.replace(/[٠-٩]/g, (d) => arabicToWestern[d] || d);
  const parsed = parseFloat(westernValue);
  return isNaN(parsed) ? 0 : parsed;
};

export default function FinancialSettlementModal({ 
  employee, 
  isOpen, 
  onClose, 
  onConfirm, 
  isPending, 
  employeeId,
  initialSettlementDate,
}: Props) {
const isMounted = typeof document !== "undefined";
  const [formData, setFormData] = useState<SettlementData>(() => ({
    ...defaultFormState,
    settlementDate: initialSettlementDate || defaultFormState.settlementDate,
  }));
  const [isLoadingSalary, setIsLoadingSalary] = useState(false);
  const [isLoadingExtras, setIsLoadingExtras] = useState(false);
  const [provisionalData, setProvisionalData] = useState<{ earnedSalary: number; bonuses: number; deductions: number; hasData: boolean } | null>(null);
  const [finalSalaryError, setFinalSalaryError] = useState("");
  const [deductionsError, setDeductionsError] = useState("");
  const [bonusesError, setBonusesError] = useState("");
  const prevDateRef = useRef<string>("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      setProvisionalData(null);
      prevDateRef.current = "";
    };
  }, [isOpen]);

// Reset error state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setFinalSalaryError("");
        setDeductionsError("");
        setBonusesError("");
      }, 0);
    }
  }, [isOpen]);

  // Fetch provisional settlement from API (re-fetches on date change)
  useEffect(() => {
    const currentEmployeeId = employee?.employeeId || employeeId;

    if (!isOpen || !currentEmployeeId) return;
    if (formData.settlementDate === prevDateRef.current) return;
    prevDateRef.current = formData.settlementDate;

    const controller = new AbortController();
    const fetchSettlement = async () => {
      setIsLoadingSalary(true);
      setIsLoadingExtras(true);
      try {
        const month = formData.settlementDate.substring(0, 7);
        const [yearStr, monthStr] = month.split('-');
        const periodStart = `${yearStr}-${monthStr}-01`;
        const periodEnd = formData.settlementDate;

        const [provisionalRes, payrollInputsRes, deductionsRes, salariesRes, attendanceRes, leavesRes] = await Promise.allSettled([
          apiClient.get('/payroll/provisional-settlement', {
            params: { employeeId: currentEmployeeId, terminationDate: formData.settlementDate },
            signal: controller.signal,
          }),
          apiClient.get('/payroll/inputs', {
            params: { periodStart, periodEnd },
            signal: controller.signal,
          }),
          apiClient.post('/attendance/calculate-deductions', {
            periodStart,
            periodEnd,
            employeeId: currentEmployeeId,
          }, { signal: controller.signal }),
          apiClient.get('/salaries', { signal: controller.signal }),
          fetchAllAttendanceRecords(currentEmployeeId, periodStart, periodEnd, controller.signal),
          apiClient.get('/leaves', {
            params: { startDate: periodStart, endDate: periodEnd },
            signal: controller.signal,
          }),
        ]);

        const provPayload = provisionalRes.status === 'fulfilled' ? (provisionalRes.value.data || {}) : {};
        const bonusesFromAPI = parseFloat(String(provPayload.bonuses ?? 0)) || 0;
        const deductionsFromAPI = parseFloat(String(provPayload.deductions ?? 0)) || 0;

        const inputsRaw = payrollInputsRes.status === 'fulfilled'
          ? (Array.isArray(payrollInputsRes.value.data) ? payrollInputsRes.value.data : (payrollInputsRes.value.data?.data || []))
          : [];
        const manualInput = inputsRaw.find((i: PayrollInput) => i.employeeId === currentEmployeeId);

        const deductionsRaw = deductionsRes.status === 'fulfilled'
          ? (deductionsRes.value.data?.data || deductionsRes.value.data || [])
          : [];
        const autoInput = Array.isArray(deductionsRaw) ? deductionsRaw.find((d: AttendanceDeductionBreakdown) => d.employeeId === currentEmployeeId) : null;

        const salariesRaw = salariesRes.status === 'fulfilled'
          ? (Array.isArray(salariesRes.value.data) ? salariesRes.value.data : (salariesRes.value.data?.data || []))
          : [];
        const salaryRecord = salariesRaw.find((s: Salary) => s.employeeId === currentEmployeeId);

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

        const attendanceRaw = attendanceRes.status === 'fulfilled'
          ? attendanceRes.value
          : [];
        const attendanceSummary = summarizeAttendance(
          attendanceRaw,
          currentEmployeeId,
          employee.scheduledStart || '08:00',
          employee.scheduledEnd || '16:00',
          typeof employee.gracePeriodMinutes === 'number' ? employee.gracePeriodMinutes : 5,
        );

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

        const leavesRaw = leavesRes.status === 'fulfilled'
          ? (Array.isArray(leavesRes.value.data) ? leavesRes.value.data : (leavesRes.value.data?.data || []))
          : [];
        
        let paidLeaveDaysFromAPI = 0;
        let adminLeaveFromAPI = 0;
        let deathLeaveFromAPI = 0;
        let sickLeaveFromAPI = 0;
        const countedDates = new Set<string>();

        leavesRaw.forEach((leave: Leave) => {
          if (leave.employeeId !== currentEmployeeId) return;
          if (leave.status && leave.status !== 'APPROVED') return;

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
              if (leave.leaveType === 'SICK') {
                sickLeaveFromAPI++;
              } else if (leave.isPaid) {
                paidLeaveDaysFromAPI++;
              }
              if (leave.leaveType === 'ADMIN') {
                adminLeaveFromAPI++;
              } else if (leave.leaveType === 'DEATH') {
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

        // Update formData with the newly calculated provisional data
        setFormData(prev => ({
          ...prev,
          finalSalaryAmount: earnedSalary,
          bonuses: bonusesFromAPI,
          deductions: deductionsFromAPI,
        }));

      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'CanceledError' || (err as { name?: string })?.name === 'AbortError') return;
        console.error('[FinancialSettlementModal] fetch error:', err);
        setProvisionalData(null);
      } finally {
        setIsLoadingSalary(false);
        setIsLoadingExtras(false);
      }
    };
    fetchSettlement();
    return () => controller.abort();
  }, [isOpen, employee, employeeId, formData.settlementDate]);

  if (!isOpen || !isMounted) return null;

  // Calculate total settlement
  const dueSalary = Math.round((provisionalData?.earnedSalary ?? 0) / 1000) * 1000;
  const apiDeductions = Math.round(provisionalData?.deductions ?? 0);
  const apiBonuses = Math.round(provisionalData?.bonuses ?? 0);
  const totalSettlement = Math.round(dueSalary + apiBonuses - apiDeductions);
  const isNegativeSettlement = totalSettlement < 0;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.finalSalaryAmount <= 0) {
      setFinalSalaryError("يجب أن يكون الراتب المقبوض أكبر من صفر");
      return;
    }
    if (formData.deductions < 0) {
      setDeductionsError("لا يمكن أن تكون الخصومات سالبة");
      return;
    }
    if (formData.bonuses < 0) {
      setBonusesError("لا يمكن أن تكون المكافآت سالبة");
      return;
    }
    onConfirm(formData);
  };

  const handleFinalSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseArabicNumber(e.target.value);
    setFormData({ ...formData, finalSalaryAmount: value });
    if (finalSalaryError && value > 0) setFinalSalaryError("");
  };

  const handleDeductionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseArabicNumber(e.target.value);
    setFormData({ ...formData, deductions: value });
    if (deductionsError && value >= 0) setDeductionsError("");
  };

  const handleBonusesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseArabicNumber(e.target.value);
    setFormData({ ...formData, bonuses: value });
    if (bonusesError && value >= 0) setBonusesError("");
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-999999 p-3 sm:p-6 transition-all duration-200" 
      dir="rtl"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#101720] rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-white/6">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/6 flex justify-between items-center bg-[#1a2530]/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20 shrink-0">
              <DollarSign className="text-blue-400" size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white truncate">التصفية المالية</h2>
              <p className="text-xs sm:text-sm text-slate-400 font-semibold truncate">
                {employee.name} <span className="text-slate-500">({employee.employeeId})</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all active:scale-95 shrink-0 mr-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — single scrollable area */}
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-4">
          <form id="settlementForm" onSubmit={handleFormSubmit} className="space-y-4">

            {/* Employee quick info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-semibold px-1">
              <span className="flex items-center gap-1"><User size={13} className="text-slate-500" />{employee.department || '—'}</span>
              <span className="text-slate-600">|</span>
              <span>{employee.jobTitle || employee.profession || '—'}</span>
            </div>

            {/* Settlement Date */}
            <div>
              <label htmlFor="settlementDate" className="block text-xs font-bold text-slate-400 mb-1.5">
                تاريخ التصفية
              </label>
              <div className="relative">
                <input
                  id="settlementDate"
                  type="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 bg-[#1a2530] border border-white/6 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none transition-all text-white font-mono text-sm font-bold pr-10 scheme-dark"
                  value={formData.settlementDate}
                  onChange={(e) => setFormData({ ...formData, settlementDate: e.target.value })}
                />
                <Calendar className="absolute right-3 top-2.5 text-slate-500" size={18} />
              </div>
            </div>

            {/* Financial Fields */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Coins size={15} className="text-blue-400" />
                <span className="text-xs font-bold text-slate-300">البيانات المالية</span>
              </div>

              {/* Earned Salary */}
              <div>
                <label htmlFor="finalSalary" className="flex items-center justify-between text-xs font-bold text-blue-400 mb-1.5">
                  <span>الراتب المستحق</span>
                  {isLoadingSalary && <Loader2 className="animate-spin text-slate-500" size={13} />}
                </label>
                <div className="relative">
                  <input
                    id="finalSalary"
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    className={`w-full px-3 py-2.5 bg-[#0d1319] border rounded-xl focus:ring-2 outline-none transition-all font-mono text-base font-bold pr-10 placeholder:text-slate-600 ${
                      finalSalaryError 
                        ? 'border-rose-500/60 focus:ring-rose-500/30 text-rose-400' 
                        : 'border-white/6 focus:ring-blue-500/30 focus:border-blue-500/50 text-blue-400'
                    }`}
                    value={isLoadingSalary ? '' : (dueSalary || '')}
                    placeholder={isLoadingSalary ? '...' : (dueSalary === 0 ? '0.00' : String(dueSalary))}
                    onChange={handleFinalSalaryChange}
                  />
                  <DollarSign className="absolute right-3 top-2.5 text-slate-600" size={18} />
                </div>
                {finalSalaryError && <p className="text-[11px] text-rose-400 font-bold mt-1">{finalSalaryError}</p>}
              </div>

              {/* Bonuses + Deductions side by side on sm+ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Bonuses */}
                <div>
                  <label htmlFor="bonuses" className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-1.5">
                    <span className="flex items-center gap-1"><TrendingUp size={13} />المكافآت</span>
                    {isLoadingExtras && <Loader2 className="animate-spin text-slate-500" size={13} />}
                  </label>
                  <input
                    id="bonuses"
                    type="number"
                    min={0}
                    step="0.01"
                    className={`w-full px-3 py-2.5 bg-[#0d1319] border rounded-xl focus:ring-2 outline-none transition-all font-mono text-base font-bold placeholder:text-slate-600 ${
                      bonusesError 
                        ? 'border-rose-500/60 focus:ring-rose-500/30 text-rose-400' 
                        : 'border-white/6 focus:ring-emerald-500/30 focus:border-emerald-500/50 text-emerald-400'
                    }`}
                    value={isLoadingExtras ? '' : (apiBonuses || '')}
                    placeholder={isLoadingExtras ? '...' : (apiBonuses === 0 ? '0.00' : String(apiBonuses))}
                    onChange={handleBonusesChange}
                  />
                  {bonusesError && <p className="text-[11px] text-rose-400 font-bold mt-1">{bonusesError}</p>}
                </div>

                {/* Deductions */}
                <div>
                  <label htmlFor="deductions" className="flex items-center justify-between text-xs font-bold text-rose-400 mb-1.5">
                    <span className="flex items-center gap-1"><TrendingDown size={13} />الخصومات</span>
                    {isLoadingExtras && <Loader2 className="animate-spin text-slate-500" size={13} />}
                  </label>
                  <input
                    id="deductions"
                    type="number"
                    min={0}
                    step="0.01"
                    className={`w-full px-3 py-2.5 bg-[#0d1319] border rounded-xl focus:ring-2 outline-none transition-all font-mono text-base font-bold placeholder:text-slate-600 ${
                      deductionsError 
                        ? 'border-rose-500/60 focus:ring-rose-500/30 text-rose-400' 
                        : 'border-white/6 focus:ring-rose-500/30 focus:border-rose-500/50 text-rose-400'
                    }`}
                    value={isLoadingExtras ? '' : (apiDeductions || '')}
                    placeholder={isLoadingExtras ? '...' : (apiDeductions === 0 ? '0.00' : String(apiDeductions))}
                    onChange={handleDeductionsChange}
                  />
                  {deductionsError && <p className="text-[11px] text-rose-400 font-bold mt-1">{deductionsError}</p>}
                </div>
              </div>
            </div>

            {/* Total — single prominent display */}
            <div className="bg-linear-to-l from-emerald-500/[0.07] to-transparent border border-emerald-500/15 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-300">الصافي المستحق</span>
                {(isLoadingSalary || isLoadingExtras) ? (
                  <span className="inline-flex items-center gap-1.5 text-slate-500 text-sm"><Loader2 className="animate-spin" size={15} />حساب...</span>
                ) : (
                  <span className={`font-mono font-black text-xl sm:text-2xl ${
                    isNegativeSettlement ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {totalSettlement.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    <span className="text-xs font-bold text-slate-500 mr-1">ل.س</span>
                  </span>
                )}
              </div>
              {isNegativeSettlement && (
                <p className="text-[11px] text-rose-400 font-bold mt-1.5 flex items-center gap-1">
                  <Info size={13} />الموظف مدين للشركة
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">ملاحظات (اختياري)</label>
              <div className="relative">
                <textarea
                  rows={2}
                  maxLength={1000}
                  placeholder="ملاحظات حول التصفية..."
                  className="w-full px-3 py-2.5 bg-[#1a2530] border border-white/6 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none transition-all text-white text-sm font-semibold pr-10 placeholder:text-slate-600 resize-none"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
                <MessageSquare className="absolute right-3 top-2.5 text-slate-600" size={16} />
              </div>
              <p className="text-[10px] text-slate-600 font-semibold mt-1 text-left">
                {formData.notes?.length || 0}/1000
              </p>
            </div>

          </form>
        </div>

        {/* Footer — compact action bar */}
        <div className="px-4 sm:px-6 py-3 bg-[#1a2530]/60 border-t border-white/6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 sm:flex-none py-2.5 rounded-xl font-bold text-sm text-slate-300 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              form="settlementForm"
              disabled={isPending || isLoadingSalary || isLoadingExtras}
              className="flex-2 sm:flex-none sm:px-8 py-2.5 rounded-xl font-black text-sm bg-blue-500 text-white flex items-center justify-center gap-2 hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-blue-500/20"
            >
              {(isLoadingSalary || isLoadingExtras) ? (
                <><Loader2 className="animate-spin" size={18} />جاري الجلب...</>
              ) : isPending ? (
                <><Loader2 className="animate-spin" size={18} />جاري المعالجة...</>
              ) : (
                <><DollarSign size={18} />تأكيد التصفية</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}