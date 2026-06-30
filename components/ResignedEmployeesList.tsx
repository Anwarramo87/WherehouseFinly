"use client";

import { useState, useMemo } from "react";
import { 
  Loader2, 
  BadgeInfo, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle, 
  Clock,
  Search,
  Filter,
  Calendar,
  Building2,
  Lock
} from "lucide-react";
import type { Employee } from "@/types/employee";
import type { ResignedEmployeesStatistics, PaginationInfo } from "@/types/resignation";
import { RehireEmployeeGuard, ProcessSettlementGuard } from "@/components/PermissionGuard";

interface ResignedEmployeesListProps {
  employees: Employee[];
  statistics?: ResignedEmployeesStatistics;
  pagination?: PaginationInfo;
  loading?: boolean;
  error?: Error | null;
  onSearch?: (query: string) => void;
  onFilterDepartment?: (department: string) => void;
  onFilterType?: (type: 'resignation' | 'termination' | 'all') => void;
  onFilterFinancialStatus?: (status: 'pending' | 'completed' | 'all') => void;
  onFilterDateRange?: (startDate: string, endDate: string) => void;
  onPageChange?: (page: number) => void;
  onSettle?: (employeeId: string) => void;
  onRehire?: (employeeId: string) => void;
  onFinancialSettlement?: (employeeId: string) => void;
  departments?: string[];
}

export default function ResignedEmployeesList({
  employees,
  statistics,
  pagination,
  loading = false,
  error = null,
  onSearch,
  onFilterDepartment,
  onFilterType,
  onFilterFinancialStatus,
  onFilterDateRange,
  onPageChange,
  onSettle,
  onRehire,
  onFinancialSettlement,
  departments = []
}: ResignedEmployeesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("الكل");
  const [selectedType, setSelectedType] = useState<'all' | 'resignation' | 'termination'>('all');
  const [selectedFinancialStatus, setSelectedFinancialStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // تقسيم الموظفين حسب الشهر الحالي والأشهر السابقة
  const { currentMonthEmployees, previousMonthsEmployees } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const current: Employee[] = [];
    const previous: Employee[] = [];

    employees.forEach(emp => {
      if (emp.terminationDate) {
        const terminationDate = new Date(emp.terminationDate);
        const empMonth = terminationDate.getMonth();
        const empYear = terminationDate.getFullYear();

        if (empMonth === currentMonth && empYear === currentYear) {
          current.push(emp);
        } else {
          previous.push(emp);
        }
      } else {
        // إذا لم يكن هناك تاريخ إنهاء، نضعه في القدماء
        previous.push(emp);
      }
    });

    return {
      currentMonthEmployees: current,
      previousMonthsEmployees: previous
    };
  }, [employees]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleDepartmentChange = (dept: string) => {
    setSelectedDepartment(dept);
    if (onFilterDepartment) {
      onFilterDepartment(dept === "الكل" ? "" : dept);
    }
  };

  const handleTypeChange = (type: 'all' | 'resignation' | 'termination') => {
    setSelectedType(type);
    if (onFilterType) {
      onFilterType(type);
    }
  };

  const handleFinancialStatusChange = (status: 'all' | 'pending' | 'completed') => {
    setSelectedFinancialStatus(status);
    if (onFilterFinancialStatus) {
      onFilterFinancialStatus(status);
    }
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    if (onFilterDateRange && (start || end)) {
      onFilterDateRange(start, end);
    }
  };

  const handleSettle = async (employeeId: string) => {
    if (confirm("هل أنت متأكد من تسليم المستحقات وتصفية هذا الموظف مالياً؟ هذا الإجراء لا يمكن التراجع عنه.")) {
      if (onSettle) {
        onSettle(employeeId);
      }
    }
  };

  const renderEmployeeTable = (employeesList: Employee[], title: string, count: number) => {
    if (employeesList.length === 0) {
      return (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-black text-[#263544]">{title}</h2>
            <span className="px-3 py-1 rounded-xl bg-[#C89355]/10 text-[#C89355] text-sm font-black">
              {count}
            </span>
          </div>
          <div className="bg-white/40 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/60">
            <p className="text-slate-500 font-bold">لا يوجد موظفون في هذا القسم</p>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-black text-[#263544]">{title}</h2>
          <span className="px-3 py-1 rounded-xl bg-[#C89355]/10 text-[#C89355] text-sm font-black">
            {count}
          </span>
        </div>
        
        <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2rem] shadow-[0_15px_40px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group">
          <div className="absolute inset-1.5 rounded-[1.7rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50 z-0" />
          
          <div className="relative z-10 w-full overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-225 text-right">
              <thead className="bg-white/40 border-b border-white/80">
                <tr>
                  <th className="p-4 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الموظف</th>
                  <th className="p-4 text-[#263544] font-black text-xs uppercase tracking-wider text-center">القسم</th>
                  <th className="p-4 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الوظيفة</th>
                  <th className="p-4 text-[#263544] font-black text-xs uppercase tracking-wider text-center">نوع الإنهاء</th>
                  <th className="p-4 text-[#263544] font-black text-xs uppercase tracking-wider text-center">تاريخ الإنهاء</th>
                  <th className="p-4 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الحالة المالية</th>
                  <th className="p-4 text-[#263544] font-black text-xs uppercase tracking-wider text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {employeesList.map((employee) => {
                  const isResignation = employee.status === "resigned" || employee.terminationType === "resignation";
                  const departureType = isResignation ? "استقالة" : "إقالة";
                  const departureColor = isResignation 
                    ? "text-blue-600 bg-blue-50/80 border-blue-200" 
                    : "text-rose-600 bg-rose-50/80 border-rose-200";

                  return (
                    <tr key={employee.employeeId} className="hover:bg-white/80 transition-all duration-300 group/row">
                      <td className="p-4 text-center">
                        <p className="font-black text-slate-800 group-hover/row:text-[#263544] transition-colors">
                          {employee.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{employee.employeeId}</p>
                      </td>
                      
                      <td className="p-4 text-center font-bold text-[#263544] text-sm">
                        {employee.department || '—'}
                      </td>

                      <td className="p-4 text-center font-bold text-slate-600 text-sm">
                        {employee.jobTitle || employee.profession || '—'}
                      </td>
                      
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1.5 rounded-xl text-[11px] font-black backdrop-blur-md border shadow-sm ${departureColor}`}>
                          {departureType}
                        </span>
                      </td>

                      <td className="p-4 text-center font-bold text-[#263544] text-sm">
                        {employee.terminationDate 
                          ? new Date(employee.terminationDate).toLocaleDateString('ar-SY')
                          : '—'
                        }
                      </td>

                      <td className="p-4 text-center">
                        {employee.isSettled || employee.financialSettlementStatus === 'completed' ? (
                          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50/80 text-emerald-600 text-[11px] font-black border border-emerald-100 shadow-sm">
                            <CheckCircle size={14} /> تمت التصفية
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 text-amber-600 text-[11px] font-black border border-amber-100 shadow-sm">
                            <Clock size={14} /> قيد التصفية
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* إعادة تعيين */}
                          <RehireEmployeeGuard
                            fallback={
                              <button
                                disabled
                                className="inline-flex items-center gap-1.5 bg-slate-300 text-slate-500 px-3 py-2 rounded-xl text-[11px] font-black cursor-not-allowed"
                                title="ليس لديك صلاحية إعادة التعيين"
                              >
                                <Lock size={14} />
                                إعادة تعيين
                              </button>
                            }
                          >
                            <button 
                              onClick={() => onRehire && onRehire(employee.employeeId)}
                              className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl text-[11px] font-black transition-all shadow-sm active:scale-95"
                              title="إعادة تعيين الموظف"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                              إعادة تعيين
                            </button>
                          </RehireEmployeeGuard>

                          {/* تصفية مالية متقدمة */}
                          <ProcessSettlementGuard
                            fallback={
                              <button
                                disabled
                                className="inline-flex items-center gap-1.5 bg-slate-300 text-slate-500 px-3 py-2 rounded-xl text-[11px] font-black cursor-not-allowed"
                                title="ليس لديك صلاحية التصفية المالية"
                              >
                                <Lock size={14} />
                                تصفية مالية
                              </button>
                            }
                          >
                            {!employee.isSettled && employee.financialSettlementStatus !== 'completed' && (
                              <button 
                                onClick={() => onFinancialSettlement && onFinancialSettlement(employee.employeeId)}
                                className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl text-[11px] font-black transition-all shadow-sm active:scale-95"
                                title="تصفية مالية متقدمة"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                تصفية مالية
                              </button>
                            )}
                          </ProcessSettlementGuard>

                          {/* اعتماد التصفية السريع */}
                          <ProcessSettlementGuard
                            fallback={
                              <button
                                disabled
                                className="inline-flex items-center gap-1.5 bg-slate-300 text-slate-500 px-3 py-2 rounded-xl text-[11px] font-black cursor-not-allowed"
                                title="ليس لديك صلاحية اعتماد التصفية"
                              >
                                <Lock size={14} />
                                اعتماد التصفية
                              </button>
                            }
                          >
                            {!employee.isSettled && employee.financialSettlementStatus !== 'completed' && (
                              <button 
                                onClick={() => handleSettle(employee.employeeId)}
                                className="inline-flex items-center gap-1.5 bg-[#1a2530] hover:bg-[#263544] text-[#C89355] px-3 py-2 rounded-xl text-[11px] font-black transition-all shadow-sm border border-[#C89355]/40 active:scale-95"
                                title="الضغط هنا يعني أن الموظف استلم كافة رواتبه ومستحقاته"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                                اعتماد التصفية
                              </button>
                            )}
                          </ProcessSettlementGuard>

                          {employee.isSettled || employee.financialSettlementStatus === 'completed' ? (
                            <span className="text-slate-400 text-xs font-bold">تمت التصفية</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* شريط الإحصائيات والفلاتر */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* الإحصائيات */}
        {statistics && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative overflow-hidden inline-flex items-center gap-2 bg-white/60 backdrop-blur-xl border border-white/80 rounded-xl px-4 py-2 shadow-sm text-[#263544] text-sm font-black group hover:shadow-md transition-all">
              <div className="absolute inset-1 rounded-lg border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
              <BadgeInfo size={16} className="text-[#C89355] relative z-10" />
              <span className="relative z-10">الإجمالي: {statistics.totalResigned}</span>
            </div>
            
            <div className="inline-flex items-center gap-2 bg-blue-50/60 backdrop-blur-xl border border-blue-200/60 rounded-xl px-4 py-2 shadow-sm text-blue-700 text-sm font-black">
              <span>استقالات: {statistics.resignations}</span>
            </div>
            
            <div className="inline-flex items-center gap-2 bg-rose-50/60 backdrop-blur-xl border border-rose-200/60 rounded-xl px-4 py-2 shadow-sm text-rose-700 text-sm font-black">
              <span>إقالات: {statistics.terminations}</span>
            </div>
          </div>
        )}

        {/* زر الفلاتر */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="relative overflow-hidden bg-[#1a2530] hover:bg-[#263544] text-[#C89355] px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 text-sm font-black border border-[#C89355]/40 group w-fit"
        >
          <div className="absolute inset-1 rounded-lg border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
          <Filter size={16} className="relative z-10" />
          <span className="relative z-10">فلاتر البحث</span>
        </button>
      </div>

      {/* لوحة الفلاتر */}
      {showFilters && (
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-5 border border-white/80 shadow-sm animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* البحث */}
            <div>
              <label className="block text-xs font-bold text-[#263544] mb-2">البحث</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="اسم أو رقم الموظف..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full p-2.5 pr-10 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-sm font-bold"
                />
                <Search size={16} className="absolute right-3 top-3 text-slate-400" />
              </div>
            </div>

            {/* القسم */}
            {departments.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-[#263544] mb-2">القسم</label>
                <div className="relative">
                  <select
                    value={selectedDepartment}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full p-2.5 pr-10 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-sm font-bold appearance-none cursor-pointer"
                  >
                    <option value="الكل">جميع الأقسام</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <Building2 size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* نوع الإنهاء */}
            <div>
              <label className="block text-xs font-bold text-[#263544] mb-2">نوع الإنهاء</label>
              <select
                value={selectedType}
                onChange={(e) => handleTypeChange(e.target.value as 'all' | 'resignation' | 'termination')}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-sm font-bold cursor-pointer"
              >
                <option value="all">الكل</option>
                <option value="resignation">استقالة</option>
                <option value="termination">إقالة</option>
              </select>
            </div>

            {/* الحالة المالية */}
            <div>
              <label className="block text-xs font-bold text-[#263544] mb-2">الحالة المالية</label>
              <select
                value={selectedFinancialStatus}
                onChange={(e) => handleFinancialStatusChange(e.target.value as 'all' | 'pending' | 'completed')}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-sm font-bold cursor-pointer"
              >
                <option value="all">الكل</option>
                <option value="pending">قيد التصفية</option>
                <option value="completed">تمت التصفية</option>
              </select>
            </div>

            {/* تاريخ البداية */}
            <div>
              <label htmlFor="startDate" className="block text-xs font-bold text-[#263544] mb-2">من تاريخ</label>
              <div className="relative">
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleDateRangeChange(e.target.value, endDate)}
                  className="w-full p-2.5 pr-10 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-sm font-bold"
                />
                <Calendar size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* تاريخ النهاية */}
            <div>
              <label htmlFor="endDate" className="block text-xs font-bold text-[#263544] mb-2">إلى تاريخ</label>
              <div className="relative">
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
                  className="w-full p-2.5 pr-10 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-sm font-bold"
                />
                <Calendar size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* حالة التحميل */}
      {loading && (
        <div className="p-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[#C89355]" size={40} />
            <span className="font-black text-[#263544] animate-pulse">جاري تحميل سجل المغادرين...</span>
          </div>
        </div>
      )}

      {/* حالة الخطأ */}
      {error && !loading && (
        <div className="p-8 text-center text-rose-600 font-black bg-rose-50/50 backdrop-blur-md rounded-2xl border border-rose-200">
          حدث خطأ في تحميل البيانات: {error.message || "خطأ غير معروف"}
        </div>
      )}

      {/* عرض البيانات */}
      {!loading && !error && (
        <>
          {employees.length === 0 ? (
            <div className="p-16 text-center text-[#263544]/60 font-black text-lg bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60">
              لا يوجد موظفون مقالون أو مستقيلون حاليًا.
            </div>
          ) : (
            <>
              {/* موظفين الشهر الحالي */}
              {renderEmployeeTable(
                currentMonthEmployees,
                "موظفين مستقيلين هذا الشهر",
                statistics?.currentMonth || currentMonthEmployees.length
              )}

              {/* موظفين الأشهر السابقة */}
              {renderEmployeeTable(
                previousMonthsEmployees,
                "موظفين مستقيلين قدماء",
                statistics?.previousMonths || previousMonthsEmployees.length
              )}
            </>
          )}
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => onPageChange && onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="p-2 rounded-xl bg-white/60 border border-white/80 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={20} className="text-[#263544]" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => onPageChange && onPageChange(page)}
                className={`px-3 py-1.5 rounded-xl text-sm font-black transition-all ${
                  page === pagination.page
                    ? 'bg-[#C89355] text-white shadow-sm'
                    : 'bg-white/60 text-[#263544] hover:bg-white/80 border border-white/80'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => onPageChange && onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="p-2 rounded-xl bg-white/60 border border-white/80 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={20} className="text-[#263544]" />
          </button>
        </div>
      )}
    </div>
  );
}
