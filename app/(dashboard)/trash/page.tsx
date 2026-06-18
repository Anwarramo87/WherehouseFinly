"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trash2, RotateCcw, XCircle, Search,
  Loader2, Clock
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { MonthPeriodSelector } from "@/components/MonthPeriodSelector";
import { useRouter, useSearchParams } from "next/navigation";

interface DeletedRecord {
  id: string;
  entityType: string;
  entityId: string;
  entityData: Record<string, unknown>;
  deletedBy?: string;
  deletedAt: string;
  restoredAt?: string;
}

const ENTITY_LABELS: Record<string, string> = {
  advance: "سلفة",
  penalty: "خصم",
  bonus: "مكافأة",
  leave_request: "طلب إجازة",
  employee: "موظف",
};

const ENTITY_COLORS: Record<string, string> = {
  advance: "bg-amber-100 text-amber-700 border-amber-200",
  penalty: "bg-rose-100 text-rose-700 border-rose-200",
  bonus: "bg-emerald-100 text-emerald-700 border-emerald-200",
  leave_request: "bg-blue-100 text-blue-700 border-blue-200",
  employee: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function TrashPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);
const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: types = [] } = useQuery<{ entityType: string; count: number }[]>({
    queryKey: ["trash", "types", period],
    queryFn: () => apiClient.get("/trash/types", { params: { period } }).then((r) => r.data),
  });

  const { data: trashData, isLoading } = useQuery({
     queryKey: ["trash", "list", typeFilter, period],
     queryFn: () => {
       const params: Record<string, string | number> = { limit: 200 };
      if (typeFilter) params.entityType = typeFilter;
      if (period) {
        const [y, m] = period.split("-").map(Number);
        params.fromDate = `${y}-${String(m).padStart(2, "0")}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        params.toDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      }
      return apiClient.get("/trash", { params }).then((r) => r.data);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (historyId: string) => apiClient.post(`/trash/restore/${historyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (historyId: string) => apiClient.delete(`/trash/${historyId}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      setConfirmDeleteId(null);
    },
  });

  const filteredRecords = useMemo(() => {
    const records: DeletedRecord[] = trashData?.data || [];
    if (!searchTerm) return records;
    const term = searchTerm.toLowerCase();
    return records.filter((r) => {
      const name = String(r.entityData?.name || r.entityData?.employeeId || "");
      const reason = String(r.entityData?.reason || r.entityData?.bonusReason || "");
      return (
        name.toLowerCase().includes(term) ||
        reason.toLowerCase().includes(term) ||
        r.entityType.includes(term)
      );
    });
  }, [trashData, searchTerm]);

  const handleRestore = async (id: string) => {
    await restoreMutation.mutateAsync(id);
  };

  const handlePermanentDelete = async (id: string) => {
    await permanentDeleteMutation.mutateAsync(id);
  };

  const formatEntityData = (record: DeletedRecord) => {
    const data = (record.entityData || {}) as Record<string, string | number | undefined | null>;
    switch (record.entityType) {
      case "advance":
        return (
          <div className="space-y-1">
            <p className="font-bold text-[#263544]">الموظف: {data.employeeId}</p>
            <p className="text-sm text-slate-600">المبلغ: {Number(data.amount || 0).toLocaleString()} ل.س</p>
            {data.reason && <p className="text-sm text-slate-500">السبب: {data.reason}</p>}
          </div>
        );
      case "penalty":
        return (
          <div className="space-y-1">
            <p className="font-bold text-[#263544]">الموظف: {data.employeeId}</p>
            <p className="text-sm text-slate-600">المبلغ: {Number(data.amount || 0).toLocaleString()} ل.س</p>
            {data.reason && <p className="text-sm text-slate-500">السبب: {data.reason}</p>}
          </div>
        );
      case "bonus":
        return (
          <div className="space-y-1">
            <p className="font-bold text-[#263544]">الموظف: {data.employeeId}</p>
            <p className="text-sm text-slate-600">المبلغ: {Number(data.bonusAmount || 0).toLocaleString()} ل.س</p>
            {data.bonusReason && <p className="text-sm text-slate-500">السبب: {data.bonusReason}</p>}
          </div>
        );
      case "leave_request":
        return (
          <div className="space-y-1">
            <p className="font-bold text-[#263544]">الموظف: {data.employeeId}</p>
            {data.startDate && <p className="text-sm text-slate-600">من: {data.startDate}</p>}
            {data.endDate && <p className="text-sm text-slate-600">إلى: {data.endDate}</p>}
            {data.reason && <p className="text-sm text-slate-500">السبب: {data.reason}</p>}
          </div>
        );
      case "employee":
        return (
          <div className="space-y-1">
            <p className="font-bold text-[#263544]">{data.name || data.employeeId}</p>
            {data.department && <p className="text-sm text-slate-600">القسم: {data.department}</p>}
            {data.position && <p className="text-sm text-slate-500">المنصب: {data.position}</p>}
          </div>
        );
      default:
        return <p className="text-sm text-slate-500">بيانات غير معروفة</p>;
    }
  };

  return (
    <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
        <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
          <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
          <span className="text-[#263544] relative z-10">سلة المحذوفات</span>
        </nav>

        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#263544]/10 pb-6 relative">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4 group">
                <Trash2 size={22} className="text-rose-400 group-hover:animate-bounce transition-all duration-300" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">سلة المحذوفات</h1>
            </div>
            <p className="text-slate-600 text-sm font-bold pr-14 mt-1">
              استعادة أو حذف السجلات المحذوفة نهائياً.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-4 w-full md:w-auto">
            <MonthPeriodSelector
              value={period}
              onChange={(p) => router.replace(`/trash?period=${p}`)}
              className="shrink-0"
            />
            <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 hover:shadow-md w-full md:w-64 transition-all">
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
              <Search size={18} className="text-[#C89355] ml-2 shrink-0 relative z-10" />
              <input
                type="text" placeholder="بحث في المحذوفات..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-sm font-bold text-[#263544] outline-none w-full relative z-10 placeholder:text-slate-400"
              />
            </div>
          </div>
        </header>

        {/* Type filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setTypeFilter("")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
              !typeFilter
                ? "bg-[#1a2530] text-[#C89355] border-[#C89355]/40"
                : "bg-white/60 text-slate-500 border-white/80 hover:bg-white/80"
            }`}
          >
            الكل ({types.reduce((sum, t) => sum + t.count, 0)})
          </button>
          {types.map((t) => (
            <button
              key={t.entityType}
              onClick={() => setTypeFilter(t.entityType)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                typeFilter === t.entityType
                  ? "bg-[#1a2530] text-[#C89355] border-[#C89355]/40"
                  : "bg-white/60 text-slate-500 border-white/80 hover:bg-white/80"
              }`}
            >
              {ENTITY_LABELS[t.entityType] || t.entityType} ({t.count})
            </button>
          ))}
        </div>

        {/* Records table */}
        <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden group">
          <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0 transition-colors group-hover:border-[#C89355]/50" />
          <div className="w-full overflow-x-auto custom-scrollbar relative z-10">
            <table className="w-full text-right min-w-[800px]">
              <thead className="bg-white/40 border-b border-white/80">
                <tr>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase text-center w-24">النوع</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase text-center">التفاصيل</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase text-center w-40">تاريخ الحذف</th>
                  <th className="p-5 text-[#263544] font-black text-xs uppercase text-center w-40">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-16 text-center">
                      <Loader2 size={32} className="text-[#C89355] animate-spin mx-auto mb-3" />
                      <p className="text-[#263544]/60 font-black">جاري تحميل المحذوفات...</p>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-white/80 rounded-2xl border border-slate-200">
                          <Trash2 size={40} className="text-slate-300" />
                        </div>
                        <p className="text-[#263544]/60 font-black">سلة المحذوفات فارغة</p>
                        <p className="text-sm text-slate-400 font-bold">لم يتم حذف أي سجلات في هذا الشهر</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-white/80 transition-all border-b border-white/40 last:border-0">
                      <td className="p-5 text-center">
                        <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-black border ${ENTITY_COLORS[record.entityType] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {ENTITY_LABELS[record.entityType] || record.entityType}
                        </span>
                      </td>
                      <td className="p-5">
                        {formatEntityData(record)}
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 font-bold">
                          <Clock size={14} className="text-slate-400" />
                          {new Date(record.deletedAt).toLocaleDateString("ar-EG", {
                            year: "numeric", month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit"
                          })}
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleRestore(record.id)}
                            disabled={restoreMutation.isPending}
                            className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-all border border-emerald-200 disabled:opacity-50"
                            title="استعادة"
                          >
                            <RotateCcw size={16} />
                          </button>
                          {confirmDeleteId === record.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handlePermanentDelete(record.id)}
                                disabled={permanentDeleteMutation.isPending}
                                className="px-3 py-2 rounded-xl bg-rose-500 text-white text-xs font-black hover:bg-rose-600 transition-all disabled:opacity-50"
                              >
                                تأكيد
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-3 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold hover:bg-slate-200 transition-all"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(record.id)}
                              className="p-2.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition-all border border-rose-200"
                              title="حذف نهائي"
                            >
                              <XCircle size={16} />
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
      </div>
    </div>
  );
}
