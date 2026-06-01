"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CalendarDays, Clock, Save, AlertOctagon, User, AlertTriangle } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PayrollInputRecord } from "@/hooks/usePayrollInputs";
import { Employee } from "@/types/employee";

export type EditTotalsPayload = {
  employeeId: string;
  absenceDays: number;
  sickLeaveDays: number;
  unpaidLeaveDays: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  adminLeaveDays: number;
  unpaidHours: number;
  overtimeRegularMinutes: number;
  overtimeWeekendDays: number;
};

type EditAttendanceTotalsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditTotalsPayload) => void;
  isPending: boolean;
  employees: Employee[];
  initialData: PayrollInputRecord | null;
  selectedEmployeeId: string;
};

// عدد أيام العمل المعياري — يتطابق مع STANDARD_WORK_DAYS في الباك إند
const STANDARD_WORK_DAYS = 26;

/**
 * Schema مع Cross-field Validation باستخدام superRefine:
 *
 * القاعدة المحاسبية:
 * إذا كان مجموع أيام الغياب والإجازات >= STANDARD_WORK_DAYS (26 يوم)،
 * فالموظف غائب طوال الشهر — لا يجوز تسجيل تأخير أو مغادرة مبكرة أو إضافي عادي.
 *
 * الحقول المسموح بها حتى عند الغياب الكامل:
 * - overtimeWeekendDays: إضافي عطلة (يوم راحة منفصل عن أيام العمل)
 * - unpaidHours: إجازة ساعية (تُحسب بشكل مستقل)
 */
const totalsSchema = z
  .object({
    employeeId: z.string().min(1, "الرجاء اختيار الموظف"),
    absenceDays: z.number().min(0, "القيمة لا يمكن أن تكون سالبة").max(STANDARD_WORK_DAYS, `الحد الأقصى ${STANDARD_WORK_DAYS} يوم`),
    sickLeaveDays: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
    unpaidLeaveDays: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
    adminLeaveDays: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
    lateMinutes: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
    earlyLeaveMinutes: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
    overtimeRegularMinutes: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
    overtimeWeekendDays: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
    unpaidHours: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
  })
  .superRefine((data, ctx) => {
    const totalAbsences =
      (data.absenceDays ?? 0) +
      (data.sickLeaveDays ?? 0) +
      (data.unpaidLeaveDays ?? 0) +
      (data.adminLeaveDays ?? 0);

    // إذا كان الموظف غائباً طوال أيام العمل المعتمدة
    if (totalAbsences >= STANDARD_WORK_DAYS) {
      if ((data.lateMinutes ?? 0) > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lateMinutes"],
          message: "الموظف غائب طوال الشهر — لا يمكن تسجيل دقائق تأخير",
        });
      }

      if ((data.earlyLeaveMinutes ?? 0) > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["earlyLeaveMinutes"],
          message: "الموظف غائب طوال الشهر — لا يمكن تسجيل مغادرة مبكرة",
        });
      }

      if ((data.overtimeRegularMinutes ?? 0) > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["overtimeRegularMinutes"],
          message: "الموظف غائب طوال الشهر — لا يمكن تسجيل إضافي عادي",
        });
      }
    }

    // التحقق من أن مجموع الإجازات لا يتجاوز أيام الشهر
    if (totalAbsences > STANDARD_WORK_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["absenceDays"],
        message: `مجموع أيام الغياب والإجازات (${totalAbsences}) يتجاوز أيام العمل المعتمدة (${STANDARD_WORK_DAYS})`,
      });
    }
  });

type TotalsFormValues = z.infer<typeof totalsSchema>;

export default function EditAttendanceTotalsModal({
  isOpen,
  onClose,
  onSave,
  isPending,
  employees,
  initialData,
  selectedEmployeeId,
}: EditAttendanceTotalsModalProps) {
  const isBrowser = typeof window !== "undefined";

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<TotalsFormValues>({
    resolver: zodResolver(totalsSchema),
    mode: "onChange",
    defaultValues: {
      employeeId: selectedEmployeeId,
      absenceDays: 0,
      sickLeaveDays: 0,
      unpaidLeaveDays: 0,
      adminLeaveDays: 0,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      overtimeRegularMinutes: 0,
      overtimeWeekendDays: 0,
      unpaidHours: 0,
    },
  });

  // نراقب حقول الغياب لحساب الإجمالي اللحظي وعرض التحذير المرئي
  const watchedAbsence = useWatch({
    control,
    name: ["absenceDays", "sickLeaveDays", "unpaidLeaveDays", "adminLeaveDays"],
  });

  const totalAbsences =
    (Number(watchedAbsence[0]) || 0) +
    (Number(watchedAbsence[1]) || 0) +
    (Number(watchedAbsence[2]) || 0) +
    (Number(watchedAbsence[3]) || 0);

  const isFullyAbsent = totalAbsences >= STANDARD_WORK_DAYS;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          employeeId: initialData.employeeId,
          absenceDays: initialData.absenceDays,
          sickLeaveDays: initialData.sickLeaveDays,
          unpaidLeaveDays: initialData.unpaidLeaveDays,
          adminLeaveDays: initialData.adminLeaveDays,
          lateMinutes: initialData.lateMinutes,
          earlyLeaveMinutes: initialData.earlyLeaveMinutes,
          overtimeRegularMinutes: initialData.overtimeRegularMinutes,
          overtimeWeekendDays: initialData.overtimeWeekendDays,
          unpaidHours: initialData.unpaidHours,
        });
      } else {
        reset({
          employeeId: selectedEmployeeId,
          absenceDays: 0,
          sickLeaveDays: 0,
          unpaidLeaveDays: 0,
          adminLeaveDays: 0,
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeRegularMinutes: 0,
          overtimeWeekendDays: 0,
          unpaidHours: 0,
        });
      }
    }
  }, [isOpen, initialData, selectedEmployeeId, reset]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen || !isBrowser) return null;

  const onSubmit = (data: TotalsFormValues) => {
    onSave(data);
  };

  // ─── Shared Styles ───
  const inputCls = (hasErr?: boolean, isLocked?: boolean) =>
    `w-full p-3 sm:p-4 bg-[#101720] border ${
      hasErr ? "border-rose-500" : isLocked ? "border-slate-700 opacity-40 cursor-not-allowed" : "border-[#263544]"
    } rounded-2xl focus:border-[#C89355] outline-none text-white text-base sm:text-lg font-mono font-black transition-colors shadow-inner`;

  const labelCls = "block text-xs font-black text-[#C89355] mb-2 uppercase tracking-widest";

  return createPortal(
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md"
      dir="rtl"
    >
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.9)] w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col border border-white/10 outline-dashed outline-1 outline-[#C89355]/30 -outline-offset-8">

        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-[#C89355]/10 p-3 rounded-2xl border border-[#C89355]/20 shadow-[0_0_20px_rgba(200,147,85,0.15)]">
              <CalendarDays className="text-[#C89355]" size={28} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">تعديل المجاميع الشهرية للدوام</h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">KU&amp;M JEANS — إدارة الإجازات والإضافي</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-rose-400 bg-[#263544] p-2.5 rounded-2xl border border-transparent hover:border-rose-400/30 transition-all active:scale-90"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 sm:p-8">
          <form id="attendanceForm" onSubmit={handleSubmit(onSubmit)} className="space-y-8">

            {/* ── Employee Select ── */}
            <div className="bg-[#1a2530]/40 p-5 rounded-3xl border border-[#263544]">
              <label className={labelCls}>الموظف <span className="text-rose-500">*</span></label>
              <div className="relative group">
                <select
                  {...register("employeeId")}
                  className={`w-full p-4 bg-[#1a2530] border ${errors.employeeId ? "border-rose-500" : "border-[#263544]"} rounded-2xl focus:border-[#C89355] outline-none text-white text-sm sm:text-base font-bold appearance-none transition-all disabled:opacity-60 cursor-pointer`}
                  disabled={!!initialData}
                >
                  <option value="" className="bg-[#101720]">-- اختر الموظف --</option>
                  {employees.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId} className="bg-[#101720]">
                      {emp.name} ({emp.employeeId})
                    </option>
                  ))}
                </select>
                <div className="absolute left-4 top-4 text-slate-500 pointer-events-none group-focus-within:text-[#C89355]">
                  <User size={22} />
                </div>
              </div>
              {errors.employeeId && <p className="text-rose-400 text-xs font-bold mt-2">{errors.employeeId.message}</p>}
            </div>

            {/* ── تحذير الغياب الكامل ── */}
            {isFullyAbsent && (
              <div className="flex items-start gap-3 bg-rose-950/60 border border-rose-500/40 rounded-2xl px-5 py-4 animate-in fade-in duration-200">
                <AlertTriangle size={18} className="text-rose-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-rose-300 text-sm font-black">
                    مجموع الغياب والإجازات: {totalAbsences} يوم — الموظف غائب طوال أيام العمل المعتمدة ({STANDARD_WORK_DAYS} يوم)
                  </p>
                  <p className="text-rose-400/70 text-xs font-bold mt-1">
                    حقول التأخير والمغادرة المبكرة والإضافي العادي مقفلة تلقائياً لمنع الخصم المزدوج
                  </p>
                </div>
              </div>
            )}

            {/* ── Data Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Absences Section */}
              <div className="bg-[#1a2530]/40 p-6 rounded-3xl border border-[#263544] space-y-5 shadow-inner">
                <div className="flex items-center justify-between border-b border-[#263544] pb-4 mb-5">
                  <h3 className="text-white font-black flex items-center gap-2 text-sm sm:text-base tracking-wide">
                    <AlertOctagon className="text-rose-400" size={20} /> الغياب والإجازات (أيام)
                  </h3>
                  {/* عداد الإجمالي اللحظي */}
                  <span className={`text-xs font-black px-3 py-1 rounded-xl border ${
                    totalAbsences >= STANDARD_WORK_DAYS
                      ? "bg-rose-900/60 text-rose-300 border-rose-500/40"
                      : totalAbsences > 0
                        ? "bg-orange-900/40 text-orange-300 border-orange-500/30"
                        : "bg-[#263544] text-slate-400 border-[#263544]"
                  }`}>
                    {totalAbsences} / {STANDARD_WORK_DAYS} يوم
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase">أيام الغياب</label>
                    <input
                      type="number" step="1" min="0" max={STANDARD_WORK_DAYS}
                      className={inputCls(!!errors.absenceDays)}
                      {...register("absenceDays", { valueAsNumber: true })}
                    />
                    {errors.absenceDays && <p className="text-rose-400 text-[11px] font-bold mt-1.5">{errors.absenceDays.message}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase">مرضية</label>
                    <input
                      type="number" step="1" min="0"
                      className={inputCls(!!errors.sickLeaveDays)}
                      {...register("sickLeaveDays", { valueAsNumber: true })}
                    />
                    {errors.sickLeaveDays && <p className="text-rose-400 text-[11px] font-bold mt-1.5">{errors.sickLeaveDays.message}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase">بلا أجر</label>
                    <input
                      type="number" step="1" min="0"
                      className={inputCls(!!errors.unpaidLeaveDays)}
                      {...register("unpaidLeaveDays", { valueAsNumber: true })}
                    />
                    {errors.unpaidLeaveDays && <p className="text-rose-400 text-[11px] font-bold mt-1.5">{errors.unpaidLeaveDays.message}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase">إدارية</label>
                    <input
                      type="number" step="1" min="0"
                      className={inputCls(!!errors.adminLeaveDays)}
                      {...register("adminLeaveDays", { valueAsNumber: true })}
                    />
                    {errors.adminLeaveDays && <p className="text-rose-400 text-[11px] font-bold mt-1.5">{errors.adminLeaveDays.message}</p>}
                  </div>
                </div>
              </div>

              {/* Time & Overtime Section */}
              <div className={`bg-[#1a2530]/40 p-6 rounded-3xl border space-y-5 shadow-inner transition-colors ${isFullyAbsent ? "border-rose-500/20" : "border-[#263544]"}`}>
                <h3 className="text-white font-black flex items-center gap-2 border-b border-[#263544] pb-4 mb-5 text-sm sm:text-base tracking-wide">
                  <Clock className={isFullyAbsent ? "text-slate-600" : "text-[#C89355]"} size={20} />
                  التأخير والإضافي
                  {isFullyAbsent && (
                    <span className="text-[10px] font-black text-rose-400/70 bg-rose-900/30 px-2 py-0.5 rounded-lg border border-rose-500/20 mr-auto">
                      مقفل — غياب كامل
                    </span>
                  )}
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* تأخير */}
                  <div>
                    <label className={`block text-[11px] font-black mb-2 uppercase ${isFullyAbsent ? "text-slate-600" : "text-slate-400"}`}>
                      تأخير (دقائق)
                    </label>
                    <input
                      type="number" step="1" min="0"
                      disabled={isFullyAbsent}
                      className={inputCls(!!errors.lateMinutes, isFullyAbsent)}
                      {...register("lateMinutes", { valueAsNumber: true })}
                    />
                    {errors.lateMinutes && (
                      <p className="text-rose-400 text-[11px] font-bold mt-1.5 flex items-center gap-1">
                        <AlertTriangle size={11} /> {errors.lateMinutes.message}
                      </p>
                    )}
                  </div>

                  {/* مغادرة مبكرة */}
                  <div>
                    <label className={`block text-[11px] font-black mb-2 uppercase ${isFullyAbsent ? "text-slate-600" : "text-slate-400"}`}>
                      مغادرة (دقائق)
                    </label>
                    <input
                      type="number" step="1" min="0"
                      disabled={isFullyAbsent}
                      className={inputCls(!!errors.earlyLeaveMinutes, isFullyAbsent)}
                      {...register("earlyLeaveMinutes", { valueAsNumber: true })}
                    />
                    {errors.earlyLeaveMinutes && (
                      <p className="text-rose-400 text-[11px] font-bold mt-1.5 flex items-center gap-1">
                        <AlertTriangle size={11} /> {errors.earlyLeaveMinutes.message}
                      </p>
                    )}
                  </div>

                  {/* الإضافي */}
                  <div className="col-span-2 grid grid-cols-3 gap-4 pt-4 border-t border-[#263544]">
                    {/* إضافي عادي — مقفل عند الغياب الكامل */}
                    <div>
                      <label className={`block text-[10px] font-black mb-2 uppercase ${isFullyAbsent ? "text-slate-600" : "text-[#C89355]"}`}>
                        إضافي عادي (د)
                      </label>
                      <input
                        type="number" step="1" min="0"
                        disabled={isFullyAbsent}
                        className={inputCls(!!errors.overtimeRegularMinutes, isFullyAbsent)}
                        {...register("overtimeRegularMinutes", { valueAsNumber: true })}
                      />
                      {errors.overtimeRegularMinutes && (
                        <p className="text-rose-400 text-[11px] font-bold mt-1.5 flex items-center gap-1">
                          <AlertTriangle size={11} /> {errors.overtimeRegularMinutes.message}
                        </p>
                      )}
                    </div>

                    {/* إضافي عطلة — مسموح دائماً */}
                    <div>
                      <label className="block text-[10px] font-black text-[#C89355] mb-2 uppercase">
                        إضافي عطلة (أيام)
                      </label>
                      <input
                        type="number" step="0.5" min="0"
                        className={inputCls(!!errors.overtimeWeekendDays)}
                        {...register("overtimeWeekendDays", { valueAsNumber: true })}
                      />
                      {errors.overtimeWeekendDays && (
                        <p className="text-rose-400 text-[11px] font-bold mt-1.5">{errors.overtimeWeekendDays.message}</p>
                      )}
                    </div>

                    {/* إجازة ساعية — مسموح دائماً */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">
                        إجازة ساعية (س)
                      </label>
                      <input
                        type="number" step="0.5" min="0"
                        className={inputCls(!!errors.unpaidHours)}
                        {...register("unpaidHours", { valueAsNumber: true })}
                      />
                      {errors.unpaidHours && (
                        <p className="text-rose-400 text-[11px] font-bold mt-1.5">{errors.unpaidHours.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 bg-[#1a2530]/80 border-t border-white/5 flex flex-col-reverse sm:flex-row justify-between items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-slate-400 bg-[#263544] hover:text-white transition-all active:scale-95"
          >
            إلغاء التعديل
          </button>

          <button
            type="submit"
            form="attendanceForm"
            disabled={isPending}
            className="w-full sm:w-auto bg-[#C89355] text-[#101720] px-10 py-3.5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-[#d0b468] active:scale-95 transition-all shadow-[0_0_20px_rgba(200,147,85,0.3)] disabled:opacity-50"
          >
            {isPending ? (
              <div className="w-5 h-5 border-2 border-[#101720]/30 border-t-[#101720] rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            حفظ واعتماد المجاميع
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
