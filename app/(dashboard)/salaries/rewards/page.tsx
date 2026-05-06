// "use client";

// import { useState, useMemo } from "react";
// import dynamic from "next/dynamic";
// import { Plus, Gift, ChevronLeft, Search, Trash2 } from "lucide-react";
// import { useEmployees } from "@/hooks/useEmployees"; 
// import type { RewardPayload } from "@/components/AddRewardModal";
// // import { useRewards } from "@/hooks/useRewards"; // للتوصيل مع الباك إند مستقبلاً

// const AddRewardModal = dynamic(() => import("@/components/AddRewardModal"), { loading: () => null });

// export default function RewardsPage() {
//   const { data: employees = [] } = useEmployees({ limit: 200, status: "active" });

//   type RewardRecord = RewardPayload & {
//     id: string;
//     name: string;
//   };
  
//   // داتا وهمية مؤقتة لتمثيل الجدول
//   const [rewards, setRewards] = useState<RewardRecord[]>([
//     { id: "1", employeeId: "EMP001", name: "أحمد محمد", type: "مكافأة", amount: 50000, date: "2026-04-18", notes: "أداء متميز" },
//     { id: "2", employeeId: "EMP015", name: "سالم العلي", type: "عمل إضافي", amount: 25000, date: "2026-04-20", notes: "دوام يوم الجمعة" },
//   ]);

//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");

//   const handleSaveReward = (data: RewardPayload) => {
//     const emp = employees.find(e => e.employeeId === data.employeeId);
//       const newRecord = {
//         id: Date.now().toString(),
//         name: emp?.name || "موظف غير معروف",
//         ...data,
//       };
//     setRewards([newRecord, ...rewards]);
//     setIsModalOpen(false);
//   };

//   const handleDelete = (id: string) => {
//     if(confirm("هل أنت متأكد من حذف هذه الزيادة؟")) {
//       setRewards(rewards.filter(r => r.id !== id));
//     }
//   };

//   const filteredRewards = useMemo(() => {
//     if (!searchTerm) return rewards;
//     return rewards.filter(r => 
//       r.name.includes(searchTerm) || r.employeeId.includes(searchTerm)
//     );
//   }, [rewards, searchTerm]);

//   return (
//     <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">
        
//         {/* نقشة الفايبر */}
//         <div 
//           className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
//           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`, backgroundSize: '24px 24px' }}
//         />

//         <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
          
//           {/* مسار التنقل */}
//           <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
//             <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
//             <span className="hover:text-[#263544] cursor-pointer transition-colors relative z-10">المركز المالي</span>
//             <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
//             <span className="text-[#263544] relative z-10">المكافآت والبدلات</span>
//           </nav>

//           {/* الهيدر */}
//           <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#263544]/10 pb-6 relative">
//             <div>
//               <div className="flex items-center gap-3 mb-2">
//                 <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4 group">
//                   <Gift size={22} className="text-[#C89355] group-hover:animate-bounce transition-all duration-300" strokeWidth={2.5} />
//                 </div>
//                 <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">المكافآت والبدلات</h1>
//               </div>
//               <p className="text-slate-600 text-sm font-bold pr-14 mt-1">
//                 إدارة كافة الإضافات المالية والمكافآت والعمل الإضافي للموظفين.
//               </p>
//             </div>
            
//             <div className="flex flex-wrap items-center justify-end gap-5 w-full md:w-auto">
//               {/* شريط البحث المدمج */}
//               <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 hover:shadow-md w-full md:w-64 transition-all">
//                 <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
//                 <Search size={18} className="text-[#C89355] ml-2 shrink-0 relative z-10" />
//                 <input 
//                   type="text" placeholder="البحث بالاسم أو الكود..." 
//                   value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
//                   className="bg-transparent text-sm font-bold text-[#263544] outline-none w-full relative z-10 placeholder:text-slate-400"
//                 />
//               </div>

//               <button 
//                 onClick={() => setIsModalOpen(true)}
//                 className="relative overflow-hidden bg-[#1a2530] hover:bg-[#263544] text-[#C89355] px-5 py-3 rounded-2xl flex items-center gap-2 shadow-[0_10px_20px_rgba(38,53,68,0.3)] transition-all active:scale-95 text-sm font-black border border-[#C89355]/40 group"
//               >
//                 <div className="absolute inset-1.5 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
//                 <Plus size={18} className="group-hover:animate-spin relative z-10" /> 
//                 <span className="relative z-10 tracking-wide">إضافة مكافأة</span>
//               </button>
//             </div>
//           </header>

//           {/* الجدول */}
//           <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group">
//             <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover:border-[#C89355]/50" />
//             <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
//               <table className="w-full text-right min-w-225">
//                 <thead className="bg-white/40 border-b border-white/80">
//                   <tr>
//                     <th className="p-5 text-[#263544] font-black text-xs uppercase text-center w-24">الكود</th>
//                     <th className="p-5 text-[#263544] font-black text-xs uppercase text-right">الموظف</th>
//                     <th className="p-5 text-[#263544] font-black text-xs uppercase text-center">نوع الإضافة</th>
//                     <th className="p-5 text-emerald-600 font-black text-xs uppercase text-center">القيمة الممنوحة</th>
//                     <th className="p-5 text-[#263544] font-black text-xs uppercase text-center">التاريخ</th>
//                     <th className="p-5 text-[#263544] font-black text-xs uppercase text-right">ملاحظات</th>
//                     <th className="p-5 text-[#263544] font-black text-xs uppercase text-center">إدارة</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-white/40">
//                   {filteredRewards.length === 0 ? (
//                     <tr><td colSpan={7} className="p-16 text-center text-[#263544]/60 font-black">لا توجد سجلات مكافآت.</td></tr>
//                   ) : (
//                     filteredRewards.map((item) => (
//                       <tr key={item.id} className="hover:bg-white/80 transition-all duration-300 group/row">
//                         <td className="p-4 font-mono font-bold text-center text-sm text-slate-500">{item.employeeId}</td>
//                         <td className="p-4 text-right font-black text-[#263544]">{item.name}</td>
//                         <td className="p-4 text-center">
//                           <span className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
//                             {item.type}
//                           </span>
//                         </td>
//                         <td className="p-4 text-center font-mono font-black text-emerald-600 bg-emerald-50/50 rounded-xl">
//                           +{item.amount.toLocaleString()} <span className="text-[10px] text-emerald-500">ل.س</span>
//                         </td>
//                         <td className="p-4 text-center font-mono font-bold text-sm text-[#263544]/70">{new Date(item.date).toLocaleDateString("ar-EG")}</td>
//                         <td className="p-4 text-right text-xs font-bold text-slate-500 truncate max-w-50">{item.notes || "—"}</td>
//                         <td className="p-4 text-center">
//                           <button onClick={() => handleDelete(item.id)} className="text-rose-400 hover:bg-rose-50 hover:text-rose-600 p-2.5 rounded-xl transition-all hover:scale-110 border border-transparent hover:border-rose-200" title="إلغاء">
//                             <Trash2 size={16} />
//                           </button>
//                         </td>
//                       </tr>
//                     ))
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* استدعاء المودال */}
//           {isModalOpen && (
//             <AddRewardModal 
//               isOpen={isModalOpen} 
//               onClose={() => setIsModalOpen(false)} 
//               onSave={handleSaveReward} 
//               employees={Array.isArray(employees) ? employees : []} 
//             />
//           )}

//         </div>
//     </div>
//   );
// }

"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Plus, Gift, ChevronLeft, Search, Trash2, Users } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees"; 
import type { RewardPayload } from "@/components/AddRewardModal";
import { useBonuses } from "@/hooks/useBonuses";
import type { Bonus, BonusInput } from "@/types/bonus";

const AddRewardModal = dynamic(() => import("@/components/AddRewardModal"), { loading: () => null });

export default function RewardsPage() {
  const searchParams = useSearchParams();
  const { data: employees = [] } = useEmployees({ limit: 200, status: "active" });
  const initialEmployeeId = searchParams.get("employeeId") ?? "";
  const initialType = searchParams.get("type") ?? "";
  const initialMonth = searchParams.get("month") ?? "";
  const initialDate = initialMonth ? `${initialMonth}-01` : searchParams.get("date") ?? "";
  const initialAllEmployees = searchParams.get("allEmployees") === "true";
  const shouldOpenOnLoad = Boolean(initialEmployeeId || initialType || initialDate || initialAllEmployees);

  type RewardRecord = RewardPayload & {
    id: string;
    name: string;
    allEmployees?: boolean;
  };

  const [isModalOpen, setIsModalOpen] = useState(shouldOpenOnLoad);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: bonusesData = [], isLoading, createBonus, deleteBonus } = useBonuses({
    employeeId: initialEmployeeId || undefined,
    period: initialMonth || undefined,
  });

  const resolveAmount = (value: Bonus["bonusAmount"]) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value && typeof value === "object" && "$numberDecimal" in value) {
      const parsed = Number(value.$numberDecimal || 0);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replace(/,/g, "").trim());
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const resolveAssistance = (value: Bonus["assistanceAmount"]) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value && typeof value === "object" && "$numberDecimal" in value) {
      const parsed = Number(value.$numberDecimal || 0);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replace(/,/g, "").trim());
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const employeesLookup = useMemo(() => {
    return new Map(employees.map((emp) => [emp.employeeId, emp.name]));
  }, [employees]);

  const rewards = useMemo<RewardRecord[]>(() => {
    return bonusesData.map((bonus) => {
  const rewardId = bonus.id || `${bonus.employeeId}-${bonus.period || ""}`;
      const isAll = bonus.employeeId === "ALL";
      const employeeId = isAll ? "ALL" : bonus.employeeId;
      const name = isAll
        ? "جميع الموظفين"
        : employeesLookup.get(employeeId) || "موظف غير معروف";
      const bonusAmount = resolveAmount(bonus.bonusAmount);
      const assistanceAmount = resolveAssistance(bonus.assistanceAmount);
      const totalAmount = bonusAmount + assistanceAmount;
      const periodDate = bonus.period ? `${bonus.period}-01` : new Date().toISOString();

      return {
        id: String(rewardId),
        employeeId,
        name,
        type: bonus.bonusReason || "مكافأة",
        amount: totalAmount,
        date: periodDate,
        notes: bonus.bonusReason || "",
        allEmployees: isAll,
      };
    });
  }, [bonusesData, employeesLookup]);

  const handleSaveReward = async (data: RewardPayload) => {
    const period = data.date ? data.date.slice(0, 7) : "";
    const basePayload: BonusInput = {
      employeeId: data.employeeId,
      bonusAmount: data.amount,
      assistanceAmount: 0,
      bonusReason: data.type || data.notes || "مكافأة",
      period,
    };

    try {
      if (data.allEmployees || data.employeeId === "ALL") {
        if (!employees.length) {
          alert("لا يمكن تطبيق المكافأة على الجميع قبل تحميل الموظفين.");
          return;
        }

        await Promise.all(
          employees.map((emp) =>
            createBonus.mutateAsync({
              ...basePayload,
              employeeId: emp.employeeId,
            }),
          ),
        );
      } else {
        await createBonus.mutateAsync(basePayload);
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving reward:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الزيادة؟")) {
      try {
        await deleteBonus.mutateAsync(id);
      } catch (error) {
        console.error("Error deleting reward:", error);
      }
    }
  };

  const filteredRewards = useMemo(() => {
    if (!searchTerm) return rewards;
    return rewards.filter((reward) =>
      reward.name.includes(searchTerm) || reward.employeeId.includes(searchTerm)
    );
  }, [rewards, searchTerm]);

  return (
    <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">
        
        {/* نقشة الفايبر */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`, backgroundSize: '24px 24px' }}
        />

        <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
          
          {/* مسار التنقل */}
          <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
            <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
            <span className="hover:text-[#263544] cursor-pointer transition-colors relative z-10">المركز المالي</span>
            <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
            <span className="text-[#263544] relative z-10">المكافآت والبدلات</span>
          </nav>

          {/* الهيدر */}
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#263544]/10 pb-6 relative">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4 group">
                  <Gift size={22} className="text-[#C89355] group-hover:animate-bounce transition-all duration-300" strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">المكافآت والبدلات</h1>
              </div>
              <p className="text-slate-600 text-sm font-bold pr-14 mt-1">
                إدارة كافة الإضافات المالية والمكافآت والعمل الإضافي للموظفين.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-end gap-5 w-full md:w-auto">
              {/* شريط البحث المدمج */}
              <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 hover:shadow-md w-full md:w-64 transition-all">
                <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
                <Search size={18} className="text-[#C89355] ml-2 shrink-0 relative z-10" />
                <input 
                  type="text" placeholder="البحث بالاسم أو الكود..." 
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent text-sm font-bold text-[#263544] outline-none w-full relative z-10 placeholder:text-slate-400"
                />
              </div>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="relative overflow-hidden bg-[#1a2530] hover:bg-[#263544] text-[#C89355] px-5 py-3 rounded-2xl flex items-center gap-2 shadow-[0_10px_20px_rgba(38,53,68,0.3)] transition-all active:scale-95 text-sm font-black border border-[#C89355]/40 group"
              >
                <div className="absolute inset-1.5 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
                <Plus size={18} className="group-hover:animate-spin relative z-10" /> 
                <span className="relative z-10 tracking-wide">إضافة مكافأة</span>
              </button>
            </div>
          </header>

          {/* الجدول */}
          <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover:border-[#C89355]/50" />
            <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
              <table className="w-full text-right min-w-225">
                <thead className="bg-white/40 border-b border-white/80">
                  <tr>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase text-center w-24">الكود</th>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase text-center">الموظف / المستهدف</th>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase text-center">نوع الإضافة</th>
                    <th className="p-5 text-emerald-600 font-black text-xs uppercase text-center">القيمة الممنوحة</th>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase text-center">التاريخ</th>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase text-right">ملاحظات</th>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase text-center">إدارة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40">
                  {isLoading ? (
                    <tr><td colSpan={7} className="p-16 text-center text-[#263544]/60 font-black">جاري تحميل المكافآت...</td></tr>
                  ) : filteredRewards.length === 0 ? (
                    <tr><td colSpan={7} className="p-16 text-center text-[#263544]/60 font-black">لا توجد سجلات مكافآت.</td></tr>
                  ) : (
                    filteredRewards.map((item) => (
                      <tr 
                        key={item.id} 
                        className={`transition-all duration-300 group/row ${
                          item.employeeId === "ALL" 
                            ? "bg-emerald-50/60 hover:bg-emerald-100/80" // تمييز لون صف جميع الموظفين
                            : "hover:bg-white/80"
                        }`}
                      >
                        <td className="p-4 font-mono font-bold text-center text-sm text-slate-500">
                          {item.employeeId === "ALL" ? (
                             <span className="text-[#C89355] text-xs">GLOBAL</span>
                          ) : (
                             item.employeeId
                          )}
                        </td>
                        <td className="p-4 text-center font-black text-[#263544]">
                          <div className="flex items-center gap-2">
                            {item.employeeId === "ALL" && <Users size={16} className="text-[#C89355]" />}
                            <span className="text-center">{item.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black border ${
                            item.employeeId === "ALL" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-black text-emerald-600 bg-emerald-50/50 rounded-xl">
                          +{item.amount.toLocaleString()} <span className="text-[10px] text-emerald-500">ل.س</span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-sm text-[#263544]/70">{new Date(item.date).toLocaleDateString("ar-EG")}</td>
                        <td className="p-4 text-right text-xs font-bold text-slate-500 truncate max-w-50">{item.notes || "—"}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleDelete(item.id)} className="text-rose-400 hover:bg-rose-50 hover:text-rose-600 p-2.5 rounded-xl transition-all hover:scale-110 border border-transparent hover:border-rose-200" title="إلغاء">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* استدعاء المودال */}
          {isModalOpen && (
            <AddRewardModal 
              key={`${isModalOpen}-${initialEmployeeId}-${initialType}-${initialDate}-${initialAllEmployees}`}
              isOpen={isModalOpen} 
              onClose={() => setIsModalOpen(false)} 
              onSave={handleSaveReward} 
              isPending={createBonus.isPending}
              employees={Array.isArray(employees) ? employees : []}
              initialParams={{
                employeeId: initialEmployeeId || undefined,
                type: initialType || undefined,
                date: initialDate || undefined,
                allEmployees: initialAllEmployees || undefined,
              }}
            />
          )}

        </div>
    </div>
  );
}