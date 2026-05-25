"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X, CalendarDays, FileText, Save, CheckSquare, Square,
  Loader2, Check, Search, Info,
} from "lucide-react";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import type { Employee } from "@/types/employee";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
}

// ─── تعريف أنواع الإجازات مع خصائصها ───────────────────────────────────────
// isPaidDefault: القيمة الافتراضية لـ isPaid عند اختيار هذا النوع
// isPaidLocked:  هل يُقفل زر مأجور/غير مأجور (لأن الباك إند يعالجه بشكل ثابت)
// lockedNote:    ملاحظة تُعرض للمستخدم عند القفل
// backendType:   القيمة المُرسلة للباك إند
interface LeaveTypeConfig {
  label: string;
  backendType: string;
  isPaidDefault: boolean;
  isPaidLocked: boolean;
  lockedNote?: string;
  isHourly?: boolean;
}

const LEAVE_TYPES: LeaveTypeConfig[] = [
  {
    label: "إجازة مرضية",
    backendType: "SICK",
    isPaidDefault: true,
    isPaidLocked: true,
    lockedNote: "الإجازة المرضية مأجورة بنسبة 50% — يُحسب الخصم تلقائياً عند احتساب الراتب",
  },
  {
    label: "إجازة إدارية",
    backendType: "ADMIN",
    isPaidDefault: true,
    isPaidLocked: true,
    lockedNote: "الإجازة الإدارية مأجورة بالكامل",
  },
  {
    label: "إجازة وفاة",
    backendType: "DEATH",
    isPaidDefault: true,
    isPaidLocked: true,
    lockedNote: "إجازة الوفاة مأجورة بالكامل",
  },
  {
    label: "إجازة بدون أجر",
    backendType: "UNPAID",
    isPaidDefault: false,
    isPaidLocked: true,
    lockedNote: "إجازة بدون أجر — يُخصم اليوم كاملاً عند احتساب الراتب",
  },
  {
    label: "إجازة ساعية",
    backendType: "OTHER",
    isPaidDefault: true,
    isPaidLocked: false,
    isHourly: true,
  },
  {
    label: "أخرى",
    backendType: "OTHER",
    isPaidDefault: false,
    isPaidLocked: false,
  },
];

const buildDefaultForm = () => ({
  employeeIds: [] as string[],
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date().toISOString().split("T")[0],
  leaveTypeLabel: "إجازة مرضية",
  customReason: "",
  isPaid: true,
  startTime: "08:00",
  endTime: "10:00",
});

function LeaveRequestModalContent({ isOpen, onClose, employees }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(buildDefaultForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // الإعدادات الحالية بناءً على نوع الإجازة المختار
  const currentConfig = useMemo(
    () => LEAVE_TYPES.find((t) => t.label === form.leaveTypeLabel) ?? LEAVE_TYPES[0],
    [form.leaveTypeLabel]
  );

  const isHourlyLeave = !!currentConfig.isHourly;
  const isAllSelected = employees.length > 0 && form.employeeIds.length === employees.length;

  // عند تغيير نوع الإجازة — نُحدّث isPaid تلقائياً للقيمة الافتراضية
  const handleLeaveTypeChange = (label: string) => {
    const config = LEAVE_TYPES.find((t) => t.label === label) ?? LEAVE_TYPES[0];
    setForm((prev) => ({ ...prev, leaveTypeLabel: label, isPaid: config.isPaidDefault }));
  };

  const filteredEmployees = useMemo(
    () =>
      employees.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [employees, searchQuery]
  );

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  if (!isOpen) return null;

  const handleSelectEmployee = (empId: string) => {
    setForm((prev) => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(empId)
        ? prev.employeeIds.filter((id) => id !== empId)
        : [...prev.employeeIds, empId],
    }));
  };

  const handleSelectAll = () => {
    setForm((prev) => ({
      ...prev,
      // إذا كان الكل محدداً → إلغاء الكل، وإلا → تحديد الكل
      employeeIds: isAllSelected ? [] : employees.map((e) => e.employeeId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.employeeIds.length === 0) {
      toast.error("الرجاء اختيار موظف واحد على الأقل");
      return;
    }
    if (!isHourlyLeave && form.startDate > form.endDate) {
      toast.error("تاريخ النهاية يجب أن يكون بعد أو يساوي تاريخ البداية");
      return;
    }
    if (isHourlyLeave && form.startTime >= form.endTime) {
      toast.error("وقت نهاية الإجازة الساعية يجب أن يكون بعد وقت البدء");
      return;
    }
    if (form.leaveTypeLabel === "أخرى" && !form.customReason.trim()) {
      toast.error("الرجاء كتابة سبب الإجازة");
      return;
    }

    setIsSubmitting(true);

    const reason =
      form.leaveTypeLabel === "أخرى"
        ? form.customReason
        : form.leaveTypeLabel;

    const notes = isHourlyLeave
      ? `إجازة ساعية من ${form.startTime} إلى ${form.endTime}`
      : undefined;

    try {
      // نُرسل طلباً لكل موظف — الباك إند لا يدعم bulk create حالياً
      const results = await Promise.allSettled(
        form.employeeIds.map((empId) =>
          apiClient.post("/leaves", {
            employeeId: empId,
            startDate: form.startDate,
            endDate: isHourlyLeave ? form.startDate : form.endDate,
            leaveType: currentConfig.backendType,
            isPaid: currentConfig.isPaidLocked ? currentConfig.isPaidDefault : form.isPaid,
            reason,
            ...(notes ? { notes } : {}),
          })
        )
      );

      const failed = results.filter((r) => r.status === "rejected");
      const succeeded = results.filter((r) => r.status === "fulfilled").length;

      if (failed.length === 0) {
        toast.success(
          form.employeeIds.length === 1
            ? "تم حفظ طلب الإجازة بنجاح"
            : `تم حفظ ${succeeded} طلب إجازة بنجاح`
        );
        setForm(buildDefaultForm());
        onClose();
      } else {
        // بعض الطلبات نجحت وبعضها فشل
        if (succeeded > 0) {
          toast.success(`نجح ${succeeded} طلب`);
        }
        const firstError = failed[0] as PromiseRejectedResult;
        const msg =
          (firstError.reason as { response?: { data?: { message?: string | string[] } } })
            ?.response?.data?.message;
        toast.error(
          `فشل ${failed.length} طلب: ${Array.isArray(msg) ? msg.join(" | ") : (msg ?? "خطأ غير معروف")}`
        );
      }
    } catch {
      toast.error("تعذر إرسال الطلب. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-999999 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md"
      dir="rtl"
    >
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(200,147,85,0.15)] w-full max-w-xl overflow-hidden flex flex-col border border-white/10 outline-dashed outline-1 outline-[#C89355]/30 -outline-offset-8 max-h-[95vh]">

        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-[#C89355]/10 p-3 rounded-2xl border border-[#C89355]/20 shadow-[0_0_20px_rgba(200,147,85,0.15)]">
              <FileText className="text-[#C89355]" size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">إدارة الإجازات والعطل</h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                {form.employeeIds.length > 0
                  ? `${form.employeeIds.length} موظف محدد`
                  : "لم يتم تحديد موظفين بعد"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-rose-400 bg-[#263544] p-2.5 rounded-2xl border border-transparent hover:border-rose-400/30 transition-all active:scale-90"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 sm:p-8">
          <form id="leaveForm" onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 text-right">

            {/* ── تحديد الموظفين ── */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-black text-[#C89355] uppercase">
                  الموظفون المشمولون بالطلب
                </label>
                {/* زر تحديد الكل */}
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 group"
                >
                  <span className="text-[11px] font-black text-slate-400 group-hover:text-[#C89355] transition-colors select-none">
                    {isAllSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
                  </span>
                  <div className="text-[#C89355] transition-colors duration-300">
                    {isAllSelected
                      ? <CheckSquare size={16} />
                      : <Square size={16} className="text-slate-500 group-hover:text-[#C89355]" />
                    }
                  </div>
                </button>
              </div>

              <div className="relative" ref={dropdownRef}>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="ابحث عن اسم الموظف أو الكود..."
                    className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold shadow-inner pr-12 text-sm"
                    value={searchQuery}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                  />
                  <Search className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors pointer-events-none" size={20} />
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 max-h-48 overflow-y-auto bg-[#1a2530] border border-[#263544] rounded-2xl shadow-2xl p-2 custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
                    {employees.length === 0 ? (
                      <p className="p-4 text-xs text-center text-slate-500 font-bold">لا يوجد موظفون في القائمة</p>
                    ) : filteredEmployees.length === 0 ? (
                      <p className="p-4 text-xs text-center text-slate-500 font-bold">لا توجد نتائج مطابقة</p>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const isSelected = form.employeeIds.includes(emp.employeeId);
                        return (
                          <div
                            key={emp.employeeId}
                            onClick={() => handleSelectEmployee(emp.employeeId)}
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer text-xs font-bold transition-all ${
                              isSelected
                                ? "bg-[#C89355]/20 text-[#C89355] border border-[#C89355]/30"
                                : "text-slate-300 hover:bg-white/5"
                            }`}
                          >
                            <span>
                              {emp.name}{" "}
                              <span className="font-mono text-[10px] text-slate-500">({emp.employeeId})</span>
                            </span>
                            {isSelected && <Check size={14} />}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Chips الموظفين المحددين */}
              {form.employeeIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 p-3 bg-[#161f29] rounded-2xl border border-white/5 max-h-28 overflow-y-auto custom-scrollbar">
                  {form.employeeIds.map((id) => {
                    const emp = employees.find((e) => e.employeeId === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black bg-[#1a2530] text-[#C89355] border border-[#C89355]/30 shadow-sm animate-in zoom-in-95"
                      >
                        {emp?.name || id}
                        <button
                          type="button"
                          onClick={() => handleSelectEmployee(id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 rounded-md hover:bg-rose-500/10 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── نوع الإجازة ── */}
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">نوع الإجازة</label>
              <div className="relative group">
                <select
                  required
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold shadow-inner pr-12 appearance-none cursor-pointer text-sm transition-all"
                  value={form.leaveTypeLabel}
                  onChange={(e) => handleLeaveTypeChange(e.target.value)}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.label} value={t.label}>{t.label}</option>
                  ))}
                </select>
                <FileText className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors pointer-events-none" size={22} />
              </div>
            </div>

            {/* ── حقول التاريخ أو الساعات ── */}
            {!isHourlyLeave ? (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                <div>
                  <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">من تاريخ</label>
                  <div className="relative group">
                    <input
                      type="date" required
                      className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 text-sm transition-all"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                    <CalendarDays className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] pointer-events-none" size={20} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">إلى تاريخ</label>
                  <div className="relative group">
                    <input
                      type="date" required
                      min={form.startDate}
                      className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 text-sm transition-all"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                    <CalendarDays className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] pointer-events-none" size={20} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 animate-in slide-in-from-top-3 duration-300">
                <div>
                  <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">تاريخ اليوم</label>
                  <div className="relative group">
                    <input
                      type="date" required
                      className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold text-xs transition-all pr-9"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                    <CalendarDays className="absolute right-3 top-3.5 text-slate-500 pointer-events-none" size={16} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">من الساعة</label>
                  <input
                    type="time" required
                    className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold text-xs transition-all text-center"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">إلى الساعة</label>
                  <input
                    type="time" required
                    className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold text-xs transition-all text-center"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* ── سبب الإجازة (عند اختيار "أخرى") ── */}
            {form.leaveTypeLabel === "أخرى" && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">السبب بالتفصيل</label>
                <textarea
                  required
                  placeholder="يرجى كتابة سبب الإجازة هنا..."
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold shadow-inner min-h-24 resize-none text-sm"
                  value={form.customReason}
                  onChange={(e) => setForm({ ...form, customReason: e.target.value })}
                />
              </div>
            )}

            {/* ── حالة الأجر ── */}
            {currentConfig.isPaidLocked ? (
              /* إذا كانت الحالة محددة مسبقاً من الباك إند — نعرض ملاحظة فقط */
              <div className="flex items-start gap-3 bg-[#1a2530]/60 border border-[#263544] rounded-2xl px-4 py-3 animate-in fade-in duration-200">
                <Info size={16} className="text-[#C89355] mt-0.5 shrink-0" />
                <p className="text-xs font-bold text-slate-400 leading-relaxed">
                  {currentConfig.lockedNote}
                </p>
              </div>
            ) : (
              /* إذا كان النوع "أخرى" أو "ساعية" — المستخدم يختار */
              <button
                type="button"
                onClick={() => setForm({ ...form, isPaid: !form.isPaid })}
                className="flex items-center gap-3 group w-fit"
              >
                <div className="text-[#C89355] transition-colors duration-300">
                  {form.isPaid
                    ? <CheckSquare size={24} />
                    : <Square size={24} className="text-slate-500 group-hover:text-[#C89355]" />
                  }
                </div>
                <span className="text-sm font-black text-white select-none transition-colors group-hover:text-[#C89355]">
                  {form.isPaid ? "إجازة مأجورة" : "إجازة غير مأجورة"}
                </span>
              </button>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 bg-[#1a2530]/80 border-t border-white/5 flex justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-8 py-3.5 rounded-2xl font-bold text-slate-400 bg-[#263544] hover:text-white transition-all active:scale-95 disabled:opacity-60"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="leaveForm"
            disabled={isSubmitting || form.employeeIds.length === 0}
            className="bg-[#C89355] text-[#101720] px-10 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:bg-[#d0b468] active:scale-95 transition-all shadow-[0_0_20px_rgba(200,147,85,0.3)] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSubmitting
              ? "جارٍ الحفظ..."
              : form.employeeIds.length > 1
                ? `حفظ ${form.employeeIds.length} طلبات`
                : "حفظ الطلب"
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function LeaveRequestModal(props: Props) {
  if (!props.isOpen || typeof document === "undefined") return null;
  return <LeaveRequestModalContent key={`leave-${props.isOpen}`} {...props} />;
}
