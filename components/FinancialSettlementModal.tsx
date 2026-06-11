"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, DollarSign, Calendar, MessageSquare, TrendingUp, TrendingDown, Coins, Info } from "lucide-react";
import type { Employee } from "@/types/employee";

export interface SettlementData {
  settlementDate: string;
  finalSalaryAmount: number;
  deductions: number;
  bonuses: number;
  notes?: string;
}

interface Props {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: SettlementData) => void;
  isPending: boolean;
  initialSettlementData?: any;
}

const defaultFormState: SettlementData = {
  settlementDate: new Date().toISOString().split('T')[0],
  finalSalaryAmount: 0,
  deductions: 0,
  bonuses: 0,
  notes: '',
};

// Helper function to parse Arabic and English numerals
const parseArabicNumber = (value: string): number => {
  // Map Arabic-Indic digits to Western digits
  const arabicToWestern: { [key: string]: string } = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  
  const westernValue = value.replace(/[٠-٩]/g, (d) => arabicToWestern[d] || d);
  const parsed = parseFloat(westernValue);
  return isNaN(parsed) ? 0 : parsed;
};

export default function FinancialSettlementModal({ 
  employee, 
  isOpen, 
  onClose, 
  onConfirm, 
  isPending, 
  initialSettlementData 
}: Props) {
  const isMounted = typeof document !== "undefined";
  const [formData, setFormData] = useState<SettlementData>(() => ({
    ...defaultFormState,
    settlementDate: new Date().toISOString().split('T')[0],
  }));
  const [finalSalaryError, setFinalSalaryError] = useState("");
  const [deductionsError, setDeductionsError] = useState("");
  const [bonusesError, setBonusesError] = useState("");

  useEffect(() => {
    if (isOpen && initialSettlementData) {
      setFormData({
        ...defaultFormState,
        settlementDate: new Date().toISOString().split('T')[0],
        finalSalaryAmount: parseFloat(initialSettlementData.earnedSalary) || 0,
        bonuses: parseFloat(initialSettlementData.bonuses) || 0,
        deductions: parseFloat(initialSettlementData.deductions) || 0,
      });
    }
  }, [isOpen, initialSettlementData]);

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
        settlementDate: new Date().toISOString().split('T')[0],
      };
      // Use a timeout to avoid setState during render
      setTimeout(() => {
        setFormData(newFormData);
        setFinalSalaryError("");
        setDeductionsError("");
        setBonusesError("");
      }, 0);
    }
  }, [isOpen]);

  if (!isOpen || !isMounted) return null;

  // Calculate total settlement
  const totalSettlement = formData.finalSalaryAmount + formData.bonuses - formData.deductions;
  const isNegativeSettlement = totalSettlement < 0;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate final salary
    if (formData.finalSalaryAmount <= 0) {
      setFinalSalaryError("يجب أن يكون الراتب النهائي أكبر من صفر");
      return;
    }
    
    // Validate deductions
    if (formData.deductions < 0) {
      setDeductionsError("لا يمكن أن تكون الخصومات سالبة");
      return;
    }
    
    // Validate bonuses
    if (formData.bonuses < 0) {
      setBonusesError("لا يمكن أن تكون المكافآت سالبة");
      return;
    }

    onConfirm(formData);
  };

  const handleFinalSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseArabicNumber(e.target.value);
    setFormData({ ...formData, finalSalaryAmount: value });
    
    if (finalSalaryError && value > 0) {
      setFinalSalaryError("");
    }
  };

  const handleDeductionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseArabicNumber(e.target.value);
    setFormData({ ...formData, deductions: value });
    
    if (deductionsError && value >= 0) {
      setDeductionsError("");
    }
  };

  const handleBonusesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseArabicNumber(e.target.value);
    setFormData({ ...formData, bonuses: value });
    
    if (bonusesError && value >= 0) {
      setBonusesError("");
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-[#101720]/80 backdrop-blur-md flex items-center justify-center z-999999 p-4 sm:p-6 transition-all duration-300" 
      dir="rtl"
    >
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 border border-white/5 outline-dashed outline-1 outline-blue-500/20 outline-offset-[-6px]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <DollarSign className="text-blue-500" size={24} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                التصفية المالية للموظف
              </h2>
              <p className="text-sm text-slate-400 font-semibold mt-0.5">
                {employee.name} ({employee.employeeId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-blue-400 bg-[#263544] p-2 rounded-xl shadow-sm border border-transparent hover:border-blue-400/30 transition-all hover:bg-blue-500/10 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="mx-6 mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <p className="text-blue-400 font-bold mb-1">معلومات التصفية المالية</p>
              <p className="text-slate-400 font-semibold">
                قم بإدخال الراتب النهائي والمكافآت والخصومات لحساب إجمالي التصفية المالية للموظف.
              </p>
            </div>
          </div>
        </div>

        {/* Employee Info */}
        <div className="mx-6 mt-4 p-4 bg-[#1a2530] border border-[#263544] rounded-xl">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500 font-semibold">القسم:</span>
              <span className="text-white font-bold mr-2">{employee.department || 'غير محدد'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold">الوظيفة:</span>
              <span className="text-white font-bold mr-2">{employee.jobTitle || employee.profession || 'غير محدد'}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6">
          <form id="settlementForm" onSubmit={handleFormSubmit} className="space-y-5">
            
            {/* Settlement Date */}
            <div>
              <label htmlFor="settlementDate" className="block text-sm font-bold text-blue-400 mb-2">
                تاريخ التصفية
              </label>
              <div className="relative group">
                <input
                  id="settlementDate"
                  type="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all text-white font-mono font-bold shadow-inner pr-11 scheme-dark"
                  value={formData.settlementDate}
                  onChange={(e) => setFormData({ ...formData, settlementDate: e.target.value })}
                />
                <Calendar className="absolute right-4 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
              </div>
            </div>

            {/* Financial Fields */}
            <div className="bg-[#1a2530] p-5 rounded-2xl border border-[#263544] shadow-inner space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Coins size={20} className="text-blue-500" />
                <span className="text-sm font-bold text-white">تفاصيل التصفية المالية</span>
              </div>

              {/* Final Salary */}
              <div>
                <label htmlFor="finalSalary" className="block text-sm font-bold text-blue-400 mb-2">
                  الراتب النهائي (ل.س) <span className="text-blue-500">*</span>
                </label>
                <div className="relative group">
                  <input
                    id="finalSalary"
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    className={`w-full p-3.5 bg-[#101720] border rounded-xl focus:ring-2 outline-none transition-all font-mono text-lg font-bold shadow-inner pr-11 placeholder:text-slate-600 ${
                      finalSalaryError 
                        ? 'border-rose-500 focus:ring-rose-500/30 focus:border-rose-500 text-rose-400' 
                        : 'border-[#263544] focus:ring-blue-500/30 focus:border-blue-500 text-blue-400'
                    }`}
                    value={formData.finalSalaryAmount || ''}
                    onChange={handleFinalSalaryChange}
                  />
                  <DollarSign className={`absolute right-4 top-3.5 transition-colors ${
                    finalSalaryError ? 'text-rose-500' : 'text-slate-500 group-focus-within:text-blue-500'
                  }`} size={20} />
                </div>
                {finalSalaryError && (
                  <p className="text-xs text-rose-400 font-bold mt-1.5">{finalSalaryError}</p>
                )}
              </div>

              {/* Bonuses */}
              <div>
                <label htmlFor="bonuses" className="block text-sm font-bold text-cyan-400 mb-2">
                  المكافآت (ل.س)
                </label>
                <div className="relative group">
                  <input
                    id="bonuses"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    className={`w-full p-3.5 bg-[#101720] border rounded-xl focus:ring-2 outline-none transition-all font-mono text-lg font-bold shadow-inner pr-11 placeholder:text-slate-600 ${
                      bonusesError 
                        ? 'border-cyan-500 focus:ring-cyan-500/30 focus:border-cyan-500 text-cyan-400' 
                        : 'border-[#263544] focus:ring-cyan-500/30 focus:border-cyan-500 text-cyan-400'
                    }`}
                    value={formData.bonuses || ''}
                    onChange={handleBonusesChange}
                  />
                  <TrendingUp className={`absolute right-4 top-3.5 transition-colors ${
                    bonusesError ? 'text-cyan-500' : 'text-slate-500 group-focus-within:text-cyan-500'
                  }`} size={20} />
                </div>
                {bonusesError && (
                  <p className="text-xs text-cyan-400 font-bold mt-1.5">{bonusesError}</p>
                )}
              </div>

              {/* Deductions */}
              <div>
                <label htmlFor="deductions" className="block text-sm font-bold text-rose-400 mb-2">
                  الخصومات (ل.س)
                </label>
                <div className="relative group">
                  <input
                    id="deductions"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    className={`w-full p-3.5 bg-[#101720] border rounded-xl focus:ring-2 outline-none transition-all font-mono text-lg font-bold shadow-inner pr-11 placeholder:text-slate-600 ${
                      deductionsError 
                        ? 'border-rose-500 focus:ring-rose-500/30 focus:border-rose-500 text-rose-400' 
                        : 'border-[#263544] focus:ring-rose-500/30 focus:border-rose-500 text-rose-400'
                    }`}
                    value={formData.deductions || ''}
                    onChange={handleDeductionsChange}
                  />
                  <TrendingDown className={`absolute right-4 top-3.5 transition-colors ${
                    deductionsError ? 'text-rose-500' : 'text-slate-500 group-focus-within:text-rose-500'
                  }`} size={20} />
                </div>
                {deductionsError && (
                  <p className="text-xs text-rose-400 font-bold mt-1.5">{deductionsError}</p>
                )}
              </div>

              {/* Calculation Breakdown */}
              <div className="pt-4 border-t border-white/5 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-semibold">الراتب النهائي:</span>
                  <span className="text-blue-400 font-mono font-bold">
                    {formData.finalSalaryAmount.toLocaleString('ar-SY')} ل.س
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-semibold">+ المكافآت:</span>
                  <span className="text-cyan-400 font-mono font-bold">
                    {formData.bonuses.toLocaleString('ar-SY')} ل.س
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-semibold">- الخصومات:</span>
                  <span className="text-rose-400 font-mono font-bold">
                    {formData.deductions.toLocaleString('ar-SY')} ل.س
                  </span>
                </div>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold text-base">إجمالي التصفية:</span>
                  <span className={`font-mono font-black text-xl ${
                    isNegativeSettlement ? 'text-rose-500' : 'text-emerald-400'
                  }`}>
                    {totalSettlement.toLocaleString('ar-SY')} ل.س
                  </span>
                </div>
              </div>

              {/* Negative Settlement Warning */}
              {isNegativeSettlement && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                  <p className="text-xs text-rose-400 font-bold">
                    ⚠️ تحذير: إجمالي التصفية سالب - الموظف مدين للشركة
                  </p>
                </div>
              )}
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
                  placeholder="أي ملاحظات إضافية حول التصفية المالية..."
                  className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all text-white font-bold shadow-inner pr-11 placeholder:text-slate-500 resize-none"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
                <MessageSquare className="absolute right-4 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-1.5">
                {formData.notes?.length || 0}/1000
              </p>
            </div>

          </form>
        </div>

        {/* Footer with Total */}
        <div className="p-5 sm:p-6 bg-[#1a2530]/80 border-t border-white/5 shrink-0 relative z-10">
          {/* Total Settlement Display */}
          <div className="mb-4 p-4 bg-[#101720] border border-blue-500/20 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold text-sm">إجمالي التصفية النهائي:</span>
              <span className={`font-mono font-black text-2xl ${
                isNegativeSettlement ? 'text-rose-500' : 'text-emerald-400'
              } drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]`}>
                {totalSettlement.toLocaleString('ar-SY')} ل.س
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
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
              form="settlementForm"
              disabled={isPending}
              className="bg-blue-500 text-white px-8 sm:px-10 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(59,130,246,0.3)] text-sm sm:text-base"
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <DollarSign size={20} />
                  تأكيد التصفية المالية
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
