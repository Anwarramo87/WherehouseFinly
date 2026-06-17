"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import {
  Calendar as CalendarIcon, ChevronLeft, Fingerprint, PencilLine,
  Clock3, LogIn, LogOut, Loader2, X, ClipboardCheck, CalendarPlus,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAttendance } from "@/hooks/useAttendance";
import { useAttendanceDailyView } from "@/hooks/useAttendanceDailyView";
import { useEmployees } from "@/hooks/useEmployees";
import { useLeaves } from "@/hooks/useLeaves";
import { HH_MM_REGEX, normalizeHHmm } from "@/lib/attendance-time";
import { timeNow, toLocalDateString } from "@/lib/date-time";
import {
  getAttendanceSocket,
  type AttendanceRealtimeEventPayload,
} from "@/lib/realtime/attendance-socket";
import LeaveManageModal, { type LeaveRecord } from "@/components/LeaveManageModal";
import { MonthPeriodSelector } from "@/components/MonthPeriodSelector";

const LeaveRequestModal = dynamic(
  () => import("@/components/LeaveRequestModal"),
  { loading: () => null }
);

type TableStatus = "present" | "late" | "absent";

const EMPLOYEE_ID_REGEX = /^EMP[0-9]{3,}$/;

const toMinutes = (time?: string) => {
  if (!time) return null;
  const normalized = time.slice(0, 5);
  const [h, m] = normalized.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const getToday = () => toLocalDateString();

/** عرض التاريخ بأرقام إنجليزية */
const formatDate = (date: string) => {
  const d = new Date(`${date}T00:00:00`);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const getStatus = (checkIn?: string, scheduledStart?: string): TableStatus => {
  if (!checkIn) return "absent";
  const ci = toMinutes(checkIn);
  const sc = toMinutes(scheduledStart || "08:00");
  if (ci === null || sc === null) return "present";
  return ci > sc + 5 ? "late" : "present";
};

const statusUi: Record<TableStatus, { label: string; classes: string }> = {
  present: { label: "حاضر", classes: "text-[#C89355] bg-[#1a2530] border-[#C89355]/30 shadow-sm" },
  late:    { label: "متأخر", classes: "text-rose-600 bg-rose-50/80 border-rose-100 shadow-sm" },
  absent:  { label: "غائب",  classes: "text-red-700 bg-red-50/80 border-red-200 shadow-sm" },
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  SICK: "مرضية",
  ADMIN: "إدارية",
  UNPAID: "بدون أجر",
  ANNUAL: "سنوية",
  DEATH: "وفاة",
  OTHER: "أخرى",
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
  leaveStatus?: string[];
  leaveObjects?: LeaveRecord[];
}

export default function AttendancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = getToday();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(today);
  const [period, setPeriod] = useState(searchParams.get("period") || new Date().toISOString().slice(0, 7));
  const [liveAttendanceEvent, setLiveAttendanceEvent] = useState<AttendanceRealtimeEventPayload | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);

  const [timeModal, setTimeModal] = useState<{
    isOpen: boolean;
    row: AttendanceTableRow | null;
    field: "checkIn" | "checkOut" | null;
    value: string;
  }>({ isOpen: false, row: null, field: null, value: "" });

  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  const { data: leaves = [], isLoading: leavesLoading } = useLeaves({
    startDate: selectedDate,
    endDate: selectedDate,
  });

  const isDayInsideLeave = (leave: { startDate: string; endDate: string }, day: string) => {
    // بعد إصلاح useLeaves، التواريخ دائماً YYYY-MM-DD — string comparison آمن وسريع
    const start = leave.startDate?.slice(0, 10);
    const end = leave.endDate?.slice(0, 10);
    const d = day?.slice(0, 10);
    if (!start || !end || !d) return false;
    return d >= start && d <= end;
  };
  const { data: dailyView, isLoading: dailyViewLoading, isFetching: dailyViewFetching, isError: dailyViewError, error: dailyViewErrorObj } = useAttendanceDailyView(selectedDate);
  const { markAttendance } = useAttendance({ period, limit: 200 });

  const employeeList = useMemo(
    () => (Array.isArray(employees) ? employees : []),
    [employees]
  );

  const employeeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of employeeList) {
      if (e?.employeeId) map.set(e.employeeId, e.name || e.employeeId);
    }
    return map;
  }, [employeeList]);

  const employeeScheduleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of employeeList) {
      if (e?.employeeId) map.set(e.employeeId, e.scheduledStart || "08:00");
    }
    return map;
  }, [employeeList]);

  const rows = useMemo((): AttendanceTableRow[] => {
    const employeeIds = new Set<string>();
    for (const e of employeeList) {
      if (e?.employeeId && EMPLOYEE_ID_REGEX.test(e.employeeId)) employeeIds.add(e.employeeId);
    }

    const dvMap = new Map<string, import("@/hooks/useAttendanceDailyView").DailyViewEmployee>();
    (dailyView?.employees || []).forEach((emp) => {
      dvMap.set(emp.employeeId, emp);
    });

    const leavesMap = new Map<string, string[]>();
    const leavesObjectMap = new Map<string, LeaveRecord[]>();
    (leaves || []).forEach((leave) => {
      if (!leave.employeeId || !leave.leaveType) return;
      if (!isDayInsideLeave(leave, selectedDate)) return;
      if (!leavesMap.has(leave.employeeId)) leavesMap.set(leave.employeeId, []);
      if (!leavesObjectMap.has(leave.employeeId)) leavesObjectMap.set(leave.employeeId, []);
      leavesMap.get(leave.employeeId)?.push(leave.leaveType);
      const leaveObj = leave as LeaveRecord;
      // لا نضيف نفس الإجازة مرتين
      if (!leavesObjectMap.get(leave.employeeId)?.find(l => l.id === leaveObj.id)) {
        leavesObjectMap.get(leave.employeeId)?.push(leaveObj);
      }
    });

    const tableRows: AttendanceTableRow[] = [];
    for (const employeeId of Array.from(employeeIds).sort()) {
      const key = `${employeeId}-${selectedDate}`;
      const dv = dvMap.get(employeeId);
      const checkIn = dv?.checkIn || "";
      const checkOut = dv?.checkOut || "";
      const scheduledStart = dv?.scheduledStart || employeeScheduleMap.get(employeeId) || "08:00";
      const leaveStatus = leavesMap.get(employeeId);

      const rawStatus: TableStatus = dv?.status === "late" ? "late" : dv?.status === "present" ? "present" : "absent";
      const effectiveStatus: TableStatus =
        rawStatus === "absent" && leaveStatus && leaveStatus.length > 0
          ? "present"
          : rawStatus;

      tableRows.push({
        key, employeeId,
        employeeName: employeeNameMap.get(employeeId) || dv?.name || employeeId,
        date: selectedDate, checkIn, checkOut, scheduledStart,
        source: (dv?.source === "biometric" ? "device" : "manual"),
        status: effectiveStatus,
        leaveStatus,
        leaveObjects: leavesObjectMap.get(employeeId),
      });
    }
    return tableRows.sort((a, b) =>
      `${b.date}-${b.employeeId}`.localeCompare(`${a.date}-${a.employeeId}`)
    );
  }, [dailyView?.employees, employeeList, selectedDate, employeeNameMap, employeeScheduleMap, leaves]);

  const stats = useMemo(() =>
    rows.reduce(
      (acc, row) => { acc[row.status] += 1; return acc; },
      { present: 0, late: 0, absent: 0 } as Record<TableStatus, number>
    ), [rows]);

  useEffect(() => {
    const socket = getAttendanceSocket();
    if (!socket) return () => {};
    const onAttendanceUpdate = (payload: AttendanceRealtimeEventPayload) => {
      if (!payload?.employeeId) return;
      setLiveAttendanceEvent(payload);
      toast.success(payload.message || "تم تسجيل حضور جديد");
      void queryClient.invalidateQueries({
        queryKey: ["attendance", "daily-view", selectedDate],
      });
    };
    socket.on("attendanceUpdate", onAttendanceUpdate);
    return () => { socket.off("attendanceUpdate", onAttendanceUpdate); };
  }, [queryClient, selectedDate]);

  const handleOpenTimeModal = (row: AttendanceTableRow, field: "checkIn" | "checkOut") => {
    if (!EMPLOYEE_ID_REGEX.test(row.employeeId)) {
      toast.error(`رقم الموظف غير صالح: ${row.employeeId}`);
      return;
    }
    const defaultValue =
      field === "checkOut" && row.checkOut ? normalizeHHmm(row.checkOut)
      : field === "checkIn" && row.checkIn ? normalizeHHmm(row.checkIn)
      : timeNow();
    setTimeModal({ isOpen: true, row, field, value: defaultValue });
  };

  const handleSaveTime = () => {
    const { row, field, value } = timeModal;
    if (!row || !field) return;
    if (!value) { toast.error("الرجاء إدخال الوقت"); return; }
    const normalizedValue = normalizeHHmm(value);
    if (!HH_MM_REGEX.test(normalizedValue)) {
      toast.error("صيغة الوقت غير صحيحة. الرجاء استخدام HH:mm");
      return;
    }
    markAttendance.mutate({
      employeeId: row.employeeId,
      date: row.date,
      checkIn: field === "checkIn" ? normalizedValue : undefined,
      checkOut: field === "checkOut" ? normalizedValue : undefined,
      source: "manual",
    }, {
      onSuccess: () => {
        setTimeModal({ isOpen: false, row: null, field: null, value: "" });
      },
    });
  };

  // إضافة يوم كامل (IN + OUT) بوقت الدوام المجدول — للاختبار
  const handleAddFullDay = (row: AttendanceTableRow) => {
    if (!EMPLOYEE_ID_REGEX.test(row.employeeId)) {
      toast.error(`رقم الموظف غير صالح: ${row.employeeId}`);
      return;
    }
    const scheduledStart = employeeScheduleMap.get(row.employeeId) || "08:00";
    const scheduledEnd = "16:00";
    markAttendance.mutate({
      employeeId: row.employeeId,
      date: row.date,
      checkIn: scheduledStart,
      checkOut: scheduledEnd,
      source: "manual",
    }, {
      onSuccess: () => {
        toast.success(`تم تسجيل يوم كامل للموظف ${row.employeeName}`);
      },
    });
  };

  if (employeesLoading || leavesLoading || dailyViewLoading) return (
    <div className="relative min-h-[85vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 bg-white/40 p-8 rounded-3xl backdrop-blur-2xl border border-white/60 shadow-[0_20px_40px_rgba(38,53,68,0.1)]">
        <div className="w-14 h-14 border-4 border-[#C89355]/30 border-t-[#263544] rounded-full animate-spin" />
        <p className="text-[#263544] font-black animate-pulse text-sm">جاري معالجة السجلات...</p>
      </div>
    </div>
  );

  if (dailyViewError) return (
    <div className="p-8 text-center text-red-600 font-bold bg-rose-50/50 mt-10 rounded-2xl mx-10 border border-rose-200">
      حدث خطأ في تحميل الحضور: {(dailyViewErrorObj as Error)?.message || "خطأ غير معروف"}
    </div>
  );

  return (
    <>
      {/* ─── Main Page ─── */}
      <div
        className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden"
        dir="rtl"
      >
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`, backgroundSize: "24px 24px" }}
        />

        <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">

          {/* Breadcrumb + زر طلب إجازة */}
          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
            <nav className="relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
              <span className="relative z-10 text-slate-500">إدارة الموارد البشرية</span>
              <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
              <span className="text-[#263544] relative z-10 font-black">سجل الحضور</span>
            </nav>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="group/btn relative overflow-hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[#C89355] bg-[#1a2530] hover:bg-[#263544] border border-[#C89355]/40 text-xs font-black active:scale-95 transition-all shadow-sm"
            >
              <div className="absolute inset-0.5 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
              <CalendarPlus size={15} className="relative z-10" />
              <span className="relative z-10">طلب إجازة</span>
            </button>
          </div>

          {/* Header */}
          <header className="mb-10 border-b border-[#263544]/10 pb-6">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-[#1a2530] rounded-2xl border border-[#C89355]/40 outline-dashed outline-1 outline-[#C89355]/50 -outline-offset-4">
                    <ClipboardCheck size={22} className="text-[#C89355]" strokeWidth={2.5} />
                  </div>
                  <h1 className="text-3xl font-black text-[#263544] tracking-tight">سجل الحضور والانصراف</h1>
                </div>
                <p className="text-slate-600 text-sm font-bold pr-14 mt-1 flex items-center gap-2">
                  <Fingerprint size={14} className="text-[#C89355]" />
                  جاهز للتكامل الفوري مع جهاز البصمة
                </p>

                {liveAttendanceEvent && (
                  <div className="mt-5 relative overflow-hidden rounded-2xl border border-white/80 bg-white/60 backdrop-blur-xl p-4 flex items-start justify-between gap-4">
                    <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
                    <div className="flex items-start gap-3 relative z-10">
                      <div className="p-2 bg-[#263544] rounded-xl border border-[#C89355]/30">
                        <Fingerprint size={18} className="text-[#C89355]" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#263544]">{liveAttendanceEvent.message}</p>
                        <p className="text-xs text-slate-500 mt-1 font-bold">
                          {liveAttendanceEvent.employeeName} <span className="text-[#C89355] mx-1">|</span>
                          <span className="font-mono">{liveAttendanceEvent.employeeId}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLiveAttendanceEvent(null)}
                      className="relative z-10 text-slate-400 hover:text-rose-500 p-1.5 rounded-full border border-slate-200"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                {/* Month + Day Selector — موحد */}
                <MonthPeriodSelector
                  value={period}
                  onChange={(newPeriod) => {
                    setPeriod(newPeriod);
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("period", newPeriod);
                    router.replace(`?${params.toString()}`);
                    const [y, m] = newPeriod.split("-").map(Number);
                    const maxDay = new Date(y, m, 0).getDate();
                    const day = Math.min(parseInt(selectedDate.split("-")[2], 10) || 1, maxDay);
                    const clamped = `${newPeriod}-${String(day).padStart(2, "0")}`;
                    setSelectedDate(clamped);
                  }}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  className="flex-1 sm:flex-none"
                />

                <div className="relative overflow-hidden flex flex-wrap items-center gap-3 bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white/80 shadow-sm group">
                  <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
                  <span className="relative z-10 bg-[#1a2530] text-[#C89355] px-4 py-1.5 rounded-xl text-xs font-black border border-[#C89355]/30">حاضر: {stats.present}</span>
                  <span className="relative z-10 bg-orange-50 text-orange-600 px-4 py-1.5 rounded-xl text-xs font-black border border-orange-100">متأخر: {stats.late}</span>
                  <span className="relative z-10 bg-red-50 text-red-600 px-4 py-1.5 rounded-xl text-xs font-black border border-red-100">غائب: {stats.absent}</span>
                  <div className="w-px h-6 bg-[#263544]/20 mx-1 hidden md:block relative z-10" />
                  <span className="relative z-10 text-[#263544] px-3 py-1 text-xs font-black">
                    {dailyViewFetching
                      ? <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin text-[#C89355]" /> تحديث...</span>
                      : <span className="font-mono">{selectedDate}</span>
                    }
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Table */}
          <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0" />
            <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
              <table className="w-full text-right border-collapse min-w-225">
                <thead>
                  <tr className="bg-white/40 border-b border-white/80">
                    <th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">الموظف</th>
                    <th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">التاريخ</th>
                    <th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">الدخول</th>
                    <th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">الخروج</th>
                    <th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">الحالة</th>
                    <th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">حالة الإجازة</th>
                    <th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">المصدر</th>
                    <th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40">
                  {markAttendance.isPending && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-[#263544] bg-white/50">
                        <span className="inline-flex items-center gap-2 font-black">
                          <Loader2 size={18} className="animate-spin text-[#C89355]" />
                          جارٍ حفظ سجل الحضور...
                        </span>
                      </td>
                    </tr>
                  )}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-16 text-center text-[#263544]/60 font-black text-lg">
                        لا توجد بيانات حضور ضمن هذا النطاق
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.key} className="hover:bg-white/80 transition-all duration-300 group/row">
                        <td className="p-4 text-center">
                          <p className="font-black text-slate-800 text-sm">{row.employeeName}</p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{row.employeeId}</p>
                        </td>
                        {/* التاريخ بالأرقام الإنجليزية باللون البرتقالي */}
                        <td className="p-4 text-sm font-black font-mono text-center text-[#C89355]">
                          {formatDate(row.date)}
                        </td>
                        <td className="p-4 text-sm text-[#263544] font-black font-mono text-center">
                          {normalizeHHmm(row.checkIn) || "—"}
                        </td>
                        <td className="p-4 text-sm text-[#263544] font-black font-mono text-center">
                          {normalizeHHmm(row.checkOut) || "—"}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-4 py-1.5 rounded-xl text-[11px] font-black border ${statusUi[row.status].classes}`}>
                            {statusUi[row.status].label}
                          </span>
                        </td>
                        {/* حالة الإجازة — تظهر "إجازة" بدلاً من "غائب" */}
                        <td className="p-4 text-center">
                          {row.leaveObjects && row.leaveObjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {row.leaveObjects.map((leaveObj) => (
                                <button
                                  key={leaveObj.id}
                                  onClick={() => setSelectedLeave({ ...leaveObj, employee: { name: row.employeeName, employeeId: row.employeeId } })}
                                  className="px-4 py-1.5 rounded-xl text-[11px] font-black border text-blue-700 bg-blue-50 border-blue-200 shadow-sm hover:bg-blue-100 hover:border-blue-300 transition-all cursor-pointer"
                                  title="اضغط للتعديل أو الحذف"
                                >
                                  {LEAVE_TYPE_LABELS[leaveObj.leaveType] || leaveObj.leaveType}
                                </button>
                              ))}
                            </div>
                          ) : row.leaveStatus && row.leaveStatus.length > 0 ? (
                            <span className="px-4 py-1.5 rounded-xl text-[11px] font-black border text-blue-700 bg-blue-50 border-blue-200 shadow-sm">
                              {row.leaveStatus.map((t) => LEAVE_TYPE_LABELS[t] || t).join("، ")}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-bold text-xs">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {row.checkIn || row.checkOut ? (
                            <span className="inline-flex items-center justify-center gap-2 text-xs font-black">
                              {row.source === "device" ? (
                                <><Fingerprint size={16} className="text-[#263544]" /><span className="text-[#263544]">جهاز</span></>
                              ) : (
                                <><PencilLine size={16} className="text-[#C89355]" /><span className="text-[#C89355]">يدوي</span></>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-bold">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenTimeModal(row, "checkIn")}
                              disabled={markAttendance.isPending}
                              className="group/btn relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#C89355] bg-[#1a2530] hover:bg-[#263544] border border-[#C89355]/40 text-xs font-black disabled:opacity-50 active:scale-95 transition-all"
                            >
                              <div className="absolute inset-0.5 rounded-lg border border-dashed border-[#C89355]/30 pointer-events-none" />
                              <LogIn size={15} className="relative z-10" />
                              <span className="relative z-10">{row.checkIn ? "تعديل دخول" : "تسجيل دخول"}</span>
                            </button>
                            <button
                              onClick={() => handleOpenTimeModal(row, "checkOut")}
                              disabled={markAttendance.isPending}
                              className="group/btn relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#263544] bg-white/80 border border-white hover:bg-white hover:border-[#C89355]/30 text-xs font-black disabled:opacity-50 active:scale-95 transition-all"
                            >
                              <div className="absolute inset-0.5 rounded-lg border border-dashed border-[#263544]/10 pointer-events-none" />
                              <LogOut size={15} className="text-[#C89355] relative z-10" />
                              <span className="relative z-10">{row.checkOut ? "تعديل خروج" : "تسجيل خروج"}</span>
                            </button>
                            {/* زر إضافة يوم كامل — يظهر إذا ما في IN أو OUT */}
                            {(!row.checkIn || !row.checkOut) && (
                              <button
                                onClick={() => handleAddFullDay(row)}
                                disabled={markAttendance.isPending}
                                className="group/btn relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-black disabled:opacity-50 active:scale-95 transition-all"
                              >
                                <div className="absolute inset-0.5 rounded-lg border border-dashed border-emerald-300/50 pointer-events-none" />
                                <CalendarPlus size={15} className="relative z-10" />
                                <span className="relative z-10">يوم كامل</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 bg-white/60 backdrop-blur-xl p-5 rounded-3xl border border-white/80 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="text-xs text-[#263544] font-black flex items-center gap-2.5">
              <Clock3 size={16} className="text-[#C89355]" />
              يعتبر الموظف متأخراً إذا تجاوز وقت الدخول وقت الدوام المجدول + 5 دقائق.
            </div>
            <div className="text-xs text-[#263544] font-black flex items-center gap-2.5">
              <Fingerprint size={16} className="text-[#C89355]" />
              تحديثات فورية من أجهزة البصمة، تأكد من صحة رمز الموظف.
            </div>
          </div>

        </div>
      </div>

      {/* ── Time Modal — خارج كل الـ containers حتى لا يتأثر بالـ scroll ── */}
      {timeModal.isOpen && timeModal.row && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-[#101720]/70 backdrop-blur-sm p-4">
          <div
            className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.4)] border-2 border-white/80 w-full max-w-lg overflow-hidden flex flex-col md:flex-row relative"
            dir="rtl"
          >
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0" />

            {/* اليسار — نموذج الوقت */}
            <div className="p-8 flex-1 order-2 md:order-1 relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-[#263544] flex items-center gap-2">
                  {timeModal.field === "checkIn"
                    ? <LogIn size={20} className="text-[#C89355]" />
                    : <LogOut size={20} className="text-[#C89355]" />
                  }
                  {timeModal.field === "checkIn" ? "تسجيل الدخول" : "تسجيل الخروج"}
                </h3>
                <button
                  onClick={() => setTimeModal({ isOpen: false, row: null, field: null, value: "" })}
                  className="text-slate-400 hover:text-rose-500 transition-colors bg-white hover:bg-rose-50 p-1.5 rounded-full border border-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <label className="block text-sm font-black text-[#263544]/80 mb-2">حدد الوقت بدقة</label>
              <input
                type="time"
                value={timeModal.value}
                onChange={(e) => setTimeModal((prev) => ({ ...prev, value: e.target.value }))}
                className="w-full p-4 bg-white/80 border-2 border-slate-200 focus:ring-2 focus:ring-[#C89355]/50 focus:border-[#C89355] outline-none font-mono text-2xl font-black text-center text-[#263544] transition-all rounded-2xl"
                dir="ltr"
              />

              <div className="mt-8 flex gap-3">
                <button
                  onClick={handleSaveTime}
                  className="relative overflow-hidden flex-1 bg-[#1a2530] hover:bg-[#263544] active:scale-95 text-[#C89355] font-black py-3 rounded-xl transition-all border border-[#C89355]/40 group"
                >
                  <div className="absolute inset-1 rounded-lg border border-dashed border-[#C89355]/30 pointer-events-none" />
                  <span className="relative z-10">حفظ السجل</span>
                </button>
                <button
                  onClick={() => setTimeModal({ isOpen: false, row: null, field: null, value: "" })}
                  className="flex-1 bg-white hover:bg-slate-50 active:scale-95 text-[#263544] font-black py-3 rounded-xl transition-all border-2 border-slate-200"
                >
                  إلغاء
                </button>
              </div>
            </div>

            {/* اليمين — معلومات الموظف */}
            <div className="bg-[#263544]/5 p-8 md:w-2/5 border-b md:border-b-0 md:border-r border-[#C89355]/20 flex flex-col justify-center items-center text-center order-1 md:order-2 relative z-10">
              <CalendarIcon size={40} className="text-[#C89355] mb-4" />
              <p className="text-[10px] text-[#263544]/60 font-black uppercase tracking-wider mb-1">تاريخ السجل</p>
              <p className="text-xl font-black text-[#C89355] font-mono mb-6 bg-white/80 px-3 py-1 rounded-xl border border-white">
                {formatDate(timeModal.row.date)}
              </p>
              <p className="text-sm font-black text-[#263544] bg-[#C89355]/10 px-3 py-2 rounded-xl border border-[#C89355]/20">
                {timeModal.row.employeeName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      <LeaveRequestModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        employees={employeeList}
      />

      {/* Leave Manage Modal — يفتح عند النقر على بادج الإجازة */}
      {selectedLeave && (
        <LeaveManageModal
          isOpen={!!selectedLeave}
          leave={selectedLeave}
          onClose={() => setSelectedLeave(null)}
          onUpdated={() => {
            void queryClient.invalidateQueries({ queryKey: ["leaves"], exact: false });
          }}
        />
      )}
    </>
  );
}
