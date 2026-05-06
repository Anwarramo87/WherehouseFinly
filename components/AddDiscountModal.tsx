"use client";


import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Save, Search, Wallet, FileText, AlertOctagon, Coins, Calendar, Edit3 } from "lucide-react";
import { useForm } from "react-hook-form";
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

export default function AddDiscountModal({ isOpen, onClose, onSave, isPending, employees = [], initialData }: Props) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<DiscountFormValues>({
    resolver: zodResolver(discountSchema),
    mode: "onChange",
    defaultValues: {
      employeeId: "",
      type: "سلفة",
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      notes: "",
    }
  });

  useEffect(() => {
    if (initialData) {
      const emp = employees.find(e => e.employeeId === initialData.employeeId);
      const newQuery = emp ? `${emp.employeeId} - ${emp.name}` : initialData.employeeId;
      
      // Batch state updates together
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
    onSave(data);
  };

  const isEditMode = !!initialData;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md transition-all duration-300" dir="rtl">
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(225,29,72,0.15)] w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col border border-white/10 outline-dashed outline-[#C89355]/30 -outline-offset-8">
        <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl border shadow-[0_0_20px_rgba(225,29,72,0.15)] ${isEditMode ? 'bg-[#C89355]/10 border-[#C89355]/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
              {isEditMode ? <Edit3 className="text-[#C89355]" size={28} /> : <Wallet className="text-rose-500" size={28} />}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                {isEditMode ? "تعديل الإجراء المالي" : "إضافة خصم أو سلفة"}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-rose-400 bg-[#263544] p-2.5 rounded-2xl border border-transparent hover:border-rose-400/30 transition-all active:scale-90">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 p-8 sm:p-10 relative">
          <form id="discountForm" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
            
            <div className="md:col-span-2" ref={dropdownRef}>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">الموظف (الاسم أو الكود)</label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="اكتب للبحث عن موظف..."
                  disabled={isEditMode}
                  className={`w-full p-4 bg-[#1a2530] border rounded-2xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner pr-12 placeholder:text-slate-500 ${errors.employeeId ? 'border-rose-500' : 'border-[#263544]'} ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!isEditMode) setIsDropdownOpen(true);
                  }}
                  onFocus={() => !isEditMode && setIsDropdownOpen(true)}
                />
                <Search className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />

                {isDropdownOpen && !isEditMode && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-full max-h-56 overflow-y-auto custom-scrollbar bg-[#1a2530] border border-[#263544] rounded-2xl shadow-2xl z-50 p-2">
                    {filteredEmployees.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 font-bold text-sm">لا يوجد موظف بهذا الاسم أو الكود</div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <div
                          key={emp.employeeId}
                          onClick={() => handleSelectEmployee(emp)}
                          className="flex items-center gap-3 p-3 hover:bg-[#263544] rounded-xl cursor-pointer transition-colors"
                        >
                          <div className="bg-[#101720] px-2 py-1 rounded text-xs font-mono font-bold text-[#C89355] border border-[#263544]">{emp.employeeId}</div>
                          <span className="font-bold text-white text-sm">{emp.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {errors.employeeId && <p className="text-red-500 text-sm font-bold mt-1">{errors.employeeId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">نوع الإجراء</label>
              <div className="relative group">
                <select
                  {...register("type")}
                  className={`w-full p-4 bg-[#1a2530] border rounded-2xl focus:border-[#C89355] outline-none text-white font-bold cursor-pointer pr-12 appearance-none ${errors.type ? 'border-rose-500' : 'border-[#263544]'}`}
                >
                  <option value="سلفة">سلفة مالية</option>
                  <option value="شراء ملابس">شراء ملابس</option>
                  <option value="عقوبة">عقوبة إدارية</option>
                </select>
                <AlertOctagon className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] pointer-events-none" size={22} />
              </div>
              {errors.type && <p className="text-red-500 text-sm font-bold mt-1">{errors.type.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">تاريخ الإجراء</label>
              <div className="relative group">
                <input
                  type="date"
                  {...register("date")}
                  className={`w-full p-4 bg-[#1a2530] border rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 scheme-dark ${errors.date ? 'border-rose-500' : 'border-[#263544]'}`}
                />
                <Calendar className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355]" size={22} />
              </div>
              {errors.date && <p className="text-red-500 text-sm font-bold mt-1">{errors.date.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black text-rose-500 mb-2 uppercase">القيمة / المبلغ المستقطع (ل.س)</label>
              <div className="relative group">
                <input
                  type="number"
                  {...register("amount", { valueAsNumber: true })}
                  placeholder="مثال: 50000"
                  className={`w-full p-4 bg-rose-500/5 border rounded-2xl focus:border-rose-500 outline-none text-rose-500 text-xl font-mono font-black pr-12 shadow-inner ${errors.amount ? 'border-rose-500' : 'border-rose-500/20'}`}
                />
                <Coins className="absolute right-4 top-4.5 text-rose-500/50 group-focus-within:text-rose-500" size={22} />
              </div>
              {errors.amount && <p className="text-red-500 text-sm font-bold mt-1">{errors.amount.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">ملاحظات أخرى (اختياري)</label>
              <div className="relative group">
                <textarea
                  {...register("notes")}
                  rows={3}
                  placeholder="أي تفاصيل أو أسباب إضافة هذا الإجراء..."
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold pr-12 resize-none placeholder:text-slate-600"
                />
                <FileText className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355]" size={22} />
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 sm:p-8 bg-[#1a2530]/80 border-t border-white/5 flex justify-between shrink-0 relative z-10">
          <button type="button" onClick={onClose} className="px-8 py-3.5 rounded-2xl font-bold text-slate-400 bg-[#263544] hover:text-white transition-all active:scale-95">
            إلغاء
          </button>

          <button type="submit" form="discountForm" disabled={isPending} className={`${isEditMode ? 'bg-[#C89355] hover:bg-[#b07f45] shadow-[0_0_20px_rgba(200,147,85,0.3)]' : 'bg-rose-600 hover:bg-rose-700 shadow-[0_0_20px_rgba(225,29,72,0.3)]'} text-white px-10 py-3.5 rounded-2xl font-black flex items-center gap-3 active:scale-95 transition-all disabled:opacity-50`}>
            <Save size={20} />
            {isPending ? "جاري الحفظ..." : isEditMode ? "حفظ التعديلات" : "اعتماد الخصم"}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
