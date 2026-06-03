"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, AlertTriangle, Calendar, FileText, MessageSquare } from "lucide-react";
import type { Employee } from "@/types/employee";

export interface TerminationData {
  terminationDate: string;
  terminationType: 'resignation' | 'termination';
  reason: string;
  notes?: string;
}

interface Props {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: TerminationData) => void;
  isPending: boolean;
}

const defaultFormState: TerminationData = {
  terminationDate: new Date().toISOString().split('T')[0],
  terminationType: 'resignation',
  reason: '',
  notes: '',
};

export default function TerminateEmployeeModal({ 
  employee, 
  isOpen, 
  onClose, 
  onConfirm, 
  isPending 
}: Props) {
  const isMounted = typeof document !== "undefined";
  const [formData, setFormData] = useState<TerminationData>(() => ({
    ...defaultFormState,
    terminationDate: new Date().toISOString().split('T')[0],
  }));
  const [reasonError, setReasonError] = useState("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { 
      document.body.style.overflow = "unset"; 
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const newFormData = {
        ...defaultFormState,
        terminationDate: new Date().toISOString().split('T')[0],
      };
      // Use a timeout to avoid setState during render
      setTimeout(() => {
        setFormData(newFormData);
        setReasonError("");
      }, 0);
    }
  }, [isOpen]);

  if (!isOpen || !isMounted) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate reason length
    if (formData.reason.trim().length < 10) {
      setReasonError("يجب أن يكون السبب 10 أحرف على الأقل");
      return;
    }
    
    if (formData.reason.trim().length > 500) {
      setReasonError("السبب طويل جداً (الحد الأقصى 500 حرف)");
      return;
    }

    onConfirm(formData);
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, reason: value });
    
    if (reasonError && value.trim().length >= 10 && value.trim().length <= 500) {
      setReasonError("");
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-[#101720]/80 backdrop-blur-md flex items-center justify-center z-999999 p-4 sm:p-6 transition-all duration-300" 
      dir="rtl"
    >
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 border border-white/5 outline-dashed outline-1 outline-rose-500/20 outline-offset-[-6px]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              <AlertTriangle className="text-rose-500" size={24} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                إنهاء عمل الموظف
              </h2>
              <p className="text-sm text-slate-400 font-semibold mt-0.5">
                {employee.name} ({employee.employeeId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-rose-400 bg-[#263544] p-2 rounded-xl shadow-sm border border-transparent hover:border-rose-400/30 transition-all hover:bg-rose-500/10 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="mx-6 mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <p className="text-rose-400 font-bold mb-1">تحذير: هذا الإجراء لا يمكن التراجع عنه</p>
              <p className="text-slate-400 font-semibold">
                سيتم نقل الموظف إلى أرشيف المستقيلين وإخفاؤه من قائمة الموظفين النشطين فوراً.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6">
          <form id="terminationForm" onSubmit={handleFormSubmit} className="space-y-5">
            
            {/* Termination Date */}
            <div>
              <label htmlFor="terminationDate" className="block text-sm font-bold text-rose-400 mb-2">
                تاريخ الإنهاء
              </label>
              <div className="relative group">
                <input
                  id="terminationDate"
                  type="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 outline-none transition-all text-white font-mono font-bold shadow-inner pr-11 scheme-dark"
                  value={formData.terminationDate}
                  onChange={(e) => setFormData({ ...formData, terminationDate: e.target.value })}
                />
                <Calendar className="absolute right-4 top-3.5 text-slate-500 group-focus-within:text-rose-500 transition-colors" size={20} />
              </div>
            </div>

            {/* Termination Type */}
            <div>
              <label className="block text-sm font-bold text-rose-400 mb-3">
                نوع الإنهاء
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label 
                  className={`relative flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.terminationType === 'resignation'
                      ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                      : 'border-[#263544] bg-[#1a2530] hover:border-rose-500/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="terminationType"
                    value="resignation"
                    checked={formData.terminationType === 'resignation'}
                    onChange={(e) => setFormData({ ...formData, terminationType: e.target.value as 'resignation' | 'termination' })}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className={`text-base font-bold ${
                      formData.terminationType === 'resignation' ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      استقالة
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-semibold">
                      الموظف قدم استقالته
                    </div>
                  </div>
                  {formData.terminationType === 'resignation' && (
                    <div className="absolute top-2 left-2 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                  )}
                </label>

                <label 
                  className={`relative flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.terminationType === 'termination'
                      ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                      : 'border-[#263544] bg-[#1a2530] hover:border-rose-500/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="terminationType"
                    value="termination"
                    checked={formData.terminationType === 'termination'}
                    onChange={(e) => setFormData({ ...formData, terminationType: e.target.value as 'resignation' | 'termination' })}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className={`text-base font-bold ${
                      formData.terminationType === 'termination' ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      إقالة
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-semibold">
                      تم إنهاء خدمة الموظف
                    </div>
                  </div>
                  {formData.terminationType === 'termination' && (
                    <div className="absolute top-2 left-2 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                  )}
                </label>
              </div>
            </div>

            {/* Termination Reason */}
            <div>
              <label className="block text-sm font-bold text-rose-400 mb-2">
                سبب الإنهاء <span className="text-rose-500">*</span>
              </label>
              <div className="relative group">
                <textarea
                  required
                  rows={4}
                  minLength={10}
                  maxLength={500}
                  placeholder="اكتب سبب إنهاء الخدمة (10-500 حرف)..."
                  className={`w-full p-3.5 bg-[#1a2530] border rounded-xl focus:ring-2 outline-none transition-all text-white font-bold shadow-inner pr-11 placeholder:text-slate-500 resize-none ${
                    reasonError 
                      ? 'border-rose-500 focus:ring-rose-500/30 focus:border-rose-500' 
                      : 'border-[#263544] focus:ring-rose-500/30 focus:border-rose-500'
                  }`}
                  value={formData.reason}
                  onChange={handleReasonChange}
                />
                <FileText className={`absolute right-4 top-3.5 transition-colors ${
                  reasonError ? 'text-rose-500' : 'text-slate-500 group-focus-within:text-rose-500'
                }`} size={20} />
              </div>
              <div className="flex justify-between items-center mt-1.5">
                {reasonError ? (
                  <p className="text-xs text-rose-400 font-bold">{reasonError}</p>
                ) : (
                  <p className="text-xs text-slate-500 font-semibold">
                    الحد الأدنى 10 أحرف
                  </p>
                )}
                <p className="text-xs text-slate-500 font-semibold">
                  {formData.reason.length}/500
                </p>
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">
                ملاحظات إضافية (اختياري)
              </label>
              <div className="relative group">
                <textarea
                  rows={3}
                  maxLength={1000}
                  placeholder="أي ملاحظات إضافية حول إنهاء الخدمة..."
                  className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 outline-none transition-all text-white font-bold shadow-inner pr-11 placeholder:text-slate-500 resize-none"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
                <MessageSquare className="absolute right-4 top-3.5 text-slate-500 group-focus-within:text-rose-500 transition-colors" size={20} />
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-1.5">
                {formData.notes?.length || 0}/1000
              </p>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 bg-[#1a2530]/80 border-t border-white/5 flex justify-between shrink-0 relative z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-6 sm:px-8 py-3 rounded-xl font-bold text-slate-300 bg-[#263544] hover:bg-[#324559] hover:text-white border border-transparent active:scale-95 transition-all text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            إلغاء
          </button>

          <button
            type="submit"
            form="terminationForm"
            disabled={isPending}
            className="bg-rose-500 text-white px-8 sm:px-10 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(244,63,94,0.3)] text-sm sm:text-base"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                جاري الإنهاء...
              </>
            ) : (
              <>
                <AlertTriangle size={20} />
                تأكيد إنهاء الخدمة
              </>
            )}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
