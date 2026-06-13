"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  X, Save, Search, Wallet, FileText, AlertOctagon, 
  Coins, Calendar, Edit3, Shirt, Banknote , Loader2 , ChevronDown
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Employee } from "@/types/employee";
import type { DiscountPayload, DiscountRecord } from "@/hooks/useDiscounts";

const discountSchema = z.object({
  employeeId: z.string().min(1, "الرجاء اختيار الموظف"),
  type: z.string().min(1, "الرجاء اختيار نوع الإجراء"),
  amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  date: z.string().min(1, "التاريخ مطلوب"),
  notes: z.string().optional(),
});

type DiscountFormValues = z.infer<typeof discountSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DiscountPayload) => void;
  isPending?: boolean;
  employees?: Employee[];
  initialData?: DiscountRecord | null;
}

// الدالة السحرية لتنسيق الأرقام مع فواصل الآلاف
const formatWithCommas = (value: string | number) => {
  if (!value) return "";
  const raw = value.toString().replace(/,/g, "").replace(/[^0-9.]/g, "");
  const parts = raw.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
};

export default function AddDiscountModal({ isOpen, onClose, onSave, isPending, employees = [], initialData }: Props) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    control, // تم إضافة control للـ Controller
    formState: { errors }
  } = useForm<DiscountFormValues>({
    resolver: zodResolver(discountSchema),
    mode: "onChange",
    defaultValues: {
      employeeId: "",
      type: "سلفة",
      amount: undefined,
      date: new Date().toISOString().split('T')[0],
      notes: "",
    }
  });

  const currentType = watch("type");

  useEffect(() => {
    if (initialData) {
      const emp = employees.find(e => e.employeeId === initialData.employeeId);
      const newQuery = emp ? `${emp.employeeId} - ${emp.name}` : initialData.employeeId;
      
      Promise.resolve().then(() => {
        reset({
          employeeId: initialData.employeeId,
          type: initialData.type,
          amount: initialData.amount,
          date: initialData.date,
          notes: initialData.notes || "",
        });
        setSearchQuery(newQuery);
      });
    } else {
      Promise.resolve().then(() => {
        reset({
          employeeId: "",
          type: "سلفة",
          amount: undefined,
          date: new Date().toISOString().split('T')[0],
          notes: "",
        });
        setSearchQuery("");
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.employeeId, initialData?.type]);

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

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    return employees.filter(emp =>
      (emp.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.employeeId || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  if (!isOpen) return null;

  const handleSelectEmployee = (emp: Employee) => {
    setValue("employeeId", emp.employeeId || "", { shouldValidate: true });
    setSearchQuery(`${emp.employeeId} - ${emp.name}`);
    setIsDropdownOpen(false);
  };

  const onSubmit = (data: DiscountFormValues) => {
    // احتسب kind بناءً على type
    let kind: DiscountPayload["kind"] = "penalty";
    if (data.type === "سلفة" || data.type === "شراء ملابس") kind = "advance";
    else if (data.type === "مكافأة" || data.type === "مساعدة") kind = "assistance";
    onSave({ ...data, kind });
  };

  const isEditMode = !!initialData;

  const renderTypeIcon = () => {
    if (currentType === "شراء ملابس") return <Shirt className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />;
    if (currentType === "عقوبة") return <AlertOctagon className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />;
    return <Banknote className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />;
  };

  return createPortal(
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md transition-all duration-300" dir="rtl">
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(225,29,72,0.15)] w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col border border-white/10 outline-dashed outline-1 outline-[#C89355]/30 -outline-offset-8 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl border shadow-[0_0_20px_rgba(225,29,72,0.15)] ${isEditMode ? 'bg-[#C89355]/10 border-[#C89355]/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
              {isEditMode ? <Edit3 className="text-[#C89355]" size={28} /> : <Wallet className="text-rose-500" size={28} />}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                {isEditMode ? "تعديل الإجراء المالي" : "إضافة خصم أو سلفة"}
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-1">سيتم اقتطاع هذا المبلغ من المسير النهائي</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-rose-400 bg-[#263544] p-2.5 rounded-2xl border border-transparent hover:border-rose-400/30 transition-all hover:rotate-90 active:scale-90">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 p-8 sm:p-10 relative">
          <form id="discountForm" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
            
            <div className="md:col-span-2" ref={dropdownRef}>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase tracking-widest">الموظف (الاسم أو الكود)</label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="اكتب للبحث عن موظف..."
                  disabled={isEditMode}
                  className={`w-full p-4 bg-[#1a2530] border rounded-2xl focus:ring-2 focus:ring-[#C89355]/20 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner pr-12 placeholder:text-slate-500 ${errors.employeeId ? 'border-rose-500' : 'border-[#263544]'} ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!isEditMode) setIsDropdownOpen(true);
                  }}
                  onFocus={() => !isEditMode && setIsDropdownOpen(true)}
                />
                <Search className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />

                {isDropdownOpen && !isEditMode && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-full max-h-56 overflow-y-auto custom-scrollbar bg-[#1a2530]/95 backdrop-blur-xl border border-[#263544] rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.5)] z-50 p-2">
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
              {errors.employeeId && <p className="text-rose-400 text-xs font-bold mt-1.5">{errors.employeeId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase tracking-widest">نوع الإجراء</label>
              <div className="relative group">
                <select
                  {...register("type")}
                  className={`w-full p-4 bg-[#1a2530] border rounded-2xl focus:ring-2 focus:ring-[#C89355]/20 focus:border-[#C89355] outline-none text-white font-bold cursor-pointer pr-12 pl-10 appearance-none transition-all ${errors.type ? 'border-rose-500' : 'border-[#263544]'}`}
                >
                  <option value="سلفة">سلفة مالية</option>
                  <option value="شراء ملابس">شراء ملابس</option>
                  <option value="عقوبة">عقوبة إدارية</option>
                </select>
                {renderTypeIcon()}
                <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-[#C89355] transition-all duration-300" size={18} />
              </div>
              {errors.type && <p className="text-rose-400 text-xs font-bold mt-1.5">{errors.type.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase tracking-widest">تاريخ الإجراء</label>
              <div className="relative group">
                <input
                  type="date"
                  {...register("date")}
                  className={`w-full p-4 bg-[#1a2530] border rounded-2xl focus:ring-2 focus:ring-[#C89355]/20 focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 scheme-dark transition-all ${errors.date ? 'border-rose-500' : 'border-[#263544]'}`}
                />
                <Calendar className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />
              </div>
              {errors.date && <p className="text-rose-400 text-xs font-bold mt-1.5">{errors.date.message}</p>}
            </div>

            {/* حقل القيمة مع التنسيق الذكي */}
            <div className="md:col-span-2 bg-rose-500/5 p-5 rounded-2xl border border-rose-500/10">
              <label className="block text-xs font-black text-rose-400 mb-3 uppercase tracking-widest">القيمة / المبلغ المستقطع (ل.س)</label>
              <div className="relative group">
                <Controller
                  name="amount"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatWithCommas(field.value || "")}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/,/g, "");
                        if (/^\d*\.?\d*$/.test(rawValue)) {
                          field.onChange(rawValue ? Number(rawValue) : undefined);
                        }
                      }}
                      placeholder="مثال: 50,000"
                      className={`w-full p-4 bg-[#101720] border rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-rose-400 text-2xl font-mono font-black pr-14 shadow-inner transition-all placeholder:text-rose-900/50 ${errors.amount ? 'border-rose-500' : 'border-rose-500/30'}`}
                    />
                  )}
                />
                <Coins className="absolute right-5 top-5 text-rose-500/50 group-focus-within:text-rose-500 transition-colors" size={24} />
              </div>
              {errors.amount && <p className="text-rose-400 text-xs font-bold mt-2">{errors.amount.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase tracking-widest">ملاحظات أخرى (اختياري)</label>
              <div className="relative group">
                <textarea
                  {...register("notes")}
                  rows={2}
                  placeholder="أدخل أي تفاصيل إضافية هنا..."
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

          <button type="submit" form="discountForm" disabled={isPending} className={`${isEditMode ? 'bg-[#C89355] hover:bg-[#b07f45] shadow-[0_0_20px_rgba(200,147,85,0.3)]' : 'bg-rose-600 hover:bg-rose-700 shadow-[0_0_20px_rgba(225,29,72,0.3)]'} text-white px-10 py-3.5 rounded-2xl font-black flex items-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10`}>
            {isPending ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {isPending ? "جاري الحفظ..." : isEditMode ? "حفظ التعديلات" : "اعتماد الخصم"}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}