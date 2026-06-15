

"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft, Calendar, Clock, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { QUERY_STALE_TIME, QUERY_GC_TIME } from "@/lib/query-cache";
import LeaveManageModal, { type LeaveRecord } from "@/components/LeaveManageModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  initialMonth: string; 
}

const WEEK_DAYS = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

const LEAVE_TYPE_LABELS: Record<string, string> = {
  SICK: "مرضية",
  ADMIN: "إدارية",
  UNPAID: "بدون أجر",
  DEATH: "وفاة",
  PAID: "مأجورة",
  OTHER: "أخرى",
};

export default function EmployeeMonthlyCalendarModal({ isOpen, onClose, employeeId, employeeName, initialMonth }: Props) {
  const isBrowser = typeof window !== "undefined";
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);
  const queryClient = useQueryClient();

  const { startDate, endDate, daysInMonth, year, month } = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const firstDay = `${currentMonth}-01`;
    const lastDayNum = new Date(y, m, 0).getDate();
    const lastDay = `${currentMonth}-${String(lastDayNum).padStart(2, "0")}`;
    
    const days = [];
    for (let i = 1; i <= lastDayNum; i++) {
      days.push(`${currentMonth}-${String(i).padStart(2, "0")}`);
    }

    return { startDate: firstDay, endDate: lastDay, daysInMonth: days, year: y, month: m };
  }, [currentMonth]);

  // جلب سجلات الحضور لشهر كامل
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["employeeMonthlyAttendance", employeeId, currentMonth],
    queryFn: async () => {
      const res = await apiClient.get(`/attendance`, {
        params: { employeeId, startDate, endDate, limit: 200 }
      });
      return Array.isArray(res.data?.records) ? res.data.records : res.data || [];
    },
    enabled: isOpen && !!employeeId,
    staleTime: QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  // جلب الإجازات للموظف مع فلتر الشهر الحالي
  const { data: leavesData } = useQuery({
    queryKey: ["employeeMonthlyLeaves", employeeId, currentMonth],
    queryFn: async () => {
      const res = await apiClient.get(`/leaves`, {
        params: { employeeId, startDate, endDate }
      });
      const data = res.data as { data?: unknown[]; leaveRequests?: unknown[] } | unknown[];
      if (Array.isArray(data)) return data as LeaveRecord[];
      if (data && typeof data === 'object') {
        if ('data' in data && Array.isArray((data as { data: unknown[] }).data)) {
          return (data as { data: LeaveRecord[] }).data;
        }
        if ('leaveRequests' in data && Array.isArray((data as { leaveRequests: unknown[] }).leaveRequests)) {
          return (data as { leaveRequests: LeaveRecord[] }).leaveRequests;
        }
      }
      return [] as LeaveRecord[];
    },
    enabled: isOpen && !!employeeId,
    staleTime: QUERY_STALE_TIME.STANDARD,
  });

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // معالجة البيانات — نخزن كائنات الإجازات الكاملة لكل يوم
  const mappedDays = useMemo(() => {
    interface DayRecord {
      isPresent: boolean;
      isLate: boolean;
      overtimeMin: number;
      leaves: LeaveRecord[];
    }
    const dayMap = new Map<string, DayRecord>();

    if (Array.isArray(attendanceData)) {
      attendanceData.forEach((rec: Record<string, unknown>) => {
        const dateKey = (typeof rec.date === 'string' ? rec.date.split("T")[0] : String(rec.date)) || '';
        
        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, { isPresent: false, isLate: false, overtimeMin: 0, leaves: [] });
        }
        const current = dayMap.get(dateKey)!;
        current.isPresent = true;

        const recData = rec as Record<string, unknown>;
        const minutesLate = Number(recData.minutesLate ?? (recData.shiftPair as Record<string, unknown>)?.minutesLate ?? 0);
        if (minutesLate > 0) current.isLate = true;

        const hoursWorked = Number(recData.hoursWorked ?? (recData.shiftPair as Record<string, unknown>)?.hoursWorked ?? 0);
        if (hoursWorked > 8) {
          current.overtimeMin += (hoursWorked - 8) * 60;
        }
      });
    }

    // نضيف كائنات الإجازات الكاملة — نتجنب إضافة نفس الإجازة مرتين لنفس اليوم
    if (Array.isArray(leavesData)) {
      leavesData.forEach((leave) => {
        const leaveRecord = leave as LeaveRecord;
        const startStr = leaveRecord.startDate?.slice(0, 10) ?? '';
        const endStr   = leaveRecord.endDate?.slice(0, 10) ?? '';
        if (!startStr || !endStr) return;

        daysInMonth.forEach(dayStr => {
          if (dayStr >= startStr && dayStr <= endStr) {
            if (!dayMap.has(dayStr)) {
              dayMap.set(dayStr, { isPresent: false, isLate: false, overtimeMin: 0, leaves: [] });
            }
            const dayEntry = dayMap.get(dayStr)!;
            // لا نضيف نفس الإجازة مرتين
            if (!dayEntry.leaves.find(l => l.id === leaveRecord.id)) {
              dayEntry.leaves.push(leaveRecord);
            }
          }
        });
      });
    }

    return dayMap;
  }, [attendanceData, leavesData, daysInMonth]);

  const firstDayPadding = useMemo(() => {
    const firstDayInstance = new Date(year, month - 1, 1);
    const jsDay = firstDayInstance.getDay(); 
    const mapping: Record<number, number> = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };
    return mapping[jsDay] || 0;
  }, [year, month]);

  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const prevDate = new Date(Date.UTC(y, m - 2, 1));
    if (!isNaN(prevDate.getTime())) {
      setCurrentMonth(prevDate.toISOString().slice(0, 7));
    }
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const nextDate = new Date(Date.UTC(y, m, 1));
    if (!isNaN(nextDate.getTime())) {
      setCurrentMonth(nextDate.toISOString().slice(0, 7));
    }
  };

  if (!isOpen || !isBrowser) return null;

  return createPortal(
    <>
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md" dir="rtl">
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(200,147,85,0.2)] w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col border border-white/10 outline-dashed outline-1 outline-[#C89355]/30 -outline-offset-8 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1a2530]/80">
          <div className="flex items-center gap-4">
            <div className="bg-[#C89355]/10 p-3 rounded-2xl border border-[#C89355]/20 shadow-[0_0_20px_rgba(200,147,85,0.15)]">
              <Calendar className="text-[#C89355]" size={26} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">التقرير التقويمي للموظف</h2>
              <p className="text-sm font-bold text-[#C89355] font-mono mt-0.5">{employeeName} ({employeeId})</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#101720] border border-[#263544] p-1.5 rounded-xl self-center sm:self-auto shadow-inner">
            <button type="button" onClick={handlePrevMonth} className="p-2 text-slate-400 hover:text-[#C89355] bg-[#263544]/50 hover:bg-[#263544] rounded-lg transition-all">
              <ChevronRight size={18} />
            </button>
            <span className="text-sm font-mono font-black text-white px-4 min-w-22.5 text-center">{currentMonth}</span>
            <button type="button" onClick={handleNextMonth} className="p-2 text-slate-400 hover:text-[#C89355] bg-[#263544]/50 hover:bg-[#263544] rounded-lg transition-all">
              <ChevronLeft size={18} />
            </button>
          </div>

          <button type="button" onClick={onClose} className="absolute left-6 top-6 sm:static text-slate-500 hover:text-rose-400 bg-[#263544] p-2 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 sm:p-8 bg-[#101720]">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-[#C89355]" size={36} />
              <span className="text-xs text-slate-400 font-bold">جاري معالجة بيانات الموظف التقويمية...</span>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-7 gap-2 text-center">
                {WEEK_DAYS.map(day => (
                  <div key={day} className="text-xs font-black text-[#C89355] bg-[#1a2530]/50 py-2.5 rounded-xl border border-white/5 shadow-sm">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstDayPadding }).map((_, index) => (
                  <div key={`pad-${index}`} className="bg-transparent opacity-0 pointer-events-none" />
                ))}

                {daysInMonth.map(dayStr => {
                  const dayNum = parseInt(dayStr.split("-")[2]);
                  const info = mappedDays.get(dayStr);
                  const hasLeaves = (info?.leaves?.length ?? 0) > 0;
                  
                  let styleClass = "border-slate-800 bg-[#161f29]/30 text-slate-400"; 
                  let statusText = "غائب";

                  if (hasLeaves && !info?.isPresent) {
                    styleClass = "border-amber-500/30 bg-amber-500/10 text-amber-400";
                    statusText = "إجازة";
                  } else if (info?.isPresent && hasLeaves) {
                    styleClass = "border-teal-500/30 bg-teal-500/10 text-teal-400";
                    statusText = "حاضر / إجازة";
                  } else if (info?.isPresent) {
                    styleClass = "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
                    statusText = info.isLate ? "متأخر" : "حاضر";
                  }

                  return (
                    <div key={dayStr} className={`min-h-22.5 p-3 rounded-2xl border flex flex-col justify-between transition-all hover:scale-102 hover:border-[#C89355]/40 group relative overflow-hidden ${styleClass}`}>
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-black text-base">{dayNum}</span>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-md border border-white/5">{statusText}</span>
                      </div>

                      {/* أزرار الإجازات — قابلة للنقر لفتح LeaveManageModal */}
                      {hasLeaves && (
                        <div className="mt-1 flex flex-col gap-0.5">
                          {info!.leaves.map((l) => (
                            <button
                              key={l.id}
                              onClick={() => setSelectedLeave({ ...l, employee: { name: employeeName, employeeId } })}
                              className="w-full text-[8px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/20 hover:border-amber-400/50 transition-all text-right truncate active:scale-95"
                              title={`${LEAVE_TYPE_LABELS[l.leaveType] ?? l.leaveType} — اضغط للتعديل أو الحذف`}
                            >
                              {LEAVE_TYPE_LABELS[l.leaveType] ?? l.leaveType}
                            </button>
                          ))}
                        </div>
                      )}

                      {(info?.overtimeMin ?? 0) > 0 && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-black text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded-lg w-fit">
                          <Clock size={10} />
                          <span>+{Math.round(info?.overtimeMin ?? 0)} د إضافي</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* LeaveManageModal — يفتح عند النقر على بادج الإجازة */}
    {selectedLeave && (
      <LeaveManageModal
        isOpen={!!selectedLeave}
        leave={selectedLeave}
        onClose={() => setSelectedLeave(null)}
        onUpdated={() => {
          void queryClient.invalidateQueries({ queryKey: ["employeeMonthlyLeaves", employeeId, currentMonth] });
          void queryClient.invalidateQueries({ queryKey: ["leaves"], exact: false });
        }}
      />
    )}
    </>,
    document.body
  );
}
