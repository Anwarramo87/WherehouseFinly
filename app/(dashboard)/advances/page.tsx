"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Plus, ChevronLeft, Loader2, Edit2, Trash2, Wallet, CalendarDays, Coins } from "lucide-react";
import { useAdvances } from "@/hooks/useAdvances";
import { useEmployees } from "@/hooks/useEmployees";
import { Advance, AdvanceType } from "@/types/advance";

const AddAdvanceModal = dynamic(() => import("@/components/AddAdvanceModal"), { loading: () => null });

const toNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "object" && value && "$numberDecimal" in value) {
    const parsed = Number((value as { $numberDecimal?: string }).$numberDecimal || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("ar-EG");
  } catch {
    return dateStr;
  }
};

export default function AdvancesPage() {
  const { data: employees = [] } = useEmployees({ limit: 500, status: "active", fetchAll: false });
  const { data: advances = [], isLoading, createAdvance, updateAdvance, deleteAdvance } = useAdvances();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<Advance | null>(null);

  const advancesWithNames = useMemo(() => {
    return advances.map((adv) => {
      const emp = employees.find((e) => e.employeeId === adv.employeeId);
      return { ...adv, name: emp?.name || "موظف غير معروف" };
    });
  }, [advances, employees]);

  const sortedAdvances = useMemo(() => {
    return [...advancesWithNames].sort(
      (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
    );
  }, [advancesWithNames]);

  const totalAmount = useMemo(() => {
    return sortedAdvances.reduce((sum, adv) => sum + toNumber(adv.totalAmount), 0);
  }, [sortedAdvances]);

  const totalRemaining = useMemo(() => {
    return sortedAdvances.reduce((sum, adv) => sum + toNumber(adv.remainingAmount), 0);
  }, [sortedAdvances]);

  const handleEditClick = (adv: Advance) => {
    setSelectedAdvance(adv);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedAdvance(null);
    setIsModalOpen(true);
  };

  const handleSave = async (data: unknown) => {
    try {
      if (selectedAdvance) {
        await updateAdvance.mutateAsync({
          id: selectedAdvance.id,
          data: data as { remainingAmount?: number; installmentAmount?: number; notes?: string },
        });
      } else {
        await createAdvance.mutateAsync(data as { employeeId: string; totalAmount: number; installmentAmount: number; advanceType?: AdvanceType; notes?: string });
      }
      setIsModalOpen(false);
      setSelectedAdvance(null);
    } catch (err) {
      console.error("Error saving advance:", err);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذه السلفة؟")) {
      deleteAdvance.mutate(id);
    }
  };

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ employeeId: e.employeeId, name: e.name })),
    [employees]
  );

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "salary":
        return "سلفة راتب";
      case "clothing":
        return "شراء ملابس";
      default:
        return "أخرى";
    }
  };

  return (
    <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
        <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
          <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
          <span className="hover:text-[#263544] cursor-pointer transition-colors relative z-10">المركز المالي</span>
          <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
          <span className="text-[#263544] relative z-10">السلف</span>
        </nav>

        <header className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#263544]/10 pb-6 relative">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4">
                <Wallet size={22} className="text-[#C89355]" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">السلف</h1>
            </div>
            <p className="text-slate-600 text-sm font-bold pr-14 flex items-center gap-2">
              إدارة سلف الموظفين وقروضهم
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-4">
              <div className="bg-[#1a2530]/5 border border-[#C89355]/30 rounded-xl px-4 py-2 text-center">
                <div className="flex items-center gap-1 text-[#C89355] text-xs font-bold mb-1">
                  <Coins size={12} />
                  <span>الإجمالي</span>
                </div>
                <div className="font-black text-[#263544] text-sm">
                  {totalAmount.toLocaleString()} ل.س
                </div>
              </div>
              <div className="bg-[#1a2530]/5 border border-[#C89355]/30 rounded-xl px-4 py-2 text-center">
                <div className="flex items-center gap-1 text-rose-500 text-xs font-bold mb-1">
                  <Coins size={12} />
                  <span>المتبقي</span>
                </div>
                <div className="font-black text-rose-600 text-sm">
                  {totalRemaining.toLocaleString()} ل.س
                </div>
              </div>
            </div>

            <button
              onClick={handleAddNew}
              className="relative overflow-hidden bg-[#1a2530] hover:bg-[#263544] text-[#C89355] px-5 py-3 rounded-2xl flex items-center gap-2 shadow-[0_10px_20px_rgba(38,53,68,0.3)] transition-all active:scale-95 text-sm font-black border border-[#C89355]/40 group"
            >
              <div className="absolute inset-1.5 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
              <Plus size={18} className="relative z-10" />
              <span className="relative z-10 tracking-wide">إضافة سلفة</span>
            </button>
          </div>
        </header>

        <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group">
          <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50 z-0" />
          <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
            <table className="w-full text-right min-w-225">
              <thead className="bg-white/40 border-b border-white/80">
                <tr>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الموظف</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">النوع</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">الإجمالي</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">القسط</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">المتبقي</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">التاريخ</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase tracking-wider text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-[#C89355]" size={40} />
                        <span className="font-black text-[#263544] animate-pulse">جاري تحميل السلف...</span>
                      </div>
                    </td>
                  </tr>
                ) : sortedAdvances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center text-[#263544]/60 font-black text-lg">
                      لا توجد سلف مسجلة
                    </td>
                  </tr>
                ) : (
                  sortedAdvances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-white/80 transition-all duration-300 group/row">
                      <td className="p-4 text-center">
                        <div className="font-black text-slate-800 text-sm">{adv.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{adv.employeeId}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-block bg-[#C89355]/10 text-[#C89355] px-3 py-1 rounded-full text-xs font-bold">
                          {getTypeLabel(adv.advanceType)}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-black text-[#263544] text-sm">
                        {toNumber(adv.totalAmount).toLocaleString()} <span className="text-[10px] text-[#C89355] mr-1">ل.س</span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-600 text-sm">
                        {toNumber(adv.installmentAmount).toLocaleString()} <span className="text-[10px] text-[#C89355] mr-1">ل.س</span>
                      </td>
                      <td className="p-4 text-center font-mono font-black text-rose-600 text-sm">
                        {toNumber(adv.remainingAmount).toLocaleString()} <span className="text-[10px] text-rose-400 mr-1">ل.س</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-600 text-sm">
                          <CalendarDays size={12} className="text-[#C89355]" />
                          {formatDate(adv.issueDate)}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2 opacity-60 group-hover/row:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditClick(adv)}
                            className="text-[#C89355] hover:bg-[#C89355]/10 p-2.5 rounded-xl transition-all duration-300 hover:scale-110 shadow-sm border border-transparent hover:border-[#C89355]/30"
                            title="تعديل"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(adv.id)}
                            className="text-rose-500 hover:bg-rose-500/10 p-2.5 rounded-xl transition-all duration-300 hover:scale-110 shadow-sm border border-transparent hover:border-rose-500/30"
                            title="حذف"
                          >
                            <Trash2 size={16} />
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

        {isModalOpen && (
          <AddAdvanceModal
            key={`advance-${selectedAdvance?.id ?? "new"}`}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedAdvance(null);
            }}
            onSave={handleSave}
            isPending={createAdvance.isPending || updateAdvance.isPending}
            employees={employeeOptions}
            initialData={selectedAdvance}
          />
        )}
      </div>
    </div>
  );
}