"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X, Loader2, Save, Coins, Zap, Shield, Search,
  Wallet, Truck, Lock
} from "lucide-react";
import type { Employee } from "@/types/employee";
import type { Salary } from "@/types/salary";

// ─── Zod Schema ────────────────────────────────────────────────────────────────
const salarySchema = z.object({
  employeeId:        z.string().min(1, "الرجاء اختيار الموظف"),
  baseSalary:        z.number({ message: "أدخل رقماً صحيحاً" }).min(1, "الراتب الأساسي مطلوب"),
  lumpSumSalary:     z.number().min(0),
  livingAllowance:   z.number().min(0),
  transportAllowance: z.number().min(0),
  insuranceAmount:   z.number().min(0),
}).refine(
  (d) => (d.lumpSumSalary ?? 0) + (d.livingAllowance ?? 0) <= d.baseSalary,
  { message: "مجموع الراتب المقطوع وبدل المعيشة يتجاوز الراتب الكلي", path: ["lumpSumSalary"] }
);

type SalaryFormValues = z.infer<typeof salarySchema>;

// ─── Payload sent upward to onSave ─────────────────────────────────────────────
export type SalaryPayload = {
  profession?: string;
  baseSalary: number;
  lumpSumSalary: number;
  livingAllowance: number;
  transportAllowance: number;
  insuranceAmount: number;
  // Hardcoded to 0 - these are now managed in Rewards/Bonuses module:
  responsibilityAllowance: number;
  extraEffortAllowance: number;
  productionIncentive: number;
};

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employeeId: string, data: SalaryPayload) => void;
  isPending?: boolean;
  initialData?: Salary | null;
  employees?: Employee[];
  preselectedEmployeeId?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const toNum = (val: unknown): number => {
  if (val && typeof val === "object" && "$numberDecimal" in (val as Record<string, unknown>)) {
    return Number((val as { $numberDecimal: string }).$numberDecimal || 0);
  }
  return Number(val || 0);
};

// ─── Component ─────────────────────────────────────────────────────────────────
function ManageSalaryModalContent({
  onClose, onSave, isPending,
  initialData, employees = [], preselectedEmployeeId,
}: Props) {
  const queryClient = useQueryClient();
  const prevSalariesRef = useRef<Salary[] | undefined>(undefined);
  const savedRef = useRef(false);

  const resolvedEmployeeId = initialData?.employeeId ?? preselectedEmployeeId ?? "";
  const resolvedEmployee = useMemo(
    () => employees.find((e) => e.employeeId === resolvedEmployeeId),
    [employees, resolvedEmployeeId],
  );

  const [searchQuery, setSearchQuery] = useState(() => (
    resolvedEmployee ? `${resolvedEmployee.employeeId} - ${resolvedEmployee.name}` : resolvedEmployeeId
  ));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState(() => resolvedEmployee?.name ?? "");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initialBaseSalary = initialData?.baseSalary !== undefined && initialData?.baseSalary !== null
    ? toNum(initialData.baseSalary) || 0
    : resolvedEmployee && toNum(resolvedEmployee.hourlyRate) > 0
      ? toNum(resolvedEmployee.hourlyRate)
      : 0;

  const defaultValues = {
    employeeId: resolvedEmployeeId,
    baseSalary: initialBaseSalary,
    lumpSumSalary: toNum(initialData?.lumpSumSalary) || 0,
    livingAllowance: toNum(initialData?.livingAllowance) || 0,
    transportAllowance: toNum(initialData?.transportAllowance) || 0,
    insuranceAmount: toNum(initialData?.insuranceAmount) || 0,
  };

  // ─── React Hook Form ─────────────────────────────────────────────────────────
  const {
    control, register, handleSubmit, setValue,
    formState: { errors },
  } = useForm<SalaryFormValues>({
    resolver: zodResolver(salarySchema),
    mode: "onChange",
    defaultValues,
  });

  // Click-outside dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Restore cache on unmount without save
  useEffect(() => {
    return () => {
      if (!savedRef.current && prevSalariesRef.current !== undefined) {
        try {
          queryClient.setQueryData(["salaries"], prevSalariesRef.current);
        } catch { /* noop */ }
      }
      prevSalariesRef.current = undefined;
      savedRef.current = false;
    };
  }, [queryClient]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(e =>
      e.name.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const handleSelectEmployee = (emp: Employee) => {
    setValue("employeeId", emp.employeeId, { shouldValidate: true });
    setSelectedEmployeeName(emp.name);
    setSearchQuery(`${emp.employeeId} - ${emp.name}`);
    setIsDropdownOpen(false);
    if (toNum(emp.hourlyRate) > 0) setValue("baseSalary", toNum(emp.hourlyRate));
  };

  const onSubmit = (values: SalaryFormValues) => {
    const payload: SalaryPayload = {
      profession:             initialData?.profession ?? "",
      baseSalary:             Math.round(Number(values.baseSalary ?? 0)),
      lumpSumSalary:          Math.round(Number(values.lumpSumSalary ?? 0)),
      livingAllowance:        Math.round(Number(values.livingAllowance ?? 0)),
      transportAllowance:     Math.round(Number(values.transportAllowance ?? 0)),
      insuranceAmount:        Math.round(Number(values.insuranceAmount ?? 0)),
      // Hardcoded to 0 - managed in Rewards/Bonuses module:
      responsibilityAllowance: 0,
      extraEffortAllowance:    0,
      productionIncentive:     0,
    };
    savedRef.current = true;
    onSave(values.employeeId, payload);
  };

  const onSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSubmit(onSubmit)(event);
  };

  // Live total display - STRICTLY: baseSalary + lumpSumSalary + livingAllowance + transportAllowance - insuranceAmount
  const baseSalary = useWatch({ control, name: "baseSalary" });
  const lumpSumSalary = useWatch({ control, name: "lumpSumSalary" });
  const livingAllowance = useWatch({ control, name: "livingAllowance" });
  const transportAllowance = useWatch({ control, name: "transportAllowance" });
  const insuranceAmount = useWatch({ control, name: "insuranceAmount" });
  
  const netTotal =
    Number(baseSalary || 0) +
    Number(lumpSumSalary || 0) +
    Number(livingAllowance || 0) +
    Number(transportAllowance || 0) -
    Number(insuranceAmount || 0);

  // ─── Shared input class ───────────────────────────────────────────────────────
  const inputCls = (hasErr?: boolean) =>
    `w-full p-4 bg-[#101720] border ${hasErr ? "border-rose-500" : "border-[#263544]"} rounded-2xl focus:border-[#C89355] outline-none text-white text-lg font-mono font-black pr-12 shadow-inner transition-colors`;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return createPortal(
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md"
      dir="rtl"
    >
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.9)] w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col border border-white/10 outline-dashed outline-1 outline-[#C89355]/30 -outline-offset-8">

        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-[#C89355]/10 p-3 rounded-2xl border border-[#C89355]/20 shadow-[0_0_20px_rgba(200,147,85,0.15)]">
              <Wallet className="text-[#C89355]" size={28} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                {initialData ? "تعديل راتب الموظف" : "ضبط الراتب والثوابت"}
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">KU&amp;M JEANS — نظام الرواتب</p>
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
        <div className="overflow-y-auto custom-scrollbar flex-1 p-8 sm:p-10">
          <form id="salaryForm" onSubmit={onSubmitHandler} className="space-y-6">

            {/* ── Employee Search ── */}
            <div ref={dropdownRef}>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase tracking-widest">
                الموظف (الاسم أو الكود) <span className="text-rose-500">*</span>
              </label>
              <Controller
                name="employeeId"
                control={control}
                render={({ field }) => (
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="اكتب للبحث عن موظف..."
                      className={`w-full p-4 bg-[#1a2530] border ${errors.employeeId ? "border-rose-500" : "border-[#263544]"} rounded-2xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner pr-12 placeholder:text-slate-500 disabled:opacity-50`}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                        if (!e.target.value) field.onChange("");
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      disabled={!!initialData}
                    />
                    <Search className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors pointer-events-none" size={22} />

                    {isDropdownOpen && !initialData && (
                      <div className="absolute top-[calc(100%+8px)] left-0 w-full max-h-56 overflow-y-auto custom-scrollbar bg-[#1a2530] border border-[#263544] rounded-2xl shadow-2xl z-50 p-2">
                        {filteredEmployees.length === 0 ? (
                          <div className="p-4 text-center text-slate-500 font-bold text-sm">لا يوجد موظف بهذا الاسم أو الكود</div>
                        ) : filteredEmployees.map((emp) => (
                          <div
                            key={emp.employeeId}
                            onClick={() => handleSelectEmployee(emp)}
                            className="flex items-center gap-3 p-3 hover:bg-[#263544] rounded-xl cursor-pointer transition-colors"
                          >
                            <div className="bg-[#101720] px-2 py-1 rounded text-xs font-mono font-bold text-[#C89355] border border-[#263544]">{emp.employeeId}</div>
                            <span className="font-bold text-white text-sm">{emp.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              />
              {errors.employeeId && <p className="text-rose-400 text-xs font-bold mt-1.5">{errors.employeeId.message}</p>}
              {selectedEmployeeName && (
                <p className="text-emerald-400 text-xs font-bold mt-1.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> تم اختيار: {selectedEmployeeName}
                </p>
              )}
            </div>

            {/* ── Salary Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* baseSalary */}
              <div>
                <label className="block text-xs font-black text-[#C89355] mb-2 uppercase tracking-widest">
                  الراتب الأساسي الكلي (ل.س) <span className="text-rose-500">*</span>
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    className={inputCls(!!errors.baseSalary)}
                    {...register("baseSalary", { valueAsNumber: true })}
                  />
                  <Coins className="absolute right-4 top-4.5 text-slate-500 group-focus-within:text-[#C89355] pointer-events-none" size={22} />
                </div>
                {errors.baseSalary && <p className="text-rose-400 text-xs font-bold mt-1.5">{errors.baseSalary.message}</p>}
              </div>

              {/* lumpSumSalary */}
              <div>
                <label className="block text-xs font-black text-[#C89355] mb-2 uppercase tracking-widest">
                  الراتب المقطوع (ل.س)
                </label>
                <div className="relative group">
                  <input type="number" min={0} step={1000} className={inputCls(!!errors.lumpSumSalary)} {...register("lumpSumSalary", { valueAsNumber: true })} />
                  <Zap className="absolute right-4 top-4.5 text-slate-500 group-focus-within:text-[#C89355] pointer-events-none" size={22} />
                </div>
                {errors.lumpSumSalary && <p className="text-rose-400 text-xs font-bold mt-1.5">{errors.lumpSumSalary.message}</p>}
              </div>

              {/* livingAllowance */}
              <div>
                <label className="block text-xs font-black text-[#C89355] mb-2 uppercase tracking-widest">
                  بدل المعيشة (ل.س)
                </label>
                <div className="relative group">
                  <input type="number" min={0} step={1000} className={inputCls(!!errors.livingAllowance)} {...register("livingAllowance", { valueAsNumber: true })} />
                  <Shield className="absolute right-4 top-4.5 text-slate-500 group-focus-within:text-[#C89355] pointer-events-none" size={22} />
                </div>
                {errors.livingAllowance && <p className="text-rose-400 text-xs font-bold mt-1.5">{errors.livingAllowance.message}</p>}
              </div>

              {/* transportAllowance */}
              <div>
                <label className="block text-xs font-black text-[#C89355] mb-2 uppercase tracking-widest">
                  بدل النقل (ل.س)
                </label>
                <div className="relative group">
                  <input type="number" min={0} step={1000} className={inputCls(!!errors.transportAllowance)} {...register("transportAllowance", { valueAsNumber: true })} />
                  <Truck className="absolute right-4 top-4.5 text-slate-500 group-focus-within:text-[#C89355] pointer-events-none" size={22} />
                </div>
                {errors.transportAllowance && <p className="text-rose-400 text-xs font-bold mt-1.5">{errors.transportAllowance.message}</p>}
              </div>

              {/* insuranceAmount */}
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-rose-400 mb-2 uppercase tracking-widest">
                  التأمينات — خصم شهري (ل.س)
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    className="w-full p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl focus:border-rose-500 outline-none text-rose-400 text-lg font-mono font-black pr-12 shadow-inner transition-colors"
                    {...register("insuranceAmount", { valueAsNumber: true })}
                  />
                  <Lock className="absolute right-4 top-4.5 text-rose-500/50 group-focus-within:text-rose-500 pointer-events-none" size={22} />
                </div>
                {errors.insuranceAmount && <p className="text-rose-400 text-xs font-bold mt-1.5">{errors.insuranceAmount.message}</p>}
              </div>
            </div>

            {/* ── Net Total Bar ── */}
            <div className="bg-[#1a2530] border border-[#263544] p-5 rounded-2xl flex justify-between items-center shadow-inner">
              <div>
                <span className="text-xs font-black text-slate-400">الإجمالي الثابت</span>
                <p className="text-[10px] text-slate-500 mt-0.5">الأساسي + المقطوع + المعيشة + نقل − تأمينات</p>
              </div>
              <span className="text-2xl font-mono font-black text-[#C89355]">
                {netTotal > 0 ? netTotal.toLocaleString() : "—"} <span className="text-xs text-slate-500">ل.س</span>
              </span>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 bg-[#1a2530]/80 border-t border-white/5 flex justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-3.5 rounded-2xl font-bold text-slate-400 bg-[#263544] hover:text-white transition-all active:scale-95"
          >
            إلغاء التعديل
          </button>

          <button
            type="submit"
            form="salaryForm"
            disabled={isPending}
            className="bg-[#C89355] text-[#101720] px-10 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:bg-[#d0b468] active:scale-95 transition-all shadow-[0_0_20px_rgba(200,147,85,0.3)] disabled:opacity-50"
          >
            {isPending
              ? <><Loader2 className="animate-spin" size={20} /> جاري الحفظ...</>
              : <><Save size={20} /> حفظ بيانات الراتب</>
            }
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

export default function ManageSalaryModal(props: Props) {
  const isMounted = typeof document !== "undefined";

  useEffect(() => {
    if (props.isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [props.isOpen]);

  if (!props.isOpen || !isMounted) return null;

  const modalKey = `${props.initialData?.employeeId ?? "new"}-${props.preselectedEmployeeId ?? ""}`;

  return <ManageSalaryModalContent key={modalKey} {...props} />;
}