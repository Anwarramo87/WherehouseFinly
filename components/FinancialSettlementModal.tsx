"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, DollarSign, Calendar, MessageSquare, TrendingUp, TrendingDown, Coins, Info, User } from "lucide-react";
import apiClient from "@/lib/api-client";
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
  employeeId?: string;
  initialSettlementDate?: string;
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
  employeeId,
  initialSettlementDate,
}: Props) {
const isMounted = typeof document !== "undefined";
  const [formData, setFormData] = useState<SettlementData>(() => ({
    ...defaultFormState,
    settlementDate: initialSettlementDate || defaultFormState.settlementDate,
  }));
  const [isLoadingSalary, setIsLoadingSalary] = useState(false);
  const [isLoadingExtras, setIsLoadingExtras] = useState(false);
  const [finalSalaryError, setFinalSalaryError] = useState("");
  const [deductionsError, setDeductionsError] = useState("");
  const [bonusesError, setBonusesError] = useState("");

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

// Reset error state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setFinalSalaryError("");
        setDeductionsError("");
        setBonusesError("");
      }, 0);
    }
  }, [isOpen]);

  // Fetch provisional settlement from API (re-fetches on date change)
  useEffect(() => {
    // نعتمد على id الموظف من الكائن نفسه لتجنب فخ الـ prop المفقود
    const currentEmployeeId = employee?.employeeId || employeeId;
    
    if (!isOpen || !currentEmployeeId) return;

    const controller = new AbortController();
    const fetchSettlement = async () => {
      console.log('[FinancialSettlementModal] Fetching for employeeId:', currentEmployeeId, 'date:', formData.settlementDate);
      setIsLoadingSalary(true);
      setIsLoadingExtras(true);
      
      try {
        const res = await apiClient.get('/payroll/provisional-settlement', {
          params: {
            employeeId: currentEmployeeId,
            terminationDate: new Date(formData.settlementDate + 'T00:00:00.000Z').toISOString(),
          },
          signal: controller.signal,
        });

        console.log('[FinancialSettlementModal] API response:', JSON.stringify(res.data));

        // اختراق تغليف NestJS: إذا كانت البيانات داخل data.data نستخرجها، وإلا نأخذها مباشرة
        const payload = res.data?.data || res.data || {};
        
        console.log('[FinancialSettlementModal] Payload:', JSON.stringify(payload));

        // دعم لعدة مسميات محتملة من الباك إند (earnedSalary أو finalSalaryAmount)
        const earned = parseFloat(String(payload.earnedSalary ?? payload.finalSalaryAmount ?? 0)) || 0;
        const bonuses = parseFloat(String(payload.bonuses ?? 0)) || 0;
        const deductions = parseFloat(String(payload.deductions ?? 0)) || 0;

        console.log('[FinancialSettlementModal] Parsed values:', { earned, bonuses, deductions });

        setFormData(prev => ({ 
          ...prev, 
          finalSalaryAmount: earned,
          bonuses: bonuses,
          deductions: deductions
        }));

      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'CanceledError' || (err as { name?: string })?.name === 'AbortError') return;
        const axiosErr = err as { response?: { status?: number; data?: unknown }; config?: { url?: string }; message?: string };
        console.warn('[FinancialSettlementModal] Fetch failed:', 
          `url=${axiosErr.config?.url}`,
          `status=${axiosErr.response?.status}`,
          `data=`, axiosErr.response?.data,
          `msg=${axiosErr.message}`);
      } finally {
        setIsLoadingSalary(false);
        setIsLoadingExtras(false);
      }
    };

    fetchSettlement();
    return () => controller.abort();
  }, [isOpen, employee?.employeeId, employeeId, formData.settlementDate]);

  if (!isOpen || !isMounted) return null;

  // Calculate total settlement
  const totalSettlement = Math.round((formData.finalSalaryAmount + formData.bonuses - formData.deductions) / 1000) * 1000;
  const isNegativeSettlement = totalSettlement < 0;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.finalSalaryAmount <= 0) {
      setFinalSalaryError("يجب أن يكون الراتب المقبوض أكبر من صفر");
      return;
    }
    if (formData.deductions < 0) {
      setDeductionsError("لا يمكن أن تكون الخصومات سالبة");
      return;
    }
    if (formData.bonuses < 0) {
      setBonusesError("لا يمكن أن تكون المكافآت سالبة");
      return;
    }
    onConfirm(formData);
  };

  const handleFinalSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseArabicNumber(e.target.value);
    setFormData({ ...formData, finalSalaryAmount: value });
    if (finalSalaryError && value > 0) setFinalSalaryError("");
  };

  const handleDeductionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseArabicNumber(e.target.value);
    setFormData({ ...formData, deductions: value });
    if (deductionsError && value >= 0) setDeductionsError("");
  };

  const handleBonusesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseArabicNumber(e.target.value);
    setFormData({ ...formData, bonuses: value });
    if (bonusesError && value >= 0) setBonusesError("");
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[999999] p-3 sm:p-6 transition-all duration-200" 
      dir="rtl"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#101720] rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-white/[0.06]">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/[0.06] flex justify-between items-center bg-[#1a2530]/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20 shrink-0">
              <DollarSign className="text-blue-400" size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white truncate">التصفية المالية</h2>
              <p className="text-xs sm:text-sm text-slate-400 font-semibold truncate">
                {employee.name} <span className="text-slate-500">({employee.employeeId})</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all active:scale-95 shrink-0 mr-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — single scrollable area */}
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-4">
          <form id="settlementForm" onSubmit={handleFormSubmit} className="space-y-4">

            {/* Employee quick info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-semibold px-1">
              <span className="flex items-center gap-1"><User size={13} className="text-slate-500" />{employee.department || '—'}</span>
              <span className="text-slate-600">|</span>
              <span>{employee.jobTitle || employee.profession || '—'}</span>
            </div>

            {/* Settlement Date */}
            <div>
              <label htmlFor="settlementDate" className="block text-xs font-bold text-slate-400 mb-1.5">
                تاريخ التصفية
              </label>
              <div className="relative">
                <input
                  id="settlementDate"
                  type="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 bg-[#1a2530] border border-white/[0.06] rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none transition-all text-white font-mono text-sm font-bold pr-10 scheme-dark"
                  value={formData.settlementDate}
                  onChange={(e) => setFormData({ ...formData, settlementDate: e.target.value })}
                />
                <Calendar className="absolute right-3 top-2.5 text-slate-500" size={18} />
              </div>
            </div>

            {/* Financial Fields */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Coins size={15} className="text-blue-400" />
                <span className="text-xs font-bold text-slate-300">البيانات المالية</span>
              </div>

              {/* Earned Salary */}
              <div>
                <label htmlFor="finalSalary" className="flex items-center justify-between text-xs font-bold text-blue-400 mb-1.5">
                  <span>الراتب المستحق</span>
                  {isLoadingSalary && <Loader2 className="animate-spin text-slate-500" size={13} />}
                </label>
                <div className="relative">
                  <input
                    id="finalSalary"
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    className={`w-full px-3 py-2.5 bg-[#0d1319] border rounded-xl focus:ring-2 outline-none transition-all font-mono text-base font-bold pr-10 placeholder:text-slate-600 ${
                      finalSalaryError 
                        ? 'border-rose-500/60 focus:ring-rose-500/30 text-rose-400' 
                        : 'border-white/[0.06] focus:ring-blue-500/30 focus:border-blue-500/50 text-blue-400'
                    }`}
                    value={isLoadingSalary ? '' : (formData.finalSalaryAmount || '')}
                    placeholder={isLoadingSalary ? '...' : '0.00'}
                    onChange={handleFinalSalaryChange}
                  />
                  <DollarSign className="absolute right-3 top-2.5 text-slate-600" size={18} />
                </div>
                {finalSalaryError && <p className="text-[11px] text-rose-400 font-bold mt-1">{finalSalaryError}</p>}
              </div>

              {/* Bonuses + Deductions side by side on sm+ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Bonuses */}
                <div>
                  <label htmlFor="bonuses" className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-1.5">
                    <span className="flex items-center gap-1"><TrendingUp size={13} />المكافآت</span>
                    {isLoadingExtras && <Loader2 className="animate-spin text-slate-500" size={13} />}
                  </label>
                  <input
                    id="bonuses"
                    type="number"
                    min={0}
                    step="0.01"
                    className={`w-full px-3 py-2.5 bg-[#0d1319] border rounded-xl focus:ring-2 outline-none transition-all font-mono text-base font-bold placeholder:text-slate-600 ${
                      bonusesError 
                        ? 'border-rose-500/60 focus:ring-rose-500/30 text-rose-400' 
                        : 'border-white/[0.06] focus:ring-emerald-500/30 focus:border-emerald-500/50 text-emerald-400'
                    }`}
                    value={isLoadingExtras ? '' : (formData.bonuses || '')}
                    placeholder="0.00"
                    onChange={handleBonusesChange}
                  />
                  {bonusesError && <p className="text-[11px] text-rose-400 font-bold mt-1">{bonusesError}</p>}
                </div>

                {/* Deductions */}
                <div>
                  <label htmlFor="deductions" className="flex items-center justify-between text-xs font-bold text-rose-400 mb-1.5">
                    <span className="flex items-center gap-1"><TrendingDown size={13} />الخصومات</span>
                    {isLoadingExtras && <Loader2 className="animate-spin text-slate-500" size={13} />}
                  </label>
                  <input
                    id="deductions"
                    type="number"
                    min={0}
                    step="0.01"
                    className={`w-full px-3 py-2.5 bg-[#0d1319] border rounded-xl focus:ring-2 outline-none transition-all font-mono text-base font-bold placeholder:text-slate-600 ${
                      deductionsError 
                        ? 'border-rose-500/60 focus:ring-rose-500/30 text-rose-400' 
                        : 'border-white/[0.06] focus:ring-rose-500/30 focus:border-rose-500/50 text-rose-400'
                    }`}
                    value={isLoadingExtras ? '' : (formData.deductions || '')}
                    placeholder="0.00"
                    onChange={handleDeductionsChange}
                  />
                  {deductionsError && <p className="text-[11px] text-rose-400 font-bold mt-1">{deductionsError}</p>}
                </div>
              </div>
            </div>

            {/* Total — single prominent display */}
            <div className="bg-gradient-to-l from-emerald-500/[0.07] to-transparent border border-emerald-500/15 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-300">الصافي المستحق</span>
                {(isLoadingSalary || isLoadingExtras) ? (
                  <span className="inline-flex items-center gap-1.5 text-slate-500 text-sm"><Loader2 className="animate-spin" size={15} />حساب...</span>
                ) : (
                  <span className={`font-mono font-black text-xl sm:text-2xl ${
                    isNegativeSettlement ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {totalSettlement.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    <span className="text-xs font-bold text-slate-500 mr-1">ل.س</span>
                  </span>
                )}
              </div>
              {isNegativeSettlement && (
                <p className="text-[11px] text-rose-400 font-bold mt-1.5 flex items-center gap-1">
                  <Info size={13} />الموظف مدين للشركة
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">ملاحظات (اختياري)</label>
              <div className="relative">
                <textarea
                  rows={2}
                  maxLength={1000}
                  placeholder="ملاحظات حول التصفية..."
                  className="w-full px-3 py-2.5 bg-[#1a2530] border border-white/[0.06] rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none transition-all text-white text-sm font-semibold pr-10 placeholder:text-slate-600 resize-none"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
                <MessageSquare className="absolute right-3 top-2.5 text-slate-600" size={16} />
              </div>
              <p className="text-[10px] text-slate-600 font-semibold mt-1 text-left">
                {formData.notes?.length || 0}/1000
              </p>
            </div>

          </form>
        </div>

        {/* Footer — compact action bar */}
        <div className="px-4 sm:px-6 py-3 bg-[#1a2530]/60 border-t border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 sm:flex-none py-2.5 rounded-xl font-bold text-sm text-slate-300 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              form="settlementForm"
              disabled={isPending || isLoadingSalary || isLoadingExtras}
              className="flex-[2] sm:flex-none sm:px-8 py-2.5 rounded-xl font-black text-sm bg-blue-500 text-white flex items-center justify-center gap-2 hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-blue-500/20"
            >
              {(isLoadingSalary || isLoadingExtras) ? (
                <><Loader2 className="animate-spin" size={18} />جاري الجلب...</>
              ) : isPending ? (
                <><Loader2 className="animate-spin" size={18} />جاري المعالجة...</>
              ) : (
                <><DollarSign size={18} />تأكيد التصفية</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}