// "use client";

// import { useState, useEffect, useRef, useMemo } from "react";
// import { createPortal } from "react-dom";
// import { X, Save, Search, Gift, FileText, Coins, Calendar, Sparkles } from "lucide-react";
// import type { Employee } from "@/types/employee";

// export type RewardPayload = {
//   employeeId: string;
//   type: string;
//   amount: number;
//   date: string;
//   notes?: string;
// };

// interface Props {
//   isOpen: boolean;
//   onClose: () => void;
//   onSave: (data: RewardPayload) => void;
//   isPending?: boolean;
//   employees?: Employee[];
// }

// export default function AddRewardModal({ isOpen, onClose, onSave, isPending, employees = [] }: Props) {
//   const isBrowser = typeof document !== "undefined";

//   // حالات البحث الذكي عن الموظف
//   const [searchQuery, setSearchQuery] = useState("");
//   const [isDropdownOpen, setIsDropdownOpen] = useState(false);
//   const dropdownRef = useRef<HTMLDivElement>(null);

//   const [form, setForm] = useState({
//     employeeId: "",
//     type: "مكافأة", // القيمة الافتراضية
//     amount: "",
//     date: new Date().toISOString().split('T')[0], // تاريخ اليوم افتراضياً
//     notes: "",
//   });

//   useEffect(() => {
//     if (!isBrowser) return;
//     if (isOpen) document.body.style.overflow = "hidden";
//     else document.body.style.overflow = "unset";
//     return () => { document.body.style.overflow = "unset"; };
//   }, [isOpen, isBrowser]);

//   // إغلاق القائمة المنسدلة عند النقر خارجها
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//         setIsDropdownOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // فلترة الموظفين للبحث الذكي
//   const filteredEmployees = useMemo(() => {
//     if (!searchQuery) return employees;
//     return employees.filter(emp => 
//       emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
//       emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
//     );
//   }, [employees, searchQuery]);

//   if (!isOpen || !isBrowser) return null;

//   const handleSelectEmployee = (emp: Employee) => {
//     setForm(p => ({ ...p, employeeId: emp.employeeId }));
//     setSearchQuery(`${emp.employeeId} - ${emp.name}`);
//     setIsDropdownOpen(false);
//   };

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!form.employeeId) return alert("الرجاء اختيار الموظف");
//     if (!form.amount || Number(form.amount) <= 0) return alert("الرجاء إدخال مبلغ صحيح");

//     onSave({
//       ...form,
//       amount: Number(form.amount)
//     });
//   };

//   return createPortal(
//     <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md transition-all duration-300" dir="rtl">
//       <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(16,185,129,0.15)] w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col border border-white/10 outline outline-dashed outline-1 outline-[#C89355]/30 outline-offset-[-8px]">

//         {/* الترويسة */}
//         <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
//           <div className="flex items-center gap-4">
//             <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
//               <Gift className="text-emerald-500" size={28} />
//             </div>
//             <div>
//               <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
//                 إضافة مكافأة أو بدل
//               </h2>
//             </div>
//           </div>
//           <button onClick={onClose} className="text-slate-500 hover:text-rose-400 bg-[#263544] p-2.5 rounded-2xl border border-transparent hover:border-rose-400/30 transition-all active:scale-90">
//             <X size={24} />
//           </button>
//         </div>

//         {/* جسم النموذج */}
//         <div className="overflow-y-auto custom-scrollbar flex-1 p-8 sm:p-10 relative">
//           <form id="rewardForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">

//             {/* اختيار الموظف (البحث الذكي) */}
//             <div className="md:col-span-2" ref={dropdownRef}>
//               <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">الموظف (الاسم أو الكود)</label>
//               <div className="relative group">
//                 <input 
//                   type="text" 
//                   required 
//                   placeholder="اكتب للبحث عن موظف..." 
//                   className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner pr-12 placeholder:text-slate-500"
//                   value={searchQuery}
//                   onChange={(e) => {
//                     setSearchQuery(e.target.value);
//                     setIsDropdownOpen(true);
//                   }}
//                   onFocus={() => setIsDropdownOpen(true)}
//                 />
//                 <Search className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />

//                 {/* القائمة المنسدلة للبحث */}
//                 {isDropdownOpen && (
//                   <div className="absolute top-[calc(100%+8px)] left-0 w-full max-h-56 overflow-y-auto custom-scrollbar bg-[#1a2530] border border-[#263544] rounded-2xl shadow-2xl z-50 p-2">
//                     {filteredEmployees.length === 0 ? (
//                       <div className="p-4 text-center text-slate-500 font-bold text-sm">لا يوجد موظف بهذا الاسم أو الكود</div>
//                     ) : (
//                       filteredEmployees.map((emp) => (
//                         <div 
//                           key={emp.employeeId} 
//                           onClick={() => handleSelectEmployee(emp)}
//                           className="flex items-center gap-3 p-3 hover:bg-[#263544] rounded-xl cursor-pointer transition-colors"
//                         >
//                           <div className="bg-[#101720] px-2 py-1 rounded text-xs font-mono font-bold text-[#C89355] border border-[#263544]">{emp.employeeId}</div>
//                           <span className="font-bold text-white text-sm">{emp.name}</span>
//                         </div>
//                       ))
//                     )}
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* نوع الإضافة */}
//             <div>
//               <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">نوع الزيادة</label>
//               <div className="relative group">
//                 <select 
//                   className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold cursor-pointer pr-12 appearance-none"
//                   value={form.type}
//                   onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))}
//                 >
//                   <option value="مكافأة">مكافأة تشجيعية</option>
//                   <option value="عمل إضافي">أجر عمل إضافي (Overtime)</option>
//                   <option value="بدل طعام">بدل طعام</option>
//                   <option value="بدل نقل">بدل نقل</option>
//                   <option value="إضافة متنوعة">إضافة متنوعة</option>
//                 </select>
//                 <Sparkles className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] pointer-events-none" size={22} />
//               </div>
//             </div>

//             {/* تاريخ الإجراء */}
//             <div>
//               <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">التاريخ</label>
//               <div className="relative group">
//                 <input 
//                   type="date" 
//                   required 
//                   className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 [color-scheme:dark]"
//                   value={form.date}
//                   onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))}
//                 />
//                 <Calendar className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355]" size={22} />
//               </div>
//             </div>

//             {/* المبلغ الممنوح */}
//             <div className="md:col-span-2">
//               <label className="block text-xs font-black text-emerald-500 mb-2 uppercase">المبلغ الممنوح (ل.س)</label>
//               <div className="relative group">
//                 <input 
//                   type="number" 
//                   min={1} 
//                   required 
//                   placeholder="مثال: 75000"
//                   className="w-full p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl focus:border-emerald-500 outline-none text-emerald-500 text-xl font-mono font-black pr-12 shadow-inner" 
//                   value={form.amount} 
//                   onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} 
//                 />
//                 <Coins className="absolute right-4 top-4.5 text-emerald-500/50 group-focus-within:text-emerald-500" size={22} />
//               </div>
//             </div>

//             {/* ملاحظات (اختياري) */}
//             <div className="md:col-span-2">
//               <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">ملاحظات أخرى (اختياري)</label>
//               <div className="relative group">
//                 <textarea 
//                   rows={3} 
//                   placeholder="أي تفاصيل أو أسباب إضافية لتوثيق هذا الإجراء..."
//                   className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold pr-12 resize-none placeholder:text-slate-600" 
//                   value={form.notes} 
//                   onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} 
//                 />
//                 <FileText className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355]" size={22} />
//               </div>
//             </div>

//           </form>
//         </div>

//         {/* أزرار الإجراءات */}
//         <div className="p-6 sm:p-8 bg-[#1a2530]/80 border-t border-white/5 flex justify-between shrink-0 relative z-10">
//           <button type="button" onClick={onClose} className="px-8 py-3.5 rounded-2xl font-bold text-slate-400 bg-[#263544] hover:text-white transition-all active:scale-95">
//             إلغاء
//           </button>

//           <button type="submit" form="rewardForm" disabled={isPending} className="bg-emerald-600 text-white px-10 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:bg-emerald-700 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50">
//             <Save size={20} /> 
//             {isPending ? "جاري الحفظ..." : "اعتماد الزيادة"}
//           </button>
//         </div>

//       </div>
//     </div>,
//     document.body
//   );
// }

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Save, Search, Gift, FileText, Coins, Calendar, Sparkles, Users } from "lucide-react";
import type { Employee } from "@/types/employee";

export type RewardPayload = {
  employeeId: string;
  type: string;
  amount: number;
  date: string;
  notes?: string;
  allEmployees?: boolean; // حقل جديد لتحديد ما إذا كانت الزيادة للكل
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RewardPayload) => void;
  isPending?: boolean;
  employees?: Employee[];
  initialParams?: Partial<RewardPayload>;
}

export default function AddRewardModal({ isOpen, onClose, onSave, isPending, employees = [], initialParams }: Props) {
  const isBrowser = typeof document !== "undefined";

  const [searchQuery, setSearchQuery] = useState(
    initialParams?.allEmployees ? "تطبيق على جميع الموظفين" : initialParams?.employeeId ?? "",
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState(() => ({
    employeeId: initialParams?.employeeId ?? "",
    type: initialParams?.type ?? "مكافأة",
    amount: initialParams?.amount ? String(initialParams.amount) : "",
    date: initialParams?.date ?? new Date().toISOString().split("T")[0],
    notes: initialParams?.notes ?? "",
    allEmployees: Boolean(initialParams?.allEmployees),
  }));


  useEffect(() => {
    if (!isBrowser) return;
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, isBrowser]);

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
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  if (!isOpen || !isBrowser) return null;

  const handleSelectEmployee = (emp: Employee) => {
    setForm(p => ({ ...p, employeeId: emp.employeeId, allEmployees: false }));
    setSearchQuery(`${emp.employeeId} - ${emp.name}`);
    setIsDropdownOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // التحقق: إذا لم يكن "للجميع"، يجب اختيار موظف
    if (!form.allEmployees && !form.employeeId) return alert("الرجاء اختيار الموظف");
    if (!form.amount || Number(form.amount) <= 0) return alert("الرجاء إدخال مبلغ صحيح");

    onSave({
      ...form,
      amount: Number(form.amount),
      employeeId: form.allEmployees ? "ALL" : form.employeeId
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md transition-all duration-300" dir="rtl">
  <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(16,185,129,0.15)] w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col border border-white/10 outline-dashed outline-1 outline-[#C89355]/30 -outline-offset-8">

        {/* الترويسة */}
        <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <Gift className="text-emerald-500" size={28} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">إضافة مكافأة أو بدل</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-rose-400 bg-[#263544] p-2 rounded-xl border border-transparent hover:border-rose-400/30 transition-all active:scale-90">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 p-8 sm:p-10 relative">
          <form id="rewardForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">

            {/* اختيار الموظف (يُعطل في حال تحديد الكل) */}
            <div className="md:col-span-2" ref={dropdownRef}>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">
                {form.allEmployees ? "المستهدفون" : "الموظف (الاسم أو الكود)"}
              </label>
              <div className="relative group">
                <input
                  type="text"
                  required
                  disabled={form.allEmployees}
                  placeholder={form.allEmployees ? "محدد للكل" : "اكتب للبحث عن موظف..."}
                  className={`w-full p-4 border border-[#263544] rounded-2xl outline-none transition-all font-bold shadow-inner pr-12 ${form.allEmployees ? 'bg-[#101720] text-[#C89355] opacity-80' : 'bg-[#1a2530] text-white focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] placeholder:text-slate-500'
                    }`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => !form.allEmployees && setIsDropdownOpen(true)}
                />
                {form.allEmployees ? (
                  <Users className="absolute right-4 top-4 text-[#C89355]" size={22} />
                ) : (
                  <Search className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />
                )}

                {isDropdownOpen && !form.allEmployees && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-full max-h-56 overflow-y-auto custom-scrollbar bg-[#1a2530] border border-[#263544] rounded-2xl shadow-2xl z-50 p-2">
                    {filteredEmployees.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 font-bold text-sm">لا يوجد موظف بهذا الاسم أو الكود</div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <div key={emp.employeeId} onClick={() => handleSelectEmployee(emp)} className="flex items-center gap-3 p-3 hover:bg-[#263544] rounded-xl cursor-pointer transition-colors">
                          <div className="bg-[#101720] px-2 py-1 rounded text-xs font-mono font-bold text-[#C89355] border border-[#263544]">{emp.employeeId}</div>
                          <span className="font-bold text-white text-sm">{emp.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* نوع الإضافة */}
            <div className={form.type === "زيادة في الراتب" ? "md:col-span-1" : "md:col-span-1"}>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">نوع الزيادة</label>
              <div className="relative group">
                <select
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold cursor-pointer pr-12 appearance-none"
                  value={form.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setForm(p => ({
                      ...p,
                      type: newType,
                      allEmployees: newType === "زيادة في الراتب" ? p.allEmployees : false
                    }));
                  }}
                >
                  <option value="مكافأة">مكافأة</option>
                  <option value="اضافي نهاية اسبوع">إضافي نهاية أسبوع</option>
                  <option value="اضافي عادي">إضافي عادي</option>
                  <option value="زيادة في الراتب">زيادة في الراتب</option>
                </select>
                <Sparkles className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] pointer-events-none" size={22} />
              </div>

              {/* خيار تحديد الكل يظهر فقط عند زيادة الراتب */}
              {form.type === "زيادة في الراتب" && (
                <div className="mt-3 flex items-center gap-3 bg-[#1a2530] p-3 rounded-xl border border-[#263544] animate-in fade-in slide-in-from-top-2">
                  <input
                    type="checkbox"
                    id="allEmp"
                    checked={form.allEmployees}
                    onChange={(e) => {
                      setForm(p => ({ ...p, allEmployees: e.target.checked }));
                      if (e.target.checked) setSearchQuery("تطبيق على جميع الموظفين");
                      else setSearchQuery("");
                    }}
                    className="w-5 h-5 rounded border-[#C89355] text-[#C89355] focus:ring-[#C89355]/30 bg-[#101720]"
                  />
                  <label htmlFor="allEmp" className="text-sm font-bold text-white cursor-pointer select-none">
                    تطبيق على جميع الموظفين
                  </label>
                </div>
              )}
            </div>

            {/* تاريخ الإجراء */}
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">التاريخ</label>
              <div className="relative group">
                <input
                  type="date"
                  required
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 scheme-dark"
                  value={form.date}
                  onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))}
                />
                <Calendar className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355]" size={22} />
              </div>
            </div>

            {/* المبلغ الممنوح */}
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-emerald-500 mb-2 uppercase">المبلغ الممنوح (ل.س)</label>
              <div className="relative group">
                <input
                  type="number"
                  min={1}
                  required
                  placeholder="مثال: 75000"
                  className="w-full p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl focus:border-emerald-500 outline-none text-emerald-500 text-xl font-mono font-black pr-12 shadow-inner"
                  value={form.amount}
                  onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))}
                />
                <Coins className="absolute right-4 top-4.5 text-emerald-500/50 group-focus-within:text-emerald-500" size={22} />
              </div>
            </div>

            {/* ملاحظات */}
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">ملاحظات أخرى (اختياري)</label>
              <div className="relative group">
                <textarea
                  rows={3}
                  placeholder="أي تفاصيل إضافية..."
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold pr-12 resize-none placeholder:text-slate-600"
                  value={form.notes}
                  onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                />
                <FileText className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355]" size={22} />
              </div>
            </div>

          </form>
        </div>

        {/* أزرار الإجراءات */}
        <div className="p-6 sm:p-8 bg-[#1a2530]/80 border-t border-white/5 flex justify-between shrink-0 relative z-10">
          <button type="button" onClick={onClose} className="px-8 py-3.5 rounded-2xl font-bold text-slate-400 bg-[#263544] hover:text-white transition-all active:scale-95">
            إلغاء
          </button>

          <button type="submit" form="rewardForm" disabled={isPending} className="bg-emerald-600 text-white px-10 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:bg-emerald-700 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50">
            <Save size={20} />
            {isPending ? "جاري الحفظ..." : "اعتماد الزيادة"}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}