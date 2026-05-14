"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Save, UserCog, Phone, User, Briefcase, ChevronRight, ChevronLeft, CalendarDays, Coins, CalendarHeart, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { Employee } from "@/types/employee";

type EmployeeWithExtendedFields = Employee & {
  age?: number | string;
  gender?: string;
  jobTitle?: string;
  baseSalary?: number | string;
  livingAllowance?: number | string;
};

const asText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value && "$numberDecimal" in value) {
    const decimal = (value as { $numberDecimal?: string }).$numberDecimal;
    return decimal || "";
  }
  return String(value);
};

export type AddEmployeeFormData = {
  employeeId: string;
  name: string;
  mobile: string;
  age: number;
  gender: string;
  jobTitle: string;
  department: string;
  baseSalary: string;
  livingAllowance: string;
  scheduledStart: string;
  scheduledEnd: string;
  roleId: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddEmployeeFormData) => void;
  isPending: boolean;
  initialData?: EmployeeWithExtendedFields | null;
}

interface RoleOption {
  id: string;
  name: string;
}

const defaultFormState = {
  employeeId: "",
  name: "",
  mobile: "",
  age: "",
  gender: "male",
  jobTitle: "",
  department: "قسم القص", 
  baseSalary: "",
  livingAllowance: "0",
  scheduledStart: "08:00",
  scheduledEnd: "16:00",
  roleId: "",
};

export default function AddEmployeeModal({ isOpen, onClose, onSave, isPending, initialData }: Props) {
  // 👇 هذا هو السطر الذي حذفه المحرر بالخطأ، أعدناه هنا! 👇
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [mobileError, setMobileError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        employeeId: initialData.employeeId || "",
        name: initialData.name || "",
        mobile: initialData.mobile || "",
        age: asText(initialData.age),
        gender: initialData.gender || "male",
        jobTitle: initialData.jobTitle || "",
        department: initialData.department || "قسم القص",
        baseSalary: asText(initialData.baseSalary),
        livingAllowance: asText(initialData.livingAllowance ?? "0"),
        scheduledStart: initialData.scheduledStart || "08:00",
        scheduledEnd: initialData.scheduledEnd || "16:00",
        roleId: initialData.roleId || "",
      };
    }
    return { ...defaultFormState, roleId: "" };
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery<RoleOption[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await apiClient.get("/auth/roles");
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: isOpen,
  });

  const resolvedRoleId = formData.roleId || initialData?.roleId || roles[0]?.id || "";

  if (!isOpen || !mounted) return null;

  const validateMobile = (number: string) => {
    const isValid = /^09[0-9]{8}$/.test(number);
    if (!isValid) {
      setMobileError("يجب أن يكون الرقم سوري (10 أرقام ويبدأ بـ 09)");
      return false;
    }
    setMobileError("");
    return true;
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); 
    setFormData({ ...formData, mobile: val });
    if (mobileError && /^09[0-9]{8}$/.test(val)) {
      setMobileError("");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!validateMobile(formData.mobile)) return;
      setStep(2);
    } else {
      onSave({
        ...formData,
        age: Number(formData.age),
        roleId: resolvedRoleId,
      });
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-[#101720]/80 backdrop-blur-md flex items-center justify-center z-999999 p-4 sm:p-6 transition-all duration-300" dir="rtl">
      <div className="bg-[#101720] rounded-4xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 border border-white/5  outline-dashed outline-1 outline-[#C89355]/20 outline-offset-[-6px]">
        
        <div className="p-5 sm:p-6 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-[#C89355]/10 p-2.5 rounded-xl border border-[#C89355]/20 shadow-[0_0_15px_rgba(200,147,85,0.15)]">
               <UserCog className="text-[#C89355]" size={24} />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
              {initialData ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-rose-400 bg-[#263544] p-2 rounded-xl shadow-sm border border-transparent hover:border-rose-400/30 transition-all hover:bg-rose-500/10 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pt-6 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className={`h-2.5 rounded-full transition-all duration-500 ease-out flex-1 ${step >= 1 ? 'bg-[#C89355] shadow-[0_0_10px_rgba(200,147,85,0.4)]' : 'bg-[#263544]'}`} />
            <div className="w-3" />
            <div className={`h-2.5 rounded-full transition-all duration-500 ease-out flex-1 ${step === 2 ? 'bg-[#C89355] shadow-[0_0_10px_rgba(200,147,85,0.4)]' : 'bg-[#263544]'}`} />
          </div>
          <div className="flex justify-between text-[11px] sm:text-xs font-bold px-1">
            <span className={`transition-colors duration-300 ${step >= 1 ? 'text-[#C89355]' : 'text-slate-500'}`}>البيانات الشخصية</span>
            <span className={`transition-colors duration-300 ${step === 2 ? 'text-[#C89355]' : 'text-slate-500'}`}>البيانات الوظيفية والمالية</span>
          </div>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 relative">
          <form id="employeeForm" onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 text-right relative z-10">
            
            <div className={`col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 transition-all duration-500 ${step === 1 ? 'block animate-in slide-in-from-right-8' : 'hidden'}`}>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-[#C89355] mb-2">اسم الموظف الرباعي</label>
                <div className="relative group">
                  <input 
                    type="text" required placeholder="مثال: أحمد محمد خالد الجابر"
                    className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner pr-11 placeholder:text-slate-500"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                  <User className="absolute right-4 top-3.5 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={20} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">رقم الموبايل</label>
                <div className="relative group">
                  <input 
                    type="tel" required placeholder="09xxxxxxxx" maxLength={10}
                    className={`w-full p-3.5 bg-[#1a2530] border rounded-xl focus:ring-2 outline-none transition-all text-white font-bold shadow-inner placeholder:text-slate-500 pl-11 dir-ltr text-right ${
                      mobileError ? 'border-rose-500 focus:ring-rose-500/30 focus:border-rose-500' : 'border-[#263544] focus:ring-[#C89355]/30 focus:border-[#C89355]'
                    }`}
                    value={formData.mobile}
                    onChange={handleMobileChange}
                  />
                  <Phone className={`absolute left-4 top-3.5 transition-colors ${mobileError ? 'text-rose-500' : 'text-slate-500 group-focus-within:text-[#C89355]'}`} size={20} />
                </div>
                {mobileError && <p className="text-xs text-rose-400 font-bold mt-1.5">{mobileError}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">كود الموظف (ID)</label>
                <input 
                  type="text" placeholder="مثال: EMP001" required pattern="^EMP[0-9]{3,}$"
                  disabled={!!initialData}
                  className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-left font-mono font-bold text-white disabled:opacity-50 disabled:bg-[#101720] shadow-inner placeholder:text-slate-500"
                  dir="ltr"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">تاريخ الميلاد / العمر</label>
                <div className="relative group">
                  <input 
                    type="number" required min={16} max={80} placeholder="مثال: 28"
                    className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-mono font-bold shadow-inner pr-11 placeholder:text-slate-500"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                  />
                  <CalendarHeart className="absolute right-4 top-3.5 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={20} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">الجنس</label>
                <div className="relative group">
                  <select 
                    required
                    className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner cursor-pointer pr-11 appearance-none"
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                  <Users className="absolute right-4 top-3.5 text-slate-500 group-focus-within:text-[#C89355] transition-colors pointer-events-none" size={20} />
                </div>
              </div>

            </div>

            <div className={`col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 transition-all duration-500 ${step === 2 ? 'block animate-in slide-in-from-left-8' : 'hidden'}`}>
              
              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">القسم التابع له</label>
                <select 
                  className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner cursor-pointer"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                >
                  <option value="قسم القص">قسم القص</option>
                  <option value="قسم الخياطة">قسم الخياطة</option>
                  <option value="قسم التعبئة والتغليف">قسم التعبئة والتغليف</option>
                  <option value="المستودع">المستودع</option>
                  <option value="الإدارة">الإدارة</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">المسمى الوظيفي</label>
                <div className="relative group">
                  <input 
                    type="text" required={step === 2} placeholder="مثال: حويص، خياط، كواء..."
                    className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner pr-11 placeholder:text-slate-500"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                  />
                  <Briefcase className="absolute right-4 top-3.5 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={20} />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-[#C89355] mb-2">صلاحية الدخول للنظام (الرتبة)</label>
                <select 
                  required={step === 2} disabled={rolesLoading}
                  className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner cursor-pointer disabled:opacity-50 disabled:bg-[#101720]"
                  value={resolvedRoleId}
                  onChange={(e) => setFormData({...formData, roleId: e.target.value})}
                >
                  {rolesLoading ? (
                    <option value="">جاري التحميل...</option>
                  ) : (
                    roles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">الراتب الشهري الأساسي (ل.س)</label>
                <div className="relative group">
                  <input 
                    type="text" required={step === 2} inputMode="decimal" placeholder="مثال: 500000"
                    className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-[#C89355] font-mono text-lg font-black shadow-inner pr-11 placeholder:text-slate-600"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({...formData, baseSalary: e.target.value})}
                  />
                  <Coins className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={20} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">بدل غلاء معيشة (ل.س)</label>
                <div className="relative group">
                  <input 
                    type="text" required={step === 2} inputMode="decimal" placeholder="0"
                    className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-mono text-lg font-bold shadow-inner pr-11 placeholder:text-slate-600"
                    value={formData.livingAllowance}
                    onChange={(e) => setFormData({...formData, livingAllowance: e.target.value})}
                  />
                   <Coins className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={20} />
                </div>
              </div>

              <div className="bg-[#1a2530] p-5 rounded-2xl border border-[#263544] md:col-span-2 grid grid-cols-2 gap-5 shadow-inner">
                <div className="col-span-2 flex items-center gap-2 border-b border-white/5 pb-3">
                  <CalendarDays size={20} className="text-[#C89355]" />
                  <span className="text-sm font-bold text-white">أوقات الدوام المجدولة</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">وقت الحضور</label>
                  <input 
                    type="time" required={step === 2}
                    className="w-full p-3 bg-[#101720] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-mono font-bold text-center shadow-sm scheme:dark"
                    value={formData.scheduledStart}
                    onChange={(e) => setFormData({...formData, scheduledStart: e.target.value})}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">وقت الانصراف</label>
                  <input 
                    type="time" required={step === 2}
                    className="w-full p-3 bg-[#101720] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-mono font-bold text-center shadow-sm scheme:dark"
                    value={formData.scheduledEnd}
                    onChange={(e) => setFormData({...formData, scheduledEnd: e.target.value})}
                    dir="ltr"
                  />
                </div>
              </div>

            </div>
          </form>
        </div>

        <div className="p-5 sm:p-6 bg-[#1a2530]/80 border-t border-white/5 flex justify-between shrink-0 relative z-10">
          {step === 1 ? (
             <button 
               type="button" onClick={onClose}
               className="px-6 sm:px-8 py-3 rounded-xl font-bold text-slate-300 bg-[#263544] hover:bg-[#324559] hover:text-white border border-transparent active:scale-95 transition-all text-sm sm:text-base"
             >
               إلغاء الإضافة
             </button>
          ) : (
             <button 
               type="button" onClick={() => setStep(1)}
               className="px-6 sm:px-8 py-3 rounded-xl font-bold text-slate-300 bg-[#263544] border border-transparent hover:bg-[#324559] hover:text-white active:scale-95 transition-all flex items-center gap-2 text-sm sm:text-base shadow-sm"
             >
               <ChevronRight size={18} /> السابق
             </button>
          )}

          <button 
            type="submit"
            form="employeeForm"
            disabled={isPending}
            className="bg-[#C89355] text-[#101720] px-8 sm:px-10 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-[#b07d45] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(200,147,85,0.3)] text-sm sm:text-base"
          >
            {step === 1 ? (
              <>متابعة <ChevronLeft size={18} /></>
            ) : isPending ? (
              <><Loader2 className="animate-spin" size={20} /> جاري الحفظ...</>
            ) : (
              <><Save size={20} /> حفظ بيانات الموظف</>
            )}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}