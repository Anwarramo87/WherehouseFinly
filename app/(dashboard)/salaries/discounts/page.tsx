"use client";

import React, { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Plus, Wallet, ChevronLeft, Search, Trash2, Edit3, Coins, CalendarDays as _CalendarDays, Users, ChevronDown, ChevronUp } from "lucide-react";
import { useEmployees, useResignedEmployees } from "@/hooks/useEmployees";
import { useDiscounts, DiscountRecord, DiscountPayload } from "@/hooks/useDiscounts";
import { useAdvances } from "@/hooks/useAdvances";
import { Advance, AdvanceInput } from "@/types/advance";
import { MonthPeriodSelector } from "@/components/MonthPeriodSelector";

const AddDiscountModal = dynamic(() => import("@/components/AddDiscountModal"), { loading: () => null });
const AddAdvanceModal = dynamic(() => import("@/components/AddAdvanceModal"), { loading: () => null });

export default function DiscountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: employees = [] } = useEmployees({ limit: 200, status: "active", fetchAll: false });
  const { data: resignedEmployees = [] } = useResignedEmployees();
  const resignedIds = useMemo(() => new Set(resignedEmployees.map(e => e.employeeId)), [resignedEmployees]);
  
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true); }, []);

  const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);
  const { data: discounts = [], createDiscount, updateDiscount, deleteDiscount } = useDiscounts(undefined, period);
  const { createAdvance, updateAdvance } = useAdvances(undefined, period);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [editingDiscount, setEditingDiscount] = useState<DiscountRecord | null>(null);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);

  // حالة تتبع الصفوف المفتوحة (المنسدلة)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Helper to attach employee names to the records
  // Filter out records for resigned/terminated employees
  // Use dual-check: (1) must be in active employees list, (2) must NOT be in resigned set
  const recordsWithNames = useMemo(() => {
    const activeEmployeeIds = new Set(employees.map(e => e.employeeId));
    
    return discounts
      .filter(d => {
        // Must be in active employees AND not in resigned list
        const isActive = activeEmployeeIds.has(d.employeeId);
        const isNotResigned = !resignedIds.has(d.employeeId);
        return isActive && isNotResigned;
      })
      .map(d => {
        const emp = employees.find(e => e.employeeId === d.employeeId);
        return { ...d, name: emp?.name || "موظف غير معروف" };
      });
  }, [discounts, employees, resignedIds]);

  const filteredDiscounts = useMemo(() => {
    let result = recordsWithNames;

    // Filter by Search Term
    if (searchTerm) {
      result = result.filter(d =>
        d.name.includes(searchTerm) || d.employeeId.includes(searchTerm)
      );
    }

    return result;
  }, [recordsWithNames, searchTerm]);

  const totalDeductions = useMemo(() => {
    return filteredDiscounts
      .filter(d => d.kind !== "reward")
      .reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [filteredDiscounts]);

  const totalRewards = useMemo(() => {
    return filteredDiscounts
      .filter(d => d.kind === "reward")
      .reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [filteredDiscounts]);

  // تجميع السجلات حسب الموظف
  const groupedDiscounts = useMemo(() => {
    const groups: Record<string, { employeeId: string; name: string; totalDeductions: number; totalRewards: number; records: typeof recordsWithNames }> = {};

    filteredDiscounts.forEach(d => {
      if (!groups[d.employeeId]) {
        groups[d.employeeId] = {
          employeeId: d.employeeId,
          name: d.name,
          totalDeductions: 0,
          totalRewards: 0,
          records: [],
        };
      }
      if (d.kind === "reward") {
        groups[d.employeeId].totalRewards += d.amount || 0;
      } else {
        groups[d.employeeId].totalDeductions += d.amount || 0;
      }
      groups[d.employeeId].records.push(d);
    });

    return Object.values(groups).sort((a, b) => b.totalDeductions - a.totalDeductions);
  }, [filteredDiscounts]);

  const toggleRow = (empId: string) => {
    setExpandedRows(prev => ({ ...prev, [empId]: !prev[empId] }));
  };

  const handleOpenAddModal = () => {
    setEditingDiscount(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: DiscountRecord) => {
    setEditingDiscount(record);
    setIsModalOpen(true);
  };

  const handleOpenAddAdvance = () => {
    setEditingAdvance(null);
    setIsAdvanceModalOpen(true);
  };

  const handleSaveAdvance = (data: AdvanceInput) => {
    if (editingAdvance) {
      updateAdvance.mutate({ id: String(editingAdvance.employeeId), data }, { onSuccess: () => setIsAdvanceModalOpen(false) });
    } else {
      createAdvance.mutate(data, { onSuccess: () => setIsAdvanceModalOpen(false) });
    }
  };

  const handleSaveDiscount = (data: DiscountPayload) => {
    if (editingDiscount) {
      updateDiscount?.mutate(
        { id: editingDiscount.id, payload: data },
        { onSuccess: () => setIsModalOpen(false) }
      );
    } else if (data.employeeId === "ALL") {
      if (!employees.length) {
        alert("لا يمكن تطبيق الخصم على الجميع قبل تحميل الموظفين");
        return;
      }
      Promise.all(
        employees.map((emp) =>
          createDiscount?.mutateAsync({ ...data, employeeId: emp.employeeId })
        )
      ).then(() => setIsModalOpen(false));
    } else {
      createDiscount?.mutate(data, {
        onSuccess: () => setIsModalOpen(false)
      });
    }
  };

  const handleDelete = (id: string, kind: "advance" | "penalty" | "assistance" | "reward") => {
    if (window.confirm("هل أنت متأكد من نقل هذا الإجراء المالي إلى سلة المهملات؟")) {
      deleteDiscount?.mutate({ id, kind });
    }
  };

  // ✅ الحماية الرابعة والأهم (منع الانهيار)
  const isPending = createDiscount?.isPending || updateDiscount?.isPending || false;

  return (
    <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">

      {/* نقشة الفايبر (القماش) */}
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
          <span className="text-[#263544] relative z-10">الخصومات والسلف</span>
        </nav>

        {/* الهيدر والمجموع */}
        <header className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#263544]/10 pb-6 relative">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4 group">
                <Wallet size={22} className="text-[#C89355] group-hover:animate-bounce transition-all duration-300" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">الخصومات والسلف</h1>
            </div>
            <p className="text-slate-600 text-sm font-bold pr-14 mt-1">
              إدارة كافة الاقتطاعات المالية (سلف، تأخير، عقوبات، إجازات).
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-5 w-full lg:w-auto">
            {/* بطاقة إجمالي الاقتطاعات */}
            <div className="relative overflow-hidden bg-linear-to-br from-rose-900 to-rose-950 px-5 py-3 rounded-2xl border border-rose-700/40 shadow-[0_15px_30px_rgba(185,28,28,0.25)] flex items-center gap-4 w-full md:w-auto group">
              <div className="absolute inset-1 rounded-xl border border-dashed border-rose-500/30 pointer-events-none" />
              <div className="p-2 bg-rose-500/10 rounded-xl relative z-10">
                <Wallet size={22} className="text-rose-400" />
              </div>
              <div className="relative z-10 flex flex-col">
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider mb-0.5">إجمالي الاقتطاعات</span>
                <span className="text-xl font-mono font-black text-rose-300 drop-shadow-md">
                  {mounted ? totalDeductions.toLocaleString() : "0"} <span className="text-[10px] text-rose-400/70">ل.س</span>
                </span>
              </div>
            </div>

            {/* بطاقة إجمالي المكافآت */}
            <div className="relative overflow-hidden bg-linear-to-br from-emerald-900 to-emerald-950 px-5 py-3 rounded-2xl border border-emerald-700/40 shadow-[0_15px_30px_rgba(5,150,105,0.25)] flex items-center gap-4 w-full md:w-auto group">
              <div className="absolute inset-1 rounded-xl border border-dashed border-emerald-500/30 pointer-events-none" />
              <div className="p-2 bg-emerald-500/10 rounded-xl relative z-10">
                <Coins size={22} className="text-emerald-400" />
              </div>
              <div className="relative z-10 flex flex-col">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-0.5">إجمالي المكافآت</span>
                <span className="text-xl font-mono font-black text-emerald-300 drop-shadow-md">
                  {mounted ? totalRewards.toLocaleString() : "0"} <span className="text-[10px] text-emerald-400/70">ل.س</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
              {/* Month Period Selector */}
              <MonthPeriodSelector
                value={period}
                onChange={(newPeriod) => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("period", newPeriod);
                  router.replace(`?${params.toString()}`);
                }}
                className="flex-1 sm:flex-none"
              />

              {/* شريط البحث المدمج */}
              <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 hover:shadow-md w-full sm:w-64 transition-all">
                <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
                <Search size={18} className="text-[#C89355] ml-2 shrink-0 relative z-10" />
                <input
                  type="text" placeholder="البحث بالاسم أو الكود..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent text-sm font-bold text-[#263544] outline-none w-full relative z-10 placeholder:text-slate-400"
                />
              </div>

              <button
                onClick={handleOpenAddModal}
                className="relative overflow-hidden bg-[#1a2530] hover:bg-[#263544] text-[#C89355] px-5 py-3 rounded-2xl flex items-center gap-2 shadow-[0_10px_20px_rgba(38,53,68,0.3)] transition-all active:scale-95 text-sm font-black border border-[#C89355]/40 group shrink-0"
              >
                <div className="absolute inset-1.5 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
                <Plus size={18} className="group-hover:animate-spin relative z-10" />
                <span className="relative z-10 tracking-wide">إضافة إجراء مالي</span>
              </button>

            </div>
          </div>
        </header>

        {/* الجدول المجمع */}
        <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group">
          <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover:border-[#C89355]/50" />
          <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
            <table className="w-full text-right min-w-175">
              <thead className="bg-white/40 border-b border-white/80">
                <tr>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase text-center w-28">الكود</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase text-center">الموظف / المستهدف</th>
                  <th className="p-5 text-rose-600 font-black text-xs uppercase text-center">الخصومات</th>
                  <th className="p-5 text-emerald-600 font-black text-xs uppercase text-center">المكافآت</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase text-center">عدد السجلات</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase text-center w-24">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {!mounted || groupedDiscounts.length === 0 ? (
                  <tr><td colSpan={6} className="p-16 text-center text-[#263544]/60 font-black">{mounted ? "لا توجد سجلات خصومات أو سلف مسجلة." : ""}</td></tr>
                ) : (
                  groupedDiscounts.map((group) => {
                    const isExpanded = expandedRows[group.employeeId];
                    const isGlobal = group.employeeId === "ALL";

                    return (
                      <React.Fragment key={group.employeeId}>
                        {/* الصف الرئيسي (الملخص) */}
                        <tr
                          onClick={() => toggleRow(group.employeeId)}
                          className={`cursor-pointer transition-all duration-300 group/row border-b border-white/40 last:border-0 ${isExpanded ? "bg-white/80" : "hover:bg-white/80"
                            }`}
                        >
                          <td className="p-5 font-mono font-bold text-center text-sm text-slate-500">
                            {isGlobal ? <span className="text-[#C89355] text-xs">GLOBAL</span> : group.employeeId}
                          </td>
                          <td className="p-5 text-center font-black text-[#263544]">
                            <div className="flex items-center justify-center gap-2">
                              {isGlobal && <Users size={16} className="text-[#C89355]" />}
                              <span>{group.name}</span>
                            </div>
                          </td>
                          <td className="p-5 text-center">
                            {group.totalDeductions > 0 ? (
                              <span className="inline-block px-3 py-1 rounded-xl font-mono font-black text-rose-700 bg-rose-100/50 border border-rose-200 shadow-sm">
                                −{group.totalDeductions.toLocaleString()} <span className="text-[10px] text-rose-600">ل.س</span>
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="p-5 text-center">
                            {group.totalRewards > 0 ? (
                              <span className="inline-block px-3 py-1 rounded-xl font-mono font-black text-emerald-700 bg-emerald-100/50 border border-emerald-200 shadow-sm">
                                +{group.totalRewards.toLocaleString()} <span className="text-[10px] text-emerald-600">ل.س</span>
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="p-5 text-center font-bold text-sm text-[#263544]/70">
                            <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{group.records.length} إجراء</span>
                          </td>
                          <td className="p-5 text-center">
                            <button className={`p-2 rounded-xl transition-all ${isExpanded ? 'bg-[#263544] text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          </td>
                        </tr>

                        {/* الصف المنسدل (التفاصيل) */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="p-0 border-b border-slate-200/50">
                              <div className="bg-slate-50/80 p-6 shadow-inner border-y border-slate-200/40 overflow-x-auto">
                                <table className="w-full text-right text-sm border border-slate-200/50 rounded-xl overflow-hidden bg-white/50">
                                  <thead className="text-[#263544] bg-slate-100/80 border-b border-slate-200/60">
                                    <tr>
                                      <th className="py-3 px-4 font-bold">نوع الإجراء</th>
                                      <th className="py-3 px-4 font-bold text-center">القيمة</th>
                                      <th className="py-3 px-4 font-bold text-center">التاريخ</th>
                                      <th className="py-3 px-4 font-bold">ملاحظات</th>
                                      <th className="py-3 px-4 font-bold text-center">إدارة</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100/80">
                                    {group.records.map((record) => {
                                      const isReward = record.kind === "reward";
                                      return (
                                      <tr key={record.id} className={`hover:bg-white transition-colors ${isReward ? 'bg-emerald-50/30' : ''}`}>
                                        <td className="py-3 px-4">
                                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black border ${isReward ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : record.backendModel === 'advance' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                            }`}>
                                            {record.type}
                                          </span>
                                        </td>
                                        <td className={`py-3 px-4 font-mono font-black text-center ${isReward ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {isReward ? '+' : '−'}{record.amount.toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-slate-500 text-center">{new Date(record.date).toLocaleDateString("ar-EG")}</td>
                                        <td className="py-3 px-4 text-xs font-medium text-slate-500 max-w-50 truncate">{record.notes || "—"}</td>
                                        <td className="py-3 px-4 text-center">
                                          <div className="flex items-center justify-center gap-2">
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleOpenEditModal(record as DiscountRecord); }}
                                              className="text-[#C89355] hover:bg-[#C89355]/10 p-2 rounded-lg transition-all"
                                              title="تعديل"
                                            >
                                              <Edit3 size={16} />
                                            </button>
<button
                                               onClick={(e) => { e.stopPropagation(); handleDelete(record.id, record.kind); }}
                                               className="text-rose-400 hover:bg-rose-100 hover:text-rose-600 p-2 rounded-lg transition-all"
                                               title="حذف"
                                             >
                                              <Trash2 size={16} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* استدعاء المودال */}
        {isModalOpen && (
          <AddDiscountModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveDiscount}
            isPending={isPending}
            employees={Array.isArray(employees) ? employees : []}
            initialData={editingDiscount}
          />
        )}

        {isAdvanceModalOpen && (
          <AddAdvanceModal
            isOpen={isAdvanceModalOpen}
            onClose={() => setIsAdvanceModalOpen(false)}
            onSave={handleSaveAdvance}
            isPending={createAdvance.isPending || updateAdvance.isPending}
            employees={Array.isArray(employees) ? employees : []}
            initialData={editingAdvance}
          />
        )}

      </div>
    </div>
  );
}