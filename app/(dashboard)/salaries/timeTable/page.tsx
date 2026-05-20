"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Clock, ChevronLeft, Search, Edit2, CalendarDays } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { usePayrollInputs, UpsertPayrollInputPayload } from "@/hooks/usePayrollInputs";
import type { EditTotalsPayload } from "@/components/EditAttendanceTotalsModal";

const EditAttendanceTotalsModal = dynamic(() => import("@/components/EditAttendanceTotalsModal"), { loading: () => null });

export default function TimeTablePage() {
  const { data: employees = [] } = useEmployees({ limit: 200, status: "active" });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  const { periodStart, periodEnd } = useMemo(() => {
    if (!selectedMonth) return { periodStart: undefined, periodEnd: undefined };
    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${month}-${String(endDay).padStart(2, '0')}`;
    return { periodStart: startDate, periodEnd: endDate };
  }, [selectedMonth]);

  const { data: payrollInputs = [], upsertPayrollInput } = usePayrollInputs(periodStart, periodEnd);

  const recordsWithNames = useMemo(() => {
    return employees.map((emp) => {
      const input = payrollInputs.find((pi) => pi.employeeId === emp.employeeId);
      return {
        ...emp,
        payrollInput: input || null,
        totalAbsencesLeaves: (input?.absenceDays || 0) + (input?.sickLeaveDays || 0) + (input?.unpaidLeaveDays || 0) + (input?.adminLeaveDays || 0),
        totalDelayMinutes: (input?.lateMinutes || 0) + (input?.earlyLeaveMinutes || 0),
        totalOvertimeMinutes: (input?.overtimeRegularMinutes || 0),
        totalOvertimeDays: (input?.overtimeWeekendDays || 0),
      };
    });
  }, [employees, payrollInputs]);

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return recordsWithNames;
    return recordsWithNames.filter(r =>
      r.name.includes(searchTerm) || r.employeeId.includes(searchTerm)
    );
  }, [recordsWithNames, searchTerm]);

  const handleOpenEditModal = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setIsModalOpen(true);
  };

  const handleSaveRecord = (data: EditTotalsPayload) => {
    if (!periodStart || !periodEnd) return;

    // دمج البيانات المالية القديمة (حتى لا تتصفر في الباك إند) مع تعديلات الدوام الجديدة
    const payload: UpsertPayrollInputPayload = {
      ...(selectedInputData || {}), // 👈 هذا السطر السحري يحمي السلف والعقوبات من الحذف!
      ...data,                      // 👈 هذه تعديلات المودال (دوام، تأخير، الخ) وتطغى على القديم
      periodStart,
      periodEnd,
      deathLeaveDays: selectedInputData?.deathLeaveDays || 0, // الحفاظ على القيمة القديمة إن وجدت
    };

    upsertPayrollInput.mutate(payload, {
      onSuccess: () => {
        setIsModalOpen(false);
      }
    });
  };

  const selectedInputData = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return payrollInputs.find(pi => pi.employeeId === selectedEmployeeId) || null;
  }, [selectedEmployeeId, payrollInputs]);

  return (
    <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">

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
            <p className="text-sm font-bold text-slate-500 max-w-xl leading-relaxed">
              إدارة ومتابعة الغيابات والإجازات وساعات العمل الإضافي للموظفين. يتم تجميع البيانات شهرياً.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 hover:shadow-md transition-all group w-full sm:w-auto">
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
              <CalendarDays size={18} className="text-[#C89355] ml-2 shrink-0 relative z-10" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-bold text-[#263544] outline-none w-full relative z-10 font-mono"
              />
            </div>

            <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 hover:shadow-md w-full sm:w-64 transition-all">
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
              <Search size={18} className="text-slate-400 ml-2 relative z-10" />
              <input
                type="text"
                placeholder="بحث عن موظف..."
                className="bg-transparent border-none outline-none w-full text-sm font-bold placeholder:text-slate-400 text-[#263544] relative z-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group">
          <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover:border-[#C89355]/50" />

          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-linear-to-l from-[#1a2530] to-[#263544] text-white">
                  <th className="px-6 py-5 text-sm font-black w-16">#</th>
                  <th className="px-6 py-5 text-sm font-black">الموظف</th>
                  <th className="px-6 py-5 text-sm font-black text-center">أيام الغياب والإجازات</th>
                  <th className="px-6 py-5 text-sm font-black text-center">إجمالي التأخير (دقائق)</th>
                  <th className="px-6 py-5 text-sm font-black text-center">إجمالي الإضافي</th>
                  <th className="px-6 py-5 text-sm font-black text-center w-24">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record, index) => (
                    <tr
                      key={record.employeeId}
                      className="hover:bg-[#C89355]/5 transition-colors group/row"
                    >
                      <td className="px-6 py-4 text-sm font-bold text-slate-400">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#1a2530]">{record.name}</span>
                          <span className="text-xs text-slate-500 font-mono">{record.employeeId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${record.totalAbsencesLeaves > 0 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                          {record.totalAbsencesLeaves} يوم
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${record.totalDelayMinutes > 0 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                          {record.totalDelayMinutes} دقيقة
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {record.totalOvertimeDays > 0 && (
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                              {record.totalOvertimeDays} أيام عطلة
                            </span>
                          )}
                          {record.totalOvertimeMinutes > 0 && (
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700 border border-teal-200">
                              {record.totalOvertimeMinutes} دقيقة عادي
                            </span>
                          )}
                          {record.totalOvertimeDays === 0 && record.totalOvertimeMinutes === 0 && (
                            <span className="text-slate-400 text-sm font-bold">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleOpenEditModal(record.employeeId)}
                            className="p-2 text-[#C89355] hover:bg-[#C89355]/10 rounded-xl transition-all hover:scale-110 active:scale-95"
                            title="تعديل المجاميع"
                          >
                            <Edit2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="p-4 bg-slate-50 rounded-full">
                          <Search className="text-slate-300" size={32} />
                        </div>
                        <span className="text-slate-400 font-bold">لم يتم العثور على أي موظف</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <EditAttendanceTotalsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRecord}
          isPending={upsertPayrollInput.isPending}
          employees={employees}
          initialData={selectedInputData}
          selectedEmployeeId={selectedEmployeeId}
        />
      )}
    </div>
  );
}
