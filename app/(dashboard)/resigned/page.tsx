"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Loader2, UserMinus, BadgeInfo, ChevronLeft, Scissors, Download, UserCheck, DollarSign, Building2, TrendingUp, TrendingDown, AlertCircle, RefreshCw, Lock } from "lucide-react";
import { useResignedEmployees } from "@/hooks/useEmployees";
import ResignedEmployeesList from "@/components/ResignedEmployeesList";
import RehireEmployeeModal from "@/components/RehireEmployeeModal";
import FinancialSettlementModal from "@/components/FinancialSettlementModal";
import type { Employee } from "@/types/employee";
import type { RehireData } from "@/components/RehireEmployeeModal";
import type { SettlementData } from "@/components/FinancialSettlementModal";
import type { ResignedEmployeesStatistics } from "@/types/resignation";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { excelExportService } from "@/lib/excel-export";
import { ExportResignedListGuard } from "@/components/PermissionGuard";

export default function ResignedEmployeesPage() {
  const { data: allEmployees = [], isLoading, isError, error, settleEmployee, refetch, isFetching } = useResignedEmployees();
  
  // Modal states
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [selectedEmployeeForRehire, setSelectedEmployeeForRehire] = useState<Employee | null>(null);
  const [selectedEmployeeForSettlement, setSelectedEmployeeForSettlement] = useState<Employee | null>(null);
  const [isRehireModalOpen, setIsRehireModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isRehirePending, setIsRehirePending] = useState(false);
  const [isSettlementPending, setIsSettlementPending] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<'resignation' | 'termination' | 'all'>('all');
  const [financialStatusFilter, setFinancialStatusFilter] = useState<'pending' | 'completed' | 'all'>('all');
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // فلترة الموظفين المغادرين فقط (إقالة أو استقالة)
  const resignedOrTerminated = useMemo(() => {
    return allEmployees.filter(emp => emp.status === "terminated" || emp.status === "resigned");
  }, [allEmployees]);

  // Apply filters
  const filteredEmployees = useMemo(() => {
    let filtered = [...resignedOrTerminated];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.name?.toLowerCase().includes(query) || 
        emp.employeeId?.toLowerCase().includes(query)
      );
    }
    
    // Department filter
    if (departmentFilter && departmentFilter !== "الكل") {
      filtered = filtered.filter(emp => emp.department === departmentFilter);
    }
    
    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(emp => {
        if (typeFilter === 'resignation') {
          return emp.status === 'resigned' || emp.terminationType === 'resignation';
        } else {
          return emp.status === 'terminated' || emp.terminationType === 'termination';
        }
      });
    }
    
    // Financial status filter
    if (financialStatusFilter !== 'all') {
      filtered = filtered.filter(emp => {
        if (financialStatusFilter === 'completed') {
          return emp.isSettled || emp.financialSettlementStatus === 'completed';
        } else {
          return !emp.isSettled && emp.financialSettlementStatus !== 'completed';
        }
      });
    }

    // Date range filter
    if (dateRangeStart || dateRangeEnd) {
      const start = dateRangeStart ? new Date(dateRangeStart) : null;
      const end = dateRangeEnd ? new Date(dateRangeEnd + 'T23:59:59') : null;
      filtered = filtered.filter(emp => {
        if (!emp.terminationDate) return false;
        const d = new Date(emp.terminationDate);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }
    
    return filtered.sort((a, b) => {
      const dateA = a.terminationDate ? new Date(a.terminationDate).getTime() : 0;
      const dateB = b.terminationDate ? new Date(b.terminationDate).getTime() : 0;
      return dateB - dateA; // Most recent first
    });
  }, [resignedOrTerminated, searchQuery, departmentFilter, typeFilter, financialStatusFilter, dateRangeStart, dateRangeEnd]);

  // Calculate statistics with department breakdown
  const statistics = useMemo((): ResignedEmployeesStatistics & { byDepartment: Record<string, number> } => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let currentMonthCount = 0;
    let previousMonthsCount = 0;
    let resignationsCount = 0;
    let terminationsCount = 0;
    let pendingSettlementCount = 0;
    let completedSettlementCount = 0;
    const byDepartment: Record<string, number> = {};
    
    resignedOrTerminated.forEach(emp => {
      // Count by month
      if (emp.terminationDate) {
        const termDate = new Date(emp.terminationDate);
        if (termDate.getMonth() === currentMonth && termDate.getFullYear() === currentYear) {
          currentMonthCount++;
        } else {
          previousMonthsCount++;
        }
      } else {
        previousMonthsCount++;
      }
      
      // Count by type
      if (emp.status === 'resigned' || emp.terminationType === 'resignation') {
        resignationsCount++;
      } else {
        terminationsCount++;
      }
      
      // Count by financial status
      if (emp.isSettled || emp.financialSettlementStatus === 'completed') {
        completedSettlementCount++;
      } else {
        pendingSettlementCount++;
      }

      // Count by department
      const dept = emp.department || 'غير محدد';
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    });
    
    return {
      currentMonth: currentMonthCount,
      previousMonths: previousMonthsCount,
      resignations: resignationsCount,
      terminations: terminationsCount,
      pendingSettlement: pendingSettlementCount,
      completedSettlement: completedSettlementCount,
      totalResigned: resignedOrTerminated.length,
      byDepartment
    };
  }, [resignedOrTerminated]);

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set<string>();
    resignedOrTerminated.forEach(emp => {
      if (emp.department) depts.add(emp.department);
    });
    return Array.from(depts).sort();
  }, [resignedOrTerminated]);

  // Pagination
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEmployees, currentPage]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const paginationInfo = {
    total: filteredEmployees.length,
    page: currentPage,
    limit: itemsPerPage,
    totalPages
  };

  // Handle quick settle (simple button in table)
  const handleSettle = useCallback(async (id: string) => {
    try {
      await settleEmployee.mutateAsync(id);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'فشل في تصفية الموظف';
      toast.error(msg);
    }
  }, [settleEmployee]);

  // Handle rehire
  const handleRehire = useCallback((employeeId: string) => {
    const employee = resignedOrTerminated.find(emp => emp.employeeId === employeeId);
    if (employee) {
      setSelectedEmployeeForRehire(employee);
      setIsRehireModalOpen(true);
    }
  }, [resignedOrTerminated]);

  const handleRehireConfirm = useCallback(async (data: RehireData) => {
    if (!selectedEmployeeForRehire) return;
    
    setIsRehirePending(true);
    try {
      const payload = {
        employeeId: selectedEmployeeForRehire.employeeId,
        rehireDate: data.rehireDate,
        notes: data.notes,
        restorePreviousSettings: data.restorePreviousSettings
      };
      
      await apiClient.post('/employees/rehire', payload);
      
      toast.success('تم إعادة تعيين الموظف بنجاح!');
      setIsRehireModalOpen(false);
      setSelectedEmployeeForRehire(null);
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message
        ?? (error instanceof Error ? error.message : 'حدث خطأ أثناء إعادة التعيين');
      toast.error(msg);
    } finally {
      setIsRehirePending(false);
    }
  }, [selectedEmployeeForRehire]);

  // Handle financial settlement — open modal (data fetching is handled by the modal)
  const handleFinancialSettlement = useCallback((employeeId: string) => {
    const employee = resignedOrTerminated.find(emp => emp.employeeId === employeeId);
    if (employee) {
      setSelectedEmployeeForSettlement(employee);
      setIsSettlementModalOpen(true);
    }
  }, [resignedOrTerminated]);

  const handleSettlementConfirm = useCallback(async (data: SettlementData) => {
    if (!selectedEmployeeForSettlement) return;
    
    setIsSettlementPending(true);
    try {
      const payload = {
        employeeId: selectedEmployeeForSettlement.employeeId,
        settlementDate: data.settlementDate,
        finalSalaryAmount: data.finalSalaryAmount,
        deductions: data.deductions,
        bonuses: data.bonuses,
        notes: data.notes
      };
      
      await apiClient.post('/employees/financial-settlement', payload);
      
      toast.success('تم إجراء التصفية المالية بنجاح!');
      setIsSettlementModalOpen(false);
      setSelectedEmployeeForSettlement(null);
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message
        ?? (error instanceof Error ? error.message : 'حدث خطأ أثناء التصفية المالية');
      toast.error(msg);
    } finally {
      setIsSettlementPending(false);
    }
  }, [selectedEmployeeForSettlement]);

  // Export to Excel
  const handleExportToExcel = useCallback(() => {
    try {
      excelExportService.exportResignedEmployees(filteredEmployees, {
        filters: {
          searchQuery,
          department: departmentFilter || undefined,
          terminationType: typeFilter === 'all' ? undefined : typeFilter,
          financialStatus: financialStatusFilter === 'all' ? undefined : financialStatusFilter,
        },
      });
      toast.success('تم تصدير البيانات بنجاح');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'حدث خطأ أثناء تصدير البيانات';
      toast.error(msg);
    }
  }, [filteredEmployees, searchQuery, departmentFilter, typeFilter, financialStatusFilter]);

  // Handle retry on error
  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">

        {/* نقشة الفايبر (القماش) الثابتة والشفافة */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* المحتوى الداخلي */}
        <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
                          
          {/* مسار التنقل (Breadcrumbs) */}
          <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
            <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
            <span className="hover:text-[#263544] cursor-pointer transition-colors relative z-10">إدارة الموارد البشرية</span>
            <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
            <span className="text-[#263544] relative z-10">أرشيف المغادرين</span>
          </nav>

          {/* الهيدر */}
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#263544]/10 pb-6 relative">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4">
                  <UserMinus size={22} className="text-[#C89355] animate-bounce" strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">
                  أرشيف المقالين والمستقيلين
                </h1>
              </div>
              <p className="text-slate-600 text-sm font-bold pr-14 flex items-center gap-2">
                <Scissors size={14} className="text-[#C89355]" />
                إدارة التصفيات المالية وإخلاء الطرف
              </p>
            </div>
            
            <div className="flex flex-wrap w-full md:w-auto justify-end gap-3">
              {mounted && !isLoading && (
                <div className="relative overflow-hidden inline-flex items-center gap-2 bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-5 py-3 shadow-[0_10px_20px_rgba(38,53,68,0.05)] text-[#263544] text-sm font-black group hover:shadow-md transition-all">
                  <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
                  <BadgeInfo size={18} className="text-[#C89355] group-hover:animate-pulse relative z-10" />
                  <span className="relative z-10 tracking-wide">العدد الإجمالي: {statistics.totalResigned}</span>
                </div>
              )}
              
              {mounted && !isLoading && (
                <ExportResignedListGuard
                  fallback={
                    <button
                      disabled
                      className="relative overflow-hidden inline-flex items-center gap-2 bg-slate-300 text-slate-500 rounded-2xl px-5 py-3 text-sm font-black cursor-not-allowed"
                    >
                      <Lock size={18} />
                      <span className="relative z-10">تصدير Excel</span>
                    </button>
                  }
                >
                  <button
                    onClick={handleExportToExcel}
                    disabled={isFetching}
                    className="relative overflow-hidden inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-5 py-3 shadow-[0_10px_20px_rgba(16,185,129,0.2)] text-sm font-black group transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-1 rounded-xl border border-dashed border-white/30 pointer-events-none transition-colors group-hover:border-white/50" />
                    <Download size={18} className="relative z-10" />
                    <span className="relative z-10">تصدير Excel</span>
                  </button>
                </ExportResignedListGuard>
              )}
            </div>
          </header>

          {/* لوحة الإحصائيات المتقدمة */}
          {!isLoading && !isError && resignedOrTerminated.length > 0 && (
            <div className="mb-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* إجمالي المغادرين */}
              <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <BadgeInfo size={16} className="text-[#C89355]" />
                  <span className="text-xs font-bold text-slate-500">إجمالي المغادرين</span>
                </div>
                <p className="text-2xl font-black text-[#263544]">{statistics.totalResigned}</p>
              </div>

              {/* الاستقالات */}
              <div className="bg-blue-50/60 backdrop-blur-xl border border-blue-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-700">استقالات</span>
                </div>
                <p className="text-2xl font-black text-blue-700">{statistics.resignations}</p>
              </div>

              {/* الإقالات */}
              <div className="bg-rose-50/60 backdrop-blur-xl border border-rose-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown size={16} className="text-rose-600" />
                  <span className="text-xs font-bold text-rose-700">إقالات</span>
                </div>
                <p className="text-2xl font-black text-rose-700">{statistics.terminations}</p>
              </div>

              {/* هذا الشهر */}
              <div className="bg-purple-50/60 backdrop-blur-xl border border-purple-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <UserMinus size={16} className="text-purple-600" />
                  <span className="text-xs font-bold text-purple-700">هذا الشهر</span>
                </div>
                <p className="text-2xl font-black text-purple-700">{statistics.currentMonth}</p>
              </div>

              {/* قيد التصفية */}
              <div className="bg-amber-50/60 backdrop-blur-xl border border-amber-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={16} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-700">قيد التصفية</span>
                </div>
                <p className="text-2xl font-black text-amber-700">{statistics.pendingSettlement}</p>
              </div>

              {/* تمت التصفية */}
              <div className="bg-emerald-50/60 backdrop-blur-xl border border-emerald-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck size={16} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700">تمت التصفية</span>
                </div>
                <p className="text-2xl font-black text-emerald-700">{statistics.completedSettlement}</p>
              </div>
            </div>
          )}

          {/* إحصائيات الأقسام */}
          {!isLoading && !isError && Object.keys(statistics.byDepartment).length > 1 && (
            <div className="mb-8 bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Building2 size={18} className="text-[#C89355]" />
                <h3 className="font-black text-[#263544]">توزيع المغادرين حسب الأقسام</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statistics.byDepartment)
                  .sort(([, a], [, b]) => b - a)
                  .map(([dept, count]) => (
                    <div
                      key={dept}
                      className="inline-flex items-center gap-2 bg-[#1a2530]/5 backdrop-blur-md border border-[#263544]/10 rounded-xl px-4 py-2"
                    >
                      <span className="font-bold text-[#263544] text-sm">{dept}</span>
                      <span className="bg-[#C89355] text-white text-xs font-black px-2 py-0.5 rounded-lg">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {(!mounted || isLoading) && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-[#C89355] mb-4" size={48} />
              <span className="font-black text-[#263544] text-lg animate-pulse">جاري تحميل بيانات المغادرين...</span>
            </div>
          )}

          {/* Error State */}
          {mounted && isError && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="p-4 bg-rose-50 rounded-2xl">
                <AlertCircle className="text-rose-500" size={48} />
              </div>
              <div className="text-center">
                <h3 className="font-black text-[#263544] text-xl mb-2">حدث خطأ في تحميل البيانات</h3>
                <p className="text-slate-600 text-sm mb-4">
                  {error instanceof Error ? error.message : 'فشل في تحميل بيانات المغادرين'}
                </p>
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 bg-[#1a2530] hover:bg-[#263544] text-[#C89355] px-5 py-3 rounded-2xl shadow-lg transition-all active:scale-95 text-sm font-black"
                >
                  <RefreshCw size={18} />
                  <span>إعادة المحاولة</span>
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {mounted && !isLoading && !isError && (
            <>
              {/* قائمة الموظفين المستقيلين */}
              <ResignedEmployeesList
                employees={paginatedEmployees}
                statistics={statistics}
                pagination={paginationInfo}
                loading={isFetching}
                error={null}
                onSearch={(q) => { setSearchQuery(q); setCurrentPage(1); }}
                onFilterDepartment={(d) => { setDepartmentFilter(d); setCurrentPage(1); }}
                onFilterType={(t) => { setTypeFilter(t); setCurrentPage(1); }}
                onFilterFinancialStatus={(s) => { setFinancialStatusFilter(s); setCurrentPage(1); }}
                onFilterDateRange={(start, end) => { setDateRangeStart(start); setDateRangeEnd(end); setCurrentPage(1); }}
                onPageChange={setCurrentPage}
                onSettle={handleSettle}
                onRehire={handleRehire}
                onFinancialSettlement={handleFinancialSettlement}
                departments={departments}
              />
            </>
          )}

        </div>

        {/* Modals */}
        {selectedEmployeeForRehire && (
          <RehireEmployeeModal
            employee={selectedEmployeeForRehire}
            isOpen={isRehireModalOpen}
            onClose={() => {
              setIsRehireModalOpen(false);
              setSelectedEmployeeForRehire(null);
            }}
            onConfirm={handleRehireConfirm}
            isPending={isRehirePending}
          />
        )}

        {selectedEmployeeForSettlement && (
          <FinancialSettlementModal
            employee={selectedEmployeeForSettlement}
            isOpen={isSettlementModalOpen}
            onClose={() => {
              setIsSettlementModalOpen(false);
              setSelectedEmployeeForSettlement(null);
            }}
            onConfirm={handleSettlementConfirm}
            isPending={isSettlementPending}
            employeeId={selectedEmployeeForSettlement.employeeId}
            initialSettlementDate={
              selectedEmployeeForSettlement.terminationDate
                ? new Date(selectedEmployeeForSettlement.terminationDate).toISOString().split('T')[0]
                : undefined
            }
          />
        )}
    </div>
  );
}
