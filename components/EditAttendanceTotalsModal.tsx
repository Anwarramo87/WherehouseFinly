"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CalendarDays, Clock, Save, AlertOctagon, User } from "lucide-react";
import { useForm } from "react-hook-form";
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

const totalsSchema = z.object({
  employeeId: z.string().min(1, "الرجاء اختيار الموظف"),
  absenceDays: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
  sickLeaveDays: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
  unpaidLeaveDays: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
  lateMinutes: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
  earlyLeaveMinutes: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
  adminLeaveDays: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
  unpaidHours: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
  overtimeRegularMinutes: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
  overtimeWeekendDays: z.number().min(0, "القيمة لا يمكن أن تكون سالبة"),
});

type TotalsFormValues = z.infer<typeof totalsSchema>;

export default function EditAttendanceTotalsModal({
  isOpen,
  onClose,
  onSave,
  isPending,
  employees,
  initialData,
  selectedEmployeeId
}: EditAttendanceTotalsModalProps) {
  // Use typeof window check directly instead of state
  const isBrowser = typeof window !== 'undefined';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TotalsFormValues>({
    resolver: zodResolver(totalsSchema),
    mode: "onChange",
    defaultValues: {
      employeeId: selectedEmployeeId,
      absenceDays: 0,
      sickLeaveDays: 0,
      unpaidLeaveDays: 0,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      adminLeaveDays: 0,
      unpaidHours: 0,
      overtimeRegularMinutes: 0,
      overtimeWeekendDays: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          employeeId: initialData.employeeId,
          absenceDays: initialData.absenceDays,
          sickLeaveDays: initialData.sickLeaveDays,
          unpaidLeaveDays: initialData.unpaidLeaveDays,
          lateMinutes: initialData.lateMinutes,
          earlyLeaveMinutes: initialData.earlyLeaveMinutes,
          adminLeaveDays: initialData.adminLeaveDays,
          unpaidHours: initialData.unpaidHours,
          overtimeRegularMinutes: initialData.overtimeRegularMinutes,
          overtimeWeekendDays: initialData.overtimeWeekendDays,
        });
      } else {
        reset({
          employeeId: selectedEmployeeId,
          absenceDays: 0,
          sickLeaveDays: 0,
          unpaidLeaveDays: 0,
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          adminLeaveDays: 0,
          unpaidHours: 0,
          overtimeRegularMinutes: 0,
          overtimeWeekendDays: 0,
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
  const inputCls = (hasErr?: boolean) =>
    `w-full p-3 sm:p-4 bg-[#101720] border ${hasErr ? "border-rose-500" : "border-[#263544]"} rounded-2xl focus:border-[#C89355] outline-none text-white text-base sm:text-lg font-mono font-black transition-colors shadow-inner`;

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

            {/* ── Data Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Absences Section */}
              <div className="bg-[#1a2530]/40 p-6 rounded-3xl border border-[#263544] space-y-5 shadow-inner">
                <h3 className="text-white font-black flex items-center gap-2 border-b border-[#263544] pb-4 mb-5 text-sm sm:text-base tracking-wide">
                  <AlertOctagon className="text-rose-400" size={20} /> الغياب والإجازات (أيام)
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase">أيام الغياب</label>
                    <input type="number" step="1" min="0" className={inputCls(!!errors.absenceDays)} {...register("absenceDays", { valueAsNumber: true })} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase">مرضية</label>
                    <input type="number" step="1" min="0" className={inputCls(!!errors.sickLeaveDays)} {...register("sickLeaveDays", { valueAsNumber: true })} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase">بلا أجر</label>
                    <input type="number" step="1" min="0" className={inputCls(!!errors.unpaidLeaveDays)} {...register("unpaidLeaveDays", { valueAsNumber: true })} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase">إدارية</label>
                    <input type="number" step="1" min="0" className={inputCls(!!errors.adminLeaveDays)} {...register("adminLeaveDays", { valueAsNumber: true })} />
                  </div>
                </div>
              </div>

              {/* Time & Overtime Section */}
              <div className="bg-[#1a2530]/40 p-6 rounded-3xl border border-[#263544] space-y-5 shadow-inner">
                <h3 className="text-white font-black flex items-center gap-2 border-b border-[#263544] pb-4 mb-5 text-sm sm:text-base tracking-wide">
                  <Clock className="text-[#C89355]" size={20} /> التأخير والإضافي
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase">تأخير (دقائق)</label>
                    <input type="number" step="1" min="0" className={inputCls(!!errors.lateMinutes)} {...register("lateMinutes", { valueAsNumber: true })} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase">مغادرة (دقائق)</label>
                    <input type="number" step="1" min="0" className={inputCls(!!errors.earlyLeaveMinutes)} {...register("earlyLeaveMinutes", { valueAsNumber: true })} />
                  </div>

                  <div className="col-span-2 grid grid-cols-3 gap-4 pt-4 border-t border-[#263544]">
                    <div>
                      <label className="block text-[10px] font-black text-[#C89355] mb-2 uppercase">إضافي عادي(د)</label>
                      <input type="number" step="1" min="0" className={inputCls(!!errors.overtimeRegularMinutes)} {...register("overtimeRegularMinutes", { valueAsNumber: true })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#C89355] mb-2 uppercase">إضافي عطلة (أيام)  </label>
                      <input type="number" step="0.5" min="0" className={inputCls(!!errors.overtimeWeekendDays)} {...register("overtimeWeekendDays", { valueAsNumber: true })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">إجازة ساعية(س)</label>
                      <input type="number" step="0.5" min="0" className={inputCls(!!errors.unpaidHours)} {...register("unpaidHours", { valueAsNumber: true })} />
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