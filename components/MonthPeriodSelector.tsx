"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from "lucide-react";

interface MonthPeriodSelectorProps {
  value: string;
  onChange: (period: string) => void;
  minPeriod?: string;
  maxPeriod?: string;
  className?: string;
  showCurrentBadge?: boolean;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}

export function MonthPeriodSelector({
  value,
  onChange,
  minPeriod = "2020-01",
  maxPeriod,
  className = "",
  showCurrentBadge = true,
  selectedDate,
  onDateChange,
}: MonthPeriodSelectorProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const effectiveMax = maxPeriod || currentMonth;
  const [isOpen, setIsOpen] = useState(false);
  const [isDayOpen, setIsDayOpen] = useState(false);
  const [dropdownValue, setDropdownValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const months = useMemo(() => {
    const result: { value: string; label: string }[] = [];
    const [minYear, minMonth] = minPeriod.split("-").map(Number);
    const [maxYear, maxMonth] = effectiveMax.split("-").map(Number);

    for (let year = maxYear; year >= minYear; year--) {
      const startM = year === minYear ? minMonth : 12;
      const endM = year === maxYear ? maxMonth : 12;
      for (let month = startM; month <= endM; month++) {
        const val = `${year}-${String(month).padStart(2, "0")}`;
        const label = new Date(year, month - 1).toLocaleDateString("ar-SY", {
          year: "numeric",
          month: "long",
        });
        result.push({ value: val, label });
      }
    }
    return result;
  }, [minPeriod, effectiveMax]);

  const isCurrentMonth = value === currentMonth;
  const today = new Date().toISOString().slice(0, 10);

  const daysInMonth = useMemo(() => {
    const [y, m] = value.split("-").map(Number);
    const count = new Date(y, m, 0).getDate();
    const result: { value: string; label: string }[] = [];
    for (let d = 1; d <= count; d++) {
      const dateStr = `${value}-${String(d).padStart(2, "0")}`;
      const dayName = new Date(y, m - 1, d).toLocaleDateString("ar-SY", { weekday: "short" });
      result.push({ value: dateStr, label: `${d} ${dayName}` });
    }
    return result;
  }, [value]);

  const effectiveDate = selectedDate || today;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDropdownValue(value);
    setIsDayOpen(false);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsDayOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (period: string) => {
    setDropdownValue(period);
    onChange(period);
    setIsOpen(false);
  };

  const handlePrev = () => {
    const [year, month] = value.split("-").map(Number);
    const prevDate = new Date(Date.UTC(year, month - 2, 1));
    const newVal = prevDate.toISOString().slice(0, 7);
    if (newVal >= minPeriod) {
      handleSelect(newVal);
    }
  };

  const handleNext = () => {
    const [year, month] = value.split("-").map(Number);
    const nextDate = new Date(Date.UTC(year, month, 1));
    const newVal = nextDate.toISOString().slice(0, 7);
    if (newVal <= effectiveMax) {
      handleSelect(newVal);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrev}
          disabled={value <= minPeriod}
          className="p-2 text-slate-400 hover:text-[#C89355] disabled:opacity-30 disabled:cursor-not-allowed bg-white/60 backdrop-blur-sm border border-slate-200 rounded-xl transition-all active:scale-95"
          aria-label="الشهر السابق"
        >
          <ChevronRight size={16} />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 min-w-[180px] px-3 py-2 bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 hover:shadow-md transition-all"
          >
            <Calendar size={16} className="text-[#C89355] shrink-0" />
            <span className="font-mono text-sm font-black text-[#263544] flex-1 text-right">
              {months.find((m) => m.value === dropdownValue)?.label || dropdownValue}
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>

          {isOpen && (
            <div className="absolute top-full right-0 left-0 mt-1 max-h-60 overflow-y-auto custom-scrollbar bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.15)] z-50 py-1">
              {months.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => handleSelect(m.value)}
                  className={`w-full px-3 py-2 text-right text-sm font-bold transition-all ${
                    dropdownValue === m.value
                      ? "bg-[#C89355] text-white"
                      : "text-[#263544] hover:bg-slate-100"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {onDateChange && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDayOpen(!isDayOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-sm hover:shadow-md transition-all"
            >
              <Calendar size={14} className="text-[#263544]/60 shrink-0" />
              <span className="font-mono text-sm font-black text-[#263544]">
                {daysInMonth.find((d) => d.value === effectiveDate)?.label || effectiveDate}
              </span>
              <ChevronDown size={12} className={`text-slate-400 transition-transform ${isDayOpen ? "rotate-180" : ""}`} />
            </button>
            {isDayOpen && (
              <div className="absolute top-full right-0 left-0 mt-1 max-h-60 overflow-y-auto custom-scrollbar bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.15)] z-50 py-1">
                {daysInMonth.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => {
                      onDateChange(d.value);
                      setIsDayOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-right text-sm font-bold transition-all ${
                      effectiveDate === d.value
                        ? "bg-[#263544] text-[#C89355]"
                        : d.value === today
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-[#263544] hover:bg-slate-100"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={value >= effectiveMax}
          className="p-2 text-slate-400 hover:text-[#C89355] disabled:opacity-30 disabled:cursor-not-allowed bg-white/60 backdrop-blur-sm border border-slate-200 rounded-xl transition-all active:scale-95"
          aria-label="الشهر التالي"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {showCurrentBadge && isCurrentMonth && (
        <span className="absolute -top-2 left-0 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
          الشهر الحالي
        </span>
      )}

      {showCurrentBadge && value < currentMonth && (
        <span className="absolute -top-2 left-0 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
          📁 أرشيف
        </span>
      )}
    </div>
  );
}