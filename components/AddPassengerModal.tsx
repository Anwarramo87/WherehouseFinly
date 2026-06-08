// "use client";

// import { useState, useEffect, useMemo } from "react";
// import { createPortal } from "react-dom";
// import { X, Save, UserPlus, Search, Coins, Info, Calculator } from "lucide-react";
// import type { BusData, Passenger } from "@/app/(dashboard)/transportation/page";

// interface Props {
//   isOpen: boolean;
//   onClose: () => void;
//   onSave: (data: Passenger) => void;
//   busData: BusData;
// }

// export default function AddPassengerModal({ isOpen, onClose, onSave, busData }: Props) {
//   const [mounted, setMounted] = useState(false);
//   const [employeeSearch, setEmployeeSearch] = useState("");
//   const [isAutoCalc, setIsAutoCalc] = useState(true);
  
//   // 1. حساب صافي التكلفة التي يجب تغطيتها من الركاب
//   const netTotalToCover = useMemo(() => {
//     return busData.totalCost - (busData.totalCost * (busData.discountPercent / 100));
//   }, [busData]);

//   // 2. حساب المبالغ المحجوزة مسبقاً (الدفع اليدوي)
//   const manualPaymentsTotal = useMemo(() => {
//     return busData.passengers
//       .filter(p => p.isManual)
//       .reduce((sum, p) => sum + p.paidAmount, 0);
//   }, [busData.passengers]);

//   // 3. عدد الركاب الذين يتبعون التوزيع التلقائي (الحاليين + الجديد)
//   const autoPassengersCount = useMemo(() => {
//     return busData.passengers.filter(p => !p.isManual).length + 1;
//   }, [busData.passengers]);

//   // 4. المبلغ المتبقي ليتم تقسيمه
//   const remainingCost = netTotalToCover - manualPaymentsTotal;
  
//   // 5. الحصة التلقائية للشخص الواحد بناءً على الركاب "الفعليين"
//   const autoAmountPerPerson = Math.max(0, Math.round(remainingCost / autoPassengersCount));

//   const [customCost, setCustomCost] = useState(autoAmountPerPerson.toString());

//   useEffect(() => {
//     setMounted(true);
//     if (isOpen) document.body.style.overflow = "hidden";
//     else document.body.style.overflow = "unset";
//     return () => { document.body.style.overflow = "unset"; };
//   }, [isOpen]);

//   if (!isOpen || !mounted) return null;

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     onSave({
//       employeeId: employeeSearch,
//       name: employeeSearch,
//       paidAmount: isAutoCalc ? autoAmountPerPerson : Number(customCost),
//       isManual: !isAutoCalc,
//     });
//   };

//   return createPortal(
//     <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md transition-all duration-300" dir="rtl">
//       <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.9)] w-full max-w-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 border border-white/10 outline outline-dashed outline-1 outline-[#C89355]/30 outline-offset-[-8px]">
        
//         <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80">
//           <div className="flex items-center gap-4">
//             <div className="bg-[#C89355]/10 p-3 rounded-2xl border border-[#C89355]/20 shadow-[0_0_20px_rgba(200,147,85,0.15)]">
//                <UserPlus className="text-[#C89355]" size={28} />
//             </div>
//             <h2 className="text-xl font-black text-white tracking-wide">تسجيل موظف بالرحلة</h2>
//           </div>
//           <button onClick={onClose} className="text-slate-500 hover:text-white bg-[#263544] p-2 rounded-xl active:scale-90 transition-all"><X size={24} /></button>
//         </div>

//         <div className="p-8 relative">
//           <form id="passengerForm" onSubmit={handleSubmit} className="flex flex-col gap-6">
            
//             <div>
//               <label className="block text-xs font-black text-[#C89355] mb-2 uppercase mr-1">الموظف (الاسم أو الكود)</label>
//               <div className="relative group">
//                 <input type="text" required placeholder="ابحث بكود أو اسم الموظف..." className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none text-white font-bold shadow-inner pr-12" value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} />
//                 <Search className="absolute right-4 top-4 text-slate-500" size={22} />
//               </div>
//             </div>

//             {/* قسم الحسابات الذكية */}
//             <div className="bg-[#1a2530] p-6 rounded-2xl border border-[#263544] shadow-inner">
//               <div className="flex items-center justify-between mb-6">
//                 <div className="flex items-center gap-2">
//                   <Calculator size={18} className="text-[#C89355]" />
//                   <label className="text-sm font-black text-white">طريقة حساب التكلفة</label>
//                 </div>
//                 <div className="flex items-center gap-2 bg-[#101720] p-1.5 rounded-xl border border-white/5">
//                   <span className="text-[10px] font-bold text-slate-400 px-2">يدوي</span>
//                   <label className="relative inline-flex items-center cursor-pointer">
//                     <input type="checkbox" className="sr-only peer" checked={isAutoCalc} onChange={() => setIsAutoCalc(!isAutoCalc)} />
//                     <div className="w-11 h-6 bg-[#263544] rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C89355]"></div>
//                   </label>
//                   <span className="text-[10px] font-bold text-[#C89355] px-2">تلقائي</span>
//                 </div>
//               </div>

//               {isAutoCalc ? (
//                 <div className="space-y-4">
//                   <div className="flex justify-between text-xs font-bold border-b border-white/5 pb-2">
//                     <span className="text-slate-500 text-right">المبلغ المتبقي للتوزيع:</span>
//                     <span className="text-white dir-ltr">{remainingCost.toLocaleString()} ل.س</span>
//                   </div>
//                   <div className="flex justify-between items-center bg-[#101720] p-4 rounded-xl border border-[#C89355]/20">
//                     <div className="text-right">
//                       <span className="text-[10px] font-black text-slate-500 block uppercase">الأجرة المقترحة</span>
//                       <span className="text-xs text-slate-400 font-bold">تقسيم على {autoPassengersCount} ركاب فعليين</span>
//                     </div>
//                     <span className="text-2xl font-mono font-black text-[#C89355]">{autoAmountPerPerson.toLocaleString()} <span className="text-xs text-slate-500">ل.س</span></span>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="relative group">
//                   <label className="block text-[10px] font-black text-[#C89355] mb-2 uppercase mr-1">تحديد أجرة مخصصة</label>
//                   <input type="number" required min={0} className="w-full p-4 bg-[#101720] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none text-white text-xl font-mono font-black pr-12 shadow-inner" value={customCost} onChange={(e) => setCustomCost(e.target.value)} />
//                   <Coins className="absolute right-4 top-11 text-slate-500" size={22} />
//                 </div>
//               )}
//             </div>
//           </form>
//         </div>

//         <div className="p-6 sm:p-8 bg-[#1a2530]/80 border-t border-white/5 flex justify-end">
//           <button type="submit" form="passengerForm" className="bg-[#C89355] text-[#101720] px-10 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-[#d0b468] active:scale-95 transition-all shadow-[0_0_20px_rgba(200,147,85,0.3)]">
//             <Save size={20}/> تأكيد الاشتراك
//           </button>
//         </div>
//       </div>
//     </div>,
//     document.body
//   );
// }

"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Save, UserPlus, Search, Coins, Calculator } from "lucide-react";
import type { BusData, Passenger } from "@/app/(dashboard)/Transportation/page";
import type { Employee } from "@/types/employee";
import { useEmployees } from "@/hooks/useEmployees";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Passenger) => void;
  busData: BusData;
}

export default function AddPassengerModal({ isOpen, onClose, onSave, busData }: Props) {
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isAutoCalc, setIsAutoCalc] = useState(true);
  const [customCost, setCustomCost] = useState("");

  // Logic: الحساب الديناميكي العادل
  const netCost = busData.totalCost - (busData.totalCost * (busData.companyDeductionPct / 100));
  const manualTotal = busData.passengers.filter(p => p.isManual).reduce((sum, p) => sum + (p.paidAmount ?? 0), 0);
  const autoCount = busData.passengers.filter(p => !p.isManual).length + 1; // +1 للراكب الجديد
  const remainingCost = Math.max(0, netCost - manualTotal);
  const autoAmountPerPerson = Math.round(remainingCost / autoCount);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  const routeText = useMemo(() => {
    if (!busData?.route) return "";
    return busData.route.trim();
  }, [busData]);

  const { data: allEmployees = [] } = useEmployees({ fetchAll: true });
  const existingEmployeeIds = useMemo(() => new Set((busData.passengers || []).map(p => p.employeeId)), [busData.passengers]);

  // Normalize Arabic text: remove diacritics, normalize alef variants, remove tatweel
  const normalize = (s: string) => {
    if (!s) return "";
    return s
      .toLowerCase()
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "") // remove tashkeel
      .replace(/[إأآا]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ـ/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim();
  };

  const { matched: matchingEmployees, others: otherEmployees } = useMemo(() => {
    const normRoute = normalize(routeText);
    const matched: Employee[] = [];
    const others: Employee[] = [];
    for (const e of (allEmployees || [])) {
      if (!e) continue;
      if (existingEmployeeIds.has(e.employeeId)) continue; // skip already added
      const r = normalize(e.residence || "");
      // Match if residence contains origin or origin contains residence or exact token match
      const isMatch = normRoute && r && (normRoute.includes(r) || r.includes(normRoute) || r.split(" ").some((tok: string) => normRoute.includes(tok)));
      if (isMatch) matched.push(e);
      else others.push(e);
    }
    // Sort matched by best heuristic: exact token match first
    matched.sort((a: Employee, b: Employee) => {
      const aScore = normalize(a.residence || "").includes(normRoute) ? 0 : 1;
      const bScore = normalize(b.residence || "").includes(normRoute) ? 0 : 1;
      return aScore - bScore;
    });
    
    const otherEmployeesLimited = (list: Employee[], limit = 30) => list.slice(0, limit);
    return { matched: matched.slice(0, 50), others: otherEmployeesLimited(others, 50) };
  }, [allEmployees, routeText, existingEmployeeIds]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeSearch.trim() && !selectedEmployeeId) return alert("الرجاء إدخال كود أو اسم الموظف");

    const employeeId = selectedEmployeeId || (employeeSearch.split('-')[0]?.trim() || employeeSearch.trim());
    const name = selectedEmployeeId
      ? (allEmployees.find((e: Employee) => e.employeeId === selectedEmployeeId)?.name || employeeSearch)
      : employeeSearch;

    const generatedId = `${busData.id}-${employeeId}-${busData.passengers.length + 1}`;

    onSave({
      id: generatedId,
      employeeId,
      name,
      paidAmount: isAutoCalc ? autoAmountPerPerson : Number(customCost),
      isManual: !isAutoCalc,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md transition-all duration-300" dir="rtl">
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.9)] w-full max-w-xl overflow-hidden flex flex-col border border-white/10 outline-dashed outline-1 outline-[#C89355]/30 -outline-offset-8">
        
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80">
          <div className="flex items-center gap-4">
            <div className="bg-[#C89355]/10 p-3 rounded-2xl border border-[#C89355]/20">
               <UserPlus className="text-[#C89355]" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">تسجيل موظف بالرحلة</h2>
              <p className="text-xs text-[#C89355] font-bold mt-1">{busData.route}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white bg-[#263544] p-2 rounded-xl active:scale-90 transition-all"><X size={24} /></button>
        </div>

        <div className="p-8 relative">
          <form id="passengerForm" onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">الموظف (الاسم أو الكود)</label>
              <div className="relative group">
                <input type="text" required placeholder="ابحث بكود أو اسم الموظف..." className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold pr-12" value={employeeSearch} onChange={(e) => { setEmployeeSearch(e.target.value); setSelectedEmployeeId(null); }} />
                <Search className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355]" size={22} />
              </div>

              {/* Suggestions based on residence / origin */}
              <div className="mt-2 grid gap-2">
                {matchingEmployees.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-400 mb-2">الموظفون المطابقون للرحلة ({routeText || '—'})</div>
                    <div className="bg-[#0f1720] border border-[#263544] rounded-xl max-h-48 overflow-auto p-2">
                      {matchingEmployees.map((emp: Employee) => (
                        <div key={emp.employeeId} className="flex items-center justify-between px-2 py-2 hover:bg-[#263544] rounded-md">
                          <div className="text-left">
                            <div className="flex justify-between items-center gap-2">
                              <span className="font-mono text-sm text-white">{emp.employeeId}</span>
                              <span className="text-slate-400 text-xs">{emp.residence || '—'}</span>
                            </div>
                            <div className="text-xs text-slate-300">{emp.name}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setEmployeeSearch(`${emp.employeeId} - ${emp.name}`); setSelectedEmployeeId(emp.employeeId); }}
                            className="px-3 py-1 rounded-2xl bg-[#C89355] text-[#101720] text-xs font-black border border-[#C89355]/30"
                          >اختيار</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {otherEmployees.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-400 mb-2">موظفون آخرون</div>
                    <div className="bg-[#0f1720] border border-[#263544] rounded-xl max-h-48 overflow-auto p-2">
                      {otherEmployees.map((emp: Employee) => (
                        <div key={emp.employeeId} className="flex items-center justify-between px-2 py-2 hover:bg-[#263544] rounded-md">
                          <div>
                            <div className="flex justify-between items-center gap-2">
                              <span className="font-mono text-sm text-white">{emp.employeeId}</span>
                              <span className="text-slate-400 text-xs">{emp.residence || '—'}</span>
                            </div>
                            <div className="text-xs text-slate-300">{emp.name}</div>
                          </div>
                          <button type="button" onClick={() => { setEmployeeSearch(`${emp.employeeId} - ${emp.name}`); setSelectedEmployeeId(emp.employeeId); }} className="px-3 py-1 rounded-2xl bg-[#C89355] text-[#101720] text-xs font-black border border-[#C89355]/30">اختيار</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#1a2530] p-6 rounded-2xl border border-[#263544] shadow-inner">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Calculator size={18} className="text-[#C89355]" />
                  <label className="text-sm font-black text-white">حساب الأجرة</label>
                </div>
                <div className="flex items-center gap-2 bg-[#101720] p-1.5 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 px-2">يدوي</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isAutoCalc} onChange={() => setIsAutoCalc(!isAutoCalc)} />
                    <div className="w-11 h-6 bg-[#263544] rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-0.5 after:right-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C89355]"></div>
                  </label>
                  <span className="text-[10px] font-bold text-[#C89355] px-2">تلقائي</span>
                </div>
              </div>

              {isAutoCalc ? (
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold border-b border-white/5 pb-2">
                    <span className="text-slate-500 text-right">المبلغ المتبقي للتوزيع:</span>
                    <span className="text-white dir-ltr">{remainingCost.toLocaleString()} ل.س</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#101720] p-4 rounded-xl border border-[#C89355]/20">
                    <div className="text-right">
                      <span className="text-[10px] font-black text-[#C89355] block uppercase">الأجرة المقترحة للموظف</span>
                      <span className="text-xs text-slate-400 font-bold">بناءً على {autoCount} ركاب (حالي+الجديد)</span>
                    </div>
                    <span className="text-2xl font-mono font-black text-[#C89355]">{autoAmountPerPerson.toLocaleString()} <span className="text-xs text-slate-500">ل.س</span></span>
                  </div>
                </div>
              ) : (
                <div className="relative group mt-2">
                  <label className="block text-[10px] font-black text-[#C89355] mb-2 uppercase">مبلغ مخصص</label>
                  <input type="number" required min={0} className="w-full p-4 bg-[#101720] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white text-xl font-mono font-black pr-12 shadow-inner" value={customCost} onChange={(e) => setCustomCost(e.target.value)} />
                  <Coins className="absolute right-4 top-11 text-slate-500" size={22} />
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="p-6 bg-[#1a2530]/80 border-t border-white/5 flex justify-end">
          <button type="submit" form="passengerForm" className="bg-[#C89355] text-[#101720] px-10 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-[#d0b468] active:scale-95 transition-all">
            <Save size={20}/> تأكيد الاشتراك
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}