// "use client";

// import { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { X, User, CalendarDays, FileText, Save, CheckSquare, Square, Loader2 } from "lucide-react";
// import apiClient from "@/lib/api-client";
// import type { Employee } from "@/types/employee";

// interface Props {
//   isOpen: boolean;
//   onClose: () => void;
//   employees: Employee[];
// }

// const buildDefaultForm = () => ({
//   employeeId: "",
//   startDate: new Date().toISOString().split('T')[0],
//   endDate: new Date().toISOString().split('T')[0],
//   leaveType: "إجازة مرضية",
//   customReason: "",
//   isPaid: false,
// });

// function LeaveRequestModalContent({ isOpen, onClose, employees }: Props) {
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [form, setForm] = useState(buildDefaultForm);

//   const LEAVES_ENDPOINT = "/leaves";
//   const USE_MOCK_API = true;

//   const leaveTypes = ["إجازة مرضية", "إجازة إدارية", "إجازة زواج", "إجازة وفاة", "أخرى"];

//   useEffect(() => {
//     if (isOpen) {
//       document.body.style.overflow = "hidden";
//     } else {
//       document.body.style.overflow = "unset";
//     }
//     return () => { document.body.style.overflow = "unset"; };
//   }, [isOpen]);

//   if (!isOpen) return null;

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!form.employeeId) {
//       window.alert("الرجاء اختيار الموظف");
//       return;
//     }
//     if (form.startDate > form.endDate) {
//       window.alert("تاريخ النهاية يجب أن يكون بعد أو يساوي تاريخ البداية!");
//       return;
//     }
//     if (form.leaveType === "أخرى" && !form.customReason) {
//       window.alert("الرجاء كتابة سبب الإجازة");
//       return;
//     }

//     const payload = {
//       employeeId: form.employeeId,
//       startDate: form.startDate,
//       endDate: form.endDate,
//       leaveType: form.leaveType === "أخرى" ? form.customReason : form.leaveType,
//       isPaid: form.isPaid,
//       reason: form.leaveType === "أخرى" ? form.customReason : undefined,
//     };

//     setErrorMessage(null);
//     setIsSubmitting(true);

//     try {
//       if (USE_MOCK_API) {
//         console.log("[Mock] Leave request payload ready:", payload);
//       } else {
//         await apiClient.post(LEAVES_ENDPOINT, payload);
//       }

//       onClose();
//     } catch (error) {
//       console.error("فشل إرسال طلب الإجازة:", error);
//       setErrorMessage("تعذر إرسال الطلب حالياً. حاول مرة أخرى.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return createPortal(
//     <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md transition-all duration-300" dir="rtl">
//       <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(200,147,85,0.15)] w-full max-w-lg overflow-hidden flex flex-col border border-white/10  outline-dashed outline-1 outline-[#C89355]/30 -outline-offset-8">
        
//         {/* Header */}
//         <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
//           <div className="flex items-center gap-4">
//             <div className="bg-[#C89355]/10 p-3 rounded-2xl border border-[#C89355]/20 shadow-[0_0_20px_rgba(200,147,85,0.15)]">
//               <FileText className="text-[#C89355]" size={24} />
//             </div>
//             <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">طلب إجازة</h2>
//           </div>
//           <button onClick={onClose} className="text-slate-500 hover:text-rose-400 bg-[#263544] p-2.5 rounded-2xl border border-transparent hover:border-rose-400/30 transition-all active:scale-90">
//             <X size={24} />
//           </button>
//         </div>

//         {/* Body */}
//         <div className="overflow-y-auto custom-scrollbar flex-1 p-8 sm:p-10 relative">
//           <form id="leaveForm" onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 text-right">
            
//             {/* الموظف */}
//             <div>
//               <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">الموظف</label>
//               <div className="relative group">
//                 <select 
//                   required 
//                   className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold shadow-inner pr-12 appearance-none cursor-pointer"
//                   value={form.employeeId} 
//                   onChange={(e) => setForm({...form, employeeId: e.target.value})}
//                 >
//                   <option value="" disabled>اختر الموظف...</option>
//                   {employees.map(emp => (
//                     <option key={emp.employeeId} value={emp.employeeId}>{emp.name}</option>
//                   ))}
//                 </select>
//                 <User className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors pointer-events-none" size={22} />
//               </div>
//             </div>

//             {/* التاريخ (من - إلى) بسطر واحد */}
//             <div className="grid grid-cols-2 gap-4">
//               {/* من تاريخ */}
//               <div>
//                 <label className="block text-[10px] sm:text-xs font-black text-[#C89355] mb-2 uppercase">من تاريخ</label>
//                 <div className="relative group">
//                   <input 
//                     type="date" required 
//                     className="w-full p-3 sm:p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-2 sm:pr-12 scheme-dark text-xs sm:text-sm transition-all"
//                     value={form.startDate} 
//                     onChange={(e) => setForm({...form, startDate: e.target.value})}
//                   />
//                   <CalendarDays className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors pointer-events-none hidden sm:block" size={20} />
//                 </div>
//               </div>

//               {/* إلى تاريخ */}
//               <div>
//                 <label className="block text-[10px] sm:text-xs font-black text-[#C89355] mb-2 uppercase">إلى تاريخ</label>
//                 <div className="relative group">
//                   <input 
//                     type="date" required 
//                     min={form.startDate} // لا يمكن اختيار تاريخ قبل تاريخ البداية
//                     className="w-full p-3 sm:p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-2 sm:pr-12 scheme-dark text-xs sm:text-sm transition-all"
//                     value={form.endDate} 
//                     onChange={(e) => setForm({...form, endDate: e.target.value})}
//                   />
//                   <CalendarDays className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors pointer-events-none hidden sm:block" size={20} />
//                 </div>
//               </div>
//             </div>

//             {/* نوع الإجازة */}
//             <div>
//               <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">نوع الإجازة</label>
//               <div className="relative group">
//                 <select 
//                   required 
//                   className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold shadow-inner pr-12 appearance-none cursor-pointer"
//                   value={form.leaveType} 
//                   onChange={(e) => setForm({...form, leaveType: e.target.value})}
//                 >
//                   {leaveTypes.map(type => (
//                     <option key={type} value={type}>{type}</option>
//                   ))}
//                 </select>
//                 <FileText className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors pointer-events-none" size={22} />
//               </div>
//             </div>

//             {/* سبب أخرى (يظهر فقط إذا كان النوع "أخرى") */}
//             {form.leaveType === "أخرى" && (
//               <div className="animate-in fade-in slide-in-from-top-4 duration-300">
//                 <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">السبب</label>
//                 <textarea 
//                   required
//                   placeholder="يرجى كتابة سبب الإجازة هنا..."
//                   className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold shadow-inner min-h-25 resize-none"
//                   value={form.customReason} 
//                   onChange={(e) => setForm({...form, customReason: e.target.value})}
//                 />
//               </div>
//             )}

//             {/* مدفوعة الأجر */}
//             <div 
//               className="flex items-center gap-3 mt-2 cursor-pointer group w-fit"
//               onClick={() => setForm({...form, isPaid: !form.isPaid})}
//             >
//               <div className="text-[#C89355] transition-colors duration-300">
//                 {form.isPaid ? <CheckSquare size={24} /> : <Square size={24} className="text-slate-500 group-hover:text-[#C89355]" />}
//               </div>
//               <span className="text-sm font-black text-white select-none transition-colors group-hover:text-[#C89355]">إجازة مدفوعة الأجر</span>
//             </div>

//             {errorMessage && (
//               <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs font-bold text-rose-600">
//                 {errorMessage}
//               </div>
//             )}

//           </form>
//         </div>

//         {/* Footer */}
//         <div className="p-6 sm:p-8 bg-[#1a2530]/80 border-t border-white/5 flex justify-between shrink-0 relative z-10">
//           <button type="button" onClick={onClose} disabled={isSubmitting} className="px-8 py-3.5 rounded-2xl font-bold text-slate-400 bg-[#263544] hover:text-white transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
//             إلغاء
//           </button>
//           <button type="submit" form="leaveForm" disabled={isSubmitting} className="bg-[#C89355] text-[#101720] px-10 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:bg-[#d0b468] active:scale-95 transition-all shadow-[0_0_20px_rgba(200,147,85,0.3)] disabled:opacity-70 disabled:cursor-not-allowed">
//             {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
//             {isSubmitting ? "جارٍ الإرسال..." : "حفظ الطلب"}
//           </button>
//         </div>

//       </div>
//     </div>,
//     document.body
//   );
// }

// export default function LeaveRequestModal(props: Props) {
//   const isMounted = typeof document !== "undefined";

//   if (!props.isOpen || !isMounted) return null;

//   const modalKey = `leave-${props.employees.length}`;

//   return <LeaveRequestModalContent key={modalKey} {...props} />;
// }

"use client";

import { useState, useEffect, useMemo , useRef } from "react";
import { createPortal } from "react-dom";
import { X, CalendarDays, FileText, Save, CheckSquare, Square, Loader2, Check, Search } from "lucide-react";
import apiClient from "@/lib/api-client";
import type { Employee } from "@/types/employee";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
}

const LEAVE_TYPE_MAP: Record<string, string> = {
  "إجازة مرضية": "SICK",
  "إجازة إدارية": "ADMIN",
  "إجازة وفاة": "DEATH",
  "عطلة رسمية": "HOLIDAY",
  "إجازة ساعية": "OTHER", 
  "أخرى": "OTHER"
};

const buildDefaultForm = () => ({
  employeeIds: [] as string[],
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  leaveType: "إجازة مرضية",
  customReason: "",
  isPaid: false,
  startTime: "08:00",
  endTime: "10:00",
});

function LeaveRequestModalContent({ isOpen, onClose, employees }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState(buildDefaultForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const LEAVE_REQUESTS_ENDPOINT = "/leave-requests"; 
  
  // القائمة كما طلبتها بالضبط
  const leaveTypes = [
    "إجازة مرضية", 
    "إجازة إدارية", 
    "إجازة وفاة", 
    "عطلة رسمية", 
    "إجازة ساعية", 
    "أخرى"
  ];

  const isHourlyLeave = form.leaveType === "إجازة ساعية";
  const isAllSelected = employees.length > 0 && form.employeeIds.length === employees.length;

  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => 
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

// إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (!isOpen) return null;

  const handleSelectEmployee = (empId: string) => {
    if (form.employeeIds.includes(empId)) {
      setForm(prev => ({ ...prev, employeeIds: prev.employeeIds.filter(id => id !== empId) }));
    } else {
      setForm(prev => ({ ...prev, employeeIds: [...prev.employeeIds, empId] }));
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setForm(prev => ({ ...prev, employeeIds: [] }));
    } else {
      setForm(prev => ({ ...prev, employeeIds: employees.map(emp => emp.employeeId) }));
    }
  };

  const handleRemoveEmployeeChip = (empId: string) => {
    setForm(prev => ({ ...prev, employeeIds: prev.employeeIds.filter(id => id !== empId) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.employeeIds.length === 0) {
      window.alert("الرجاء اختيار موظف واحد على الأقل");
      return;
    }
    if (!isHourlyLeave && form.startDate > form.endDate) {
      window.alert("تاريخ النهاية يجب أن يكون بعد أو يساوي تاريخ البداية!");
      return;
    }
    if (isHourlyLeave && form.startTime >= form.endTime) {
      window.alert("وقت نهاية الإجازة الساعية يجب أن يكون بعد وقت البدء!");
      return;
    }
    if (form.leaveType === "أخرى" && !form.customReason) {
      window.alert("الرجاء كتابة سبب الإجازة");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const mappedLeaveType = LEAVE_TYPE_MAP[form.leaveType] || "OTHER";

    interface LeavePayload {
      employeeId: string;
      startDate: string;
      endDate: string;
      leaveType: string;
      isPaid: boolean;
      reason: string;
      isHourly: boolean;
      startTime?: string;
      endTime?: string;
    }

    try {
      await Promise.all(
        form.employeeIds.map(empId => {
          const payload: LeavePayload = {
            employeeId: empId,
            startDate: form.startDate,
            endDate: isHourlyLeave ? form.startDate : form.endDate,
            leaveType: mappedLeaveType,
            isPaid: form.isPaid,
            reason: form.leaveType === "أخرى" || isHourlyLeave ? form.customReason || form.leaveType : form.leaveType,
            isHourly: isHourlyLeave,
          };

          if (isHourlyLeave) {
            payload.startTime = form.startTime;
            payload.endTime = form.endTime;
          }

          return apiClient.post(LEAVE_REQUESTS_ENDPOINT, payload);
        })
      );

      setForm(buildDefaultForm());
      onClose();
    } catch (error: unknown) {
      console.error("فشل إرسال طلب الإجازة المتعدد:", error);
      const serverMsg = error.response?.data?.message || "تعذر إرسال الطلب حالياً. حاول مرة أخرى.";
      setErrorMessage(Array.isArray(serverMsg) ? serverMsg.join(" | ") : serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md transition-all duration-300" dir="rtl">
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(200,147,85,0.15)] w-full max-w-xl overflow-hidden flex flex-col border border-white/10 outline-dashed outline-1 outline-[#C89355]/30 -outline-offset-8">
        
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-[#C89355]/10 p-3 rounded-2xl border border-[#C89355]/20 shadow-[0_0_20px_rgba(200,147,85,0.15)]">
              <FileText className="text-[#C89355]" size={24} />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">إدارة الإجازات والعطل</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-rose-400 bg-[#263544] p-2.5 rounded-2xl border border-transparent hover:border-rose-400/30 transition-all active:scale-90">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 sm:p-8 relative">
          <form id="leaveForm" onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 text-right">
            
{/* تحديد الموظفين */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-black text-[#C89355] uppercase">الموظفون المشمولون بالطلب</label>
                
                {/* زر تحديد الكل (شكل Checkbox) */}
                <div 
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={handleSelectAll}
                >
                  <span className="text-[11px] font-black text-slate-400 group-hover:text-[#C89355] transition-colors select-none">
                    {isAllSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
                  </span>
                  <div className="text-[#C89355] transition-colors duration-300">
                    {isAllSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-500 group-hover:text-[#C89355]" />}
                  </div>
                </div>
              </div>

              {/* 👇 تم ربط الـ ref هنا ليعمل الإغلاق عند النقر بالخارج */}
              <div className="relative" ref={dropdownRef}>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="ابحث عن اسم الموظف أو الكود لإضافته..."
                    className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold shadow-inner pr-12 text-sm"
                    value={searchQuery}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                  />
                  <Search className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={20} />
                  {isDropdownOpen && (
                    <button 
                      type="button" 
                      onClick={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                      className="absolute left-4 top-4 text-xs text-slate-400 hover:text-white font-bold bg-[#263544] px-2 py-1 rounded-lg"
                    >
                      إغلاق
                    </button>
                  )}
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 max-h-48 overflow-y-auto bg-[#1a2530] border border-[#263544] rounded-2xl shadow-2xl p-2 custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
                    {filteredEmployees.length === 0 ? (
                      <p className="p-4 text-xs text-center text-slate-500 font-bold">لا توجد نتائج مطابقة</p>
                    ) : (
                      filteredEmployees.map(emp => {
                        const isSelected = form.employeeIds.includes(emp.employeeId);
                        return (
                          <div
                            key={emp.employeeId}
                            onClick={() => handleSelectEmployee(emp.employeeId)}
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer text-xs font-bold transition-all ${isSelected ? "bg-[#C89355]/20 text-[#C89355] border border-[#C89355]/30" : "text-slate-300 hover:bg-white/5"}`}
                          >
                            <span>{emp.name} <span className="font-mono text-[10px] text-slate-500">({emp.employeeId})</span></span>
                            {isSelected && <Check size={14} />}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {form.employeeIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 p-3 bg-[#161f29] rounded-2xl border border-white/5 max-h-28 overflow-y-auto custom-scrollbar">
                  {form.employeeIds.map(id => {
                    const emp = employees.find(e => e.employeeId === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black bg-[#1a2530] text-[#C89355] border border-[#C89355]/30 shadow-sm animate-in zoom-in-95">
                        {emp?.name || id}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveEmployeeChip(id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 rounded-md hover:bg-rose-500/10 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* نوع الإجازة */}
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">نوع الإجازة المطلوبة</label>
              <div className="relative group">
                <select 
                  required 
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold shadow-inner pr-12 appearance-none cursor-pointer text-sm transition-all"
                  value={form.leaveType} 
                  onChange={(e) => setForm({...form, leaveType: e.target.value})}
                >
                  {leaveTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <FileText className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors pointer-events-none" size={22} />
              </div>
            </div>

            {/* عرض ديناميكي: حقول التواريخ أو حقول الساعات */}
            {!isHourlyLeave ? (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                <div>
                  <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">من تاريخ</label>
                  <div className="relative group">
                    <input 
                      type="date" required 
                      className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 scheme-dark text-sm transition-all"
                      value={form.startDate} 
                      onChange={(e) => setForm({...form, startDate: e.target.value})}
                    />
                    <CalendarDays className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] pointer-events-none" size={20} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">إلى تاريخ</label>
                  <div className="relative group">
                    <input 
                      type="date" required 
                      min={form.startDate}
                      className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 scheme-dark text-sm transition-all"
                      value={form.endDate} 
                      onChange={(e) => setForm({...form, endDate: e.target.value})}
                    />
                    <CalendarDays className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] pointer-events-none" size={20} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 animate-in slide-in-from-top-3 duration-300">
                <div>
                  <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">تاريخ اليوم</label>
                  <div className="relative group">
                    <input 
                      type="date" required 
                      className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold scheme-dark text-xs transition-all pr-9"
                      value={form.startDate} 
                      onChange={(e) => setForm({...form, startDate: e.target.value})}
                    />
                    <CalendarDays className="absolute right-3 top-3.5 text-slate-500 pointer-events-none" size={16} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">من الساعة</label>
                  <div className="relative group">
                    <input 
                      type="time" required 
                      className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold scheme-dark text-xs transition-all text-center"
                      value={form.startTime} 
                      onChange={(e) => setForm({...form, startTime: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">إلى الساعة</label>
                  <div className="relative group">
                    <input 
                      type="time" required 
                      className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold scheme-dark text-xs transition-all text-center"
                      value={form.endTime} 
                      onChange={(e) => setForm({...form, endTime: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}



            {/* تفاصيل السبب (في حال تم اختيار "أخرى") */}
            {form.leaveType === "أخرى" && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">السبب بالتفصيل</label>
                <textarea 
                  required
                  placeholder="يرجى كتابة سبب الإجازة هنا..."
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold shadow-inner min-h-24 resize-none text-sm"
                  value={form.customReason} 
                  onChange={(e) => setForm({...form, customReason: e.target.value})}
                />
              </div>
            )}

            {/* زر الأجر (Checkbox) */}
            <div 
              className="flex items-center gap-3 mt-2 cursor-pointer group w-fit"
              onClick={() => setForm({...form, isPaid: !form.isPaid})}
            >
              <div className="text-[#C89355] transition-colors duration-300">
                {form.isPaid ? <CheckSquare size={24} /> : <Square size={24} className="text-slate-500 group-hover:text-[#C89355]" />}
              </div>
              <span className="text-sm font-black text-white select-none transition-colors group-hover:text-[#C89355]">
                {form.isPaid ? "إجازة مأجورة" : "إجازة غير مأجورة"}
              </span>
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs font-bold text-rose-600">
                {errorMessage}
              </div>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 bg-[#1a2530]/80 border-t border-white/5 flex justify-between shrink-0 relative z-10">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-8 py-3.5 rounded-2xl font-bold text-slate-400 bg-[#263544] hover:text-white transition-all active:scale-95 disabled:opacity-60">
            إلغاء
          </button>
          <button type="submit" form="leaveForm" disabled={isSubmitting} className="bg-[#C89355] text-[#101720] px-10 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:bg-[#d0b468] active:scale-95 transition-all shadow-[0_0_20px_rgba(200,147,85,0.3)] disabled:opacity-70">
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSubmitting ? "جارٍ حفظ الإجازة..." : "حفظ الطلب"}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

export default function LeaveRequestModal(props: Props) {
  const isMounted = typeof document !== "undefined";

  if (!props.isOpen || !isMounted) return null;

  const modalKey = `leave-${props.employees.length}`;

  return <LeaveRequestModalContent key={modalKey} {...props} />;
}