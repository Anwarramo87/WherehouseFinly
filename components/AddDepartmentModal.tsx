"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Building2, UserCog, CalendarDays, Save, Loader2, Search, ChevronLeft, Check } from "lucide-react";
import useDepartments from "@/hooks/useDepartments";
import { useEmployees } from "@/hooks/useEmployees";

export interface DeptFormData {
  name: string;
  manager: string;
  date: string;
  originalName?: string; // لمعرفة الاسم القديم في حال التعديل
  id?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DeptFormData) => void | Promise<void>;
  initialData?: DeptFormData | null;
}

const buildDefaultForm = (data?: DeptFormData | null): DeptFormData => (
  data
    ? { ...data }
    : { name: "", manager: "", date: new Date().toISOString().split('T')[0] }
);

function DepartmentModalContent({ isOpen, onClose, onSave, initialData }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<DeptFormData>(() => buildDefaultForm(initialData));
  const [empSearch, setEmpSearch] = useState("");
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);
  const empDropdownRef = useRef<HTMLDivElement>(null);
  const empInputRef = useRef<HTMLInputElement>(null);
  const { createDepartment, updateDepartment } = useDepartments();
  const { data: rawEmployees = [] } = useEmployees({ fetchAll: true });
  const allEmployees = useMemo(() => (Array.isArray(rawEmployees) ? rawEmployees : []), [rawEmployees]);

  const normalize = useCallback((s: string) => {
    if (!s) return "";
    return s
      .toLowerCase()
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
      .replace(/[إأآا]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ـ/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim();
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!showEmpDropdown) return [];
    const q = normalize(empSearch);
    return allEmployees.filter((emp) => {
      if (!emp?.name) return false;
      const nameNorm = normalize(emp.name);
      const idNorm = normalize(emp.employeeId);
      return nameNorm.includes(q) || idNorm.includes(q) || (emp.residence && normalize(emp.residence).includes(q));
    }).slice(0, 50);
  }, [allEmployees, empSearch, normalize, showEmpDropdown]);

  const selectedEmployee = useMemo(
    () => allEmployees.find((emp) => emp.employeeId === form.manager),
    [allEmployees, form.manager],
  );

  // close dropdown on outside click
  useEffect(() => {
    if (!showEmpDropdown) return;
    const handler = (e: MouseEvent) => {
      if (empDropdownRef.current && !empDropdownRef.current.contains(e.target as Node)) {
        setShowEmpDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmpDropdown]);

  // use real API via hook
  // submit to /api/departments
  const submitDepartment = async (payload: DeptFormData) => {
    const id = initialData?.id;
    if (id) {
      await updateDepartment.mutateAsync({ id, name: payload.name, manager: payload.manager, date: payload.date });
      return;
    }

    // create
    await createDepartment.mutateAsync({ name: payload.name, manager: payload.manager, date: payload.date });
  };

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "unset";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(buildDefaultForm(initialData));
  }, [isOpen, initialData]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await submitDepartment(form);
      await onSave(form);
    } catch (error) {
      console.error("فشل حفظ القسم:", error);
      // Handle 409 Conflict (department name already exists)
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setErrorMessage(`القسم "${form.name}" موجود بالفعل. يرجى استخدام اسم آخر.`);
      } else {
        setErrorMessage("تعذر حفظ القسم حالياً. حاول مرة أخرى.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md transition-all duration-300" dir="rtl">
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(200,147,85,0.15)] w-full max-w-lg overflow-hidden flex flex-col border border-white/10 outline-dashed outline-1 outline-[#C89355]/30 outline-offset-8">
        
        <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-[#C89355]/10 p-3 rounded-2xl border border-[#C89355]/20 shadow-[0_0_20px_rgba(200,147,85,0.15)]">
              <Building2 className="text-[#C89355]" size={24} />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              {initialData ? "تعديل بيانات القسم" : "إضافة قسم جديد"}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-rose-400 bg-[#263544] p-2.5 rounded-2xl border border-transparent hover:border-rose-400/30 transition-all active:scale-90">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 p-8 sm:p-10 relative">
          <form id="deptForm" onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 text-right">
            
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">اسم القسم</label>
              <div className="relative group">
                <input 
                  type="text" required placeholder="مثال: قسم التعبئة والتغليف"
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold shadow-inner pr-12 placeholder:text-slate-500"
                  value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                />
                <Building2 className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />
              </div>
            </div>

            <div className="relative" ref={empDropdownRef}>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">المشرف (اختياري)</label>
              <div
                onClick={() => { setShowEmpDropdown(true); setTimeout(() => empInputRef.current?.focus(), 50); }}
                className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl outline-none text-white font-bold shadow-inner pr-12 cursor-pointer flex items-center justify-between"
              >
                {selectedEmployee ? (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#C89355]/20 border border-[#C89355]/30 flex items-center justify-center text-[10px] font-black text-[#C89355] shrink-0">
                      {selectedEmployee.name[0]}
                    </div>
                    <span className="text-sm font-bold">{selectedEmployee.name}</span>
                    <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{selectedEmployee.employeeId}</span>
                  </div>
                ) : (
                  <span className="text-slate-500">اختر مشرفاً من الموظفين...</span>
                )}
                <ChevronLeft size={18} className={`text-slate-500 transition-transform ${showEmpDropdown ? "-rotate-90" : ""}`} />
              </div>
              <UserCog className="absolute top-[42px] right-4 text-slate-500 pointer-events-none" size={22} />

              {showEmpDropdown && (
                <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-[#0f1720] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
                  <div className="p-3 border-b border-white/5">
                    <div className="relative">
                      <input
                        ref={empInputRef}
                        type="text"
                        placeholder="ابحث بالاسم أو الكود..."
                        className="w-full p-3 bg-[#1a2530] border border-[#263544] rounded-xl focus:border-[#C89355]/60 outline-none text-white text-sm font-bold pr-10 placeholder:text-slate-500"
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        dir="rtl"
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto custom-scrollbar">
                    {filteredEmployees.length > 0 ? filteredEmployees.map((emp) => {
                      const isSelected = form.manager === emp.employeeId;
                      return (
                        <div
                          key={emp.employeeId}
                          onClick={() => {
                            setForm({ ...form, manager: isSelected ? "" : emp.employeeId });
                            setEmpSearch("");
                            setShowEmpDropdown(false);
                          }}
                          className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                            isSelected ? "bg-[#C89355]/10 border-r-2 border-[#C89355]" : "hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#C89355]/20 border border-[#C89355]/30 flex items-center justify-center text-xs font-black text-[#C89355] shrink-0">
                              {emp.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{emp.name}</p>
                              <p className="text-[10px] font-mono text-slate-500">{emp.employeeId} {emp.residence ? `• ${emp.residence}` : ""}</p>
                            </div>
                          </div>
                          {isSelected && <Check size={16} className="text-[#C89355]" />}
                        </div>
                      );
                    }) : (
                      <div className="px-4 py-8 text-center">
                        <p className="text-slate-500 text-sm">لا توجد نتائج</p>
                      </div>
                    )}
                  </div>
                  {form.manager && (
                    <div className="border-t border-white/5 p-2">
                      <button
                        type="button"
                        onClick={() => { setForm({ ...form, manager: "" }); setShowEmpDropdown(true); }}
                        className="w-full text-center text-xs text-rose-400 hover:text-rose-300 py-2 transition-colors"
                      >
                        إزالة المشرف
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">تاريخ التأسيس / الإنشاء</label>
              <div className="relative group">
                <input 
                  type="date" required 
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 scheme-dark"
                  value={form.date} onChange={(e) => setForm({...form, date: e.target.value})}
                />
                <CalendarDays className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs font-bold text-rose-600">
                {errorMessage}
              </div>
            )}

          </form>
        </div>

        <div className="p-6 sm:p-8 bg-[#1a2530]/80 border-t border-white/5 flex justify-between shrink-0 relative z-10">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-8 py-3.5 rounded-2xl font-bold text-slate-400 bg-[#263544] hover:text-white transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
            إلغاء
          </button>
          <button type="submit" form="deptForm" disabled={isSubmitting} className="bg-[#C89355] text-[#101720] px-10 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:bg-[#d0b468] active:scale-95 transition-all shadow-[0_0_20px_rgba(200,147,85,0.3)] disabled:opacity-70 disabled:cursor-not-allowed">
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSubmitting ? "جارٍ الحفظ..." : "حفظ القسم"}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

export default function AddDepartmentModal(props: Props) {
  const isMounted = typeof document !== "undefined";

  if (!props.isOpen || !isMounted) return null;

  const modalKey = props.initialData?.originalName ?? props.initialData?.name ?? "new";

  return <DepartmentModalContent key={modalKey} {...props} />;
}