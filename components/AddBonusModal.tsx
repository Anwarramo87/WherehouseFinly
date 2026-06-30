"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Loader2, Save, X, Calculator, Search, Gift, 
  TrendingUp, Zap, Briefcase, Award, ChevronDown, 
  Calendar, Coins, HeartHandshake, FileText 
} from "lucide-react";
import { BonusInput } from "@/types/bonus";
import type { Salary } from "@/types/salary";

interface AddBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BonusInput) => void;
  isPending?: boolean;
  employees: Array<{ employeeId: string; name: string; hourlyRate?: number | string | { $numberDecimal: string } }>;
  salaries?: Salary[];
  initialData?: {
    id?: string;
    employeeId?: string;
    bonusAmount?: number | string | { $numberDecimal: string };
    bonusReason?: string | null;
    assistanceAmount?: number | string | { $numberDecimal: string };
    period?: string | null;
  } | null;
}

const asStringAmount = (value?: number | string | { $numberDecimal: string }) => {
  if (value && typeof value === "object" && "$numberDecimal" in value) {
    return value.$numberDecimal || "";
  }
  return value?.toString() || "";
};

const toNumber = (value: unknown): number => {
  if (value && typeof value === "object" && "$numberDecimal" in (value as Record<string, unknown>)) {
    return Number((value as { $numberDecimal: string }).$numberDecimal || 0);
  }
  return Number(value || 0);
};

// 🌟 الدالة السحرية لتنسيق الأرقام مع فواصل الآلاف
const formatWithCommas = (value: string | number) => {
  if (!value) return "";
  // إزالة أي فواصل سابقة أو أحرف غير رقمية (مع السماح بالنقطة العشرية)
  const raw = value.toString().replace(/,/g, "").replace(/[^0-9.]/g, "");
  const parts = raw.split(".");
  // إضافة الفاصلة كل 3 خانات للرقم الصحيح
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  // إرجاع الرقم مع القسم العشري إذا وجد
  return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
};

const currentPeriod = (() => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
})();

const defaultForm: BonusInput = {
  employeeId: "",
  bonusAmount: "",
  bonusReason: "",
  assistanceAmount: "",
  period: currentPeriod,
};

const REWARD_TYPES = [
  { value: "مكافأة", label: "مكافأة" },
  { value: "زيادة راتب", label: "زيادة راتب" },
  { value: "بدل حوافز إنتاجية", label: "بدل حوافز إنتاجية" },
  { value: "تعويض مسؤولية", label: "تعويض مسؤولية" },
  { value: "جهد إضافي", label: "جهد إضافي" },
];

const ALLOWANCE_TYPES = ["بدل حوافز إنتاجية", "تعويض مسؤولية", "جهد إضافي"];

export default function AddBonusModal({ isOpen, onClose, onSave, isPending, employees, salaries = [], initialData }: AddBonusModalProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Initialize searchQuery based on initialData - recalculate when dependencies change
  const searchQuery = useMemo(() => {
    if (initialData?.employeeId) {
      const emp = employees.find(e => e.employeeId === initialData.employeeId);
      if (emp) return `${emp.employeeId} - ${emp.name}`;
      return initialData.employeeId;
    }
    return "";
  }, [initialData, employees]);
  
  const [searchQueryInput, setSearchQueryInput] = useState(searchQuery);

  const [form, setForm] = useState<BonusInput>(() => {
    if (initialData) {
      return {
        employeeId: initialData.employeeId || "",
        bonusAmount: asStringAmount(initialData.bonusAmount),
        bonusReason: initialData.bonusReason || "",
        assistanceAmount: asStringAmount(initialData.assistanceAmount),
        period: initialData.period || currentPeriod,
      };
    }
    return defaultForm;
  });

  const [selectedType, setSelectedType] = useState<string>("مكافأة");
  const [includeDate, setIncludeDate] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string>("");

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [selectAll, setSelectAll] = useState(false);

  const filteredEmployees = useMemo(() => {
    if (!searchQueryInput) return employees;
    return employees.filter(emp =>
      (emp.name || "").toLowerCase().includes(searchQueryInput.toLowerCase()) ||
      (emp.employeeId || "").toLowerCase().includes(searchQueryInput.toLowerCase())
    );
  }, [employees, searchQueryInput]);

  if (!isOpen) return null;

  const isEditMode = !!initialData;
  const isAllowanceType = ALLOWANCE_TYPES.includes(selectedType);

  const handleSelectEmployee = (emp: typeof employees[0]) => {
    setForm((p) => ({ ...p, employeeId: emp.employeeId }));
    setSearchQueryInput(`${emp.employeeId} - ${emp.name}`);
    setIsDropdownOpen(false);
    setCalculationError("");
  };

  const handleCalculateAllowance = async () => {
    if (!form.employeeId) {
      setCalculationError("الرجاء اختيار موظف أولاً");
      return;
    }

    setCalculationError("");
    setIsCalculating(true);

    try {
      const salaryConfig = salaries.find(s => s.employeeId === form.employeeId);
      let baseSalary = 0;
      let lumpSumSalary = 0;
      let livingAllowance = 0;

      if (salaryConfig) {
        baseSalary = toNumber(salaryConfig.baseSalary);
        lumpSumSalary = toNumber(salaryConfig.lumpSumSalary);
        livingAllowance = toNumber(salaryConfig.livingAllowance);
      } else {
        const employee = employees.find(e => e.employeeId === form.employeeId);
        if (employee?.hourlyRate) {
          baseSalary = toNumber(employee.hourlyRate);
        }
      }

      if (baseSalary === 0) {
        setCalculationError("لا يوجد راتب مضبوط لهذا الموظف");
        setIsCalculating(false);
        return;
      }

      const response = await fetch("/api/salary/calculate-allowances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salary: baseSalary,
          lumpSumSalary: lumpSumSalary,
          livingAllowance: livingAllowance,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error?.message || json?.message || "خطأ في حساب البدل");
      }

      let calculatedAmount = 0;
      if (selectedType === "تعويض مسؤولية") calculatedAmount = Number(json.responsibilityRounded ?? json.responsibilityAllowance ?? 0);
      else if (selectedType === "جهد إضافي") calculatedAmount = Number(json.extraEffortRounded ?? json.extraEffortAllowance ?? 0);
      else if (selectedType === "بدل حوافز إنتاجية") calculatedAmount = Number(json.productionRounded ?? json.productionIncentives ?? 0);

      setForm(prev => ({ ...prev, bonusAmount: calculatedAmount.toString() }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "فشل في حساب البدل";
      setCalculationError(errorMessage);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) {
      setCalculationError("يرجى اختيار الموظف أولاً");
      return;
    }
    const finalForm = {
      ...form,
      bonusReason: form.bonusReason || selectedType,
    };
    onSave(finalForm);
  };

  const renderTypeIcon = () => {
    const props = { className: "absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors", size: 22 };
    if (selectedType === "زيادة راتب") return <TrendingUp {...props} />;
    if (selectedType === "بدل حوافز إنتاجية") return <Zap {...props} />;
    if (selectedType === "تعويض مسؤولية") return <Briefcase {...props} />;
    if (selectedType === "جهد إضافي") return <Award {...props} />;
    return <Gift {...props} />;
  };

  return createPortal(
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md transition-all duration-300" dir="rtl">
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(200,147,85,0.15)] w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col border border-white/10 outline-dashed outline-1 outline-[#C89355]/30 -outline-offset-8 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl border shadow-[0_0_20px_rgba(200,147,85,0.15)] ${isEditMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-[#C89355]/10 border-[#C89355]/20'}`}>
              {isEditMode ? <Gift className="text-emerald-500" size={28} /> : <Gift className="text-[#C89355]" size={28} />}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                {isEditMode ? "تعديل المكافأة" : "إضافة مكافأة أو بدل"}
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-1">سيتم إضافة هذا المبلغ للاستحقاقات في المسير النهائي</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-rose-400 bg-[#263544] p-2.5 rounded-2xl border border-transparent hover:border-rose-400/30 transition-all hover:rotate-90 active:scale-90">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 p-8 sm:p-10 relative">
          <form id="bonusForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
            
            <div className="md:col-span-2" ref={dropdownRef}>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase tracking-widest">الموظف (الاسم أو الكود)</label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="اكتب للبحث عن موظف..."
                  disabled={isEditMode}
                  className={`w-full p-4 bg-[#1a2530] border rounded-2xl focus:ring-2 focus:ring-[#C89355]/20 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner pr-12 placeholder:text-slate-500 border-[#263544] ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={searchQueryInput}
                  onChange={(e) => {
                    setSearchQueryInput(e.target.value);
                    if (!isEditMode) setIsDropdownOpen(true);
                  }}
                  onFocus={() => !isEditMode && setIsDropdownOpen(true)}
                />
                <Search className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />

                {isDropdownOpen && !isEditMode && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-full max-h-56 overflow-y-auto custom-scrollbar bg-[#1a2530]/95 backdrop-blur-xl border border-[#263544] rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.5)] z-50 p-2">
                    <div
                      onClick={() => {
                        setForm((p) => ({ ...p, employeeId: "ALL" }));
                        setSearchQueryInput("جميع الموظفين");
                        setSelectAll(true);
                        setIsDropdownOpen(false);
                        setCalculationError("");
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-[#263544] rounded-xl cursor-pointer transition-all hover:scale-[0.98] border-b border-[#263544] mb-1"
                    >
                      <div className="bg-[#C89355]/20 px-2 py-1 rounded-lg text-xs font-mono font-bold text-[#C89355] border border-[#C89355]/30 shadow-sm">ALL</div>
                      <span className="font-bold text-white text-sm">جميع الموظفين</span>
                    </div>
                    {filteredEmployees.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 font-bold text-sm">لا يوجد موظف بهذا الاسم أو الكود</div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <div
                          key={emp.employeeId}
                          onClick={() => handleSelectEmployee(emp)}
                          className="flex items-center gap-3 p-3 hover:bg-[#263544] rounded-xl cursor-pointer transition-all hover:scale-[0.98]"
                        >
                          <div className="bg-[#101720] px-2 py-1 rounded-lg text-xs font-mono font-bold text-[#C89355] border border-[#263544] shadow-sm">{emp.employeeId}</div>
                          <span className="font-bold text-white text-sm">{emp.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase tracking-widest">الفترة المستحقة</label>
              <div className="relative group">
                <input
                  type={includeDate ? "date" : "month"}
                  value={includeDate ? (form.period ? `${form.period}-01` : "") : (form.period || "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (includeDate) {
                      setForm((p) => ({ ...p, period: val.slice(0, 7) }));
                    } else {
                      setForm((p) => ({ ...p, period: val }));
                    }
                  }}
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/20 focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 scheme-dark transition-all"
                />
                <Calendar className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />
              </div>
              <button
                type="button"
                onClick={() => setIncludeDate(!includeDate)}
                className="text-xs font-bold text-[#C89355]/70 hover:text-[#C89355] mt-1.5 transition-colors"
              >
                {includeDate ? "تحديد شهر فقط" : "تحديد يوم محدد"}
              </button>
            </div>

            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase tracking-widest">نوع المكافأة</label>
              <div className="relative group">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/20 focus:border-[#C89355] outline-none text-white font-bold cursor-pointer pr-12 pl-10 appearance-none transition-all"
                >
                  {REWARD_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                {renderTypeIcon()}
                <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-[#C89355] transition-all duration-300" size={18} />
              </div>
            </div>

            {/* 🌟 قيمة المكافأة مع ميزة تنسيق الآلاف */}
            <div className="md:col-span-2 bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10">
              <label className="block text-xs font-black text-emerald-400 mb-3 uppercase tracking-widest">قيمة المكافأة / البدل (ل.س)</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative group flex-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatWithCommas(form.bonusAmount || "")}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/,/g, "");
                      if (/^\d*\.?\d*$/.test(rawValue)) {
                        setForm((p) => ({ ...p, bonusAmount: rawValue }));
                      }
                    }}
                    placeholder="مثال: 150,000"
                    className="w-full p-4 bg-[#101720] border border-emerald-500/30 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-emerald-400 text-2xl font-mono font-black pr-14 shadow-inner transition-all placeholder:text-emerald-900/50"
                  />
                  <Coins className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500/50 group-focus-within:text-emerald-500 transition-colors" size={24} />
                </div>
                {isAllowanceType && (
                  <button
                    type="button"
                    onClick={handleCalculateAllowance}
                    disabled={isCalculating || !form.employeeId}
                    className="px-6 py-4 bg-[#C89355] text-[#101720] rounded-2xl hover:bg-[#b07f45] disabled:bg-[#263544] disabled:text-slate-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-black text-sm whitespace-nowrap shadow-[0_0_20px_rgba(200,147,85,0.2)] active:scale-95"
                  >
                    {isCalculating ? <Loader2 className="animate-spin" size={20} /> : <Calculator size={20} />}
                    حساب التلقائي
                  </button>
                )}
              </div>
              {calculationError && <p className="text-rose-400 text-xs font-bold mt-3">{calculationError}</p>}
            </div>

            {/* 🌟 قيمة الإعانة مع ميزة تنسيق الآلاف */}
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase tracking-widest">قيمة الإعانة (اختياري)</label>
              <div className="relative group">
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatWithCommas(form.assistanceAmount || "")}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/,/g, "");
                    if (/^\d*\.?\d*$/.test(rawValue)) {
                      setForm((p) => ({ ...p, assistanceAmount: rawValue }));
                    }
                  }}
                  placeholder="مبلغ إعانة إضافي..."
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/20 focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 shadow-inner transition-all"
                />
                <HeartHandshake className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase tracking-widest">السبب / ملاحظات</label>
              <div className="relative group">
                <textarea
                  value={form.bonusReason || ""}
                  onChange={(e) => setForm((p) => ({ ...p, bonusReason: e.target.value }))}
                  rows={2}
                  placeholder={`سيتم استخدام "${selectedType}" كسبب افتراضي إذا تُرك فارغاً`}
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/20 focus:border-[#C89355] outline-none text-white font-bold pr-12 resize-none placeholder:text-slate-600 transition-all shadow-inner"
                />
                <FileText className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 sm:p-8 bg-[#1a2530]/90 backdrop-blur-md border-t border-white/5 flex justify-between shrink-0 relative z-10">
          <button type="button" onClick={onClose} className="px-8 py-3.5 rounded-2xl font-bold text-slate-400 bg-[#263544] hover:text-white hover:bg-[#324559] transition-all active:scale-95 border border-transparent hover:border-slate-500/30">
            إلغاء التعديل
          </button>

          <button type="submit" form="bonusForm" disabled={isPending} className="bg-[#C89355] hover:bg-[#b07f45] shadow-[0_0_20px_rgba(200,147,85,0.3)] text-[#101720] px-10 py-3.5 rounded-2xl font-black flex items-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-[#C89355]/50">
            {isPending ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {isPending ? "جاري الحفظ..." : isEditMode ? "حفظ التعديلات" : "اعتماد المكافأة"}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}