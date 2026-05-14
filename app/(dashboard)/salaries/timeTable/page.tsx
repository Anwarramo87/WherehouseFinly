"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Clock, ChevronLeft, Search, Edit2, Timer, AlertCircle } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees"; 
import type { TimeRecord, TimeRecordPayload } from "@/components/EditTimeRecordModal";

const EditTimeRecordModal = dynamic(() => import("@/components/EditTimeRecordModal"), { loading: () => null });

export default function TimeTablePage() {
  const { data: employees = [] } = useEmployees({ limit: 500 });
  
  // داتا وهمية لسجلات الدوام
  const [records, setRecords] = useState<TimeRecord[]>([
    { id: "1", employeeId: "EMP001", name: "أحمد محمد", baseSalary: 600000, attendedDays: 26, absentDays: 0, delayMinutes: 0, overtimeHours: 12 },
    { id: "2", employeeId: "EMP015", name: "سالم العلي", baseSalary: 450000, attendedDays: 24, absentDays: 2, delayMinutes: 120, overtimeHours: 0 },
    { id: "3", employeeId: "EMP033", name: "خالد سعيد", baseSalary: 500000, attendedDays: 25, absentDays: 1, delayMinutes: 45, overtimeHours: 5 },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TimeRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSaveRecord = (data: TimeRecordPayload) => {
    if (selectedRecord) {
      setRecords(records.map(r => r.id === selectedRecord.id ? { ...r, ...data } : r));
    } else {
      const emp = employees.find(e => e.employeeId === data.employeeId);
      const newRecord = {
        id: Date.now().toString(),
        name: emp?.name || "موظف غير معروف",
        baseSalary: 500000, // يمكن جلبها من البيانات الفعلية
        ...data
      };
      setRecords([newRecord, ...records]);
    }
    setIsModalOpen(false);
    setSelectedRecord(null);
  };

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    return records.filter(r => 
      r.name.includes(searchTerm) || r.employeeId.includes(searchTerm)
    );
  }, [records, searchTerm]);

  // إحصائيات سريعة
  const totalOvertime = records.reduce((sum, r) => sum + r.overtimeHours, 0);
  const totalDelays = records.reduce((sum, r) => sum + r.delayMinutes, 0);

  return (
    <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">
        
        {/* نقشة الفايبر */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`, backgroundSize: '24px 24px' }}
        />

        <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
          
          <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
            <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
            <span className="hover:text-[#263544] cursor-pointer transition-colors relative z-10">المركز المالي</span>
            <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
            <span className="text-[#263544] relative z-10">سجل الدوام والعمليات</span>
          </nav>

          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#263544]/10 pb-6 relative">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4 group">
                  <Clock size={22} className="text-[#C89355] group-hover:animate-bounce transition-all duration-300" strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">سجل الدوام والعمليات</h1>
              </div>
              <p className="text-slate-600 text-sm font-bold pr-14 mt-1">
                متابعة الحضور، الغياب، العمل الإضافي، والتأخيرات وتأثيرها المالي.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-end gap-5 w-full md:w-auto">
              
              <div className="flex gap-4">
                <div className="bg-white/60 backdrop-blur-md border border-emerald-500/20 px-4 py-2 rounded-2xl shadow-sm flex items-center gap-3">
                  <Timer className="text-emerald-500" size={20} />
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">إجمالي الإضافي</p>
                    <p className="font-mono font-black text-emerald-600 leading-tight">{totalOvertime} ساعة</p>
                  </div>
                </div>
                <div className="bg-white/60 backdrop-blur-md border border-rose-500/20 px-4 py-2 rounded-2xl shadow-sm flex items-center gap-3">
                  <AlertCircle className="text-rose-500" size={20} />
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">إجمالي التأخير</p>
                    <p className="font-mono font-black text-rose-600 leading-tight">{totalDelays} دقيقة</p>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 w-full md:w-56 transition-all">
                <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
                <Search size={18} className="text-[#C89355] ml-2 shrink-0 relative z-10" />
                <input type="text" placeholder="بحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-sm font-bold text-[#263544] outline-none w-full relative z-10 placeholder:text-slate-400" />
              </div>
            </div>
          </header>

          <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover:border-[#C89355]/50" />
            <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
              <table className="w-full text-right min-w-250">
                <thead className="bg-white/40 border-b border-white/80">
                  <tr>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase text-right pr-6">الموظف</th>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase text-center">أيام الدوام</th>
                    <th className="p-5 text-rose-600 font-black text-xs uppercase text-center">أيام الغياب</th>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase text-center">التأخير</th>
                    <th className="p-5 text-emerald-600 font-black text-xs uppercase text-center">العمل الإضافي</th>
                    <th className="p-5 text-[#1a2530] font-black text-xs uppercase text-center bg-[#C89355]/10">صافي الأجر المتوقع</th>
                    <th className="p-5 text-[#263544] font-black text-xs uppercase text-center">إدارة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40">
                  {filteredRecords.length === 0 ? (
                    <tr><td colSpan={7} className="p-16 text-center text-[#263544]/60 font-black">لا توجد سجلات.</td></tr>
                  ) : (
                    filteredRecords.map((item) => {
                      // عمليات حسابية تقريبية للتأثير المالي
                      const dailyRate = item.baseSalary / 26;
                      const minuteRate = dailyRate / (8 * 60);
                      const hourRate = dailyRate / 8;
                      
                      const deductions = (item.absentDays * dailyRate) + (item.delayMinutes * minuteRate);
                      const additions = item.overtimeHours * hourRate * 1.5; // الإضافي بمرة ونصف
                      const expectedNet = item.baseSalary - deductions + additions;

                      return (
                        <tr key={item.id} className="hover:bg-white/80 transition-all duration-300 group/row">
                          <td className="p-4 text-right pr-6">
                            <div className="font-black text-slate-800 text-base">{item.name}</div>
                            <div className="font-mono font-bold text-[10px] text-slate-500 mt-0.5">{item.employeeId}</div>
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-mono font-black text-[#263544]">{item.attendedDays}</span>
                            <span className="text-[10px] font-bold text-slate-400 mr-1">يوم</span>
                          </td>
                          <td className="p-4 text-center">
                            {item.absentDays > 0 ? (
                              <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">{item.absentDays} يوم</span>
                            ) : (
                              <span className="font-mono font-bold text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {item.delayMinutes > 0 ? (
                              <span className="font-mono font-black text-orange-600">{item.delayMinutes} دقيقة</span>
                            ) : (
                              <span className="font-mono font-bold text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {item.overtimeHours > 0 ? (
                              <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">+{item.overtimeHours} ساعة</span>
                            ) : (
                              <span className="font-mono font-bold text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-4 font-black text-center text-[#1a2530] bg-[#C89355]/5 border-x border-[#C89355]/10">
                            {Math.round(expectedNet).toLocaleString()} <span className="text-[9px] text-[#C89355]">ل.س</span>
                          </td>
                          <td className="p-4 text-center">
                            <button onClick={() => { setSelectedRecord(item); setIsModalOpen(true); }} className="text-[#C89355] hover:bg-[#1a2530] p-2.5 rounded-xl transition-all hover:scale-110 shadow-sm border border-transparent hover:border-[#C89355]/30">
                              <Edit2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {isModalOpen && (
            <EditTimeRecordModal 
              isOpen={isModalOpen} 
              onClose={() => { setIsModalOpen(false); setSelectedRecord(null); }} 
              onSave={handleSaveRecord} 
              employees={Array.isArray(employees) ? employees : []}
              initialData={selectedRecord}
            />
          )}

        </div>
    </div>
  );
}