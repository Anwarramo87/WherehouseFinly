"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X, CalendarDays, FileText, Save, CheckSquare, Square,
  Loader2, Check, Search, Info, Plus
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { Employee } from "@/types/employee";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
}

// â”€â”€â”€ ØªØ¹Ø±ÙŠÙ Ø£Ù†ÙˆØ§Ø¹ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø§Øª Ù…Ø¹ Ø®ØµØ§Ø¦ØµÙ‡Ø§ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface LeaveTypeConfig {
  label: string;
  backendType: string;
  isPaidDefault: boolean;
  isPaidLocked: boolean;
  lockedNote?: string;
  isHourly?: boolean;
}

const LEAVE_TYPES: LeaveTypeConfig[] = [
  {
    label: "Ø¥Ø¬Ø§Ø²Ø© Ù…Ø±Ø¶ÙŠØ©",
    backendType: "SICK",
    isPaidDefault: true,
    isPaidLocked: true,
    lockedNote: "Ø§Ù„Ø¥Ø¬Ø§Ø²Ø© Ø§Ù„Ù…Ø±Ø¶ÙŠØ© Ù…Ø£Ø¬ÙˆØ±Ø© Ø¨Ù†Ø³Ø¨Ø© 50% â€” ÙŠÙØ­Ø³Ø¨ Ø§Ù„Ø®ØµÙ… ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¹Ù†Ø¯ Ø§Ø­ØªØ³Ø§Ø¨ Ø§Ù„Ø±Ø§ØªØ¨",
  },
  {
    label: "Ø¥Ø¬Ø§Ø²Ø© Ø¥Ø¯Ø§Ø±ÙŠØ©",
    backendType: "ADMIN",
    isPaidDefault: true,
    isPaidLocked: true,
    lockedNote: "Ø§Ù„Ø¥Ø¬Ø§Ø²Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ© Ù…Ø£Ø¬ÙˆØ±Ø© Ø¨Ø§Ù„ÙƒØ§Ù…Ù„",
  },
  {
    label: "Ø¥Ø¬Ø§Ø²Ø© ÙˆÙØ§Ø©",
    backendType: "DEATH",
    isPaidDefault: true,
    isPaidLocked: true,
    lockedNote: "Ø¥Ø¬Ø§Ø²Ø© Ø§Ù„ÙˆÙØ§Ø© Ù…Ø£Ø¬ÙˆØ±Ø© Ø¨Ø§Ù„ÙƒØ§Ù…Ù„",
  },
  {
    label: "Ø¥Ø¬Ø§Ø²Ø© Ø¨Ø¯ÙˆÙ† Ø£Ø¬Ø±",
    backendType: "UNPAID",
    isPaidDefault: false,
    isPaidLocked: true,
    lockedNote: "Ø¥Ø¬Ø§Ø²Ø© Ø¨Ø¯ÙˆÙ† Ø£Ø¬Ø± â€” ÙŠÙØ®ØµÙ… Ø§Ù„ÙŠÙˆÙ… ÙƒØ§Ù…Ù„Ø§Ù‹ Ø¹Ù†Ø¯ Ø§Ø­ØªØ³Ø§Ø¨ Ø§Ù„Ø±Ø§ØªØ¨",
  },
  {
    label: "Ø¥Ø¬Ø§Ø²Ø© Ø³Ø§Ø¹ÙŠØ©",
    backendType: "OTHER",
    isPaidDefault: true,
    isPaidLocked: false,
    isHourly: true,
  },
  {
    label: "Ø£Ø®Ø±Ù‰",
    backendType: "OTHER",
    isPaidDefault: false,
    isPaidLocked: false,
  },
];

const buildDefaultForm = () => ({
  employeeIds: [] as string[],
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date().toISOString().split("T")[0],
  leaveTypeLabel: "Ø¥Ø¬Ø§Ø²Ø© Ù…Ø±Ø¶ÙŠØ©",
  customReason: "",
  isPaid: true,
  startTime: "08:00",
  endTime: "10:00",
});

function LeaveRequestModalContent({ isOpen, onClose, employees }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(buildDefaultForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Ø­Ø§Ù„Ø© Ø¬Ø¯ÙŠØ¯Ø© Ù„Ù„ØªØ­ÙƒÙ… Ø¨Ø¸Ù‡ÙˆØ± Ø­Ù‚Ù„ "Ø¥Ù„Ù‰ ØªØ§Ø±ÙŠØ®"
  const [isMultiDay, setIsMultiDay] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const currentConfig = useMemo(
    () => LEAVE_TYPES.find((t) => t.label === form.leaveTypeLabel) ?? LEAVE_TYPES[0],
    [form.leaveTypeLabel]
  );

  const isHourlyLeave = !!currentConfig.isHourly;
  const isAllSelected = employees.length > 0 && form.employeeIds.length === employees.length;

  const handleLeaveTypeChange = (label: string) => {
    const config = LEAVE_TYPES.find((t) => t.label === label) ?? LEAVE_TYPES[0];
    setForm((prev) => ({ ...prev, leaveTypeLabel: label, isPaid: config.isPaidDefault }));
  };

  const filteredEmployees = useMemo(
    () =>
      employees.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [employees, searchQuery]
  );

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  if (!isOpen) return null;

  const handleSelectEmployee = (empId: string) => {
    setForm((prev) => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(empId)
        ? prev.employeeIds.filter((id) => id !== empId)
        : [...prev.employeeIds, empId],
    }));
    // Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© ÙˆÙ…Ø³Ø­ Ø§Ù„Ø¨Ø­Ø« ÙÙˆØ± Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø§Ø³Ù…
    setIsDropdownOpen(false);
    setSearchQuery("");
  };

  const handleSelectAll = () => {
    setForm((prev) => ({
      ...prev,
      // Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„ÙƒÙ„ Ù…Ø­Ø¯Ø¯Ø§Ù‹ â†’ Ø¥Ù„ØºØ§Ø¡ Ø§Ù„ÙƒÙ„ØŒ ÙˆØ¥Ù„Ø§ â†’ ØªØ­Ø¯ÙŠØ¯ Ø§Ù„ÙƒÙ„
      employeeIds: isAllSelected ? [] : employees.map((e) => e.employeeId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (form.employeeIds.length === 0) {
      toast.error("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ù…ÙˆØ¸Ù ÙˆØ§Ø­Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„");
      return;
    }
    if (!isHourlyLeave && form.startDate > form.endDate) {
      toast.error("ØªØ§Ø±ÙŠØ® Ø§Ù„Ù†Ù‡Ø§ÙŠØ© ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø¨Ø¹Ø¯ Ø£Ùˆ ÙŠØ³Ø§ÙˆÙŠ ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©");
      return;
    }
    if (isHourlyLeave && form.startTime >= form.endTime) {
      toast.error("ÙˆÙ‚Øª Ù†Ù‡Ø§ÙŠØ© Ø§Ù„Ø¥Ø¬Ø§Ø²Ø© Ø§Ù„Ø³Ø§Ø¹ÙŠØ© ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø¨Ø¹Ø¯ ÙˆÙ‚Øª Ø§Ù„Ø¨Ø¯Ø¡");
      return;
    }
    if (form.leaveTypeLabel === "Ø£Ø®Ø±Ù‰" && !form.customReason.trim()) {
      toast.error("Ø§Ù„Ø±Ø¬Ø§Ø¡ ÙƒØªØ§Ø¨Ø© Ø³Ø¨Ø¨ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø©");
      return;
    }

    setIsSubmitting(true);

    const reason =
      form.leaveTypeLabel === "Ø£Ø®Ø±Ù‰"
        ? form.customReason
        : form.leaveTypeLabel;

    // Ø§Ù„Ù„ÙˆØ¬ÙŠÙƒ Ø¨Ù‚ÙŠ ÙƒÙ…Ø§ Ù‡Ùˆ Ø¯ÙˆÙ† Ø£ÙŠ ØªØºÙŠÙŠØ± Ù„ÙŠØ·Ø§Ø¨Ù‚ Ø§Ù„Ø¨Ø§Ùƒ Ø¥Ù†Ø¯
    const items = form.employeeIds.map((empId) => ({
      employeeId: empId,
      startDate: form.startDate,
      endDate: isHourlyLeave ? form.startDate : form.endDate,
      leaveType: currentConfig.backendType,
      isPaid: currentConfig.isPaidLocked ? currentConfig.isPaidDefault : form.isPaid,
      reason,
      status: "APPROVED",
      ...(isHourlyLeave ? {
        isHourly: true,
        startTime: form.startTime,
        endTime: form.endTime,
      } : {}),
    }));

    try {
      const res = await apiClient.post("/leaves/bulk", { items });
      const { succeeded, failed, results: bulkResults } = res.data as {
        succeeded: number;
        failed: number;
        results: Array<{ employeeId: string; success: boolean; error?: string }>;
      };

      if (failed === 0) {
        toast.success(
          items.length === 1
            ? "ØªÙ… Ø­ÙØ¸ Ø·Ù„Ø¨ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø© Ø¨Ù†Ø¬Ø§Ø­"
            : `ØªÙ… Ø­ÙØ¸ ${succeeded} Ø·Ù„Ø¨ Ø¥Ø¬Ø§Ø²Ø© Ø¨Ù†Ø¬Ø§Ø­`
        );
        void queryClient.invalidateQueries({ queryKey: ["leaves"], exact: false });
        void queryClient.invalidateQueries({ queryKey: ["employeeMonthlyLeaves"], exact: false });
        setForm(buildDefaultForm());
        setIsMultiDay(false); // Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† Ø­Ø§Ù„Ø© Ø§Ù„Ø£ÙŠØ§Ù…
        onClose();
      } else {
        if (succeeded > 0) toast.success(`Ù†Ø¬Ø­ ${succeeded} Ø·Ù„Ø¨`);
        const firstFailed = bulkResults.find((r) => !r.success);
        toast.error(`ÙØ´Ù„ ${failed} Ø·Ù„Ø¨: ${firstFailed?.error ?? "Ø®Ø·Ø£ ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ"}`);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string | string[]; error?: { message?: string } } } };
      const status = axiosErr?.response?.status;
      const msg = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error?.message;

      if (status === 404) {
        toast.error("Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…: Ù…Ø³Ø§Ø± Ø§Ù„Ø¥Ø¬Ø§Ø²Ø§Øª ØºÙŠØ± Ù…ÙØ¹Ù‘Ù„. ØªÙˆØ§ØµÙ„ Ù…Ø¹ Ø§Ù„Ù…Ø®ØªØµ Ø§Ù„ØªÙ‚Ù†ÙŠ.");
      } else if (status === 403) {
        toast.error("Ù„ÙŠØ³ Ù„Ø¯ÙŠÙƒ ØµÙ„Ø§Ø­ÙŠØ© Ù„Ø¥Ù†Ø´Ø§Ø¡ Ø·Ù„Ø¨Ø§Øª Ø¥Ø¬Ø§Ø²Ø©.");
      } else if (status === 400) {
        // Ø¹Ø±Ø¶ Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ø®Ø·Ø£ Ù…Ù† Ø§Ù„Ø¨Ø§Ùƒ Ø¥Ù†Ø¯ Ø¨Ø´ÙƒÙ„ ÙˆØ§Ø¶Ø­ ÙˆÙ„Ø·ÙŠÙ
        const errorMessage = Array.isArray(msg) ? msg.join("\n") : (msg ?? "ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª");
        
        // Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø§Ù„Ø±Ø³Ø§Ù„Ø© ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ ÙƒÙ„Ù…Ø© "ØªØ¯Ø§Ø®Ù„" Ù†Ø¹Ø±Ø¶ Ø±Ø³Ø§Ù„Ø© Ø£ÙƒØ«Ø± ÙˆØ¯ÙŠØ©
        if (typeof errorMessage === 'string' && errorMessage.includes('ØªØ¯Ø§Ø®Ù„')) {
          toast.error("âš ï¸ Ø§Ù„Ù…ÙˆØ¸Ù Ù„Ø¯ÙŠÙ‡ Ø¥Ø¬Ø§Ø²Ø© Ø¨Ø§Ù„ÙØ¹Ù„ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„ØªÙˆØ§Ø±ÙŠØ®. ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± ØªÙˆØ§Ø±ÙŠØ® Ù…Ø®ØªÙ„ÙØ©.", { duration: 5000 });
        } else {
          toast.error(errorMessage, { duration: 5000 });
        }
      } else if (status === 500) {
        toast.error(`Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…: ${typeof msg === 'string' ? msg : "Ø­Ø¯Ø« Ø®Ø·Ø£ ØºÙŠØ± Ù…ØªÙˆÙ‚Ø¹. ØªØ­Ù‚Ù‚ Ù…Ù† logs Ø§Ù„Ø¨Ø§Ùƒ Ø¥Ù†Ø¯."}`);
      } else {
        toast.error("ØªØ¹Ø°Ø± Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø®Ø§Ø¯Ù…. ØªØ£ÙƒØ¯ Ù…Ù† ØªØ´ØºÙŠÙ„ Ø§Ù„Ø¨Ø§Ùƒ Ø¥Ù†Ø¯.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md"
      dir="rtl"
    >
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(200,147,85,0.15)] w-full max-w-xl overflow-hidden flex flex-col border border-white/10 outline-dashed outline-1 outline-[#C89355]/30 -outline-offset-8 max-h-[95vh]">

        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-[#C89355]/10 p-3 rounded-2xl border border-[#C89355]/20 shadow-[0_0_20px_rgba(200,147,85,0.15)]">
              <FileText className="text-[#C89355]" size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¥Ø¬Ø§Ø²Ø§Øª ÙˆØ§Ù„Ø¹Ø·Ù„</h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                {form.employeeIds.length > 0
                  ? `${form.employeeIds.length} Ù…ÙˆØ¸Ù Ù…Ø­Ø¯Ø¯`
                  : "Ù„Ù… ÙŠØªÙ… ØªØ­Ø¯ÙŠØ¯ Ù…ÙˆØ¸ÙÙŠÙ† Ø¨Ø¹Ø¯"}
              </p>
            </div>
          </div>
          
          {/* Ø²Ø± Ø§Ù„Ø¥ØºÙ„Ø§Ù‚ Ù…Ø¹ ØªØ£Ø«ÙŠØ± Ø§Ù„Ø·Ø§Ø­ÙˆÙ†Ø© */}
          <button
            onClick={onClose}
            className="group text-slate-500 hover:text-rose-400 bg-[#263544] p-2.5 rounded-2xl border border-transparent hover:border-rose-400/30 transition-all active:scale-90"
          >
            <X size={24} className="transition-transform duration-500 group-hover:rotate-180" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 sm:p-8">
          <form id="leaveForm" onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 text-right">

            {/* â”€â”€ ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ† â”€â”€ */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-black text-[#C89355] uppercase">
                  Ø§Ù„Ù…ÙˆØ¸ÙÙˆÙ† Ø§Ù„Ù…Ø´Ù…ÙˆÙ„ÙˆÙ† Ø¨Ø§Ù„Ø·Ù„Ø¨
                </label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 group"
                >
                  <span className="text-[11px] font-black text-slate-400 group-hover:text-[#C89355] transition-colors select-none">
                    {isAllSelected ? "Ø¥Ù„ØºØ§Ø¡ ØªØ­Ø¯ÙŠØ¯ Ø§Ù„ÙƒÙ„" : "ØªØ­Ø¯ÙŠØ¯ Ø§Ù„ÙƒÙ„"}
                  </span>
                  <div className="text-[#C89355] transition-colors duration-300">
                    {isAllSelected
                      ? <CheckSquare size={16} />
                      : <Square size={16} className="text-slate-500 group-hover:text-[#C89355]" />
                    }
                  </div>
                </button>
              </div>

              <div className="relative" ref={dropdownRef}>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Ø§Ø¨Ø­Ø« Ø¹Ù† Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ¸Ù Ø£Ùˆ Ø§Ù„ÙƒÙˆØ¯..."
                    className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold shadow-inner pr-12 text-sm"
                    value={searchQuery}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                  />
                  <Search className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors pointer-events-none" size={20} />
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 max-h-48 overflow-y-auto bg-[#1a2530] border border-[#263544] rounded-2xl shadow-2xl p-2 custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
                    {employees.length === 0 ? (
                      <p className="p-4 text-xs text-center text-slate-500 font-bold">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ¸ÙÙˆÙ† ÙÙŠ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©</p>
                    ) : filteredEmployees.length === 0 ? (
                      <p className="p-4 text-xs text-center text-slate-500 font-bold">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬ Ù…Ø·Ø§Ø¨Ù‚Ø©</p>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const isSelected = form.employeeIds.includes(emp.employeeId);
                        return (
                          <div
                            key={emp.employeeId}
                            onClick={() => handleSelectEmployee(emp.employeeId)}
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer text-xs font-bold transition-all ${
                              isSelected
                                ? "bg-[#C89355]/20 text-[#C89355] border border-[#C89355]/30"
                                : "text-slate-300 hover:bg-white/5"
                            }`}
                          >
                            <span>
                              {emp.name}{" "}
                              <span className="font-mono text-[10px] text-slate-500">({emp.employeeId})</span>
                            </span>
                            {isSelected && <Check size={14} />}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Chips Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ† Ø§Ù„Ù…Ø­Ø¯Ø¯ÙŠÙ† */}
              {form.employeeIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 p-3 bg-[#161f29] rounded-2xl border border-white/5 max-h-28 overflow-y-auto custom-scrollbar">
                  {form.employeeIds.map((id) => {
                    const emp = employees.find((e) => e.employeeId === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black bg-[#1a2530] text-[#C89355] border border-[#C89355]/30 shadow-sm animate-in zoom-in-95"
                      >
                        {emp?.name || id}
                        <button
                          type="button"
                          onClick={() => handleSelectEmployee(id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 rounded-md hover:bg-rose-500/10 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* â”€â”€ Ù†ÙˆØ¹ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø© â”€â”€ */}
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">Ù†ÙˆØ¹ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø©</label>
              <div className="relative group">
                <select
                  required
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold shadow-inner pr-12 appearance-none cursor-pointer text-sm transition-all"
                  value={form.leaveTypeLabel}
                  onChange={(e) => handleLeaveTypeChange(e.target.value)}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.label} value={t.label}>{t.label}</option>
                  ))}
                </select>
                <FileText className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors pointer-events-none" size={22} />
              </div>
            </div>

            {/* â”€â”€ Ø­Ù‚ÙˆÙ„ Ø§Ù„ØªØ§Ø±ÙŠØ® Ø£Ùˆ Ø§Ù„Ø³Ø§Ø¹Ø§Øª â”€â”€ */}
            {!isHourlyLeave ? (
              <div className={`grid grid-cols-1 ${isMultiDay ? 'sm:grid-cols-2' : ''} gap-4 animate-in fade-in duration-300`}>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="block text-xs font-black text-[#C89355] uppercase">
                      {isMultiDay ? "Ù…Ù† ØªØ§Ø±ÙŠØ®" : "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¥Ø¬Ø§Ø²Ø©"}
                    </label>
                  </div>
                  <div className="relative group">
                    <input
                      type="date" required
                      className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 text-sm transition-all"
                      value={form.startDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setForm({ 
                          ...form, 
                          startDate: newDate,
                          // Ù…Ø²Ø§Ù…Ù†Ø© Ø­Ù‚Ù„ Ø¥Ù„Ù‰ ØªØ§Ø±ÙŠØ® ÙÙŠ Ø­Ø§Ù„ ÙƒØ§Ù† ÙŠÙˆÙ… ÙˆØ§Ø­Ø¯ ÙÙ‚Ø· Ù„ÙƒÙŠ Ù„Ø§ ÙŠÙ†ÙƒØ³Ø± Ø·Ù„Ø¨ Ø§Ù„Ù€ API
                          endDate: isMultiDay ? form.endDate : newDate
                        });
                      }}
                    />
                    <CalendarDays className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] pointer-events-none" size={20} />
                  </div>
                  
                  {/* Ø²Ø± Ø¥Ø¶Ø§ÙØ© Ø¥Ø¬Ø§Ø²Ø© Ù…ØªØ¹Ø¯Ø¯Ø© Ø§Ù„Ø£ÙŠØ§Ù… Ø¨ØªØµÙ…ÙŠÙ… Ø¬Ø¯ÙŠØ¯ */}
                  {!isMultiDay && (
                    <button
                      type="button"
                      onClick={() => setIsMultiDay(true)}
                      className="mt-3 w-fit px-4 py-2.5 bg-[#1a2530] border border-dashed border-[#263544] hover:border-[#C89355]/70 hover:bg-[#C89355]/10 text-[11px] font-black text-slate-400 hover:text-[#C89355] rounded-xl flex items-center gap-2 transition-all duration-300 group"
                    >
                      <div className="bg-[#263544] p-1 rounded-md group-hover:bg-[#C89355]/20 transition-colors">
                        <Plus size={14} className="group-hover:scale-110 transition-transform" />
                      </div>
                      ØªØ­Ø¯ÙŠØ¯ Ø¥Ø¬Ø§Ø²Ø© Ù„Ø£ÙƒØ«Ø± Ù…Ù† ÙŠÙˆÙ…
                    </button>
                  )}
                </div>

                {isMultiDay && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-black text-[#C89355] uppercase">Ø¥Ù„Ù‰ ØªØ§Ø±ÙŠØ®</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMultiDay(false);
                          // Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† ØªØ§Ø±ÙŠØ® Ø§Ù„Ù†Ù‡Ø§ÙŠØ© Ù„ÙŠØ·Ø§Ø¨Ù‚ Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©
                          setForm(prev => ({ ...prev, endDate: prev.startDate }));
                        }}
                        className="text-[10px] font-bold text-rose-400/80 hover:text-rose-400 transition-colors"
                      >
                        Ø¥Ù„ØºØ§Ø¡ (ÙŠÙˆÙ… ÙˆØ§Ø­Ø¯)
                      </button>
                    </div>
                    <div className="relative group">
                      <input
                        type="date" required
                        min={form.startDate}
                        className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 text-sm transition-all"
                        value={form.endDate}
                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      />
                      <CalendarDays className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] pointer-events-none" size={20} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 animate-in slide-in-from-top-3 duration-300">
                <div>
                  <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">ØªØ§Ø±ÙŠØ® Ø§Ù„ÙŠÙˆÙ…</label>
                  <div className="relative group">
                    <input
                      type="date" required
                      className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold text-xs transition-all pr-9"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                    <CalendarDays className="absolute right-3 top-3.5 text-slate-500 pointer-events-none" size={16} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">Ù…Ù† Ø§Ù„Ø³Ø§Ø¹Ø©</label>
                  <input
                    type="time" required
                    className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold text-xs transition-all text-center"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">Ø¥Ù„Ù‰ Ø§Ù„Ø³Ø§Ø¹Ø©</label>
                  <input
                    type="time" required
                    className="w-full p-3.5 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold text-xs transition-all text-center"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* â”€â”€ Ø³Ø¨Ø¨ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø© (Ø¹Ù†Ø¯ Ø§Ø®ØªÙŠØ§Ø± "Ø£Ø®Ø±Ù‰") â”€â”€ */}
            {form.leaveTypeLabel === "Ø£Ø®Ø±Ù‰" && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">Ø§Ù„Ø³Ø¨Ø¨ Ø¨Ø§Ù„ØªÙØµÙŠÙ„</label>
                <textarea
                  required
                  placeholder="ÙŠØ±Ø¬Ù‰ ÙƒØªØ§Ø¨Ø© Ø³Ø¨Ø¨ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø© Ù‡Ù†Ø§..."
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold shadow-inner min-h-24 resize-none text-sm"
                  value={form.customReason}
                  onChange={(e) => setForm({ ...form, customReason: e.target.value })}
                />
              </div>
            )}

            {/* â”€â”€ Ø­Ø§Ù„Ø© Ø§Ù„Ø£Ø¬Ø± â”€â”€ */}
            {currentConfig.isPaidLocked ? (
              <div className="flex items-start gap-3 bg-[#1a2530]/60 border border-[#263544] rounded-2xl px-4 py-3 animate-in fade-in duration-200">
                <Info size={16} className="text-[#C89355] mt-0.5 shrink-0" />
                <p className="text-xs font-bold text-slate-400 leading-relaxed">
                  {currentConfig.lockedNote}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setForm({ ...form, isPaid: !form.isPaid })}
                className="flex items-center gap-3 group w-fit"
              >
                <div className="text-[#C89355] transition-colors duration-300">
                  {form.isPaid
                    ? <CheckSquare size={24} />
                    : <Square size={24} className="text-slate-500 group-hover:text-[#C89355]" />
                  }
                </div>
                <span className="text-sm font-black text-white select-none transition-colors group-hover:text-[#C89355]">
                  {form.isPaid ? "Ø¥Ø¬Ø§Ø²Ø© Ù…Ø£Ø¬ÙˆØ±Ø©" : "Ø¥Ø¬Ø§Ø²Ø© ØºÙŠØ± Ù…Ø£Ø¬ÙˆØ±Ø©"}
                </span>
              </button>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 bg-[#1a2530]/80 border-t border-white/5 flex justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-8 py-3.5 rounded-2xl font-bold text-slate-400 bg-[#263544] hover:text-white transition-all active:scale-95 disabled:opacity-60"
          >
            Ø¥Ù„ØºØ§Ø¡
          </button>
          <button
            type="submit"
            form="leaveForm"
            disabled={isSubmitting || form.employeeIds.length === 0}
            className="bg-[#C89355] text-[#101720] px-10 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:bg-[#d0b468] active:scale-95 transition-all shadow-[0_0_20px_rgba(200,147,85,0.3)] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSubmitting
              ? "Ø¬Ø§Ø±Ù Ø§Ù„Ø­ÙØ¸..."
              : form.employeeIds.length > 1
                ? `Ø­ÙØ¸ ${form.employeeIds.length} Ø·Ù„Ø¨Ø§Øª`
                : "Ø­ÙØ¸ Ø§Ù„Ø·Ù„Ø¨"
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function LeaveRequestModal(props: Props) {
  if (!props.isOpen || typeof document === "undefined") return null;
  return <LeaveRequestModalContent key={`leave-${props.isOpen}`} {...props} />;
}
