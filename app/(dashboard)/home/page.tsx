/* eslint-disable @next/next/no-img-element */
"use client";

import dynamic from "next/dynamic";
import {
  Users, Clock, Timer, AlertTriangle,
  UserCheck, Wallet, UserX, Building2, TrendingUp,
  Scissors,
  User,
  CalendarX,
  ClockAlert,
  Banknote,
  Gavel,
  Briefcase,
  ArrowLeftRight,
  X,
  HandCoins
} from "lucide-react";
import { useDashboard } from '@/hooks/useDashboard';
import useDepartments from '@/hooks/useDepartments';
import { useEmployees } from '@/hooks/useEmployees';
import { useAdvances } from '@/hooks/useAdvances';
import { useDiscounts } from '@/hooks/useDiscounts';
import { usePayrollReport } from '@/hooks/usePayrollReport';
import { Employee } from '@/types/employee';
import type { DeptFormData } from "@/components/AddDepartmentModal";
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useAuthStore } from "@/stores/auth-store";
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toLocalDateString } from '@/lib/date-time';
import { useAuthStore } from '@/stores/auth-store';

const AddDepartmentModal = dynamic(() => import("@/components/AddDepartmentModal"), {
  loading: () => null,
});

const DataDrilldownModal = dynamic(
  () => import("@/components/DataDrilldownModal").then((module) => module.DataDrilldownModal),
  { loading: () => null },
);

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface DepartmentData {
  id?: string;
  name: string;
  count: number;
  manager: string;
}

interface OvertimeEmployee {
  employeeId: string;
  name: string;
  department: string;
  profession: string;
  scheduledEnd: string;
  actualCheckOut: string;
  overtimeMinutes: number;
  overtimeHours: number;
  hourlyRate: number;
  overtimePay: number;
  avatar?: string;
}

interface SalaryAdvance {
  advanceId: string;
  employeeId: string;
  name: string;
  department: string;
  profession: string;
  amount: number;
  requestDate: string;
  approvalDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  repaymentStatus: 'pending' | 'partial' | 'completed';
  remainingBalance: number;
  avatar?: string;
}

interface EmployeePenalty {
  penaltyId: string;
  employeeId: string;
  name: string;
  department: string;
  profession: string;
  reason: string;
  severity: 'minor' | 'moderate' | 'severe';
  amount: number;
  date: string;
  issuedBy: string;
  status: 'active' | 'waived' | 'completed';
  notes?: string;
  avatar?: string;
}

interface PresentEmployee {
  employeeId: string;
  name: string;
  department: string;
  profession: string;
  checkIn: string;
  checkOut: string | null;
  avatar?: string;
}

interface AbsentEmployee {
  employeeId: string;
  name: string;
  department: string;
  profession: string;
  scheduledStart: string;
  avatar?: string;
  lastCheckIn?: string;
}

interface LateEmployeeDetail {
  employeeId: string;
  name: string;
  department: string;
  profession: string;
  scheduledStart: string;
  checkIn: string;
  minutesLate: number;
  avatar?: string;
}

type ModalType = 'present' | 'absent' | 'late' | 'overtime' | null;

export default function DashboardPage() {
  const { kpis, isLoading } = useDashboard();
  const { data: employees = [] } = useEmployees({ includeTerminated: true, fetchAll: true, limit: 500 });
  const canViewFinancialRecords = useAuthStore((state) => state.hasAnyRole(["admin"]));
  const router = useRouter();
  const currentPayrollMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);
  const { data: payrollReport, isLoading: payrollReportLoading } = usePayrollReport(currentPayrollMonth);

  const isSkeleton = isLoading || payrollReportLoading;

  // --- Modal state management ---
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<
    PresentEmployee[] | AbsentEmployee[] | LateEmployeeDetail[] | OvertimeEmployee[] | null
  >(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // --- إدارة الأقسام ---
  const queryClient = useQueryClient();

  const toNumber = (value: unknown) => {    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value && typeof value === "object" && "$numberDecimal" in (value as Record<string, unknown>)) {
      const raw = (value as { $numberDecimal?: string }).$numberDecimal;
      const parsed = Number(raw ?? 0);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replace(/,/g, ""));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const totalReceivedFromPayrollReport = useMemo(() => {
    const items = Array.isArray(payrollReport?.items) ? payrollReport.items : [];
    return items.reduce((sum, item) => sum + toNumber(item?.netPayRounded ?? item?.netPay), 0);
  }, [payrollReport?.items]);

  const formatTime = (timestamp?: string | null): string => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };
  void formatTime; // used in JSX indirectly

  const fetchModalData = async (type: ModalType) => {
    if (!type) return;

    setIsModalLoading(true);
    setModalData(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (type === 'present') {
        const mockPresentData: PresentEmployee[] = [
          { employeeId: 'EMP001', name: 'أحمد محمد علي', department: 'الخياطة', profession: 'خياط رئيسي', checkIn: '08:15', checkOut: null },
          { employeeId: 'EMP005', name: 'فاطمة حسن الأحمد', department: 'القص', profession: 'عاملة قص', checkIn: '08:00', checkOut: '16:30' },
        ];
        setModalData(mockPresentData);
      } else if (type === 'absent') {
        const mockAbsentData: AbsentEmployee[] = [
          { employeeId: 'EMP042', name: 'خالد عبدالله السيد', department: 'الكي', profession: 'عامل كي', scheduledStart: '08:00', lastCheckIn: '2026-04-24' },
        ];
        setModalData(mockAbsentData);
      } else if (type === 'late') {
        const mockLateData: LateEmployeeDetail[] = [
          { employeeId: 'EMP015', name: 'محمد خالد الدين', department: 'الخياطة', profession: 'مشرف خط', scheduledStart: '08:00', checkIn: '08:23', minutesLate: 23 },
          { employeeId: 'EMP028', name: 'سارة أحمد النجار', department: 'التعبئة', profession: 'مشرفة تعبئة', scheduledStart: '08:00', checkIn: '08:12', minutesLate: 12 },
        ];
        setModalData(mockLateData);
      } else if (type === 'overtime') {
        const mockOvertimeData: OvertimeEmployee[] = [
          { employeeId: 'EMP012', name: 'محمد أحمد الخطيب', department: 'الخياطة', profession: 'خياط رئيسي', scheduledEnd: '16:00', actualCheckOut: '18:30', overtimeMinutes: 150, overtimeHours: 2.5, hourlyRate: 5000, overtimePay: 12500 },
          { employeeId: 'EMP025', name: 'فاطمة حسن العلي', department: 'القص', profession: 'عاملة قص', scheduledEnd: '16:00', actualCheckOut: '17:45', overtimeMinutes: 105, overtimeHours: 1.75, hourlyRate: 4500, overtimePay: 7875 },
          { employeeId: 'EMP033', name: 'علي محمود الشامي', department: 'الكي', profession: 'عامل كي', scheduledEnd: '16:00', actualCheckOut: '17:30', overtimeMinutes: 90, overtimeHours: 1.5, hourlyRate: 4000, overtimePay: 6000 },
        ];
        setModalData(mockOvertimeData);
      }
    } catch (error) {
      console.error('Error fetching modal data:', error);
      setModalData([]);
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleCardClick = (type: ModalType) => {
    if (type === null) return;
    setActiveModal(type);
    fetchModalData(type);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setModalData(null);
  };

  // --- حذف الأقسام ---
  const handleDeleteDepartment = async (deptId: string | undefined, count: number) => {
    if (!deptId || count > 0) return;
    if (!window.confirm('هل أنت متأكد من مسح هذا القسم؟')) return;
    try {
      await apiClient.delete(`/departments/${deptId}`);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    } catch (err) {
      console.error('Error deleting department:', err);
      alert('فشل حذف القسم');
    }
  };
  void handleDeleteDepartment;

  const monthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const { data: advances = [] } = useAdvances(undefined, canViewFinancialRecords);
  const { data: discounts = [] } = useDiscounts(undefined, canViewFinancialRecords);

  const employeeListMemo = useMemo<Employee[]>(() => {
    return Array.isArray(employees) ? employees : [];
  }, [employees]);

  const monthlyAdvances = useMemo<SalaryAdvance[]>(() => {
    return advances
      .filter((advance) => {
        const advanceDate = advance.issueDate || advance.createdAt || "";
        return advanceDate.startsWith(monthKey);
      })
      .slice()
      .sort((a, b) => (b.issueDate || b.createdAt || "").localeCompare(a.issueDate || a.createdAt || ""))
      .slice(0, 6)
      .map((advance): SalaryAdvance | null => {
        const employee = employeeListMemo.find((emp) => emp.employeeId === advance.employeeId);
        if (!employee?.name) return null;
        return {
          advanceId: advance.id,
          employeeId: advance.employeeId,
          name: `${employee.name} - ${employee.employeeId}`,
          department: employee?.department || "",
          profession: employee?.jobTitle || employee?.profession || "",
          amount: Number(advance.remainingAmount ?? advance.totalAmount ?? 0),
          requestDate: (advance.issueDate || advance.createdAt || "").slice(0, 10),
          approvalDate: (advance.issueDate || advance.createdAt || "").slice(0, 10),
          reason: "",
          status: "approved" as const,
          repaymentStatus: "pending" as const,
          remainingBalance: Number(advance.remainingAmount ?? 0),
          avatar: undefined,
        };
      })
      .filter((item): item is SalaryAdvance => Boolean(item));
  }, [advances, employeeListMemo, monthKey]);

  const recentPenalties = useMemo<EmployeePenalty[]>(() => {
    const monthRecords = discounts.filter((record) => (record.date || "").startsWith(monthKey));
    const source = monthRecords.length > 0 ? monthRecords : discounts;

    return source
      .sort((a, b) => (b.date || b.createdAt || "").localeCompare(a.date || a.createdAt || ""))
      .slice(0, 6)
      .map((penalty): EmployeePenalty | null => {
        const employee = employeeListMemo.find((emp) => emp.employeeId === penalty.employeeId);
        const isAdvance = penalty.kind === "advance" || penalty.backendModel === "advance" || Boolean(penalty.advanceType);
        if (!employee?.name) return null;
        return {
          penaltyId: penalty.id,
          employeeId: penalty.employeeId,
          name: `${employee.name} - ${employee.employeeId}`,
          department: employee?.department || "",
          profession: employee?.jobTitle || employee?.profession || "",
          reason: penalty.notes || penalty.type || (isAdvance ? "سلفة" : "عقوبة"),
          severity: "moderate" as const,
          amount: Number(penalty.amount ?? 0),
          date: (penalty.date || penalty.createdAt || "").slice(0, 10),
          issuedBy: "",
          status: "active" as const,
          avatar: undefined,
        };
      })
      .filter((item): item is EmployeePenalty => Boolean(item));
  }, [discounts, employeeListMemo, monthKey]);

  const { data: deptsData } = useDepartments();

  const departmentSummary = useMemo<DepartmentData[]>(() => {
    const apiList = Array.isArray(deptsData?.departments) ? deptsData.departments : [];
    return apiList.map((d) => ({ id: d.id, name: d.name, count: Number(d.employeeCount ?? 0), manager: d.manager ?? '' }));
  }, [deptsData]);

  const stats = [

    { title: 'إجمالي الموظفين', value: kpis.totalEmployees, subValue: 'مسجل في النظام', icon: Users, clickable: true, onClick: () => router.push('/employees') },
    { title: 'حضور اليوم', value: kpis.activeToday, subValue: 'موظف على رأس عمله', icon: UserCheck, clickable: true, onClick: () => handleCardClick('present') },
    { title: 'إجمالي الغياب', value: kpis.totalAbsentToday, subValue: 'موظف غائب اليوم', icon: UserX, clickable: true, onClick: () => handleCardClick('absent') },
    { title: 'اجمالي المقبوض', value: totalReceivedFromPayrollReport.toLocaleString(), subValue: 'ليرة سورية', icon: HandCoins, clickable: false },
    { title: 'دقائق التأخير', value: kpis.totalLateMinutesToday, subValue: 'إجمالي تأخير اليوم', icon: Clock, clickable: true, onClick: () => handleCardClick('late') },
    { title: 'العمل الإضافي', value: kpis.totalOvertimeMinutesToday, subValue: 'دقيقة عمل إضافية', icon: Timer, clickable: true, onClick: () => handleCardClick('overtime') },
  ];


  // const departmentSummary = Object.entries(employeesStats?.byDepartment || {}).map(([name, count]) => ({ name, count: Number(count) }));


  return (
    <>
      <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">
        
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`, backgroundSize: '24px 24px' }} />

        <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
          
          {/* Header */}
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#263544]/10 pb-6 relative">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline outline-dashed outline-[#C89355]/50 -outline-offset-4 group">
                  <TrendingUp size={22} className="text-[#C89355] group-hover:animate-bounce transition-all duration-300" strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">لوحة التحكم</h1>
              </div>
              <p className="text-slate-600 text-sm font-bold pr-14 flex items-center gap-2">
                <Scissors size={14} className="text-[#C89355]" />
                مراقبة أداء المعمل والموظفين لهذا اليوم
              </p>
            </div>
          </header>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {stats.map((stat, index) => (
              <div key={index} className={`relative bg-white/60 backdrop-blur-xl p-7 rounded-4xl border-2 border-white/90 shadow-[0_10px_30px_rgba(38,53,68,0.08)] transition-all duration-500 group overflow-hidden ${stat.clickable ? 'cursor-pointer hover:shadow-[0_25px_50px_rgba(200,147,85,0.2)] hover:-translate-y-2 hover:scale-[1.02]' : 'hover:shadow-[0_15px_35px_rgba(38,53,68,0.1)]'}`} onClick={stat.onClick} role={stat.clickable ? 'button' : undefined} tabIndex={stat.clickable ? 0 : undefined} onKeyDown={(e) => { if (stat.clickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); stat.onClick?.(); }}}>
                <div className={`absolute inset-1.5 rounded-[1.7rem] border border-dashed pointer-events-none transition-colors duration-500 z-0 ${stat.clickable ? 'border-[#C89355]/30 group-hover:border-[#C89355]/60' : 'border-[#C89355]/20'}`} />
                {stat.clickable && <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-[#263544] to-[#C89355] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />}
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <p className="text-[#263544]/80 text-sm font-black group-hover:text-[#263544] transition-colors">{stat.title}</p>
                  <div className={`p-3 bg-white/80 backdrop-blur-md rounded-2xl transition-all duration-500 border border-white shadow-sm ${stat.clickable ? 'group-hover:bg-[#1a2530] group-hover:border-[#C89355]/40 group-hover:shadow-[0_0_15px_rgba(200,147,85,0.4)]' : ''}`}>
                    <stat.icon size={22} className={`text-[#263544] transition-all duration-300 ${stat.clickable ? 'group-hover:text-[#C89355] group-hover:animate-pulse group-hover:scale-110 group-hover:-rotate-6' : ''}`} />
                  </div>
                </div>
                <h3 className={`text-4xl font-black text-[#263544] tracking-tight mb-2 origin-right transition-transform duration-500 drop-shadow-md relative z-10 ${stat.clickable ? 'group-hover:scale-105' : ''}`}>
                  {isSkeleton ? (
                    <span className="inline-block h-9 w-24 bg-[#e7e0d5] animate-pulse rounded-lg" />
                  ) : (
                    stat.value
                  )}
                </h3>
                <p className="text-[11px] font-bold text-slate-500 bg-white/70 backdrop-blur-md inline-block px-3 py-1.5 rounded-lg border border-white shadow-sm relative z-10">
                  {stat.subValue}
                </p>
              </div>
            ))}
          </div>

          {/* Middle Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Monthly Advances */}
            <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-8 border-2 border-white/90 shadow-[0_15px_40px_rgba(38,53,68,0.08)] flex flex-col h-100 hover:shadow-[0_25px_60px_rgba(38,53,68,0.12)] transition-all duration-500 relative overflow-hidden group/card">
              <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover/card:border-[#C89355]/50" />
              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 shadow-sm">
                  <Banknote className="text-emerald-600 group-hover/card:animate-pulse transition-all duration-300" size={22} />
                </div>
                <h2 className="text-xl font-black text-[#263544]">السلف المأخوذة هذا الشهر</h2>
              </div>
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10">
                {monthlyAdvances.map((advance) => (
                  <div key={advance.advanceId} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/50 backdrop-blur-md rounded-2xl border border-white/80 hover:border-emerald-300 shadow-sm hover:shadow-[0_8px_20px_rgba(16,185,129,0.15)] transition-all duration-300 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-xs font-black text-emerald-700 shadow-md">
                        {advance.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#263544]">{advance.name}</p>
                        <p className="text-[11px] font-bold text-[#263544]/60 mt-0.5">{advance.department}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl shadow-md border border-emerald-200">
                        {advance.amount.toLocaleString()} ل.س
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">{advance.approvalDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Penalties */}
            <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-8 border-2 border-white/90 shadow-[0_15px_40px_rgba(38,53,68,0.08)] flex flex-col h-100 hover:shadow-[0_25px_60px_rgba(38,53,68,0.12)] transition-all duration-500 relative overflow-hidden group/card">
              <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover/card:border-[#C89355]/50" />
              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 shadow-sm">
                  <Gavel className="text-rose-600 group-hover/card:animate-pulse transition-all duration-300" size={22} />
                </div>
                <h2 className="text-xl font-black text-[#263544]">العقوبات الأخيرة</h2>
              </div>
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10">
                {recentPenalties.map((penalty) => (
                  <div key={penalty.penaltyId} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/50 backdrop-blur-md rounded-2xl border border-white/80 hover:border-rose-300 shadow-sm hover:shadow-[0_8px_20px_rgba(225,29,72,0.15)] transition-all duration-300 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center text-xs font-black text-rose-700 shadow-md">
                        {penalty.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#263544]">{penalty.name}</p>
                        <p className="text-[11px] font-bold text-[#263544]/60 mt-0.5">{penalty.department}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{penalty.reason}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-extrabold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl shadow-md border border-rose-200">
                        {penalty.amount.toLocaleString()} ل.س
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">{penalty.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Grid: Department Details */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-[#C89355]/10 rounded-xl border border-[#C89355]/30 shadow-sm">
                <Building2 className="text-[#C89355]" size={22} />
              </div>
              <h2 className="text-2xl font-black text-[#263544]">تفاصيل الأقسام</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {departmentSummary.map((dept, index) => (
                <div key={index} className="group relative bg-white/60 backdrop-blur-xl p-6 rounded-3xl border-2 border-white/90 shadow-[0_10px_30px_rgba(38,53,68,0.08)] hover:shadow-[0_20px_40px_rgba(200,147,85,0.15)] hover:-translate-y-1 transition-all duration-500 overflow-hidden">
                  <div className="absolute inset-1.5 rounded-3xl border border-dashed border-[#C89355]/30 pointer-events-none z-0 group-hover:border-[#C89355]/50 transition-colors duration-500" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-[#C89355] shadow-[0_0_10px_rgba(200,147,85,0.6)] group-hover:scale-125 transition-transform duration-300" />
                      <h3 className="text-base font-black text-[#263544] group-hover:text-[#C89355] transition-colors">{dept.name}</h3>
                    </div>
                    <p className="text-3xl font-black text-[#263544] mb-1 group-hover:scale-105 origin-right transition-transform duration-300">{dept.count}</p>
                    <p className="text-[11px] font-bold text-slate-500">موظف</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* المودالات في الخارج لتغطي كامل الشاشة */}
      
      {/* 1. Present Employees Modal */}
      <DataDrilldownModal<PresentEmployee>
        isOpen={activeModal === 'present'}
        onClose={handleCloseModal}
        title="الموظفون الحاضرون اليوم"
        icon={UserCheck}
        isLoading={isModalLoading}
        data={modalData as PresentEmployee[] | null}
        emptyMessage="لا يوجد موظفون حاضرون اليوم"
        emptyIcon={User}
        renderItem={(employee) => (
          <div key={employee.employeeId} className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/40 backdrop-blur-md rounded-[1.25rem] border border-white/80 hover:border-emerald-300 shadow-sm hover:shadow-[0_8px_20px_rgba(16,185,129,0.15)] transition-all duration-500 group transform hover:-translate-y-0.5 gap-4">
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-r-[1.25rem] opacity-40 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4 pr-3 relative z-10">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-100 to-white border border-emerald-200 shadow-inner flex items-center justify-center text-emerald-700 font-black text-lg group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                  {employee.avatar ? <img src={employee.avatar} alt={employee.name} className="w-full h-full rounded-xl object-cover" /> : employee.name[0]}
                </div>
                <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
              </div>
              <div>
                <p className="text-sm font-black text-[#263544] mb-1">{employee.name}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
                  <Briefcase size={12} className="text-emerald-600 opacity-70" />
                  <span>{employee.profession}</span>
                  <span className="text-slate-300 mx-0.5">•</span>
                  <span>{employee.department}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pr-15 sm:pr-0 pl-1">
              <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                <span className="text-[11px] text-[#263544] font-black bg-white/80 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-slate-200 shadow-sm whitespace-nowrap">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> دخول: <span className="font-mono text-emerald-700">{employee.checkIn}</span>
                </span>
                {employee.checkOut && (
                  <span className="text-[11px] text-slate-500 font-bold bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-slate-100 whitespace-nowrap">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> خروج: <span className="font-mono">{employee.checkOut}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      />

      {/* 2. Absent Employees Modal */}
      <DataDrilldownModal<AbsentEmployee>
        isOpen={activeModal === 'absent'}
        onClose={handleCloseModal}
        title="الموظفون الغائبون اليوم"
        icon={UserX}
        isLoading={isModalLoading}
        data={modalData as AbsentEmployee[] | null}
        emptyMessage="لا يوجد موظفون غائبون اليوم - حضور كامل! 🎉"
        emptyIcon={CalendarX}
        renderItem={(employee) => (
          <div key={employee.employeeId} className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/40 backdrop-blur-md rounded-[1.25rem] border border-white/80 hover:border-rose-300 shadow-sm hover:shadow-[0_8px_20px_rgba(225,29,72,0.15)] transition-all duration-500 group transform hover:-translate-y-0.5 gap-4">
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-rose-500 rounded-r-[1.25rem] opacity-40 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4 pr-3 relative z-10">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-rose-100 to-white border border-rose-200 border-dashed shadow-inner flex items-center justify-center text-rose-700 font-black text-lg group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                  {employee.avatar ? <img src={employee.avatar} alt={employee.name} className="w-full h-full rounded-xl object-cover" /> : employee.name[0]}
                </div>
                <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white shadow-sm flex items-center justify-center">
                  <X size={8} className="text-white" strokeWidth={4} />
                </div>
              </div>
              <div>
                <p className="text-sm font-black text-[#263544] mb-1">{employee.name}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
                  <Briefcase size={12} className="text-rose-500 opacity-70" />
                  <span>{employee.profession}</span>
                  <span className="text-slate-300 mx-0.5">•</span>
                  <span>{employee.department}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pr-15 sm:pr-0 pl-1">
              <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                <span className="text-[11px] text-rose-700 font-black bg-rose-50 px-3 py-1.5 rounded-lg flex items-center justify-between sm:justify-start gap-3 border border-rose-100 shadow-sm">
                  <span className="flex items-center gap-1.5"><AlertTriangle size={12} /> لم يحضر</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded shadow-sm">دوام: {employee.scheduledStart}</span>
                </span>
                {employee.lastCheckIn && (
                  <span className="text-[10px] text-slate-500 font-bold bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-100">
                    <Clock size={10} /> آخر حضور: <span className="font-mono tracking-wider">{employee.lastCheckIn}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      />

      {/* 3. Late Employees Modal */}
      <DataDrilldownModal<LateEmployeeDetail>
        isOpen={activeModal === 'late'}
        onClose={handleCloseModal}
        title="الموظفون المتأخرون اليوم"
        icon={ClockAlert}
        isLoading={isModalLoading}
        data={modalData as LateEmployeeDetail[] | null}
        emptyMessage="لا يوجد موظفون متأخرون اليوم - التزام ممتاز! ⭐"
        emptyIcon={ClockAlert}
        renderItem={(employee) => (
          <div key={employee.employeeId} className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/40 backdrop-blur-md rounded-[1.25rem] border border-white/80 hover:border-amber-300 shadow-sm hover:shadow-[0_8px_20px_rgba(245,158,11,0.15)] transition-all duration-500 group transform hover:-translate-y-0.5 gap-4">
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-amber-500 rounded-r-[1.25rem] opacity-40 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4 pr-3 relative z-10">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-amber-100 to-white border border-amber-200 shadow-inner flex items-center justify-center text-amber-700 font-black text-lg group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                  {employee.avatar ? <img src={employee.avatar} alt={employee.name} className="w-full h-full rounded-xl object-cover" /> : employee.name[0]}
                </div>
                <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow-sm" />
              </div>
              <div>
                <p className="text-sm font-black text-[#263544] mb-1">{employee.name}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
                  <Briefcase size={12} className="text-amber-600 opacity-70" />
                  <span>{employee.profession}</span>
                  <span className="text-slate-300 mx-0.5">•</span>
                  <span>{employee.department}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 pr-15 sm:pr-0 pl-1 w-full sm:w-auto">
              <span className="text-xs text-amber-800 font-black bg-linear-to-r from-amber-100 to-amber-50 px-3 py-1.5 rounded-lg flex items-center justify-center sm:justify-start gap-2 border border-amber-200 shadow-sm w-fit mr-auto sm:mr-0">
                <Clock size={14} className="text-amber-600 group-hover:animate-spin-slow" /> تأخر {employee.minutesLate} دقيقة
              </span>
              <div className="flex items-center justify-end sm:justify-start gap-1.5 text-[10px] text-slate-600 font-bold bg-white/60 px-2 py-1 rounded-md border border-slate-100 w-fit mr-auto sm:mr-0">
                <span className="font-mono text-slate-400 line-through decoration-rose-400/50">{employee.scheduledStart}</span>
                <ArrowLeftRight size={10} className="text-slate-300" />
                <span className="font-mono text-amber-700">{employee.checkIn}</span>
              </div>
            </div>
          </div>
        )}
      />

      {/* 4. Overtime Employees Modal */}
      <DataDrilldownModal<OvertimeEmployee>
        isOpen={activeModal === 'overtime'}
        onClose={handleCloseModal}
        title="موظفو العمل الإضافي اليوم"
        icon={Timer}
        isLoading={isModalLoading}
        data={modalData as OvertimeEmployee[] | null}
        emptyMessage="لا يوجد عمل إضافي اليوم"
        emptyIcon={Timer}
        renderItem={(employee) => (
          <div key={employee.employeeId} className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/40 backdrop-blur-md rounded-[1.25rem] border border-white/80 hover:border-blue-300 shadow-sm hover:shadow-[0_8px_20px_rgba(59,130,246,0.15)] transition-all duration-500 group transform hover:-translate-y-0.5 gap-4">
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-blue-500 rounded-r-[1.25rem] opacity-40 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4 pr-3 relative z-10">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-100 to-white border border-blue-200 shadow-inner flex items-center justify-center text-blue-700 font-black text-lg group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                  {employee.avatar ? <img src={employee.avatar} alt={employee.name} className="w-full h-full rounded-full object-cover" /> : employee.name[0]}
                </div>
                <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
              </div>
              <div>
                <p className="text-sm font-black text-[#263544] mb-1">{employee.name}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
                  <Briefcase size={12} className="text-blue-600 opacity-70" />
                  <span>{employee.profession}</span>
                  <span className="text-slate-300 mx-0.5">•</span>
                  <span>{employee.department}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 pr-15 sm:pr-0 pl-1 w-full sm:w-auto">
              <span className="text-xs text-blue-800 font-black bg-linear-to-r from-blue-100 to-blue-50 px-3 py-1.5 rounded-lg flex items-center justify-between sm:justify-start gap-3 border border-blue-200 shadow-sm w-full sm:w-auto">
                <span className="flex items-center gap-1.5">
                  <Timer size={14} className="text-blue-600 group-hover:animate-pulse" /> {employee.overtimeMinutes} دقيقة <span className="text-[10px] text-blue-600/70 hidden sm:inline">({employee.overtimeHours.toFixed(1)} س)</span>
                </span>
                <span className="font-mono bg-white px-2 py-0.5 rounded shadow-sm text-emerald-600">+{employee.overtimePay.toLocaleString()} ل.س</span>
              </span>
              <div className="flex items-center justify-end sm:justify-start gap-1.5 text-[10px] text-slate-600 font-bold bg-white/60 px-2 py-1 rounded-md border border-slate-100 w-fit mr-auto sm:mr-0">
                <span className="font-mono text-slate-400 line-through decoration-slate-400/50">{employee.scheduledEnd}</span>
                <ArrowLeftRight size={10} className="text-slate-300" />
                <span className="font-mono text-blue-700">{employee.actualCheckOut}</span>
              </div>
            </div>
          </div>
        )}
      />
    </>
  );
}
