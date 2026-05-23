"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, ChevronLeft, Fingerprint, PencilLine, Clock3, LogIn, LogOut, Loader2, X, ClipboardCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAttendance } from "@/hooks/useAttendance";
import { useEmployees } from "@/hooks/useEmployees";
import { HH_MM_REGEX, normalizeHHmm } from "@/lib/attendance-time";
import { timeNow, toLocalDateString } from "@/lib/date-time";
import {
  getAttendanceSocket,
  type AttendanceRealtimeEventPayload,
} from "@/lib/realtime/attendance-socket";

type TableStatus = "present" | "late" | "absent";

const EMPLOYEE_ID_REGEX = /^EMP[0-9]{3,}$/;

const toMinutes = (time?: string) => {
  if (!time) return null;
  const normalized = time.slice(0, 5);
  const [h, m] = normalized.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return (h * 60) + m;
};

const getToday = () => toLocalDateString();

const getDateRange = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const dates: string[] = [];

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return dates;

  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toLocalDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const toArabicDate = (date: string) =>
  new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${date}T00:00:00`));

const getStatus = (checkIn?: string, scheduledStart?: string): TableStatus => {
  if (!checkIn) return "absent";
  const checkInMinutes = toMinutes(checkIn);
  const scheduledMinutes = toMinutes(scheduledStart || "08:00");
  if (checkInMinutes === null || scheduledMinutes === null) return "present";
  if (checkInMinutes > (scheduledMinutes + 15)) return "late";
  return "present";
};

const statusUi: Record<TableStatus, { label: string; classes: string }> = {
  present: { label: "حاضر", classes: "text-[#C89355] bg-[#1a2530] border-[#C89355]/30 shadow-sm" },
  late: { label: "متأخر", classes: "text-rose-600 bg-rose-50/80 backdrop-blur-md border-rose-100 shadow-sm" },
  absent: { label: "غائب", classes: "text-red-700 bg-red-50/80 backdrop-blur-md border-red-200 shadow-sm" },
};

interface AttendanceTableRow {
  key: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  scheduledStart?: string;
  source: "manual" | "device";
  status: TableStatus;
}

export default function AttendancePage() {
  const today = getToday();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(today);
  const [liveAttendanceEvent, setLiveAttendanceEvent] = useState<AttendanceRealtimeEventPayload | null>(null);

  const [timeModal, setTimeModal] = useState<{
    isOpen: boolean;
    row: AttendanceTableRow | null;
    field: "checkIn" | "checkOut" | null;
    value: string;
  }>({ isOpen: false, row: null, field: null, value: "" });

  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  const { data, isLoading, isFetching, isError, error, markAttendance } = useAttendance({
    date: selectedDate,
    startDate: selectedDate,
    endDate: selectedDate,
    limit: 200,
  });

  const employeeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(employees)) {
      for (const employee of employees) {
        if (employee?.employeeId) map.set(employee.employeeId, employee.name || employee.employeeId);
      }
    }
    return map;
  }, [employees]);

  const employeeScheduleMap = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(employees)) {
      for (const employee of employees) {
        if (employee?.employeeId) map.set(employee.employeeId, employee.scheduledStart || "08:00");
      }
    }
    return map;
  }, [employees]);

const rows = useMemo(() => {
    const dateRange = getDateRange(selectedDate, selectedDate);
    // 1. قراءة البيانات من records بدلاً من dailyRecords
    const rawRecords = data?.records || []; 
    
    // 2. تجميع البصمات المبعثرة (IN / OUT) لكل موظف في اليوم
    const byKey = new Map();
    
    rawRecords.forEach((record: { employeeId: string; date: string; timestamp: string; type: string; source: string }) => {
      const key = `${record.employeeId}-${record.date}`;
      if (!byKey.has(key)) {
        byKey.set(key, { key, checkIn: "", checkOut: "", source: record.source });
      }
      const entry = byKey.get(key);
      
      // استخراج الوقت (ساعات ودقائق) من الـ timestamp
      const timeString = new Date(record.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      if (record.type === 'IN') entry.checkIn = timeString;
      if (record.type === 'OUT') entry.checkOut = timeString;
      // نأخذ المصدر بناءً على آخر بصمة
      entry.source = record.source;
    });

    const employeeIds = new Set<string>();
    (employees || []).forEach((e) => {
      if (e?.employeeId && EMPLOYEE_ID_REGEX.test(e.employeeId)) employeeIds.add(e.employeeId);
    });

    const tableRows: AttendanceTableRow[] = [];
    for (const date of dateRange) {
      for (const employeeId of Array.from(employeeIds).sort()) {
        const key = `${employeeId}-${date}`;
        const entry = byKey.get(key);
        const checkIn = entry?.checkIn || "";
        const checkOut = entry?.checkOut || "";
        const scheduledStart = employeeScheduleMap.get(employeeId) || "08:00";

        tableRows.push({
          key,
          employeeId,
          employeeName: employeeNameMap.get(employeeId) || employeeId,
          date,
          checkIn,
          checkOut,
          scheduledStart,
          source: entry?.source || "manual",
          status: getStatus(checkIn, scheduledStart),
        });
      }
    }
    return tableRows.sort((a, b) => `${b.date}-${b.employeeId}`.localeCompare(`${a.date}-${a.employeeId}`));
  }, [data?.records, employees, selectedDate, employeeNameMap, employeeScheduleMap]);

  const stats = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc[row.status] += 1;
        return acc;
      },
      { present: 0, late: 0, absent: 0 } as Record<TableStatus, number>,
    );
  }, [rows]);

  useEffect(() => {
    const socket = getAttendanceSocket();
    if (!socket) return;
    const onAttendanceUpdate = (payload: AttendanceRealtimeEventPayload) => {
      if (!payload?.employeeId) return;
      setLiveAttendanceEvent(payload);
      toast.success(payload.message || "تم تسجيل حضور جديد");
      void queryClient.invalidateQueries({ queryKey: ["attendance"], exact: false });
      void queryClient.refetchQueries({ queryKey: ["attendance"], exact: false });
    };
    socket.on("attendanceUpdate", onAttendanceUpdate);
    return () => { socket.off("attendanceUpdate", onAttendanceUpdate); };
  }, [queryClient]);

  const handleOpenTimeModal = (row: AttendanceTableRow, field: "checkIn" | "checkOut") => {
    if (!EMPLOYEE_ID_REGEX.test(row.employeeId)) {
      window.alert(`لا يمكن تسجيل الحضور لهذا السطر لأن رقم الموظف غير صالح: ${row.employeeId}`);
      return;
    }
    const defaultValue = field === "checkOut" && row.checkOut
      ? normalizeHHmm(row.checkOut)
      : field === "checkIn" && row.checkIn ? normalizeHHmm(row.checkIn) : timeNow();
    setTimeModal({ isOpen: true, row, field, value: defaultValue });
  };

const handleSaveTime = () => {
    const { row, field, value } = timeModal;
    if (!row || !field) return;
    if (!value) { window.alert("الرجاء إدخال الوقت"); return; }
    
    const normalizedValue = normalizeHHmm(value);
    if (!HH_MM_REGEX.test(normalizedValue)) {
      window.alert("صيغة الوقت غير صحيحة. الرجاء استخدام HH:mm");
      return;
    }

    // Pass the data exactly as the hook expects it.
    markAttendance.mutate({
      employeeId: row.employeeId,
      date: row.date,
      // If the field is checkIn, assign normalizedValue to checkIn, else undefined
      checkIn: field === "checkIn" ? normalizedValue : undefined,
      // If the field is checkOut, assign normalizedValue to checkOut, else undefined
      checkOut: field === "checkOut" ? normalizedValue : undefined,
      source: "manual",
    });
    
    setTimeModal({ isOpen: false, row: null, field: null, value: "" });
  };


  if (isLoading || employeesLoading) return (
    <div className="relative min-h-[85vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 relative z-10 bg-white/40 p-8 rounded-3xl backdrop-blur-2xl border border-white/60 shadow-[0_20px_40px_rgba(38,53,68,0.1)]">
        <div className="w-14 h-14 border-4 border-[#C89355]/30 border-t-[#263544] rounded-full animate-spin shadow-lg" />
        <p className="text-[#263544] font-black animate-pulse text-sm tracking-wide">جاري معالجة السجلات...</p>
      </div>
    </div>
  );

  if (isError) {
    return <div className="p-8 text-center text-red-600 font-bold bg-rose-50/50 mt-10 rounded-2xl mx-10 border border-rose-200">حدث خطأ في تحميل الحضور: {(error as Error)?.message || "خطأ غير معروف"}</div>;
  }

  return (
    <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`, backgroundSize: '24px 24px' }} />

      <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">

        <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
          <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
          <span className="hover:text-[#263544] cursor-pointer transition-colors relative z-10">إدارة الموارد البشرية</span>
          <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
          <span className="text-[#263544] relative z-10">سجل الحضور</span>
        </nav>

        <header className="mb-10 text-right border-b border-[#263544]/10 pb-6 relative">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 -outline-offset-4 group">
                  <ClipboardCheck size={22} className="text-[#C89355] group-hover:animate-bounce transition-all duration-300" strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">سجل الحضور والانصراف</h1>
              </div>
              <p className="text-slate-600 text-sm font-bold pr-14 mt-1 flex items-center gap-2">
                <Fingerprint size={14} className="text-[#C89355]" />
                جاهز للتكامل الفوري مع جهاز البصمة
              </p>

              {liveAttendanceEvent && (
                <div className="mt-5 relative overflow-hidden rounded-2xl border border-white/80 bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgba(38,53,68,0.08)] p-4 flex items-start justify-between gap-4 animate-in slide-in-from-right-4 duration-300 group">
                  <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="p-2 bg-[#263544] rounded-xl shadow-inner border border-[#C89355]/30">
                      <Fingerprint size={18} className="text-[#C89355] group-hover:animate-pulse transition-all duration-300" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#263544]">{liveAttendanceEvent.message}</p>
                      <p className="text-xs text-slate-500 mt-1 font-bold">
                        {liveAttendanceEvent.employeeName} <span className="text-[#C89355] mx-1">|</span> <span className="font-mono text-[#263544]">{liveAttendanceEvent.employeeId}</span>
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setLiveAttendanceEvent(null)} className="relative z-10 text-slate-400 hover:text-rose-500 transition-colors bg-white/80 hover:bg-white p-1.5 rounded-full shadow-sm border border-slate-200">
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 xl:mt-0 flex flex-wrap items-center gap-4 w-full xl:w-auto">
              <div className="relative overflow-hidden flex flex-wrap items-center gap-3 bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all group">
                <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
                <span className="relative z-10 bg-[#1a2530] text-[#C89355] px-4 py-1.5 rounded-xl text-xs font-black border border-[#C89355]/30 shadow-sm">حاضر: {stats.present}</span>
                <span className="relative z-10 bg-orange-50 text-orange-600 px-4 py-1.5 rounded-xl text-xs font-black border border-orange-100 shadow-sm">متأخر: {stats.late}</span>
                <span className="relative z-10 bg-red-50 text-red-600 px-4 py-1.5 rounded-xl text-xs font-black border border-red-100 shadow-sm">غائب: {stats.absent}</span>
                <div className="w-px h-6 bg-[#263544]/20 mx-1 hidden md:block relative z-10"></div>
                <span className="relative z-10 text-[#263544] px-3 py-1 text-xs font-black">
                  {isFetching ? <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin text-[#C89355]" /> تحديث...</span> : <span className="font-mono">{selectedDate}</span>}
                </span>
              </div>

              <div className="relative overflow-hidden bg-white/60 backdrop-blur-2xl border border-white/80 rounded-2xl p-2.5 shadow-sm hover:shadow-md transition-all group min-w-40">
                <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
                <div className="flex items-center gap-2 relative z-10 px-2">
                  <CalendarIcon size={16} className="text-[#C89355]" />
                  <input
                    type="date"
                    value={selectedDate}
                    max={today}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-[#263544] font-mono font-bold text-sm cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group">
          <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50 z-0" />
          <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
            <table className="w-full text-right border-collapse min-w-245">
              <thead>
                <tr className="bg-white/40 border-b border-white/80">
                  <th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">الموظف</th>
                  <th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">التاريخ</th>
                  <th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">الدخول</th>
                  <th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">الخروج</th>
                  <th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">الحالة</th>
                  <th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">المصدر</th>
                  <th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {markAttendance.isPending && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-[#263544] bg-white/50">
                      <span className="inline-flex items-center gap-2 font-black">
                        <Loader2 size={18} className="animate-spin text-[#C89355]" />
                        جارٍ حفظ سجل الحضور...
                      </span>
                    </td>
                  </tr>
                )}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center text-[#263544]/60 font-black text-lg">
                      لا توجد بيانات حضور ضمن هذا النطاق
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.key} className="hover:bg-white/80 transition-all duration-300 group/row">
                      <td className="p-4 text-center">
                        <div>
                          <p className="font-black text-slate-800 text-sm group-hover/row:text-[#263544] transition-colors">{row.employeeName}</p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{row.employeeId}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-[#263544]/80 font-bold text-center">{toArabicDate(row.date)}</td>
                      <td className="p-4 text-sm text-[#263544] font-black font-mono text-center bg-white/30 rounded-lg">{normalizeHHmm(row.checkIn) || "—"}</td>
                      <td className="p-4 text-sm text-[#263544] font-black font-mono text-center bg-white/30 rounded-lg">{normalizeHHmm(row.checkOut) || "—"}</td>
                      <td className="p-4 text-center">
                        <span className={`px-4 py-1.5 rounded-xl text-[11px] font-black border ${statusUi[row.status].classes}`}>
                          {statusUi[row.status].label}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {row.checkIn || row.checkOut ? (
                          <span className="inline-flex items-center justify-center gap-2 text-xs font-black">
                            {row.source === "device" ? (
                              <>
                                <Fingerprint size={16} className="text-[#263544] group-hover/row:animate-pulse transition-all duration-300" />
                                <span className="text-[#263544]">جهاز</span>
                              </>
                            ) : (
                              <>
                                <PencilLine size={16} className="text-[#C89355] group-hover/row:animate-pulse transition-all duration-300" />
                                <span className="text-[#C89355]">يدوي</span>
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-80 group-hover/row:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenTimeModal(row, "checkIn")}
                            disabled={markAttendance.isPending}
                            className="group/btn relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#C89355] bg-[#1a2530] hover:bg-[#263544] border border-[#C89355]/40 text-xs font-black disabled:opacity-50 active:scale-95 transition-all shadow-sm"
                          >
                            <div className="absolute inset-0.5 rounded-lg border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/btn:border-[#C89355]/50" />
                            <LogIn size={15} className="group-hover/btn:-translate-x-1 transition-transform relative z-10" />
                            <span className="relative z-10">{row.checkIn ? "تعديل دخول" : "تسجيل دخول"}</span>
                          </button>

                          <button
                            onClick={() => handleOpenTimeModal(row, "checkOut")}
                            disabled={markAttendance.isPending || !row.checkIn}
                            className="group/btn relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#263544] bg-white/80 backdrop-blur-md border border-white hover:bg-white hover:border-[#C89355]/30 text-xs font-black disabled:opacity-50 active:scale-95 transition-all shadow-sm"
                            title={!row.checkIn ? "يجب تسجيل الدخول أولاً" : "تسجيل/تعديل الخروج"}
                          >
                            <div className="absolute inset-0.5 rounded-lg border border-dashed border-[#263544]/10 pointer-events-none transition-colors group-hover/btn:border-[#C89355]/30" />
                            <LogOut size={15} className="text-[#C89355] group-hover/btn:translate-x-1 transition-transform relative z-10" />
                            <span className="relative z-10">{row.checkOut ? "تعديل خروج" : "تسجيل خروج"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 relative overflow-hidden bg-white/60 backdrop-blur-xl p-5 rounded-4xl border border-white/80 shadow-[0_8px_30px_rgba(38,53,68,0.05)] flex flex-col md:flex-row gap-4 justify-between items-start md:items-center group">
          <div className="absolute inset-1 rounded-[1.8rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
          <div className="text-xs text-[#263544] font-black flex items-center gap-2.5 relative z-10">
            <Clock3 size={16} className="text-[#C89355] group-hover:animate-pulse transition-all duration-300" />
            يعتبر الموظف متأخراً إذا تجاوز وقت الدخول وقت الدوام المجدول + 15 دقيقة.
          </div>
          <div className="text-xs text-[#263544] font-black flex items-center gap-2.5 relative z-10">
            <Fingerprint size={16} className="text-[#C89355] group-hover:animate-pulse transition-all duration-300" />
            تحديثات فورية من أجهزة البصمة، تأكد من صحة رمز الموظف.
          </div>
        </div>

        {timeModal.isOpen && timeModal.row && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#101720]/60 backdrop-blur-md p-4">
            <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] border-2 border-white/80 w-full max-w-lg overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300 relative">
              <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0" />

              <div className="p-8 flex-1 order-2 md:order-1 relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-[#263544] flex items-center gap-2">
                    {timeModal.field === 'checkIn' ? <LogIn className="text-[#C89355]" /> : <LogOut className="text-[#C89355]" />}
                    {timeModal.field === 'checkIn' ? 'تسجيل الدخول' : 'تسجيل الخروج'}
                  </h3>
                  <button
                    onClick={() => setTimeModal({ isOpen: false, row: null, field: null, value: "" })}
                    className="text-slate-400 hover:text-rose-500 transition-colors bg-white hover:bg-rose-50 p-1.5 rounded-full shadow-sm border border-slate-100"
                  >
                    <X size={20} />
                  </button>
                </div>

                <label className="block text-sm font-black text-[#263544]/80 mb-2">حدد الوقت بدقة</label>
                <input
                  type="time"
                  value={timeModal.value}
                  onChange={(e) => setTimeModal(prev => ({...prev, value: e.target.value}))}
                  className="w-full p-4 bg-white/80 border-2 border-white focus:ring-2 focus:ring-[#C89355]/50 focus:border-[#C89355] outline-none font-mono text-2xl font-black text-center text-[#263544] transition-all shadow-inner rounded-2xl"
                  dir="ltr"
                />

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={handleSaveTime}
                    className="relative overflow-hidden flex-1 bg-[#1a2530] hover:bg-[#263544] active:scale-95 text-[#C89355] font-black py-3 rounded-xl transition-all shadow-[0_10px_20px_rgba(38,53,68,0.3)] border border-[#C89355]/40 group"
                  >
                    <div className="absolute inset-1 rounded-lg border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
                    <span className="relative z-10">حفظ السجل</span>
                  </button>
                  <button
                    onClick={() => setTimeModal({ isOpen: false, row: null, field: null, value: "" })}
                    className="flex-1 bg-white hover:bg-slate-50 active:scale-95 text-[#263544] font-black py-3 rounded-xl transition-all border-2 border-white shadow-sm"
                  >
                    إلغاء
                  </button>
                </div>
              </div>

              <div className="bg-[#263544]/5 p-8 md:w-2/5 border-b md:border-b-0 md:border-r border-[#C89355]/20 flex flex-col justify-center items-center text-center order-1 md:order-2 relative z-10 group">
                <CalendarIcon size={40} className="text-[#C89355] mb-4 drop-shadow-md group-hover:animate-bounce transition-all duration-300" />
                <p className="text-[10px] text-[#263544]/60 font-black uppercase tracking-wider mb-1">تاريخ السجل</p>
                <p className="text-xl font-black text-[#263544] font-mono mb-6 bg-white/80 px-3 py-1 rounded-xl shadow-sm border border-white">{timeModal.row.date}</p>
                <p className="text-sm font-black text-[#263544] line-clamp-2 leading-relaxed bg-[#C89355]/10 px-3 py-2 rounded-xl border border-[#C89355]/20">{timeModal.row.employeeName}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}