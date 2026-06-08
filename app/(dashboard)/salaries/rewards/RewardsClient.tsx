"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Plus, Gift, ChevronLeft, Search, Trash2, Users, ChevronDown, ChevronUp } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import useSalaries from "@/hooks/useSalaries";
import { useBonuses } from "@/hooks/useBonuses";
import type { Bonus, BonusInput } from "@/types/bonus";

const AddBonusModal = dynamic(() => import("@/components/AddBonusModal"), { loading: () => null });

export default function RewardsClient() {
  const searchParams = useSearchParams();
  const { data: employees = [] } = useEmployees({ limit: 200, status: "active", fetchAll: false });
  const { data: salaries = [] } = useSalaries();
  const initialEmployeeId = searchParams.get("employeeId") ?? "";
  const initialType = searchParams.get("type") ?? "";
  const initialMonth = searchParams.get("month") ?? "";
  const initialDate = initialMonth ? `${initialMonth}-01` : searchParams.get("date") ?? "";
  const initialAllEmployees = searchParams.get("allEmployees") === "true";
  const shouldOpenOnLoad = Boolean(initialEmployeeId || initialType || initialDate || initialAllEmployees);

  type RewardRecord = {
    id: string;
    employeeId: string;
    name: string;
    type: string;
    amount: number;
    date: string;
    notes: string;
    allEmployees?: boolean;
  };

  const [isModalOpen, setIsModalOpen] = useState(shouldOpenOnLoad);
  const [searchTerm, setSearchTerm] = useState("");
  // حالة تتبع الصفوف المفتوحة (المنسدلة)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const { data: bonusesData = [], isLoading, createBonus, deleteBonus } = useBonuses({
    employeeId: initialEmployeeId || undefined,
    period: initialMonth || undefined,
  });

  const resolveAmount = (value: Bonus["bonusAmount"]) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value && typeof value === "object" && "$numberDecimal" in value) {
      const parsed = Number(value.$numberDecimal || 0);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replace(/,/g, "").trim());
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const resolveAssistance = (value: Bonus["assistanceAmount"]) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value && typeof value === "object" && "$numberDecimal" in value) {
      const parsed = Number(value.$numberDecimal || 0);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replace(/,/g, "").trim());
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const employeesLookup = useMemo(() => {
    return new Map(employees.map((emp) => [emp.employeeId, emp.name]));
  }, [employees]);

  // تجهيز السجلات المسطحة أولاً
  const rewards = useMemo<RewardRecord[]>(() => {
    // التحقق من أن البيانات array
    if (!Array.isArray(bonusesData)) {
      return [];
    }
    
    return bonusesData.map((bonus) => {
      const rewardId = bonus.id || `${bonus.employeeId}-${bonus.period || ""}`;
      const isAll = bonus.employeeId === "ALL";
      const employeeId = isAll ? "ALL" : bonus.employeeId;
      const name = isAll
        ? "جميع الموظفين"
        : employeesLookup.get(employeeId) || "موظف غير معروف";
      const bonusAmount = resolveAmount(bonus.bonusAmount);
      const assistanceAmount = resolveAssistance(bonus.assistanceAmount);
      // المكافآت الإجمالية = bonusAmount + assistanceAmount
      const totalAmount = bonusAmount + assistanceAmount;
      const periodDate = bonus.period ? `${bonus.period}-01` : new Date().toISOString();

      // فقط عرض السجلات التي فيها مكافآت
      if (totalAmount <= 0) return null;

      return {
        id: String(rewardId),
        employeeId,
        name,
        type: bonus.bonusReason || "مكافأة",
        amount: totalAmount,
        date: periodDate,
        notes: bonus.bonusReason || "",
        allEmployees: isAll,
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);
  }, [bonusesData, employeesLookup]);

  // تجميع السجلات حسب الموظف
  const groupedRewards = useMemo(() => {
    const groups: Record<string, { employeeId: string; name: string; totalAmount: number; records: RewardRecord[] }> = {};

    rewards.forEach(reward => {
      if (!groups[reward.employeeId]) {
        groups[reward.employeeId] = {
          employeeId: reward.employeeId,
          name: reward.name,
          totalAmount: 0,
          records: [],
        };
      }
      groups[reward.employeeId].totalAmount += reward.amount;
      groups[reward.employeeId].records.push(reward);
    });

    // تحويل الكائن إلى مصفوفة لسهولة العرض
    return Object.values(groups);
  }, [rewards]);

  // فلترة المجموعات المجمعة بناءً على البحث
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedRewards;
    return groupedRewards.filter((g) =>
      g.name.includes(searchTerm) || g.employeeId.includes(searchTerm)
    );
  }, [groupedRewards, searchTerm]);

  const toggleRow = (empId: string) => {
    setExpandedRows(prev => ({ ...prev, [empId]: !prev[empId] }));
  };

  const handleSaveReward = async (data: BonusInput) => {
    const period = data.period || "";
    const basePayload: BonusInput = {
      employeeId: data.employeeId,
      bonusAmount: data.bonusAmount,
      assistanceAmount: data.assistanceAmount || 0,
      bonusReason: data.bonusReason || "مكافأة",
      period,
    };

    try {
      if (data.employeeId === "ALL") {
        if (!employees.length) {
          alert("لا يمكن تطبيق المكافأة على الجميع قبل تحميل الموظفين");
          return;
        }

        await Promise.all(
          employees.map((emp) =>
            createBonus.mutateAsync({
              ...basePayload,
              employeeId: emp.employeeId,
            }),
          ),
        );
      } else {
        await createBonus.mutateAsync(basePayload);
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving reward:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الزيادة؟")) {
      try {
        await deleteBonus.mutateAsync(id);
      } catch (error) {
        console.error("Error deleting reward:", error);
      }
    }
  };

  return (
    <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">
      
      {/* نقشة الفايبر */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
        
        {/* مسار التنقل */}
        <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
          <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
          <span className="hover:text-[#263544] cursor-pointer transition-colors relative z-10">المركز المالي</span>
          <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
          <span className="text-[#263544] relative z-10">المكافآت والبدلات</span>
        </nav>

        {/* الهيدر */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#263544]/10 pb-6 relative">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4 group">
                <Gift size={22} className="text-[#C89355] group-hover:animate-bounce transition-all duration-300" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">المكافآت والبدلات</h1>
            </div>
            <p className="text-slate-600 text-sm font-bold pr-14 mt-1">
              إدارة كافة الإضافات المالية والمكافآت والعمل الإضافي للموظفين.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-5 w-full md:w-auto">
            <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 hover:shadow-md w-full md:w-64 transition-all">
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
              <Search size={18} className="text-[#C89355] ml-2 shrink-0 relative z-10" />
              <input
                type="text" placeholder="البحث بالاسم أو الكود..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-sm font-bold text-[#263544] outline-none w-full relative z-10 placeholder:text-slate-400"
              />
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="relative overflow-hidden bg-[#1a2530] hover:bg-[#263544] text-[#C89355] px-5 py-3 rounded-2xl flex items-center gap-2 shadow-[0_10px_20px_rgba(38,53,68,0.3)] transition-all active:scale-95 text-sm font-black border border-[#C89355]/40 group"
            >
              <div className="absolute inset-1.5 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
              <Plus size={18} className="group-hover:animate-spin relative z-10" />
              <span className="relative z-10 tracking-wide">إضافة مكافأة</span>
            </button>
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
                  <th className="p-5 text-emerald-600 font-black text-xs uppercase text-center">إجمالي المكافآت الممنوحة</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase text-center">عدد السجلات</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase text-center w-24">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-16 text-center text-[#263544]/60 font-black">جاري تحميل المكافآت...</td></tr>
                ) : filteredGroups.length === 0 ? (
                  <tr><td colSpan={5} className="p-16 text-center text-[#263544]/60 font-black">لا توجد سجلات مكافآت.</td></tr>
                ) : (
                  filteredGroups.map((group) => {
                    const isExpanded = expandedRows[group.employeeId];
                    const isGlobal = group.employeeId === "ALL";

                    return (
                      <React.Fragment key={group.employeeId}>
                        {/* الصف الرئيسي (الملخص) */}
                        <tr
                          onClick={() => toggleRow(group.employeeId)}
                          className={`cursor-pointer transition-all duration-300 group/row border-b border-white/40 last:border-0 ${isGlobal
                            ? "bg-emerald-50/60 hover:bg-emerald-100/80"
                            : isExpanded ? "bg-white/80" : "hover:bg-white/80"
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
                            <span className="inline-block px-4 py-1.5 rounded-xl font-mono font-black text-emerald-700 bg-emerald-100/50 border border-emerald-200 shadow-sm">
                              +{group.totalAmount.toLocaleString()} <span className="text-[10px] text-emerald-600">ل.س</span>
                            </span>
                          </td>
                          <td className="p-5 text-center font-bold text-sm text-[#263544]/70">
                            <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{group.records.length} إضافة</span>
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
                            <td colSpan={5} className="p-0 border-b border-slate-200/50">
                              <div className="bg-slate-50/80 p-6 shadow-inner border-y border-slate-200/40">
                                <table className="w-full text-right text-sm border border-slate-200/50 rounded-xl overflow-hidden bg-white/50">
                                  <thead className="text-[#263544] bg-slate-100/80 border-b border-slate-200/60">
                                    <tr>
                                      <th className="py-3 px-4 font-bold">نوع الإضافة</th>
                                      <th className="py-3 px-4 font-bold text-emerald-600 text-center">القيمة</th>
                                      <th className="py-3 px-4 font-bold text-center">التاريخ</th>
                                      <th className="py-3 px-4 font-bold">ملاحظات</th>
                                      <th className="py-3 px-4 font-bold text-center">إلغاء</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100/80">
                                    {group.records.map((record) => (
                                      <tr key={record.id} className="hover:bg-white transition-colors">
                                        <td className="py-3 px-4 font-bold text-slate-700">{record.type}</td>
                                        <td className="py-3 px-4 font-mono font-black text-emerald-600 text-center">+{record.amount.toLocaleString()}</td>
                                        <td className="py-3 px-4 font-mono text-slate-500 text-center">{new Date(record.date).toLocaleDateString("ar-EG")}</td>
                                        <td className="py-3 px-4 text-xs font-medium text-slate-500 max-w-50 truncate">{record.notes || "—"}</td>
                                        <td className="py-3 px-4 text-center">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                                            className="text-rose-400 hover:bg-rose-100 hover:text-rose-600 p-2 rounded-lg transition-all"
                                            title="إلغاء هذه المكافأة"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
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
          <AddBonusModal
            key={`${isModalOpen}-${initialEmployeeId}-${initialType}-${initialDate}-${initialAllEmployees}`}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveReward}
            isPending={createBonus.isPending}
            employees={Array.isArray(employees) ? employees : []}
            salaries={Array.isArray(salaries) ? salaries : []}
            initialData={undefined}
          />
        )}

      </div>
    </div>
  );
}
