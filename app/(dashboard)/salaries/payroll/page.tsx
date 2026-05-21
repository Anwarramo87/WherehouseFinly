"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { 
  Download, FileSpreadsheet, Wallet, Receipt, 
  HandCoins, Calendar as CalendarIcon, 
  ChevronLeft, Search 
} from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import useSalaries from "@/hooks/useSalaries";
import { useBonuses } from "@/hooks/useBonuses";
import { useAdvances } from "@/hooks/useAdvances";
import { toast } from "react-hot-toast";
import type { Salary } from "@/types/salary";
import type { Bonus } from "@/types/bonus";
import type { Advance } from "@/types/advance";

// ─── TypeScript Interfaces ─────────────────────────────────────────────────────
interface AggregatedPayroll {
  employeeId: string;
  employeeName: string;
  fixedEarnings: number;      // base + lumpSum + living + transport
  variableEarnings: number;   // sum of bonuses
  fixedDeductions: number;    // insurance
  variableDeductions: number; // sum of advances + attendance penalties
  netPay: number;
  details: {
    salaryConfig: Salary | null;
    bonuses: Bonus[];
    advances: Advance[];
    attendance: null; // optional - for future implementation
  };
}

// ─── Helper Functions ──────────────────────────────────────────────────────────
const toNumber = (value: unknown): number => {
  if (value && typeof value === "object" && "$numberDecimal" in (value as Record<string, unknown>)) {
    return Number((value as { $numberDecimal: string }).$numberDecimal || 0);
  }
  return Number(value || 0);
};

const getLocalMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const [month, setMonth] = useState(getLocalMonth());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayslip, setSelectedPayslip] = useState<AggregatedPayroll | null>(null);

  const { data: employees = [], isLoading: employeesLoading } = useEmployees({ status: "active", limit: 500 });
  const { data: salaries = [], isLoading: salariesLoading } = useSalaries();
  const { data: bonuses = [], isLoading: bonusesLoading } = useBonuses({ period: month });
  const { data: advances = [], isLoading: advancesLoading } = useAdvances();

  const isLoading = employeesLoading || salariesLoading || bonusesLoading || advancesLoading;

  const payrollData = useMemo<AggregatedPayroll[]>(() => {
    if (!employees.length) return [];

    return employees.map((employee) => {
      const employeeId = employee.employeeId;
      const employeeName = employee.name;

      const salaryConfig = salaries.find(s => s.employeeId === employeeId) || null;
      
      const baseSalary = salaryConfig ? toNumber(salaryConfig.baseSalary) : 0;
      const lumpSumSalary = salaryConfig ? toNumber(salaryConfig.lumpSumSalary) : 0;
      const livingAllowance = salaryConfig ? toNumber(salaryConfig.livingAllowance) : 0;
      const transportAllowance = salaryConfig ? toNumber(salaryConfig.transportAllowance) : 0;
      const insuranceAmount = salaryConfig ? toNumber(salaryConfig.insuranceAmount) : 0;

      const fixedEarnings = baseSalary + lumpSumSalary + livingAllowance + transportAllowance;

      const employeeBonuses = bonuses.filter(b => b.employeeId === employeeId);
      const variableEarnings = employeeBonuses.reduce((sum, bonus) => {
        return sum + toNumber(bonus.bonusAmount) + toNumber(bonus.assistanceAmount);
      }, 0);

      const employeeAdvances = advances.filter(a => {
        if (a.employeeId !== employeeId) return false;
        const advanceDate = a.issueDate || a.createdAt || "";
        return advanceDate.startsWith(month);
      });
      
      const advancesDeduction = employeeAdvances.reduce((sum, advance) => {
        return sum + (toNumber(advance.installmentAmount) || toNumber(advance.remainingAmount));
      }, 0);

      const fixedDeductions = insuranceAmount;
      const variableDeductions = advancesDeduction;
      const netPay = (fixedEarnings + variableEarnings) - (fixedDeductions + variableDeductions);

      return {
        employeeId, employeeName, fixedEarnings, variableEarnings,
        fixedDeductions, variableDeductions, netPay,
        details: { salaryConfig, bonuses: employeeBonuses, advances: employeeAdvances, attendance: null },
      };
    });
  }, [employees, salaries, bonuses, advances, month]);

  const filteredPayrollData = useMemo(() => {
    if (!searchTerm) return payrollData;
    const query = searchTerm.toLowerCase();
    return payrollData.filter(p => 
      p.employeeName.toLowerCase().includes(query) || 
      p.employeeId.toLowerCase().includes(query)
    );
  }, [payrollData, searchTerm]);

  const globalTotals = useMemo(() => {
    const totalNetPay = filteredPayrollData.reduce((sum, p) => sum + p.netPay, 0);
    const totalEarnings = filteredPayrollData.reduce((sum, p) => sum + p.fixedEarnings + p.variableEarnings, 0);
    const totalDeductions = filteredPayrollData.reduce((sum, p) => sum + p.fixedDeductions + p.variableDeductions, 0);
    return { totalNetPay, totalEarnings, totalDeductions };
  }, [filteredPayrollData]);

  const handleExportExcel = async () => {
    if (!filteredPayrollData.length) {
      toast.error("لا توجد بيانات رواتب للتنزيل");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const rows: Array<Record<string, string | number>> = filteredPayrollData.map((item, index) => ({
        "#": index + 1,
        " اسم الظاهرالموظف": item.employeeId,
        "اسم الموظف": item.employeeName,
        "الأرباح الثابتة": Number(item.fixedEarnings.toFixed(2)),
        "الأرباح المتغيرة": Number(item.variableEarnings.toFixed(2)),
        "إجمالي الأرباح": Number((item.fixedEarnings + item.variableEarnings).toFixed(2)),
        "إجمالي الخصومات": Number((item.fixedDeductions + item.variableDeductions).toFixed(2)),
        "صافي الراتب": Number(item.netPay.toFixed(2)),
      }));

      // Add totals row
      rows.push({
        "#": "",
        "كود الموظف": "",
        "اسم الموظف": "الإجمالي",
        "الأرباح الثابتة": Number(filteredPayrollData.reduce((sum, p) => sum + p.fixedEarnings, 0).toFixed(2)),
        "الأرباح المتغيرة": Number(filteredPayrollData.reduce((sum, p) => sum + p.variableEarnings, 0).toFixed(2)),
        "إجمالي الأرباح": Number(globalTotals.totalEarnings.toFixed(2)),
        "إجمالي الخصومات": Number(globalTotals.totalDeductions.toFixed(2)),
        "صافي الراتب": Number(globalTotals.totalNetPay.toFixed(2)),
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [ { wch: 5 }, { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 } ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");
      XLSX.writeFile(workbook, `payroll-report-${month}.xlsx`);
      toast.success("تم تنزيل ملف Excel بنجاح");
    } catch {
      toast.error("تعذر تنزيل ملف Excel حالياً");
    }
  };

  if (isLoading) {
    return (
      <div className="relative min-h-[85vh] w-full flex items-center justify-center animate-in fade-in duration-500">
        <div className="flex flex-col items-center gap-4 relative z-10 bg-white/40 p-8 rounded-3xl backdrop-blur-2xl border border-white/60 shadow-[0_20px_40px_rgba(38,53,68,0.1)]">
          <div className="w-14 h-14 border-4 border-[#C89355]/30 border-t-[#263544] rounded-full animate-spin shadow-lg" />
          <p className="text-[#263544] font-black animate-pulse text-sm tracking-wide">جاري تجميع بيانات الرواتب...</p>
        </div>
      </div>
    );
  }

  return (
    // ─── تم استعادة الحاوية الرئيسية (Root Container) السليمة لعدم النزول تحت القائمة الجانبية ───
    <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`, backgroundSize: '24px 24px' }} />

      <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
        <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
          <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
          <span className="hover:text-[#263544] cursor-pointer transition-colors relative z-10">المركز المالي</span>
          <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
          <span className="text-[#263544] relative z-10">تقارير الرواتب</span>
        </nav>

        <header className="mb-10 flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-[#263544]/10 pb-8 relative">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4">
                <FileSpreadsheet size={22} className="text-[#C89355]" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">التقرير النهائي للرواتب</h1>
            </div>
            <p className="text-slate-600 text-sm font-bold pr-14 mt-1">اختر الشهر لعرض ملخص المسير وتفاصيله المعتمدة.</p>
          </div>

          <div className="mt-4 xl:mt-0 flex flex-wrap items-center justify-start xl:justify-end gap-3 w-full xl:w-auto">
            <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-4 py-2 shadow-sm transition-all duration-300 hover:shadow-md group focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20">
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50 group-focus-within:border-[#C89355]/50" />
              <CalendarIcon size={18} className="text-[#C89355] group-hover:scale-110 transition-transform relative z-10 ml-2" />
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="bg-transparent border-none outline-none font-mono text-sm font-black text-[#263544] w-full cursor-pointer focus:ring-0 relative z-10" />
            </div>

            <button type="button" onClick={handleExportExcel} className="relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600/90 backdrop-blur-md text-white font-black text-sm hover:bg-emerald-700 transition-all shadow-[0_10px_20px_rgba(5,150,105,0.3)] active:scale-95 border border-emerald-500 group">
              <div className="absolute inset-1 rounded-xl border border-dashed border-white/30 pointer-events-none" />
              <Download size={16} className="group-hover:-translate-y-1 transition-transform relative z-10" />
              <span className="relative z-10">تنزيل Excel</span>
            </button>

            <Link href={`/vouchers?month=${month}`} className="relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/80 backdrop-blur-md text-[#263544] font-black text-sm border border-white hover:bg-white hover:border-[#C89355]/30 transition-all shadow-sm active:scale-95 group">
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#263544]/10 pointer-events-none transition-colors group-hover:border-[#C89355]/30" />
              <span className="relative z-10">قسائم القبض</span>
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] hover:-translate-y-1 transition-all group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-3 bg-[#1a2530] rounded-xl border border-[#C89355]/30 shadow-sm group-hover:shadow-[0_0_15px_rgba(200,147,85,0.4)] transition-shadow">
                <Wallet className="text-[#C89355]" size={22}/>
              </div>
              <p className="font-black text-[#263544] text-sm">إجمالي الأرباح</p>
            </div>
            <p className="text-4xl font-black text-[#263544] relative z-10 drop-shadow-sm">{globalTotals.totalEarnings.toLocaleString()}</p>
          </div>

          <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(225,29,72,0.12)] hover:-translate-y-1 transition-all group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-rose-300" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 shadow-sm group-hover:shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-shadow">
                <Receipt className="text-rose-600" size={22}/>
              </div>
              <p className="font-black text-[#263544] text-sm">إجمالي الخصومات</p>
            </div>
            <p className="text-4xl font-black text-rose-600 relative z-10 drop-shadow-sm">{globalTotals.totalDeductions.toLocaleString()}</p>
          </div>

          <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] hover:shadow-[0_20px_50px_rgba(200,147,85,0.15)] hover:-translate-y-1 transition-all group">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/60" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-3 bg-[#C89355] rounded-xl border border-[#1a2530]/20 shadow-sm group-hover:shadow-[0_0_15px_rgba(26,37,48,0.3)] transition-shadow">
                <HandCoins className="text-[#1a2530]" size={22}/>
              </div>
              <p className="font-black text-[#263544] text-sm">صافي الرواتب للدفع</p>
            </div>
            <p className="text-4xl font-black text-[#C89355] relative z-10 drop-shadow-md">{globalTotals.totalNetPay.toLocaleString()}</p>
          </div>
        </div>

        <div className="mb-6 relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-4 py-3 shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 hover:shadow-md transition-all group">
          <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
          <Search size={20} className="text-[#C89355] ml-3 relative z-10 group-focus-within:scale-110 transition-transform" />
          <input type="text" placeholder="البحث بالاسم أو الكود عن موظف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none font-bold text-sm text-[#263544] w-full focus:ring-0 relative z-10 placeholder:text-slate-400" />
        </div>

        <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group/table">
          <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover/table:border-[#C89355]/50" />
          <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
            <table className="w-full text-right min-w-225 border-collapse">
              <thead className="bg-white/40 border-b border-white/80">
                <tr>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">كود</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الموظف</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">أرباح ثابتة</th>
                  <th className="p-5 text-emerald-600 font-black text-xs uppercase tracking-wider text-center">أرباح متغيرة</th>
                  <th className="p-5 text-rose-600 font-black text-xs uppercase tracking-wider text-center">إجمالي الخصومات</th>
                  <th className="p-5 text-[#1a2530] font-black text-xs uppercase tracking-wider text-center bg-[#C89355]/10">الصافي للدفع</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {filteredPayrollData.length ? (
                  filteredPayrollData.slice(0, 12).map((item) => (
                    <tr key={item.employeeId} className="hover:bg-white/90 transition-all duration-300 group/row hover:scale-[1.005] hover:shadow-sm">
                      <td className="p-4 text-center font-mono text-sm font-black text-[#263544]/60 group-hover/row:text-[#C89355] transition-colors">{item.employeeId}</td>
                      <td className="p-4 text-center font-black text-slate-800 group-hover/row:text-[#263544] transition-colors">{item.employeeName}</td>
                      <td className="p-4 text-center font-mono font-black text-[#263544]">{item.fixedEarnings.toLocaleString()}</td>
                      <td className="p-4 text-center font-mono font-black text-emerald-600 bg-emerald-50/30 rounded-xl">{item.variableEarnings.toLocaleString()}</td>
                      <td className="p-4 text-center font-mono font-black text-rose-600 bg-rose-50/30 rounded-xl">{(item.fixedDeductions + item.variableDeductions).toLocaleString()}</td>
                      <td className="p-4 text-center font-black text-xl text-[#1a2530] bg-linear-to-l from-[#C89355]/10 to-transparent rounded-xl shadow-inner border border-[#C89355]/20">{item.netPay.toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => setSelectedPayslip(item)} className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-xl bg-white text-[#C89355] hover:bg-[#C89355] hover:text-white font-bold text-xs transition-all shadow-sm border border-[#C89355]/30 active:scale-95 group/btn">
                          <Receipt size={16} className="group-hover/btn:scale-110 transition-transform" />
                          عرض الوصل
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-16 text-center" colSpan={7}>
                      <div className="flex flex-col items-center justify-center gap-3 animate-in fade-in zoom-in duration-500">
                        <div className="p-4 bg-white/50 rounded-full border-2 border-dashed border-slate-300">
                          <Search size={32} className="text-slate-400" />
                        </div>
                        <p className="text-[#263544]/60 font-black text-lg">
                          {searchTerm ? "لا توجد نتائج مطابقة للبحث" : "لا توجد بيانات رواتب لهذا الشهر"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {filteredPayrollData.length > 12 && (
          <div className="relative mt-4 bg-white/60 backdrop-blur-md p-4 text-center rounded-2xl border border-white/80 shadow-sm overflow-hidden">
            <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/20 pointer-events-none" />
            <p className="text-xs text-[#263544] font-black relative z-10 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C89355] animate-pulse"></span>
              يتم عرض أول 12 سجل كمعاينة. قم بتنزيل ملف الـ Excel لرؤية القائمة كاملة.
            </p>
          </div>
        )}
      </div>

      {/* ─── STEP 4: Payslip Modal (إطار كحلي + قلب أبيض) ─────────────────────────────────── */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md transition-all duration-300" dir="rtl">
          
          <div className="payslip-container bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(200,147,85,0.15)] w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col border border-white/10 outline-dashed outline-1 outline-[#C89355]/30 -outline-offset-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header (كحلي) */}
            <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10 print:bg-transparent print:border-b-2 print:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl border shadow-[0_0_20px_rgba(200,147,85,0.15)] bg-[#C89355]/10 border-[#C89355]/20 print:border-none print:shadow-none print:bg-transparent print:p-0">
                  <Receipt className="text-[#C89355] print:text-slate-800" size={28} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide print:text-slate-900">تفاصيل وصل الراتب</h2>
                  <p className="text-xs text-slate-400 font-bold mt-1 print:text-slate-500">KU&M JEANS — إدارة الموارد البشرية</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-left bg-black/20 p-3 rounded-xl border border-white/10 backdrop-blur-sm print:bg-transparent print:border-slate-300">
                  <p className="text-white/60 text-xs font-bold mb-1 uppercase tracking-widest print:text-slate-500">فترة الاستحقاق</p>
                  <p className="text-[#C89355] text-xl font-black font-mono print:text-slate-800">{month}</p>
                </div>
                <button onClick={() => setSelectedPayslip(null)} className="text-slate-500 hover:text-rose-400 bg-[#263544] p-2.5 rounded-2xl border border-transparent hover:border-rose-400/30 transition-all hover:rotate-90 active:scale-90 print:hidden">
                  <ChevronLeft size={24} />
                </button>
              </div>
            </div>
            
            {/* ─── BODY (أبيض ناصع) ─── */}
            <div className="overflow-y-auto custom-scrollbar flex-1 bg-slate-50 p-6 sm:p-10 relative print:p-4 print:overflow-visible">
              
              {/* بطاقة معلومات الموظف */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8 print:border-none print:shadow-none print:p-0 print:mb-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-widest print:text-black">اسم الموظف</p>
                    <p className="text-slate-800 text-2xl font-black print:text-black">{selectedPayslip.employeeName}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-widest print:text-black">كود الموظف</p>
                    <p className="text-[#C89355] text-2xl font-black font-mono print:text-black">{selectedPayslip.employeeId}</p>
                  </div>
                </div>
              </div>

              {/* Grid: المستحقات والاقتطاعات */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-4">
                
                {/* Right Side: المستحقات (Earnings) */}
                <div className="space-y-6 print:space-y-4">
                  <div className="flex items-center gap-3 border-b-2 border-emerald-100 pb-4 print:border-emerald-200">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-200 print:bg-transparent">
                      <Wallet className="text-emerald-600 print:text-black" size={20} />
                    </div>
                    <h2 className="text-xl font-black text-emerald-800 tracking-tight print:text-black">التفاصيل المالية (المستحقات)</h2>
                  </div>

                  {/* Fixed Earnings */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                    <h3 className="text-sm font-black text-slate-500 mb-4 uppercase tracking-widest print:text-black">الأجور الثابتة</h3>
                    
                    {selectedPayslip.details.salaryConfig ? (
                      <div className="space-y-4 text-slate-700 print:text-black">
                        {toNumber(selectedPayslip.details.salaryConfig.baseSalary) > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold">الراتب الأساسي</span>
                            <span className="text-lg font-black text-emerald-600 font-mono print:text-black">
                              {toNumber(selectedPayslip.details.salaryConfig.baseSalary).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {toNumber(selectedPayslip.details.salaryConfig.lumpSumSalary) > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold">الراتب المقطوع</span>
                            <span className="text-lg font-black text-emerald-600 font-mono print:text-black">
                              {toNumber(selectedPayslip.details.salaryConfig.lumpSumSalary).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {toNumber(selectedPayslip.details.salaryConfig.livingAllowance) > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold">بدل المعيشة</span>
                            <span className="text-lg font-black text-emerald-600 font-mono print:text-black">
                              {toNumber(selectedPayslip.details.salaryConfig.livingAllowance).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {toNumber(selectedPayslip.details.salaryConfig.transportAllowance) > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold">بدل النقل</span>
                            <span className="text-lg font-black text-emerald-600 font-mono print:text-black">
                              {toNumber(selectedPayslip.details.salaryConfig.transportAllowance).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic print:text-black">لا يوجد راتب ثابت مضبوط للموظف</p>
                    )}
                    
                    <div className="mt-5 pt-4 border-t border-slate-200 border-dashed flex justify-between items-center print:border-slate-400">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest print:text-black">مجموع الثوابت</span>
                      <span className="text-xl font-black text-emerald-600 font-mono print:text-black">
                        {selectedPayslip.fixedEarnings.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Variable Earnings */}
                  {selectedPayslip.details.bonuses.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                      <h3 className="text-sm font-black text-[#C89355] mb-4 uppercase tracking-widest print:text-black">المكافآت والبدلات</h3>
                      <div className="space-y-4 text-slate-700 print:text-black">
                        {selectedPayslip.details.bonuses.map((bonus, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-sm font-bold">{bonus.bonusReason || "مكافأة غير مسماة"}</span>
                            <span className="text-lg font-black text-[#C89355] font-mono print:text-black">
                              +{(toNumber(bonus.bonusAmount) + toNumber(bonus.assistanceAmount)).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 pt-4 border-t border-slate-200 border-dashed flex justify-between items-center print:border-slate-400">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest print:text-black">مجموع المتغيرات</span>
                        <span className="text-xl font-black text-[#C89355] font-mono print:text-black">
                          {selectedPayslip.variableEarnings.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Left Side: الاقتطاعات (Deductions) */}
                <div className="space-y-6 print:space-y-4">
                  <div className="flex items-center gap-3 border-b-2 border-rose-100 pb-4 print:border-slate-300 print:pb-2">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-200 print:hidden">
                      <Receipt className="text-rose-600" size={20} />
                    </div>
                    <h2 className="text-xl font-black text-rose-800 tracking-tight print:text-black print:text-lg">الاقتطاعات والخصومات</h2>
                  </div>

                  {/* Fixed Deductions */}
                  {selectedPayslip.fixedDeductions > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                      <h3 className="text-sm font-black text-slate-500 mb-4 uppercase tracking-widest print:text-black">اقتطاعات ثابتة</h3>
                      <div className="flex justify-between items-center text-slate-700 print:text-black">
                        <span className="text-sm font-bold">مؤسسة التأمينات الاجتماعية</span>
                        <span className="text-lg font-black text-rose-600 font-mono print:text-black">
                          -{selectedPayslip.fixedDeductions.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Variable Deductions */}
                  {selectedPayslip.details.advances.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                      <h3 className="text-sm font-black text-slate-500 mb-4 uppercase tracking-widest print:text-black">سلف وعقوبات (مستردة)</h3>
                      <div className="space-y-4 text-slate-700 print:text-black">
                        {selectedPayslip.details.advances.map((advance, idx) => {
                          const deductionAmount = toNumber(advance.installmentAmount) || toNumber(advance.remainingAmount);
                          return (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="text-sm font-bold">
                                سلفة {advance.advanceType === "salary" ? "راتب" : advance.advanceType === "clothing" ? "ملابس" : "أخرى"}
                              </span>
                              <span className="text-lg font-black text-rose-600 font-mono print:text-black">
                                -{deductionAmount.toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-5 pt-4 border-t border-slate-200 border-dashed flex justify-between items-center print:border-slate-400">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest print:text-black">مجموع السلف</span>
                        <span className="text-xl font-black text-rose-600 font-mono print:text-black">
                          -{selectedPayslip.variableDeductions.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* No Deductions Message */}
                  {selectedPayslip.fixedDeductions === 0 && selectedPayslip.variableDeductions === 0 && (
                    <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center shadow-sm print:shadow-none print:border-slate-300">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100 print:hidden">
                        <HandCoins className="text-slate-400" size={28} />
                      </div>
                      <p className="text-slate-500 font-bold text-base print:text-black">لا توجد أي خصومات مالية مسجلة لهذا الشهر.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Print Signatures - Only visible when printing */}
              <div className="hidden print:flex justify-between items-end w-full mt-8 pt-4 border-t-2 border-slate-800">
                <div className="text-center w-1/3">
                  <p className="text-black font-bold text-xs mb-6">توقيع المحاسب</p>
                  <div className="border-b border-dashed border-slate-400 w-full"></div>
                </div>
                <div className="text-center">
                  <p className="text-black text-xs font-black uppercase mb-1">الصافي للدفع</p>
                  <p className="text-black text-2xl font-black font-mono">
                    {selectedPayslip.netPay.toLocaleString()} <span className="text-sm">ل.س</span>
                  </p>
                </div>
                <div className="text-center w-1/3">
                  <p className="text-black font-bold text-xs mb-6">توقيع الموظف المستلم</p>
                  <div className="border-b border-dashed border-slate-400 w-full"></div>
                </div>
              </div>
            </div>

            {/* Footer / Action Area (كحلي - مخفي عند الطباعة) */}
            <div className="p-6 sm:p-8 bg-[#1a2530]/90 backdrop-blur-md border-t border-white/5 flex flex-col md:flex-row items-center justify-between shrink-0 relative z-10 print:hidden">
              
              <div className="text-right mb-6 md:mb-0">
                <p className="text-[#C89355] font-black text-sm uppercase tracking-widest mb-1">صافي المبلغ المستحق للدفع</p>
                <p className="text-white text-5xl font-black font-mono drop-shadow-md">
                  {selectedPayslip.netPay.toLocaleString()}
                  <span className="text-2xl mr-3 opacity-80">ل.س</span>
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="px-8 py-3.5 rounded-2xl font-bold text-slate-400 bg-[#263544] hover:text-white hover:bg-[#324559] transition-all active:scale-95 border border-transparent hover:border-slate-500/30"
                >
                  إغلاق الوصل
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-[#C89355] hover:bg-[#b07f45] shadow-[0_0_20px_rgba(200,147,85,0.3)] text-[#101720] px-10 py-3.5 rounded-2xl font-black flex items-center gap-3 active:scale-95 transition-all border border-[#C89355]/50"
                >
                  <Download size={20} /> طباعة الوصل
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── Print CSS ────────────────────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .payslip-container, .payslip-container * { visibility: visible; }
          .payslip-container {
            position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; max-height: none;
            overflow: visible; border-radius: 0; box-shadow: none; page-break-inside: avoid;
          }
          
          /* Utility print overrides */
          .print\\:hidden { display: none !important; }
          .print\\:text-black { color: #000000 !important; }
          .print\\:border-none { border: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:bg-transparent { background-color: transparent !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}} />
    </div>
  );
}