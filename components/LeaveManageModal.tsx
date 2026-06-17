"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Edit2, Trash2, Save, CalendarDays, FileText,
  Loader2, AlertTriangle, Check,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LeaveRecord {
  id: string;
  employeeId: string;
  leaveType: string;
  status: string;
  isPaid: boolean;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  reason?: string | null;
  notes?: string | null;
  employee?: { name?: string; employeeId?: string };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leave: LeaveRecord;
  onUpdated?: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<string, string> = {
  SICK:   "مرضية",
  ADMIN:  "إدارية",
  UNPAID: "بدون أجر",
  DEATH:  "وفاة",
  PAID:   "مأجورة",
  OTHER:  "أخرى",
};

const LEAVE_TYPES_OPTIONS = [
  { value: "SICK",   label: "مرضية",     isPaid: true  },
  { value: "ADMIN",  label: "إدارية",    isPaid: true  },
  { value: "DEATH",  label: "وفاة",      isPaid: true  },
  { value: "UNPAID", label: "بدون أجر",  isPaid: false },
  { value: "PAID",   label: "مأجورة",    isPaid: true  },
  { value: "OTHER",  label: "أخرى",      isPaid: false },
];

const STATUS_LABELS: Record<string, string> = {
  APPROVED:  "معتمدة",
  PENDING:   "معلقة",
  REJECTED:  "مرفوضة",
  CANCELLED: "ملغاة",
};

// ── Component ─────────────────────────────────────────────────────────────────

function LeaveManageModalContent({ onClose, leave, onUpdated }: Omit<Props, "isOpen">) {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form state when leave prop changes - use values directly from leave prop
  const getInitialForm = () => ({
    leaveType: leave.leaveType,
    startDate: leave.startDate?.slice(0, 10) ?? "",
    endDate:   leave.endDate?.slice(0, 10)   ?? "",
    reason:    leave.reason ?? "",
    isPaid:    leave.isPaid,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["leaves"],                  exact: false });
    void queryClient.invalidateQueries({ queryKey: ["employeeMonthlyLeaves"],   exact: false });
    void queryClient.invalidateQueries({ queryKey: ["attendance-deductions"],   exact: false });
  };

  // ── Edit save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.startDate || !form.endDate) {
      toast.error("يرجى تحديد تاريخي البداية والنهاية");
      return;
    }
    if (form.startDate > form.endDate) {
      toast.error("تاريخ النهاية يجب أن يكون بعد أو يساوي تاريخ البداية");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/leaves/${leave.id}`, {
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate:   form.endDate,
        isPaid:    form.isPaid,
        reason:    form.reason || null,
      });
      toast.success("تم تعديل الإجازة بنجاح");
      invalidate();
      onUpdated?.();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message;
      const errorMessage = Array.isArray(msg) ? msg.join(" | ") : (msg ?? "فشل تعديل الإجازة");
      
      // عرض رسالة ودية عند محاولة التعديل لتواريخ متداخلة
      if (typeof errorMessage === 'string' && errorMessage.includes('تداخل')) {
        toast.error("⚠️ الموظف لديه إجازة بالفعل في هذه التواريخ. يرجى اختيار تواريخ مختلفة.", { duration: 5000 });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/leaves/${leave.id}`);
      toast.success("تم حذف الإجازة بنجاح");
      invalidate();
      onUpdated?.();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(" | ") : (msg ?? "فشل حذف الإجازة"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const employeeName = leave.employee?.name ?? leave.employeeId;

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      dir="rtl"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#101720] rounded-[2rem] shadow-[0_30px_90px_-15px_rgba(200,147,85,0.2)] w-full max-w-md overflow-hidden flex flex-col border border-white/10 outline-dashed outline-1 outline-[#C89355]/30 -outline-offset-8 animate-in zoom-in-95 duration-200">

        {/* ── Header ── */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#C89355]/10 p-2.5 rounded-xl border border-[#C89355]/20">
              <FileText className="text-[#C89355]" size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                {mode === "edit" ? "تعديل الإجازة" : mode === "confirmDelete" ? "تأكيد الحذف" : "تفاصيل الإجازة"}
              </h2>
              <p className="text-xs text-[#C89355] font-mono mt-0.5">{employeeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-rose-400 bg-[#263544] p-2 rounded-xl transition-all active:scale-90"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">

          {/* ── View mode ── */}
          {mode === "view" && (
            <div className="space-y-3">
              <InfoRow label="نوع الإجازة" value={LEAVE_TYPE_LABELS[leave.leaveType] ?? leave.leaveType} />
              <InfoRow label="الحالة" value={STATUS_LABELS[leave.status] ?? leave.status} />
              <InfoRow label="من تاريخ" value={leave.startDate?.slice(0, 10)} />
              <InfoRow label="إلى تاريخ" value={leave.endDate?.slice(0, 10)} />
              <InfoRow label="نوع الأجر" value={leave.isPaid ? "مأجورة" : "غير مأجورة"} />
              {leave.reason && <InfoRow label="السبب" value={leave.reason} />}
            </div>
          )}

          {/* ── Edit mode ── */}
          {mode === "edit" && (
            <div className="space-y-4">
              {/* Leave type */}
              <div>
                <label className="block text-xs font-black text-[#C89355] mb-1.5 uppercase">نوع الإجازة</label>
                <select
                  value={form.leaveType}
                  onChange={(e) => {
                    const opt = LEAVE_TYPES_OPTIONS.find(o => o.value === e.target.value);
                    setForm(p => ({ ...p, leaveType: e.target.value, isPaid: opt?.isPaid ?? p.isPaid }));
                  }}
                  className="w-full p-3 bg-[#1a2530] border border-[#263544] rounded-xl focus:border-[#C89355] outline-none text-white font-bold text-sm"
                >
                  {LEAVE_TYPES_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#C89355] mb-1.5 uppercase">من تاريخ</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm(p => ({ ...p, startDate: e.target.value }))}
                      className="w-full p-3 pr-9 bg-[#1a2530] border border-[#263544] rounded-xl focus:border-[#C89355] outline-none text-white font-mono font-bold text-sm"
                    />
                    <CalendarDays className="absolute right-2.5 top-3 text-slate-500 pointer-events-none" size={16} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-[#C89355] mb-1.5 uppercase">إلى تاريخ</label>
                  <div className="relative">
                    <input
                      type="date"
                      min={form.startDate}
                      value={form.endDate}
                      onChange={(e) => setForm(p => ({ ...p, endDate: e.target.value }))}
                      className="w-full p-3 pr-9 bg-[#1a2530] border border-[#263544] rounded-xl focus:border-[#C89355] outline-none text-white font-mono font-bold text-sm"
                    />
                    <CalendarDays className="absolute right-2.5 top-3 text-slate-500 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-black text-[#C89355] mb-1.5 uppercase">السبب (اختياري)</label>
                <textarea
                  rows={3}
                  placeholder="سبب الإجازة..."
                  value={form.reason}
                  onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))}
                  className="w-full p-3 bg-[#1a2530] border border-[#263544] rounded-xl focus:border-[#C89355] outline-none text-white font-bold text-sm resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Confirm delete ── */}
          {mode === "confirmDelete" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
                <AlertTriangle size={36} className="text-rose-400" />
              </div>
              <div>
                <p className="text-white font-black text-base">هل أنت متأكد من حذف هذه الإجازة؟</p>
                <p className="text-slate-400 text-xs font-bold mt-1">
                  {LEAVE_TYPE_LABELS[leave.leaveType] ?? leave.leaveType} — من {leave.startDate?.slice(0, 10)} إلى {leave.endDate?.slice(0, 10)}
                </p>
                <p className="text-rose-400/80 text-xs font-bold mt-2">سيتم إلغاء أثرها على الراتب تلقائياً.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-5 bg-[#1a2530]/80 border-t border-white/5 flex gap-2 shrink-0">

          {mode === "view" && (
            <>
              <button
                onClick={() => setMode("edit")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#C89355]/10 hover:bg-[#C89355]/20 text-[#C89355] font-black text-sm border border-[#C89355]/30 transition-all active:scale-95"
              >
                <Edit2 size={15} /> تعديل
              </button>
              <button
                onClick={() => setMode("confirmDelete")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-black text-sm border border-rose-500/20 transition-all active:scale-95"
              >
                <Trash2 size={15} /> حذف
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[#263544] text-slate-400 hover:text-white font-black text-sm transition-all active:scale-95"
              >
                إغلاق
              </button>
            </>
          )}

          {mode === "edit" && (
            <>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#C89355] hover:bg-[#d0b468] text-[#101720] font-black text-sm transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_15px_rgba(200,147,85,0.3)]"
              >
                {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {isSubmitting ? "جارٍ الحفظ..." : "حفظ التعديلات"}
              </button>
              <button
                onClick={() => setMode("view")}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-[#263544] text-slate-400 hover:text-white font-black text-sm transition-all active:scale-95 disabled:opacity-50"
              >
                إلغاء
              </button>
            </>
          )}

          {mode === "confirmDelete" && (
            <>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {isSubmitting ? "جارٍ الحذف..." : "نعم، احذف الإجازة"}
              </button>
              <button
                onClick={() => setMode("view")}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-[#263544] text-slate-400 hover:text-white font-black text-sm transition-all active:scale-95 disabled:opacity-50"
              >
                تراجع
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5">
      <span className="text-xs font-black text-slate-500 uppercase">{label}</span>
      <span className="text-sm font-bold text-white">{value ?? "—"}</span>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function LeaveManageModal(props: Props) {
  if (!props.isOpen || typeof document === "undefined") return null;
  return <LeaveManageModalContent key={props.leave.id} {...props} />;
}
