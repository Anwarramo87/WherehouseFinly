"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, UserCheck, Calendar, MessageSquare, CheckSquare } from "lucide-react";
import type { Employee } from "@/types/employee";

export interface RehireData {
  rehireDate: string;
  restorePreviousSettings: boolean;
  notes?: string;
}

interface Props {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: RehireData) => void;
  isPending: boolean;
}

const defaultFormState: RehireData = {
  rehireDate: new Date().toISOString().split('T')[0],
  restorePreviousSettings: true,
  notes: '',
};

export default function RehireEmployeeModal({ 
  employee, 
  isOpen, 
  onClose, 
  onConfirm, 
  isPending 
}: Props) {
  const isMounted = typeof document !== "undefined";
  const [formData, setFormData] = useState<RehireData>(() => ({
    ...defaultFormState,
    rehireDate: new Date().toISOString().split('T')[0],
  }));
  const [dateError, setDateError] = useState("");

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
        rehireDate: new Date().toISOString().split('T')[0],
      };
      // Use a timeout to avoid setState during render
      setTimeout(() => {
        setFormData(newFormData);
        setDateError("");
      }, 0);
    }
  }, [isOpen]);

  if (!isOpen || !isMounted) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate rehire date is not in the past
    const selectedDate = new Date(formData.rehireDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      setDateError("لا يمكن أن يكون تاريخ إعادة التعيين في الماضي");
      return;
    }

    onConfirm(formData);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, rehireDate: value });
    
    // Clear error if date is valid
    const selectedDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateError && selectedDate >= today) {
      setDateError("");
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-[#101720]/80 backdrop-blur-md flex items-center justify-center z-999999 p-4 sm:p-6 transition-all duration-300" 
      dir="rtl"
    >
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 border border-white/5 outline-dashed outline-1 outline-emerald-500/20 outline-offset-[-6px]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <UserCheck className="text-emerald-500" size={24} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                إعادة تعيين الموظف
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

        {/* Info Banner */}
        <div className="mx-6 mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <UserCheck className="text-emerald-500 shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <p className="text-emerald-400 font-bold mb-1">إعادة تعيين الموظف</p>
              <p className="text-slate-400 font-semibold">
                سيتم إرجاع الموظف إلى حالة النشاط وإظهاره في قائمة الموظفين النشطين.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6">
          <form id="rehireForm" onSubmit={handleFormSubmit} className="space-y-5">
            
            {/* Rehire Date */}
            <div>
              <label htmlFor="rehireDate" className="block text-sm font-bold text-emerald-400 mb-2">
                تاريخ إعادة التعيين <span className="text-emerald-500">*</span>
              </label>
              <div className="relative group">
                <input
                  id="rehireDate"
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full p-3.5 bg-[#1a2530] border rounded-xl focus:ring-2 outline-none transition-all text-white font-mono font-bold shadow-inner pr-11 scheme-dark ${
                    dateError 
                      ? 'border-rose-500 focus:ring-rose-500/30 focus:border-rose-500' 
                      : 'border-[#263544] focus:ring-emerald-500/30 focus:border-emerald-500'
                  }`}
                  value={formData.rehireDate}
                  onChange={handleDateChange}
                />
                <Calendar className={`absolute right-4 top-3.5 transition-colors ${
                  dateError ? 'text-rose-500' : 'text-slate-500 group-focus-within:text-emerald-500'
                }`} size={20} />
              </div>
              {dateError ? (
                <p className="text-xs text-rose-400 font-bold mt-1.5">{dateError}</p>
              ) : (
                <p className="text-xs text-slate-500 font-semibold mt-1.5">
                  لا يمكن اختيار تاريخ في الماضي
                </p>
              )}
            </div>

            {/* Restore Previous Settings Checkbox */}
            <div className="bg-[#1a2530] p-5 rounded-2xl border border-[#263544] shadow-inner">
              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={formData.restorePreviousSettings}
                    onChange={(e) => setFormData({ ...formData, restorePreviousSettings: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                    formData.restorePreviousSettings
                      ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-[#101720] border-[#263544] group-hover:border-emerald-500/30'
                  }`}>
                    {formData.restorePreviousSettings && (
                      <CheckSquare className="text-white" size={16} />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className={`text-base font-bold transition-colors ${
                    formData.restorePreviousSettings ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                    استعادة الإعدادات السابقة
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 font-semibold leading-relaxed">
                    سيتم استعادة جميع البيانات السابقة للموظف (الراتب، القسم، الوظيفة، أوقات الدوام، والثوابت المالية)
                  </p>
                </div>
              </label>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">
                ملاحظات إضافية (اختياري)
              </label>
              <div className="relative group">
                <textarea
                  rows={4}
                  maxLength={1000}
                  placeholder="أي ملاحظات إضافية حول إعادة التعيين..."
                  className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all text-white font-bold shadow-inner pr-11 placeholder:text-slate-500 resize-none"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
                <MessageSquare className="absolute right-4 top-3.5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={20} />
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
            form="rehireForm"
            disabled={isPending}
            className="bg-emerald-500 text-white px-8 sm:px-10 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.3)] text-sm sm:text-base"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                جاري إعادة التعيين...
              </>
            ) : (
              <>
                <UserCheck size={20} />
                تأكيد إعادة التعيين
              </>
            )}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
