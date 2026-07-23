"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  Save,
  UserCog,
  Phone,
  User,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Coins,
  Users,
  UserCircle,
  Calendar,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useRoles } from "@/hooks/useRoles";
import useDepartments from "@/hooks/useDepartments";
import type { Employee } from "@/types/employee";

type EmployeeWithExtendedFields = Employee & {
  username?: string | null;
  birthDate?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  jobTitle?: string | null;
  baseSalary?: number | string | { $numberDecimal: string } | null;
  lumpSumSalary?: number | string | { $numberDecimal: string } | null;
  livingAllowance?: number | string | { $numberDecimal: string } | null;
  transportAllowance?: number | string | { $numberDecimal: string } | null;
  transportAllowanceOverride?: number | string | { $numberDecimal: string } | null;
  insuranceAmount?: number | string | { $numberDecimal: string } | null;
};

const asText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value && "$numberDecimal" in value) {
    const decimal = (value as { $numberDecimal?: string }).$numberDecimal;
    return decimal || "";
  }
  return String(value);
};

// تنسيق الأرقام مع فواصل الآلاف
const formatNumberWithCommas = (val: string) => {
  if (!val) return "";
  const numericOnly = val.replace(/\D/g, "");
  return numericOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// إزالة الفواصل قبل الإرسال للسيرفر
const removeCommas = (val: string) => {
  return val.replace(/,/g, "");
};

const normalizeDateValue = (value?: string | null) => {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value;
};

export type AddEmployeeFormData = {
  employeeId: string;
  name: string;
  username: string;
  mobile: string;
  birthDate: string;
  gender: string;
  jobTitle: string;
  department: string;
  baseSalary: string;
  lumpSumSalary: string;
  livingAllowance: string;
  transportAllowance: string;
  insuranceAmount: string;
  scheduledStart: string;
  scheduledEnd: string;
  roleId: string;
  residence?: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddEmployeeFormData) => void;
  isPending: boolean;
  initialData?: EmployeeWithExtendedFields | null;
  nextSuggestedId?: string;
  existingIds?: string[];
}

const defaultFormState = {
  employeeId: "",
  name: "",
  username: "",
  mobile: "",
  birthDate: "",
  gender: "male",
  jobTitle: "",
  department: "قسم القص",
  baseSalary: "",
  lumpSumSalary: "",
  livingAllowance: "",
  transportAllowance: "",
  insuranceAmount: "",
  scheduledStart: "08:00",
  scheduledEnd: "16:00",
  roleId: "",
  residence: "",
};

export default function AddEmployeeModal({
  isOpen,
  onClose,
  onSave,
  isPending,
  initialData,
  nextSuggestedId = "EMP001",
  existingIds = [],
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [mobileError, setMobileError] = useState("");
  const [idError] = useState(() => {
    if (!initialData && existingIds.includes(nextSuggestedId)) {
      return "كود الموظف هذا مُستَخدم مسبقاً. لن يتم حفظ الموظف بهذا الكود.";
    }
    return "";
  });
  const [roleError, setRoleError] = useState("");
  const [isUsernameManuallyEdited, setIsUsernameManuallyEdited] = useState(false);

  const { data: roleOptions = [], isLoading: rolesLoading } = useRoles();
  const { data: deptsData } = useDepartments();
  const prevIsOpen = useRef(isOpen);

  const buildFormState = useCallback(
    (employee?: EmployeeWithExtendedFields | null) => {
      if (employee) {
        return {
          employeeId: employee.employeeId || "",
          name: employee.name || "",
          // تم إلغاء الدمج ليعود لأخذ الاسم الأول فقط
          username: employee.username || employee.name?.split(" ")[0] || "",
          mobile: employee.mobile || "",
          birthDate: normalizeDateValue(employee.dateOfBirth ?? undefined),
          gender: employee.gender || "male",
          jobTitle: employee.jobTitle || employee.profession || "",
          department: employee.department || "قسم القص",
          baseSalary: formatNumberWithCommas(asText(employee.baseSalary || "")),
          lumpSumSalary: asText(employee.lumpSumSalary || ""),
          livingAllowance: formatNumberWithCommas(asText(employee.livingAllowance || "")),
          transportAllowance: formatNumberWithCommas(asText((employee.transportAllowanceOverride ?? employee.transportAllowance) || "")),
          insuranceAmount: formatNumberWithCommas(asText(employee.insuranceAmount || "")),
          scheduledStart: employee.scheduledStart || "08:00",
          scheduledEnd: employee.scheduledEnd || "16:00",
          roleId: employee.roleId || "",
          residence: employee.residence || "",
        };
      }

      return {
        ...defaultFormState,
        employeeId: nextSuggestedId,
      };
    },
    [nextSuggestedId],
  );

  const [formData, setFormData] = useState(() => buildFormState(initialData));

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && prevIsOpen.current) {
      setStep(1);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

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
    const val = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, mobile: val });
    if (mobileError && /^09[0-9]{8}$/.test(val)) {
      setMobileError("");
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;

    // تم إعادة المنطق القديم: تعبئة اسم المستخدم بالاسم الأول فقط
    if (!isUsernameManuallyEdited) {
      const firstName = newName.trim().split(" ")[0] || "";
      setFormData({ ...formData, name: newName, username: firstName });
    } else {
      setFormData({ ...formData, name: newName });
    }
  };

  const resolvedRoleId = formData.roleId || roleOptions[0]?.id || "";

  const liveTotalSalary = useCallback(() => {
    const base = Number(removeCommas(formData.baseSalary) || 0);
    const living = Number(removeCommas(formData.livingAllowance) || 0);
    const transport = Number(removeCommas(formData.transportAllowance) || 0);
    const insurance = Number(removeCommas(formData.insuranceAmount) || 0);
    return base + living + transport - insurance;
  }, [formData.baseSalary, formData.livingAllowance, formData.transportAllowance, formData.insuranceAmount]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idError) {
      toast.error(idError);
      return;
    }

    if (step === 1) {
      if (!validateMobile(formData.mobile)) return;

      // 🌟 الحماية من الكود الحالي: التحقق من التاريخ والعمر (10 سنوات) 🌟
      if (!formData.birthDate || formData.birthDate.length !== 10) {
        toast.error("الرجاء اختيار تاريخ الميلاد بشكل صحيح");
        return;
      }

      const birthDateObj = new Date(formData.birthDate);
      if (isNaN(birthDateObj.getTime())) {
        toast.error("الرجاء اختيار تاريخ الميلاد بشكل صحيح");
        return;
      }

      const today = new Date();

      let age = today.getFullYear() - birthDateObj.getFullYear();
      const monthDifference = today.getMonth() - birthDateObj.getMonth();

      if (
        monthDifference < 0 ||
        (monthDifference === 0 && today.getDate() < birthDateObj.getDate())
      ) {
        age--; // طرح سنة إذا لم يأتِ شهر/يوم الميلاد بعد في السنة الحالية
      }

      if (age < 10) {
        toast.error("عمر الموظف يجب أن لا يقل عن 10 سنوات. يرجى التأكد من تاريخ الميلاد.");
        return; // نمنع الانتقال للخطوة التالية
      }

      setStep(2);
    } else {
      if (!resolvedRoleId) {
        setRoleError("يجب اختيار الدور الوظيفي");
        return;
      }

      const dataToSave = {
        ...formData,
        roleId: resolvedRoleId,
        baseSalary: removeCommas(formData.baseSalary),
        livingAllowance: removeCommas(formData.livingAllowance),
        transportAllowance: removeCommas(formData.transportAllowance),
        insuranceAmount: removeCommas(formData.insuranceAmount),
        lumpSumSalary: "0",
      };

      onSave(dataToSave);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-[#101720]/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 transition-all duration-300"
      style={{zIndex: 9998}} // 🌟 حماية الـ Pop-up من الكود الحالي
      dir="rtl"
    >
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 border border-white/5 outline-dashed outline-1 outline-[#C89355]/20 outline-offset-[-6px]">
        {/* Header */}
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

        {/* Progress Bar */}
        <div className="px-6 pt-6 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ease-out flex-1 ${step >= 1 ? "bg-[#C89355] shadow-[0_0_10px_rgba(200,147,85,0.4)]" : "bg-[#263544]"}`}
            />
            <div className="w-3" />
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ease-out flex-1 ${step === 2 ? "bg-[#C89355] shadow-[0_0_10px_rgba(200,147,85,0.4)]" : "bg-[#263544]"}`}
            />
          </div>
          <div className="flex justify-between text-[11px] sm:text-xs font-bold px-1">
            <span
              className={`transition-colors duration-300 ${step >= 1 ? "text-[#C89355]" : "text-slate-500"}`}
            >
              البيانات الشخصية
            </span>
            <span
              className={`transition-colors duration-300 ${step === 2 ? "text-[#C89355]" : "text-slate-500"}`}
            >
              البيانات الوظيفية والمالية
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 relative">
          <form
            id="employeeForm"
            onSubmit={handleFormSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-5 text-right relative z-10"
          >
            {/* ─── الخطوة الأولى: البيانات الشخصية ─── */}
            <div
              className={`col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 transition-all duration-500 ${step === 1 ? "block animate-in slide-in-from-right-8" : "hidden"}`}
            >
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-[#C89355] mb-2">
                  اسم الموظف الثلاثي
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    required
                    placeholder="أدخل الاسم الثلاثي"
                    className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner pr-12 placeholder:text-slate-500"
                    value={formData.name}
                    onChange={handleNameChange}
                  />
                  <User
                    className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors"
                    size={20}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">رقم الموبايل</label>
                <div className="relative group">
                  <input
                    type="tel"
                    required
                    placeholder="09xxxxxxxx"
                    maxLength={10}
                    className={`w-full p-4 bg-[#1a2530] border rounded-xl focus:ring-2 outline-none transition-all text-white font-bold shadow-inner placeholder:text-slate-500 pl-11 dir-ltr text-right ${
                      mobileError
                        ? "border-rose-500 focus:ring-rose-500/30 focus:border-rose-500"
                        : "border-[#263544] focus:ring-[#C89355]/30 focus:border-[#C89355]"
                    }`}
                    value={formData.mobile}
                    onChange={handleMobileChange}
                  />
                  <Phone
                    className={`absolute left-4 top-4 transition-colors ${mobileError ? "text-rose-500" : "text-slate-500 group-focus-within:text-[#C89355]"}`}
                    size={20}
                  />
                </div>
                {mobileError && (
                  <p className="text-xs text-rose-400 font-bold mt-1.5">{mobileError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">
                  كود الموظف (ID)
                </label>
                <input
                  type="text"
                  placeholder="مثال: EMP001"
                  required
                  pattern="^EMP[0-9]{3,}$"
                  readOnly
                  className={`w-full p-4 bg-[#1a2530]/80 border rounded-xl focus:ring-2 outline-none transition-all text-left font-mono font-bold text-white shadow-inner placeholder:text-slate-500 cursor-not-allowed ${
                    idError
                      ? "border-rose-500 focus:ring-rose-500/30 focus:border-rose-500"
                      : "border-[#263544] focus:ring-[#C89355]/30 focus:border-[#C89355]"
                  }`}
                  dir="ltr"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                />
                {idError && <p className="text-xs text-rose-400 font-bold mt-1.5">{idError}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">مكان الإقامة</label>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="مثال: دوما، دمشق"
                    className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner placeholder:text-slate-500"
                    value={formData.residence}
                    onChange={(e) => setFormData({ ...formData, residence: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">اسم المستخدم</label>
                <div className="relative group">
                  <input
                    type="text"
                    className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner placeholder:text-slate-500 pr-11"
                    value={formData.username}
                    onChange={(e) => {
                      setIsUsernameManuallyEdited(true);
                      setFormData({ ...formData, username: e.target.value });
                    }}
                    placeholder="الاسم المستعار للنظام"
                  />
                  <UserCircle
                    className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors"
                    size={20}
                  />
                </div>
              </div>

              {/* 🌟 حقل تاريخ الميلاد بالتصميم الداكن السليم من الكود الحالي 🌟 */}
              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">تاريخ الميلاد</label>
                <div className="relative group">
                  <input
                    type="date"
                    required
                    className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-mono font-bold shadow-inner pr-12 text-left scheme-dark"
                    dir="ltr"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  />
                  <Calendar
                    className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors"
                    size={22}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">الجنس</label>
                <div className="relative group">
                  <select
                    required
                    className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner cursor-pointer pr-12 appearance-none"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                  <Users
                    className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors pointer-events-none"
                    size={20}
                  />
                </div>
              </div>
            </div>

            {/* ─── الخطوة الثانية: البيانات الوظيفية والمالية ─── */}
            <div
              className={`col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 transition-all duration-500 ${step === 2 ? "block animate-in slide-in-from-left-8" : "hidden"}`}
            >
              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">
                  القسم التابع له
                </label>
                <select
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner cursor-pointer"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                >
                  {(Array.isArray(deptsData?.departments) ? deptsData.departments : []).map(
                    (d: { id: string; name: string }) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">الدور الوظيفي</label>
                {roleOptions.length > 0 ? (
                  <select
                    required={step === 2}
                    className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner cursor-pointer"
                    value={formData.roleId || roleOptions[0]?.id || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, roleId: e.target.value });
                      if (roleError) setRoleError("");
                    }}
                  >
                    {roleOptions.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required={step === 2}
                    placeholder="أدخل Role ID"
                    className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner"
                    value={formData.roleId}
                    onChange={(e) => {
                      setFormData({ ...formData, roleId: e.target.value });
                      if (roleError) setRoleError("");
                    }}
                  />
                )}
                {rolesLoading && (
                  <p className="text-xs text-slate-400 font-semibold mt-1">جاري تحميل الأدوار...</p>
                )}
                {roleError && <p className="text-xs text-rose-400 font-bold mt-1.5">{roleError}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#C89355] mb-2">
                  المسمى الوظيفي
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    required={step === 2}
                    placeholder="مثال: حويص، خياط، كواء..."
                    className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner pr-11 placeholder:text-slate-500"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  />
                  <Briefcase
                    className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors"
                    size={20}
                  />
                </div>
              </div>

              <div className="md:col-span-2 bg-[#1a2530] p-6 rounded-2xl border border-[#263544] shadow-inner mt-2">
                <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
                  <Coins size={22} className="text-[#C89355]" />
                  <span className="text-base font-bold text-white">معلومات الراتب</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="baseSalary"
                      className="block text-xs font-bold text-[#C89355] mb-2"
                    >
                      الراتب الأساسي (ل.س)
                    </label>
                    <input
                      id="baseSalary"
                      type="text"
                      placeholder="0"
                      className="w-full p-4 bg-[#101720] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-[#C89355] font-mono text-lg font-bold shadow-sm placeholder:text-slate-600 text-left"
                      dir="ltr"
                      value={formData.baseSalary}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          baseSalary: formatNumberWithCommas(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="livingAllowance"
                      className="block text-xs font-bold text-[#C89355] mb-2"
                    >
                      بدل غلاء المعيشة (ل.س)
                    </label>
                    <input
                      id="livingAllowance"
                      type="text"
                      placeholder="0"
                      className="w-full p-4 bg-[#101720] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-[#C89355] font-mono text-lg font-bold shadow-sm placeholder:text-slate-600 text-left"
                      dir="ltr"
                      value={formData.livingAllowance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          livingAllowance: formatNumberWithCommas(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="transportAllowance"
                      className="block text-xs font-bold text-[#C89355] mb-2"
                    >
                      بدل المواصلات (ل.س)
                    </label>
                    <input
                      id="transportAllowance"
                      type="text"
                      placeholder="0"
                      className="w-full p-4 bg-[#101720] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-[#C89355] font-mono text-lg font-bold shadow-sm placeholder:text-slate-600 text-left"
                      dir="ltr"
                      value={formData.transportAllowance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          transportAllowance: formatNumberWithCommas(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <div>
                    <label
                      htmlFor="insuranceAmount"
                      className="block text-xs font-bold text-rose-400 mb-2"
                    >
                      التأمينات — خصم شهري (ل.س)
                    </label>
                    <input
                      id="insuranceAmount"
                      type="text"
                      placeholder="0"
                      className="w-full p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 outline-none transition-all text-rose-400 font-mono text-lg font-bold shadow-sm placeholder:text-slate-600 text-left"
                      dir="ltr"
                      value={formData.insuranceAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          insuranceAmount: formatNumberWithCommas(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-4 font-semibold">
                  💡 يمكنك ترك الحقول فارغة إذا لم تكن مطلوبة (سيتم حفظها كقيمة 0)
                </p>
              </div>

              <div className="bg-[#1a2530] border border-[#263544] p-5 rounded-2xl flex justify-between items-center shadow-inner md:col-span-2">
                <div>
                  <span className="text-xs font-black text-slate-400">الراتب الإجمالي</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">الأساسي + غلاء المعيشة + المواصلات − التأمينات</p>
                </div>
                <span className="text-2xl font-mono font-black text-[#C89355]">
                  {(() => {
                    const t = liveTotalSalary();
                    return t > 0 ? t.toLocaleString() : "—";
                  })()} <span className="text-xs text-slate-500">ل.س</span>
                </span>
              </div>

              <div className="bg-[#1a2530] p-6 rounded-2xl border border-[#263544] md:col-span-2 grid grid-cols-2 gap-6 shadow-inner">
                <div className="col-span-2 flex items-center gap-2 border-b border-white/5 pb-4">
                  <CalendarDays size={22} className="text-[#C89355]" />
                  <span className="text-base font-bold text-white">أوقات الدوام المجدولة</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#C89355] mb-2">وقت الحضور</label>
                  <input
                    type="time"
                    required={step === 2}
                    className="w-full p-4 bg-[#101720] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-mono text-lg font-bold text-center shadow-sm scheme-dark"
                    value={formData.scheduledStart}
                    onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#C89355] mb-2">
                    وقت الانصراف
                  </label>
                  <input
                    type="time"
                    required={step === 2}
                    className="w-full p-4 bg-[#101720] border border-[#263544] rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-mono text-lg font-bold text-center shadow-sm scheme-dark"
                    value={formData.scheduledEnd}
                    onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 bg-[#1a2530]/80 border-t border-white/5 flex justify-between shrink-0 relative z-10">
          {step === 1 ? (
            <button
              type="button"
              onClick={onClose}
              className="px-6 sm:px-8 py-3 rounded-xl font-bold text-slate-300 bg-[#263544] hover:bg-[#324559] hover:text-white border border-transparent active:scale-95 transition-all text-sm sm:text-base"
            >
              إلغاء الإضافة
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(1)}
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
              <>
                متابعة <ChevronLeft size={18} />
              </>
            ) : isPending ? (
              <>
                <Loader2 className="animate-spin" size={20} /> جاري الحفظ...
              </>
            ) : (
              <>
                <Save size={20} /> حفظ بيانات الموظف
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
