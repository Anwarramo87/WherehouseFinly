"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  UserMinus,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Calendar,
  FileText,
  Calculator,
  Coins,
  AlertOctagon,
  UserX,
  LogOut,
} from "lucide-react";
import type { Employee } from "@/types/employee";
import apiClient from "@/lib/api-client";
import useDepartments from "@/hooks/useDepartments";

export type FireEmployeePayload = {
  employeeId: string;
  fireDate: string;
  reason: string;
  notes: string;
  attendanceBasedSalary: number; // Mapped from backend
  totalBonuses: number; // Mapped from backend
  totalDeductions: number; // Mapped from backend
  netPayRounded: number; // Mapped from backend
  status: "terminated" | "resigned";
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onConfirm: (data: FireEmployeePayload) => void;
  isPending: boolean;
};

type ProvisionalSettlementData = {
  attendanceBasedSalary: number;
  totalBonuses: number;
  totalDeductions: number;
  netPayRounded: number;
  hasData: boolean;
};

const toNum = (v: unknown): number => {
  if (v && typeof v === "object" && "$numberDecimal" in (v as object)) {
    return Number((v as { $numberDecimal: string }).$numberDecimal || 0);
  }
  const parsed = Number(v || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};


export default function FireEmployeeModal({
  isOpen,
  onClose,
  employee,
  onConfirm,
  isPending,
}: Props) {
  const { data: departmentsData } = useDepartments();
  const departments = departmentsData?.departments || [];
  const managedDepartment = employee
    ? departments.find((dept) => dept.manager === employee.employeeId)
    : null;

  const [step, setStep] = useState<1 | 2>(1);
  const [departureType, setDepartureType] = useState<"terminated" | "resigned">("terminated");
  const [fireDate, setFireDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [bonus, setBonus] = useState<string>("");
  const [provisionalData, setProvisionalData] = useState<ProvisionalSettlementData | null>(null);
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
        // const month = fireDate.substring(0, 7);
        // const [yearStr, monthStr] = month.split('-');
        // const periodStart = `${yearStr}-${monthStr}-01`;
        // const periodEnd = fireDate;

        // جلب البيانات اللازمة من نفس مصادر صفحة سجل الدوام مع pagination للحضور
        const [provisionalRes] = await Promise.allSettled([
          apiClient.get('/payroll/provisional-settlement', {
            params: { employeeId: employee.employeeId, terminationDate: fireDate },
            signal: controller.signal,
          }),
        ]);

        const provPayload = provisionalRes.status === 'fulfilled' ? (provisionalRes.value.data || {}) : {};
        console.log('[FireModal] provisional response:', provPayload);
        const attendanceBasedSalary = toNum(provPayload.earnedSalary ?? provPayload.attendanceBasedSalary);
        const totalBonuses = toNum(provPayload.bonuses ?? provPayload.totalBonuses);
        const totalDeductions = toNum(provPayload.deductions ?? provPayload.totalDeductions);
        const netPayRounded = toNum(provPayload.provisionalTotal ?? provPayload.netPayRounded);

        setProvisionalData({
          attendanceBasedSalary,
          totalBonuses,
          totalDeductions,
          netPayRounded,
          hasData: netPayRounded > 0, // Use netPayRounded for data validity check
        });
      } catch (err: unknown) {
        if (
          (err as { name?: string })?.name === "CanceledError" ||
          (err as { name?: string })?.name === "AbortError"
        )
          return;
        console.error("[FireModal] fetch error:", err);
        setProvisionalData(null);
      } finally {
        setSalaryLoading(false);
      }
    };
    fetchSettlement();
    return () => controller.abort();
  }, [isOpen, employee, fireDate]);

  if (!isOpen || typeof document === "undefined" || !employee) return null;

  const dueSalary = provisionalData?.attendanceBasedSalary ?? 0;
  const apiDeductions = provisionalData?.totalDeductions ?? 0;
  const apiBonuses = provisionalData?.totalBonuses ?? 0;
  const totalDues = provisionalData?.netPayRounded ?? 0; // Directly use netPayRounded as per architectural constraint

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
      attendanceBasedSalary: provisionalData?.attendanceBasedSalary ?? 0,
      totalBonuses: provisionalData?.totalBonuses ?? 0,
      totalDeductions: provisionalData?.totalDeductions ?? 0,
      netPayRounded: provisionalData?.netPayRounded ?? 0,
      status: departureType
    });
  };

  const isResigned = departureType === "resigned";
  const themeColor = isResigned ? "amber" : "rose";

  return createPortal(
    <div
      className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-300"
      dir="rtl"
    >
      <div
        className={`bg-[#101720] rounded-4xl sm:rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.5)] w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-${themeColor}-500/20 outline-dashed outline-1 outline-${themeColor}-500/30 -outline-offset-8`}
      >
        <div className="p-4 sm:p-5 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className={`bg-${themeColor}-500/10 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-${themeColor}-500/20 shadow-[0_0_20px_rgba(0,0,0,0.2)]`}
            >
              {isResigned ? (
                <LogOut className={`text-${themeColor}-500`} size={24} />
              ) : (
                <UserX className="text-rose-500" size={24} />
              )}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                {isResigned ? "تسجيل استقالة وتصفية حساب" : "إقالة موظف وتصفية حساب"}
              </h2>
              <p className={`text-xs sm:text-sm font-bold text-${themeColor}-400 mt-1`}>
                {employee.name} - {employee.employeeId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white bg-[#263544] p-2 rounded-xl transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto relative flex-1 custom-scrollbar">
          <form
            onSubmit={handleNext}
            className={`grid grid-cols-1 gap-4 transition-all duration-500 ${step === 1 ? "block animate-in slide-in-from-right-10" : "hidden"}`}
          >
            <div>
              <label className="block text-[11px] sm:text-xs font-black text-[#E7C873] mb-1.5 uppercase">
                نوع إنهاء الخدمة
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setDepartureType("terminated")}
                  className={`flex-1 py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2 text-sm ${!isResigned ? "bg-rose-500/20 text-rose-500 border-2 border-rose-500" : "bg-[#1a2530] text-slate-500 border-2 border-transparent hover:bg-[#263544]"}`}
                >
                  <UserX size={16} /> إقالة (قرار إدارة)
                </button>
                <button
                  type="button"
                  onClick={() => setDepartureType("resigned")}
                  className={`flex-1 py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2 text-sm ${isResigned ? "bg-amber-500/20 text-amber-500 border-2 border-amber-500" : "bg-[#1a2530] text-slate-500 border-2 border-transparent hover:bg-[#263544]"}`}
                >
                  <LogOut size={16} /> استقالة (طوعية)
                </button>
              </div>
            </div>

            <div
              className={`bg-${themeColor}-500/5 border border-${themeColor}-500/10 p-3 rounded-xl flex items-start gap-3`}
            >
              <AlertOctagon size={18} className={`text-${themeColor}-500 shrink-0 mt-0.5`} />
              <p
                className={`text-[11px] sm:text-xs text-${themeColor}-200 leading-relaxed font-bold`}
              >
                أنت على وشك {isResigned ? "تسجيل استقالة" : "إنهاء خدمة"} الموظف المختار. يرجى إدخال
                التفاصيل بدقة ليتم حفظها في الأرشيف وحساب المستحقات النهائية.
              </p>
            </div>

            {managedDepartment && (
              <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-[11px] sm:text-xl text-red-200 leading-relaxed font-bold">
                  لا يمكن {isResigned ? "تسجيل استقالة" : "إنهاء خدمة"} هذا الموظف لأنه المشرف على
                  قسم <span className="font-black">{managedDepartment.name}</span>. يرجى تغيير
                  المشرف للقسم أولاً.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-black text-[#E7C873] mb-1.5 uppercase">
                  تاريخ ترك العمل
                </label>
                <div className="relative group">
                  <input
                    type="date"
                    required
                    className="w-full p-3 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#E7C873]/30 focus:border-[#E7C873] outline-none text-white font-mono font-bold pr-10 text-sm scheme:dark"
                    value={fireDate}
                    onChange={(e) => setFireDate(e.target.value)}
                  />
                  <Calendar className="absolute right-3 top-3 text-slate-500" size={18} />
                </div>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-black text-[#E7C873] mb-1.5 uppercase">
                  السبب
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    required
                    placeholder={
                      isResigned ? "مثال: ظروف شخصية، سفر..." : "مثال: انتهاء العقد، غياب متكرر..."
                    }
                    className="w-full p-3 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#E7C873]/30 focus:border-[#E7C873] outline-none text-white font-bold pr-10 text-sm placeholder:text-slate-600"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <AlertTriangle className="absolute right-3 top-3 text-slate-500" size={18} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-black text-[#E7C873] mb-1.5 uppercase">
                ملاحظات إضافية (اختياري)
              </label>
              <div className="relative group">
                <textarea
                  rows={2}
                  placeholder="أي تفاصيل أخرى..."
                  className="w-full p-3 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#E7C873]/30 focus:border-[#E7C873] outline-none text-white font-bold pr-10 text-sm placeholder:text-slate-600 resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <FileText className="absolute right-3 top-3 text-slate-500" size={18} />
              </div>
            </div>
          </form>

          <div
            className={`flex flex-col gap-4 transition-all duration-500 ${step === 2 ? "block animate-in slide-in-from-left-10" : "hidden"}`}
          >
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Calculator className="text-[#E7C873]" size={20} />
              <h3 className="text-base sm:text-lg font-black text-white">
                تصفية المستحقات المالية
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-[#1a2530] p-3 rounded-xl border border-[#263544] sm:col-span-2">
                <p className="text-[11px] sm:text-xs font-bold text-[#E7C873] mb-1">
                  الراتب المستحق
                </p>
                {salaryLoading ? (
                  <p className="text-lg sm:text-xl font-black text-slate-400">جاري التحميل...</p>
                ) : provisionalData !== null ? (
                  <>
                    <p className="text-lg sm:text-xl font-mono font-black text-[#E7C873]">
                      {dueSalary.toLocaleString()}{" "}
                      <span className="text-[10px] sm:text-xs text-slate-500">ل.س</span>
                    </p>
                    <p className="text-[9px] text-emerald-500 font-bold mt-0.5">
                      من التسوية المؤقتة ✓
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg sm:text-xl font-mono font-black text-amber-400">
                      0 <span className="text-[10px] sm:text-xs text-slate-500">ل.س</span>
                    </p>
                    <p className="text-[9px] text-amber-500 font-bold mt-0.5">لا يوجد بيانات</p>
                  </>
                )}
              </div>

              {provisionalData && apiBonuses > 0 && (
                <div className="bg-[#1a2530] p-3 rounded-xl border border-emerald-500/20">
                  <p className="text-[11px] font-bold text-emerald-400 mb-1">مكافآت</p>
                  <p className="text-base font-mono font-black text-emerald-400">
                    +{apiBonuses.toLocaleString()}{" "}
                    <span className="text-[10px] text-slate-500">ل.س</span>
                  </p>
                </div>
              )}
            </div>

            {provisionalData && apiDeductions > 0 && (
              <div className="mt-3 sm:mt-4">
                <div className="bg-[#1a2530] p-3 rounded-xl border border-rose-500/20">
                  <p className="text-[11px] font-bold text-rose-400 mb-1">خصومات</p>
                  <p className="text-base font-mono font-black text-rose-400">
                    -{apiDeductions.toLocaleString()}{" "}
                    <span className="text-[10px] text-slate-500">ل.س</span>
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] sm:text-xs font-black text-[#E7C873] mb-1.5 uppercase">
                مكافأة أو خصم إضافي
              </label>
              <div className="relative group">
                <input
                  type="number"
                  placeholder="0"
                  className="w-full p-3 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#E7C873]/30 focus:border-[#E7C873] outline-none text-white font-mono text-base font-bold pr-10 placeholder:text-slate-600"
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                />
                <Coins className="absolute right-3 top-3 text-slate-500" size={20} />
              </div>
            </div>

            <div
              className={`bg-${themeColor}-500/10 p-4 sm:p-5 rounded-xl border border-${themeColor}-500/30 text-center shadow-inner`}
            >
              <p
                className={`text-[11px] sm:text-xs font-black text-${themeColor}-300 mb-1 uppercase tracking-widest`}
              >
                إجمالي المستحقات النهائية للصرف
              </p>
              <p className={`text-2xl sm:text-3xl font-mono font-black text-${themeColor}-500`}>
                {totalDues.toLocaleString()}{" "}
                <span className={`text-xs sm:text-sm font-bold text-${themeColor}-500/50`}>
                  ل.س
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-[#1a2530]/80 border-t border-white/5 flex justify-between shrink-0 relative z-10">
          <button
            type="button"
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="px-4 sm:px-6 py-2.5 rounded-xl text-sm sm:text-base font-bold text-slate-400 bg-[#263544] hover:text-white transition-all active:scale-95 flex items-center gap-2"
          >
            {step === 2 && <ChevronRight size={16} />} {step === 1 ? "إلغاء" : "رجوع"}
          </button>

          {step === 1 ? (
            <button
              type="submit"
              onClick={handleNext}
              disabled={!!managedDepartment}
              className="bg-[#E7C873] text-[#101720] px-6 sm:px-8 py-2.5 rounded-xl text-sm sm:text-base font-black flex items-center gap-2 hover:bg-[#d0b468] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              المستحقات <ChevronLeft size={16} />
            </button>
          ) : (
            <button
              disabled={isPending || !!managedDepartment}
              onClick={handleConfirm}
              className={`bg-${themeColor}-600 text-white px-6 sm:px-8 py-2.5 rounded-xl text-sm sm:text-base font-black flex items-center gap-2 hover:bg-${themeColor}-700 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,0,0,0.4)] disabled:opacity-50`}
            >
              {isResigned ? <LogOut size={18} /> : <UserMinus size={18} />}
              {isResigned ? "تأكيد" : "تأكيد"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
