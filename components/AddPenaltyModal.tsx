"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Calendar, Coins, FileText, Search, X } from "lucide-react";
import type { Employee } from "@/types/employee";

export type PenaltyPayload = {
  employeeId: string;
  category: string;
  amount: number;
  date: string;
  reason?: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PenaltyPayload) => void;
  isPending?: boolean;
  employees?: Employee[];
}

export default function AddPenaltyModal({ isOpen, onClose, onSave, isPending, employees = [] }: Props) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState({
    employeeId: "",
    category: "مطعم",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    reason: "",
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    return employees.filter((emp) =>
      (emp.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.employeeId || "").toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [employees, searchQuery]);

  if (!isOpen) return null;

  const handleSelectEmployee = (emp: Employee) => {
    setForm((prev) => ({ ...prev, employeeId: emp.employeeId || "" }));
    setSearchQuery(`${emp.employeeId} - ${emp.name}`);
    setIsDropdownOpen(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.employeeId) return alert("الرجاء اختيار الموظف");
    if (!form.amount || Number(form.amount) <= 0) return alert("الرجاء إدخال مبلغ صحيح");

    onSave({
      employeeId: form.employeeId,
      category: form.category,
      amount: Number(form.amount),
      date: form.date,
      reason: form.reason || undefined,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md transition-all duration-300" dir="rtl">
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(239,68,68,0.2)] w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col border border-white/10 outline-dashed outline-[#C89355]/30 -outline-offset-8">
        <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-rose-500/10 p-3 rounded-2xl border border-rose-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <AlertTriangle className="text-rose-400" size={28} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">إضافة عقوبة أو خصم</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-rose-400 bg-[#263544] p-2.5 rounded-2xl border border-transparent hover:border-rose-400/30 transition-all active:scale-90">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 p-8 sm:p-10 relative">
          <form id="penaltyForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
            <div className="md:col-span-2" ref={dropdownRef}>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">الموظف (الاسم أو الكود)</label>
              <div className="relative group">
                <input
                  type="text"
                  required
                  placeholder="اكتب للبحث عن موظف..."
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner pr-12 placeholder:text-slate-500"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                />
                <Search className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />

                {isDropdownOpen && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-full max-h-56 overflow-y-auto custom-scrollbar bg-[#1a2530] border border-[#263544] rounded-2xl shadow-2xl z-50 p-2">
                    {filteredEmployees.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 font-bold text-sm">لا يوجد موظف بهذا الاسم أو الكود</div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <div
                          key={emp.employeeId}
                          onClick={() => handleSelectEmployee(emp)}
                          className="flex items-center gap-3 p-3 hover:bg-[#263544] rounded-xl cursor-pointer transition-colors"
                        >
                          <div className="bg-[#101720] px-2 py-1 rounded text-xs font-mono font-bold text-[#C89355] border border-[#263544]">
                            {emp.employeeId}
                          </div>
                          <span className="font-bold text-white text-sm">{emp.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">نوع الخصم</label>
              <div className="relative group">
                <select
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold cursor-pointer pr-12 appearance-none"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                >
                  <option value="مطعم">مطعم</option>
                  <option value="ملابس">ملابس</option>
                  <option value="عقوبة">عقوبة</option>
                  <option value="خصم متنوع">خصم متنوع</option>
                </select>
                <AlertTriangle className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] pointer-events-none" size={22} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">تاريخ الإجراء</label>
              <div className="relative group">
                <input
                  type="date"
                  required
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 scheme-dark"
                  value={form.date}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                />
                <Calendar className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355]" size={22} />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black text-rose-500 mb-2 uppercase">المبلغ المخصوم (ل.س)</label>
              <div className="relative group">
                <input
                  type="number"
                  min={1}
                  required
                  placeholder="مثال: 50000"
                  className="w-full p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl focus:border-rose-500 outline-none text-rose-500 text-xl font-mono font-black pr-12 shadow-inner"
                  value={form.amount}
                  onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                />
                <Coins className="absolute right-4 top-4.5 text-rose-500/50 group-focus-within:text-rose-500" size={22} />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">ملاحظات (اختياري)</label>
              <div className="relative group">
                <textarea
                  rows={3}
                  placeholder="سبب الخصم أو تفاصيل إضافية..."
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold pr-12 resize-none placeholder:text-slate-600"
                  value={form.reason}
                  onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                />
                <FileText className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355]" size={22} />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 sm:p-8 bg-[#1a2530]/80 border-t border-white/5 flex justify-between shrink-0 relative z-10">
          <button type="button" onClick={onClose} className="px-8 py-3.5 rounded-2xl font-bold text-slate-400 bg-[#263544] hover:text-white transition-all active:scale-95">
            إلغاء
          </button>

          <button
            type="submit"
            form="penaltyForm"
            disabled={isPending}
            className="bg-rose-600 text-white px-10 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:bg-rose-700 active:scale-95 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] disabled:opacity-50"
          >
            حفظ الخصم
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
