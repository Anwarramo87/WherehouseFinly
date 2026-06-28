// "use client";

// import { useState, useMemo, useEffect, useRef } from "react";
// import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from "lucide-react";

// interface MonthPeriodSelectorProps {
//   value: string;
//   onChange: (period: string) => void;
//   minPeriod?: string;
//   maxPeriod?: string;
//   className?: string;
//   showCurrentBadge?: boolean;
//   selectedDate?: string;
//   onDateChange?: (date: string) => void;
// }

// export function MonthPeriodSelector({
//   value,
//   onChange,
//   minPeriod = "2020-01",
//   maxPeriod,
//   className = "",
//   showCurrentBadge = true,
//   selectedDate,
//   onDateChange,
// }: MonthPeriodSelectorProps) {
//   const currentMonth = (() => {
//     const d = new Date();
//     return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
//   })();
//   const effectiveMax = maxPeriod || currentMonth;
//   const [isOpen, setIsOpen] = useState(false);
//   const [isDayOpen, setIsDayOpen] = useState(false);
//   const [dropdownValue, setDropdownValue] = useState(value);
//   const containerRef = useRef<HTMLDivElement>(null);

//   const months = useMemo(() => {
//     const result: { value: string; label: string }[] = [];
//     const [minYear, minMonth] = minPeriod.split("-").map(Number);
//     const [maxYear, maxMonth] = effectiveMax.split("-").map(Number);

//     for (let year = maxYear; year >= minYear; year--) {
//       const startM = year === minYear ? minMonth : 12;
//       const endM = year === maxYear ? maxMonth : 12;
//       for (let month = startM; month <= endM; month++) {
//         const val = `${year}-${String(month).padStart(2, "0")}`;
//         const label = new Date(year, month - 1).toLocaleDateString("ar-SY", {
//           year: "numeric",
//           month: "long",
//         });
//         result.push({ value: val, label });
//       }
//     }
//     return result;
//   }, [minPeriod, effectiveMax]);

//   const isCurrentMonth = value === currentMonth;
//   const today = (() => {
//     const d = new Date();
//     return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
//   })();

//   const daysInMonth = useMemo(() => {
//     const [y, m] = value.split("-").map(Number);
//     const count = new Date(y, m, 0).getDate();
//     const result: { value: string; label: string }[] = [];
//     for (let d = 1; d <= count; d++) {
//       const dateStr = `${value}-${String(d).padStart(2, "0")}`;
//       const dayName = new Date(y, m - 1, d).toLocaleDateString("ar-SY", { weekday: "short" });
//       result.push({ value: dateStr, label: `${d} ${dayName}` });
//     }
//     return result;
//   }, [value]);

// const effectiveDate = selectedDate || today;

//   // Close day dropdown only when the period or date actually changes from outside
//   const prevValueRef = useRef(value);
//   const prevSelectedDateRef = useRef(selectedDate);
//   useEffect(() => {
//     const valueChanged = prevValueRef.current !== value;
//     const dateChanged = prevSelectedDateRef.current !== selectedDate;
//     prevValueRef.current = value;
//     prevSelectedDateRef.current = selectedDate;
//     if (isDayOpen && (valueChanged || dateChanged)) {
//       setIsDayOpen(false);
//     }
//   }, [value, selectedDate, isDayOpen]);

//   useEffect(() => {
//     const handleClickOutside = (e: MouseEvent) => {
//       if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
//         setIsOpen(false);
//         setIsDayOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   const handleSelect = (period: string) => {
//     setDropdownValue(period);
//     onChange(period);
//     setIsOpen(false);
//   };

//   const handleGoToday = () => {
//     const todayMonth = today.slice(0, 7);
//     if (value !== todayMonth) {
//       setDropdownValue(todayMonth);
//       onChange(todayMonth);
//     }
//     if (selectedDate !== today && onDateChange) {
//       onDateChange(today);
//     }
//   };

//   const handlePrev = () => {
//     const [year, month] = value.split("-").map(Number);
//     const prevDate = new Date(Date.UTC(year, month - 2, 1));
//     const newVal = prevDate.toISOString().slice(0, 7);
//     if (newVal >= minPeriod) {
//       handleSelect(newVal);
//     }
//   };

//   const handleNext = () => {
//     const [year, month] = value.split("-").map(Number);
//     const nextDate = new Date(Date.UTC(year, month, 1));
//     const newVal = nextDate.toISOString().slice(0, 7);
//     if (newVal <= effectiveMax) {
//       handleSelect(newVal);
//     }
//   };

//   return (
//     <div ref={containerRef} className={`relative ${className}`}>
//       <div className="flex items-center gap-2">
//         <button
//           type="button"
//           onClick={handlePrev}
//           disabled={value <= minPeriod}
//           className="p-2 text-slate-400 hover:text-[#C89355] disabled:opacity-30 disabled:cursor-not-allowed bg-white/60 backdrop-blur-sm border border-slate-200 rounded-xl transition-all active:scale-95"
//           aria-label="الشهر السابق"
//         >
//           <ChevronRight size={16} />
//         </button>

//         <div className="relative">
//           <button
//             type="button"
//             onClick={() => setIsOpen(!isOpen)}
//             className="flex items-center gap-2 min-w-45 px-3 py-2 bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 hover:shadow-md transition-all"
//           >
//             <Calendar size={16} className="text-[#C89355] shrink-0" />
//             <span className="font-mono text-sm font-black text-[#263544] flex-1 text-right">
//               {months.find((m) => m.value === dropdownValue)?.label || dropdownValue}
//             </span>
//             <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
//           </button>

//           {isOpen && (
//             <div className="absolute top-full right-0 left-0 mt-1 max-h-60 overflow-y-auto custom-scrollbar bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.15)] z-50 py-1">
//               {months.map((m) => (
//                 <button
//                   key={m.value}
//                   type="button"
//                   onClick={() => handleSelect(m.value)}
//                   className={`w-full px-3 py-2 text-right text-sm font-bold transition-all ${
//                     dropdownValue === m.value
//                       ? "bg-[#C89355] text-white"
//                       : "text-[#263544] hover:bg-slate-100"
//                   }`}
//                 >
//                   {m.label}
//                 </button>
//               ))}
//             </div>
//           )}
//         </div>

//         {onDateChange && (
//           <div className="relative">
//             <button
//               type="button"
//               onClick={() => setIsDayOpen(!isDayOpen)}
//               className="flex items-center gap-2 px-3 py-2 bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-sm hover:shadow-md transition-all"
//             >
//               <Calendar size={14} className="text-[#263544]/60 shrink-0" />
//               <span className="font-mono text-sm font-black text-[#263544]">
//                 {daysInMonth.find((d) => d.value === effectiveDate)?.label || effectiveDate}
//               </span>
//               <ChevronDown size={12} className={`text-slate-400 transition-transform ${isDayOpen ? "rotate-180" : ""}`} />
//             </button>
//             {isDayOpen && (
//               <div className="absolute top-full right-0 left-0 mt-1 max-h-60 overflow-y-auto custom-scrollbar bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.15)] z-50 py-1">
//                 {daysInMonth.map((d) => (
//                   <button
//                     key={d.value}
//                     type="button"
//                     onClick={() => {
//                       onDateChange(d.value);
//                       setIsDayOpen(false);
//                     }}
//                     className={`w-full px-3 py-2 text-right text-sm font-bold transition-all ${
//                       effectiveDate === d.value
//                         ? "bg-[#263544] text-[#C89355]"
//                         : d.value === today
//                           ? "bg-emerald-50 text-emerald-700"
//                           : "text-[#263544] hover:bg-slate-100"
//                     }`}
//                   >
//                     {d.label}
//                   </button>
//                 ))}
//               </div>
//             )}
//           </div>
//         )}

//         <button
//           type="button"
//           onClick={handleNext}
//           disabled={value >= effectiveMax}
//           className="p-2 text-slate-400 hover:text-[#C89355] disabled:opacity-30 disabled:cursor-not-allowed bg-white/60 backdrop-blur-sm border border-slate-200 rounded-xl transition-all active:scale-95"
//           aria-label="الشهر التالي"
//         >
//           <ChevronLeft size={16} />
//         </button>

//         {/* زر العودة لليوم */}
//         {onDateChange && selectedDate !== today && (
//           <button
//             type="button"
//             onClick={handleGoToday}
//             className="px-3 py-2 text-xs font-black text-white bg-[#1a2530] hover:bg-[#263544] border border-[#C89355]/40 rounded-xl transition-all active:scale-95 shadow-sm"
//           >
//             اليوم
//           </button>
//         )}
//       </div>

//       {showCurrentBadge && isCurrentMonth && (
//         <span className="absolute -top-2 left-0 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
//           الشهر الحالي
//         </span>
//       )}

//       {showCurrentBadge && value < currentMonth && (
//         <span className="absolute -top-2 left-0 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
//           📁 أرشيف
//         </span>
//       )}
//     </div>
//   );
// }




"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronRight, ChevronLeft, CalendarDays, CalendarArrowDown } from "lucide-react";

interface MonthPeriodSelectorProps {
  value: string; // YYYY-MM
  onChange: (period: string) => void;
  minPeriod?: string;
  maxPeriod?: string;
  className?: string;
  showCurrentBadge?: boolean;
  selectedDate?: string; // YYYY-MM-DD
  onDateChange?: (date: string) => void;
}

const ARABIC_MONTHS = [
  "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
  "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
];

const WEEKDAYS = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export function MonthPeriodSelector({
  value,
  onChange,
  className = "",
  selectedDate,
  onDateChange,
}: MonthPeriodSelectorProps) {
  
  const isDaily = !!(selectedDate && onDateChange);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"days" | "months" | "years">(isDaily ? "days" : "months");
  
  const [cursorDate, setCursorDate] = useState<Date>(
    new Date(isDaily ? selectedDate! : `${value}-01`)
  );

  useEffect(() => {
    if (isOpen) {
      setCursorDate(new Date(isDaily ? selectedDate! : `${value}-01`));
      setView(isDaily ? "days" : "months");
    }
  }, [isOpen, isDaily, selectedDate, value]);

  // عمل التمرير (Scroll) التلقائي للسنة المحددة عند فتح قائمة السنوات
  useEffect(() => {
    if (view === "years" && isOpen) {
      const activeYearBtn = document.getElementById(`year-btn-${cursorDate.getFullYear()}`);
      if (activeYearBtn) {
        activeYearBtn.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }, [view, isOpen, cursorDate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const todayStr = new Date().toISOString().slice(0, 10);
  
  const cursorYear = cursorDate.getFullYear();
  const cursorMonth = cursorDate.getMonth();

  // 1. النص بالأرقام الإنجليزية والأشهر العربية (مثال: 28 حزيران 2026)
  const displayText = useMemo(() => {
    const d = new Date(isDaily ? selectedDate! : `${value}-01`);
    const y = d.getFullYear();
    const m = ARABIC_MONTHS[d.getMonth()];
    if (isDaily) {
      return `${d.getDate()} ${m} ${y}`;
    }
    return `${m} ${y}`;
  }, [isDaily, selectedDate, value]);

  const handleSelectDay = (day: number) => {
    const newDate = new Date(Date.UTC(cursorYear, cursorMonth, day));
    const newDateStr = newDate.toISOString().slice(0, 10);
    if (onDateChange) onDateChange(newDateStr);
    
    const newMonthStr = newDateStr.slice(0, 7);
    if (newMonthStr !== value) onChange(newMonthStr);
    
    setIsOpen(false);
  };

  const handleSelectMonth = (monthIndex: number) => {
    const newDate = new Date(Date.UTC(cursorYear, monthIndex, 1));
    setCursorDate(newDate);
    
    if (isDaily) {
      setView("days");
    } else {
      const newMonthStr = newDate.toISOString().slice(0, 7);
      onChange(newMonthStr);
      setIsOpen(false);
    }
  };

  const handleSelectYear = (year: number) => {
    const newDate = new Date(Date.UTC(year, cursorMonth, 1));
    setCursorDate(newDate);
    setView("months");
  };

  const navigateCursor = (direction: "prev" | "next") => {
    const dir = direction === "next" ? 1 : -1;
    if (view === "days") {
      setCursorDate(new Date(Date.UTC(cursorYear, cursorMonth + dir, 1)));
    } else if (view === "months") {
      setCursorDate(new Date(Date.UTC(cursorYear + dir, cursorMonth, 1)));
    }
  };

  const renderDaysView = () => {
    const firstDay = new Date(cursorYear, cursorMonth, 1).getDay();
    const daysInMonth = new Date(cursorYear, cursorMonth + 1, 0).getDate();
    
    return (
      <div className="p-3">
        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] font-black text-slate-400">
          {WEEKDAYS.map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const currentIterDate = new Date(Date.UTC(cursorYear, cursorMonth, dayNum)).toISOString().slice(0, 10);
            const isSelected = isDaily && selectedDate === currentIterDate;
            const isToday = currentIterDate === todayStr;

            return (
              <button
                key={dayNum}
                onClick={() => handleSelectDay(dayNum)}
                className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold transition-all active:scale-90 font-mono
                  ${isSelected ? "bg-[#C89355] text-white shadow-md" : 
                    isToday ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : 
                    "text-[#263544] hover:bg-slate-100 border border-transparent"}
                `}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthsView = () => {
    return (
      <div className="grid grid-cols-3 gap-2 p-3">
        {ARABIC_MONTHS.map((monthName, index) => {
          const iterMonthStr = `${cursorYear}-${String(index + 1).padStart(2, "0")}`;
          const isSelectedMonth = (!isDaily && value === iterMonthStr) || (isDaily && selectedDate?.startsWith(iterMonthStr));
          const isCurrentMonthBox = iterMonthStr === currentMonthStr;

          return (
            <button
              key={index}
              onClick={() => handleSelectMonth(index)}
              // 2. إصلاح المسافة: py-2.5 تعطي مسافة مريحة للنص كما طلبت
              className={`py-2.5 px-1 rounded-xl text-sm font-bold transition-all
                ${isSelectedMonth ? "bg-[#C89355] text-white shadow-md" : 
                  isCurrentMonthBox ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : 
                  "text-[#263544] hover:bg-slate-100 border border-transparent"}
              `}
            >
              {monthName}
            </button>
          );
        })}
      </div>
    );
  };

  // 3. إصلاح قائمة السنوات: التمرير العمودي (Scroll) بدلاً من الشبكة
  const renderYearsView = () => {
    const currentY = new Date().getFullYear();
    const years = Array.from({ length: 40 }).map((_, i) => currentY - 20 + i); 

    return (
      <div className="max-h-[240px] overflow-y-auto custom-scrollbar flex flex-col p-1.5">
        {years.map(y => {
          const isSelectedYear = (!isDaily && value.startsWith(y.toString())) || (isDaily && selectedDate?.startsWith(y.toString()));
          const isCurrentYearBox = y === currentY;

          return (
            <button
              key={y}
              id={`year-btn-${y}`}
              onClick={() => handleSelectYear(y)}
              className={`py-2.5 px-4 text-center rounded-xl text-sm font-bold transition-all font-mono mb-1
                ${isSelectedYear ? "bg-[#C89355] text-white shadow-md" : 
                  isCurrentYearBox ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : 
                  "text-[#263544] hover:bg-slate-100 border border-transparent"}
              `}
            >
              {y}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className} w-full sm:w-auto min-w-[200px]`} dir="rtl">
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full relative group flex items-center justify-between gap-3 px-4 py-2.5 bg-white/80 backdrop-blur-xl border border-slate-200 hover:border-[#C89355]/50 rounded-2xl shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#C89355]/20"
      >
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-[#C89355]" />
          <span className="font-black text-sm text-[#263544] tracking-wide font-mono mt-0.5">
            {displayText}
          </span>
        </div>
      </button>

      {isOpen && (
        // 4. الحجم القديم: استخدام right-0 left-0 يجعل العرض يطابق عرض الزر تماماً
        <div className="absolute top-full right-0 left-0 mt-2 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-[1.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.15)] z-50 overflow-hidden transform origin-top animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100 bg-slate-50/50">
            {view !== "years" ? (
               <button onClick={() => navigateCursor("prev")} className="p-1.5 text-slate-400 hover:text-[#C89355] hover:bg-white rounded-lg transition-all"><ChevronRight size={18} /></button>
            ) : <div className="w-8" />}
            
            <div className="flex items-center gap-1">
              {view === "days" && (
                <>
                  <button onClick={() => setView("months")} className="px-2 py-1 text-sm font-black text-[#263544] hover:bg-slate-200/50 rounded-lg transition-all">
                    {ARABIC_MONTHS[cursorMonth]}
                  </button>
                  <button onClick={() => setView("years")} className="px-2 py-1 text-sm font-black text-slate-500 hover:bg-slate-200/50 rounded-lg transition-all font-mono">
                    {cursorYear}
                  </button>
                </>
              )}
              {view === "months" && (
                <button onClick={() => setView("years")} className="px-3 py-1.5 text-sm font-black text-[#263544] hover:bg-slate-200/50 rounded-lg transition-all font-mono">
                  {cursorYear}
                </button>
              )}
              {view === "years" && (
                <span className="px-2 py-1 text-sm font-black text-[#263544]">
                  اختر السنة
                </span>
              )}
            </div>

            {view !== "years" ? (
               <button onClick={() => navigateCursor("next")} className="p-1.5 text-slate-400 hover:text-[#C89355] hover:bg-white rounded-lg transition-all"><ChevronLeft size={18} /></button>
            ) : <div className="w-8" />}
          </div>

          <div className="min-h-[220px]">
            {view === "days" && renderDaysView()}
            {view === "months" && renderMonthsView()}
            {view === "years" && renderYearsView()}
          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={() => {
                if (isDaily && onDateChange) onDateChange(todayStr);
                onChange(currentMonthStr);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1a2530] text-[#C89355] hover:bg-[#263544] hover:text-white rounded-xl text-xs font-black transition-all shadow-sm"
            >
              <CalendarArrowDown size={14} />
              {isDaily ? "اليوم الحالي" : "الشهر الحالي"}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}