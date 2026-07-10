"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Save, Search, Calendar, CheckSquare, Square, Users, ChevronLeft, Check, AlertCircle, Bus as BusIcon } from "lucide-react";
import type { BusData, Passenger } from "@/app/(dashboard)/Transportation/TransportationClient";
import type { Employee } from "@/types/employee";
import { useEmployees, useResignedEmployees } from "@/hooks/useEmployees";
import apiClient from "@/lib/api-client";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Passenger) => void;
  busData: BusData;
}

export default function AddPassengerModal({ isOpen, onClose, onSave, busData }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [subscriptionDate, setSubscriptionDate] = useState(new Date().toISOString().split('T')[0]);
  const [isClosing, setIsClosing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeSubscribers, setActiveSubscribers] = useState<Record<string, { route: string; plateNumber: string }>>({});

  // Focus trap and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsClosing(false);
      setTimeout(() => searchInputRef.current?.focus(), 100);
      // Fetch active subscribers to disable already-subscribed employees  
      apiClient.get("/transportation/active-subscribers")
        .then(res => setActiveSubscribers(res.data ?? {}))
        .catch(() => setActiveSubscribers({}));
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  const routeText = useMemo(() => busData?.route?.trim() || "", [busData]);
  
  // Use proper filtering pattern - same as rewards/discounts pages
  const { data: rawEmployees = [], isLoading } = useEmployees({ 
    limit: 200, 
    status: "active", 
    fetchAll: false 
  });
  const { data: resignedEmployees = [] } = useResignedEmployees();
  const resignedIds = useMemo(() => 
    new Set(resignedEmployees.map(e => e.employeeId)), 
    [resignedEmployees]
  );
  
  // Filter out resigned employees from available selections
  const allEmployees = useMemo(() => {
    const employees = Array.isArray(rawEmployees) ? rawEmployees : [];
    return employees.filter(emp => !resignedIds.has(emp.employeeId));
  }, [rawEmployees, resignedIds]);
  
  // Employees already subscribed to THIS bus
  const existingEmployeeIds = useMemo(
    () => new Set((busData.passengers || []).map((p: Passenger) => p.employeeId)),
    [busData.passengers]
  );

  // Employees subscribed to OTHER buses (cannot be added here)
  const subscribedElsewhere = useMemo(() => {
    const map = new Map<string, { route: string; plateNumber: string }>();
    for (const [empId, info] of Object.entries(activeSubscribers)) {
      if (!existingEmployeeIds.has(empId)) {
        map.set(empId, info);
      }
    }
    return map;
  }, [activeSubscribers, existingEmployeeIds]);

  // Normalization for matching
  const normalize = useCallback((s: string) => {
    if (!s) return "";
    return s
      .toLowerCase()
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
      .replace(/[إأآا]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ـ/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim();
  }, []);

  const { matchedEmployees, otherEmployees } = useMemo(() => {
    const normRoute = normalize(routeText);
    const matched: Employee[] = [];
    const others: Employee[] = [];

    for (const emp of allEmployees) {
      if (!emp || existingEmployeeIds.has(emp.employeeId)) continue;
      const residenceNorm = normalize(emp.residence || "");
      const isMatch = normRoute && residenceNorm && 
        (normRoute.includes(residenceNorm) || residenceNorm.includes(normRoute) || 
         residenceNorm.split(" ").some(token => normRoute.includes(token)));

      if (isMatch) matched.push(emp);
      else others.push(emp);
    }

    matched.sort((a, b) => {
      const aScore = normalize(a.residence || "").includes(normRoute) ? 0 : 1;
      const bScore = normalize(b.residence || "").includes(normRoute) ? 0 : 1;
      return aScore - bScore;
    });

    return {
      matchedEmployees: matched.slice(0, 50),
      otherEmployees: others.slice(0, 50),
    };
  }, [allEmployees, routeText, existingEmployeeIds, normalize]);

  // Live search filter
  const filterByQuery = useCallback((employees: Employee[]) => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.trim().toLowerCase();
    return employees.filter(emp =>
      emp.employeeId.toLowerCase().includes(q) || emp.name.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredMatched = useMemo(() => filterByQuery(matchedEmployees), [filterByQuery, matchedEmployees]);
  const filteredOthers = useMemo(() => filterByQuery(otherEmployees), [filterByQuery, otherEmployees]);

  const toggleSelect = (empId: string) => {
    if (subscribedElsewhere.has(empId)) return; // prevent selecting employees subscribed elsewhere
    if (resignedIds.has(empId)) return; // prevent selecting resigned employees
    setSelectedEmployeeIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(empId)) newSet.delete(empId);
      else newSet.add(empId);
      return newSet;
    });
  };

  const selectAll = (employees: Employee[]) => {
    setSelectedEmployeeIds(prev => {
      const newSet = new Set(prev);
      employees.forEach(emp => {
        if (!subscribedElsewhere.has(emp.employeeId) && !resignedIds.has(emp.employeeId)) {
          newSet.add(emp.employeeId);
        }
      });
      return newSet;
    });
  };

  const deselectAll = (employees: Employee[]) => {
    setSelectedEmployeeIds(prev => {
      const newSet = new Set(prev);
      employees.forEach(emp => newSet.delete(emp.employeeId));
      return newSet;
    });
  };

  const clearAllSelections = () => setSelectedEmployeeIds(new Set());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployeeIds.size === 0) {
      alert("الرجاء تحديد موظف واحد أو أكثر.");
      return;
    }
    if (!subscriptionDate) {
      alert("الرجاء إدخال تاريخ الاشتراك.");
      return;
    }

    for (const empId of selectedEmployeeIds) {
      const employee = allEmployees.find(emp => emp.employeeId === empId);
      if (!employee) continue;
      const generatedId = `${busData.id}-${empId}-${Date.now()}-${Math.random()}`;
      onSave({
        id: generatedId,
        employeeId: employee.employeeId,
        name: employee.name,
        subscriptionDate,
      });
    }

    // Reset and close with animation
    setIsClosing(true);
    setTimeout(() => {
      setSelectedEmployeeIds(new Set());
      setSearchQuery("");
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen && !isClosing) onClose();
  }, [isOpen, onClose, isClosing]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  if (!isOpen && !isClosing) return null;
  if (typeof document === "undefined") return null;

  // Render employee list with checkboxes
  const renderEmployeeList = (employees: Employee[], title: string, variant: 'matched' | 'other') => {
    if (employees.length === 0) return null;
    return (
      <div className="animate-fadeInUp" style={{ animationDelay: variant === 'matched' ? '0.05s' : '0.1s' }}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            {variant === 'matched' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-glow"></span>
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {title}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => selectAll(employees)}
              className="text-[11px] font-medium bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5"
            >
              <CheckSquare size={12} /> الكل
            </button>
            <button
              type="button"
              onClick={() => deselectAll(employees)}
              className="text-[11px] font-medium bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5"
            >
              <Square size={12} /> إلغاء
            </button>
          </div>
        </div>
        <div className="bg-[#0a0f15]/60 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
          {employees.map((emp, idx) => {
            const isSubscribedElsewhere = subscribedElsewhere.has(emp.employeeId);
            const subInfo = subscribedElsewhere.get(emp.employeeId);
            const isResignedButExisting = resignedIds.has(emp.employeeId);
            
            return (
            <label
              key={emp.employeeId}
              className={`flex items-center justify-between px-4 py-3 transition-all duration-150 group ${
                isSubscribedElsewhere
                  ? 'opacity-60 cursor-not-allowed bg-rose-500/5'
                  : isResignedButExisting
                    ? 'opacity-70 cursor-not-allowed bg-amber-500/5'
                    : selectedEmployeeIds.has(emp.employeeId)
                      ? 'cursor-pointer bg-[#C89355]/5 hover:bg-white/5'
                      : 'cursor-pointer hover:bg-white/5'
              }`}
              style={{ animationDelay: `${idx * 0.01}s` }}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={selectedEmployeeIds.has(emp.employeeId)}
                    disabled={isSubscribedElsewhere || isResignedButExisting}
                    onChange={() => toggleSelect(emp.employeeId)}
                    className="w-5 h-5 rounded-md border-2 border-slate-500 bg-transparent checked:bg-[#C89355] checked:border-[#C89355] focus:ring-2 focus:ring-[#C89355]/50 focus:ring-offset-0 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {selectedEmployeeIds.has(emp.employeeId) && (
                    <Check className="absolute top-0.5 right-0.5 w-3 h-3 text-white pointer-events-none" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-mono text-sm font-bold text-white tracking-wide">{emp.employeeId}</span>
                    <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
                      {emp.residence || 'بدون سكن'}
                    </span>
                    {isSubscribedElsewhere && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                        <BusIcon size={10} />
                        مشترك بباص &ldquo;{subInfo?.route}&rdquo; ({subInfo?.plateNumber})
                      </span>
                    )}
                    {isResignedButExisting && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        <AlertCircle size={10} />
                        موظف مستقيل - لا يمكن إضافته
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-300 mt-0.5 group-hover:text-white transition-colors">
                    {emp.name}
                  </div>
                </div>
              </div>
              {!isSubscribedElsewhere && !isResignedButExisting && (
                <ChevronLeft size={16} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-all" />
              )}
            </label>
            );
          })}
        </div>
      </div>
    );
  };

  return createPortal(
    <div 
      className={`fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ${
        isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md'
      }`}
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      dir="rtl"
    >
      <div 
        className={`bg-gradient-to-br from-[#0f1720] to-[#0a0f15] rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-white/10 transition-all duration-300 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Header with enhanced gradient and glow */}
        <div className="relative p-6 border-b border-white/10 bg-gradient-to-r from-[#1a2530]/80 to-[#0f1720]/80">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C89355] via-amber-500 to-[#C89355]"></div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-[#C89355]/20 rounded-2xl blur-lg"></div>
                <div className="relative bg-gradient-to-br from-[#C89355]/20 to-[#C89355]/5 p-3 rounded-2xl border border-[#C89355]/30">
                  <Users className="text-[#C89355]" size={26} />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-black bg-gradient-to-l from-white to-slate-300 bg-clip-text text-transparent">
                  تسجيل موظفين بالرحلة
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[#C89355] font-bold bg-[#C89355]/10 px-2 py-0.5 rounded-full">
                    {busData.route}
                  </span>
                  {selectedEmployeeIds.size > 0 && (
                    <span className="text-xs text-slate-400">
                      • تم اختيار <span className="text-[#C89355] font-bold">{selectedEmployeeIds.size}</span> موظف
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#C89355]/50"
              aria-label="إغلاق"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <form id="passengerForm" onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {/* Search Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black text-[#C89355] uppercase tracking-wider">
                <Search size={14} /> البحث عن موظف
              </label>
              <div className="relative group">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="اكتب كود الموظف أو اسمه..."
                  className="w-full p-4 bg-[#1a2530] border-2 border-transparent rounded-xl focus:border-[#C89355]/60 outline-none text-white font-medium placeholder:text-slate-500 transition-all pr-12 focus:bg-[#1e2a36]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={20} />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Employee Lists */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-2 border-[#C89355]/30 border-t-[#C89355] rounded-full animate-spin"></div>
                <p className="text-slate-400 text-sm">جاري تحميل الموظفين...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredMatched.length > 0 && renderEmployeeList(filteredMatched, `✨ مطابقون للرحلة (${routeText || 'بدون مسار'})`, 'matched')}
                {filteredOthers.length > 0 && renderEmployeeList(filteredOthers, 'جميع الموظفين الآخرين', 'other')}
                {filteredMatched.length === 0 && filteredOthers.length === 0 && (
                  <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    {searchQuery ? (
                      <>
                        <AlertCircle className="mx-auto text-slate-500 mb-2" size={32} />
                        <p className="text-slate-400">لا توجد نتائج مطابقة لـ &ldquo;{searchQuery}&rdquo;</p>
                      </>
                    ) : (
                      <>
                        <Users className="mx-auto text-slate-600 mb-2" size={32} />
                        <p className="text-slate-400">لا يوجد موظفون متاحون للإضافة</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Subscription Date */}
            <div className="bg-gradient-to-br from-[#1a2530]/50 to-[#0f1720]/50 rounded-2xl border border-white/10 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#C89355]" />
                <label className="text-sm font-bold text-white">تاريخ الاشتراك الموحد</label>
              </div>
              <div className="relative">
                <input
                  type="date"
                  required
                  className="w-full p-3 bg-[#101720] border border-white/10 rounded-xl focus:border-[#C89355]/60 outline-none text-white font-mono text-base font-medium cursor-pointer transition-all"
                  value={subscriptionDate}
                  onChange={(e) => setSubscriptionDate(e.target.value)}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                سيتم تطبيق هذا التاريخ على جميع الموظفين المحددين
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-[#0a0f15]/80 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full">
                <span className="text-xs text-slate-400">المحددون</span>
                <span className="text-[#C89355] font-black text-lg">{selectedEmployeeIds.size}</span>
              </div>
              {selectedEmployeeIds.size > 0 && (
                <button
                  type="button"
                  onClick={clearAllSelections}
                  className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <X size={12} /> إلغاء الكل
                </button>
              )}
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold border border-white/10 hover:bg-white/5 transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                form="passengerForm"
                className="flex-1 sm:flex-none bg-gradient-to-r from-[#C89355] to-[#d4a373] text-[#101720] px-8 py-3 rounded-xl font-black flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[#C89355]/20 active:scale-95 transition-all"
              >
                <Save size={18} /> تأكيد الاشتراك
              </button>
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a2530;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #C89355;
          border-radius: 10px;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>,
    document.body
  );
}