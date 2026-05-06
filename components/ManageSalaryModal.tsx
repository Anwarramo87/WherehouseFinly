"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X, Loader2, Save, Coins, Zap, Shield, Search,
  Wallet, Calculator, Truck, Lock
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
  // Computed by backend / calculate-allowances endpoint:
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

const fmt = (val?: string | number) => {
  if (val === undefined || val === null || val === "") return "—";
  const n = Number(val);
  return isFinite(n) ? Math.round(n).toLocaleString() : "—";
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function ManageSalaryModal({
  isOpen, onClose, onSave, isPending,
  initialData, employees = [], preselectedEmployeeId,
}: Props) {
  const queryClient = useQueryClient();
  const prevSalariesRef = useRef<Salary[] | undefined>(undefined);
  const savedRef = useRef(false);

  // Employee search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Computed allowances state (from calculate-allowances endpoint)
  const [isComputing, setIsComputing] = useState(false);
  const [computed, setComputed] = useState<{
    difference?: number;
    responsibilityAllowance?: number;
    extraEffortAllowance?: number;
    productionIncentive?: number;
    verificationMessage?: string;
  }>({});

  // ─── React Hook Form ─────────────────────────────────────────────────────────
  const {
    control, register, handleSubmit, watch, setValue, setError,
    formState: { errors },
  } = useForm<SalaryFormValues>({
    resolver: zodResolver(salarySchema),
    mode: "onChange",
    defaultValues: {
      employeeId:        initialData?.employeeId ?? preselectedEmployeeId ?? "",
      baseSalary:        toNum(initialData?.baseSalary) || 0,
      lumpSumSalary:     toNum(initialData?.lumpSumSalary) || 0,
      livingAllowance:   toNum(initialData?.livingAllowance) || 0,
      transportAllowance: toNum(initialData?.transportAllowance) || 0,
      insuranceAmount:   toNum(initialData?.insuranceAmount) || 0,
    },
  });



  // ─── Init search label ────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialData?.employeeId) {
      const emp = employees.find(e => e.employeeId === initialData.employeeId);
      setSearchQuery(emp ? `${emp.employeeId} - ${emp.name}` : initialData.employeeId);
      setSelectedEmployeeName(emp?.name ?? "");
    } else if (preselectedEmployeeId) {
      const emp = employees.find(e => e.employeeId === preselectedEmployeeId);
      if (emp) {
        setSearchQuery(`${emp.employeeId} - ${emp.name}`);
        setSelectedEmployeeName(emp.name);
        // Pre-fill baseSalary from hourlyRate if available
        if (toNum(emp.hourlyRate) > 0) setValue("baseSalary", toNum(emp.hourlyRate));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

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

  if (!isOpen || typeof document === "undefined") return null;

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const handleSelectEmployee = (emp: Employee) => {
    setValue("employeeId", emp.employeeId, { shouldValidate: true });
    setSelectedEmployeeName(emp.name);
    setSearchQuery(`${emp.employeeId} - ${emp.name}`);
    setIsDropdownOpen(false);
    if (toNum(emp.hourlyRate) > 0) setValue("baseSalary", toNum(emp.hourlyRate));
  };

  const runCalculation = async (values: SalaryFormValues, saveAfter = false) => {
    const salaryVal = Number(values.baseSalary ?? 0);
    const lumpVal   = Number(values.lumpSumSalary ?? 0);
    const livingVal = Number(values.livingAllowance ?? 0);

    if (lumpVal + livingVal > salaryVal) {
      setError("lumpSumSalary", { message: "مجموع الراتب المقطوع وبدل المعيشة يتجاوز الراتب الكلي" });
      return;
    }

    try {
      setIsComputing(true);
      const resp = await fetch("/api/salary/calculate-allowances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salary: salaryVal, lumpSumSalary: lumpVal, livingAllowance: livingVal }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json?.error?.message || json?.message || "خطأ في حساب البدلات");
      }

      const respAllowance  = Number(json.responsibilityRounded ?? json.responsibilityAllowance ?? 0);
      const extraEffort    = Number(json.extraEffortRounded    ?? json.extraEffortAllowance    ?? 0);
      const production     = Number(json.productionRounded     ?? json.productionIncentives    ?? 0);
      const difference     = Number(json.differenceRounded     ?? json.difference              ?? 0);

      setComputed({
        difference,
        responsibilityAllowance: respAllowance,
        extraEffortAllowance:    extraEffort,
        productionIncentive:     production,
        verificationMessage:     json.verification?.message,
      });

      // Optimistic cache update
      try {
        if (prevSalariesRef.current === undefined)
          prevSalariesRef.current = queryClient.getQueryData<Salary[]>(["salaries"]);

        const empId = values.employeeId;
        const tempSalary: Salary = {
          id: `temp-${empId}`,
          employeeId: empId,
          baseSalary: Math.round(salaryVal),
          lumpSumSalary: Math.round(lumpVal),
          livingAllowance: Math.round(livingVal),
          responsibilityAllowance: respAllowance,
          extraEffortAllowance: extraEffort,
          productionIncentive: production,
          transportAllowance: Number(values.transportAllowance ?? 0),
          insuranceAmount: Number(values.insuranceAmount ?? 0),
        };
        queryClient.setQueryData<Salary[] | undefined>(["salaries"], (old) => {
          const list = Array.isArray(old) ? [...old] : [];
          const idx  = list.findIndex(s => s?.employeeId === empId);
          if (idx >= 0) list[idx] = { ...list[idx], ...tempSalary } as Salary;
          else list.push(tempSalary);
          return list;
        });
      } catch { /* cache update is best-effort */ }

      if (saveAfter) {
        const payload: SalaryPayload = {
          profession:             initialData?.profession ?? "",
          baseSalary:             Math.round(salaryVal),
          lumpSumSalary:          Math.round(lumpVal),
          livingAllowance:        Math.round(livingVal),
          transportAllowance:     Math.round(Number(values.transportAllowance ?? 0)),
          insuranceAmount:        Math.round(Number(values.insuranceAmount ?? 0)),
          responsibilityAllowance: respAllowance,
          extraEffortAllowance:    extraEffort,
          productionIncentive:     production,
        };
        savedRef.current = true;
        onSave(values.employeeId, payload);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "فشل في حساب الراتب";
      setError("baseSalary", { message: msg });
    } finally {
      setIsComputing(false);
    }
  };

  const onSubmit = (values: SalaryFormValues) => runCalculation(values, true);

  // Live total display (uses computed when available)
  // eslint-disable-next-line react-hooks/incompatible-library
  const baseSalary = watch("baseSalary");
  const transportAllowance = watch("transportAllowance");
  const insuranceAmount = watch("insuranceAmount");
  
  const netTotal =
    Number(baseSalary || 0) +
    (computed.responsibilityAllowance ?? 0) +
    (computed.extraEffortAllowance    ?? 0) +
    (computed.productionIncentive     ?? 0) +
    Number(transportAllowance || 0) -
    Number(insuranceAmount    || 0);

  // ─── Shared input class ───────────────────────────────────────────────────────
  const inputCls = (hasErr?: boolean) =>
    `w-full p-4 bg-[#101720] border ${hasErr ? "border-rose-500" : "border-[#263544]"} rounded-2xl focus:border-[#C89355] outline-none text-white text-lg font-mono font-black pr-12 shadow-inner transition-colors`;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md"
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
          <form id="salaryForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

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

            {/* ── Computed Allowances Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "الفرق المحسوب", value: computed.difference, color: "text-[#C89355]" },
                { label: "جهد إضافي (30%)", value: computed.extraEffortAllowance, color: "text-white" },
                { label: "مسؤولية (50%)", value: computed.responsibilityAllowance, color: "text-white" },
                { label: "إنتاجية (20%)", value: computed.productionIncentive, color: "text-white" },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-4 bg-[#0f1720] rounded-2xl border border-[#263544] text-center">
                  <div className="text-[10px] text-slate-400 font-bold mb-1">{label}</div>
                  <div className={`text-xl font-mono font-black ${color}`}>{fmt(value)}</div>
                </div>
              ))}
            </div>

            {/* verification message */}
            {computed.verificationMessage && (
              <p className="text-xs text-emerald-400 font-bold text-center">{computed.verificationMessage}</p>
            )}

            {/* ── Net Total Bar ── */}
            <div className="bg-[#1a2530] border border-[#263544] p-5 rounded-2xl flex justify-between items-center shadow-inner">
              <div>
                <span className="text-xs font-black text-slate-400">الإجمالي الثابت</span>
                <p className="text-[10px] text-slate-500 mt-0.5">الأساسي + البدلات + نقل − تأمينات</p>
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

          <div className="flex items-center gap-3">
            {/* Calculate only */}
            <button
              type="button"
              onClick={handleSubmit((v) => runCalculation(v, false))}
              disabled={isComputing}
              className="px-6 py-3 rounded-2xl font-bold bg-[#263544] text-[#C89355] hover:bg-[#2e3a41] disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isComputing
                ? <><Loader2 className="animate-spin" size={16} /> جاري الحساب...</>
                : <><Calculator size={16} /> حساب البدلات</>
              }
            </button>

            {/* Save */}
            <button
              type="submit"
              form="salaryForm"
              disabled={isPending || isComputing}
              className="bg-[#C89355] text-[#101720] px-10 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:bg-[#d0b468] active:scale-95 transition-all shadow-[0_0_20px_rgba(200,147,85,0.3)] disabled:opacity-50"
            >
              {isPending
                ? <><Loader2 className="animate-spin" size={20} /> جاري الحفظ...</>
                : <><Save size={20} /> حفظ بيانات الراتب</>
              }
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}