"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Building2, UserCog, CalendarDays, Save, Loader2 } from "lucide-react";
import apiClient from "@/lib/api-client";
import useDepartments from "@/hooks/useDepartments";
import { useQueryClient } from '@tanstack/react-query';

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
    const { createDepartment, updateDepartment } = useDepartments();

  // use real API via hook
  // submit to /api/departments
    const submitDepartment = async (payload: DeptFormData) => {
      const id = (initialData as any)?.id as string | undefined;
      if (id) {
        await updateDepartment.mutateAsync({ id, name: payload.name } as any);
        return;
      }

      // create
      await createDepartment.mutateAsync({ name: payload.name } as any);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // تعبئة البيانات في حال التعديل، أو تفريغها في حال الإضافة
      if (initialData) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm(initialData);
      } else {
        setForm({ name: "", manager: "", date: new Date().toISOString().split('T')[0] });
      }
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
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
      setErrorMessage("تعذر حفظ القسم حالياً. حاول مرة أخرى.");
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

            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">اسم المشرف (اختياري)</label>
              <div className="relative group">
                <input 
                  type="text" placeholder="مثال: محمد الأحمد"
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold shadow-inner pr-12 placeholder:text-slate-500"
                  value={form.manager} onChange={(e) => setForm({...form, manager: e.target.value})}
                />
                <UserCog className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />
              </div>
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