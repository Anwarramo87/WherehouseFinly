"use client";

import { useState, useEffect } from "react";
import { Search, Filter as FilterIcon, SlidersHorizontal } from "lucide-react";

interface FilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedDept: string;
  onDeptChange: (value: string) => void;
  departments: string[];
}

export default function Filter({ searchTerm, onSearchChange, selectedDept, onDeptChange, departments }: FilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Avoid hydration mismatch by only rendering select options after client hydration
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHydrated(true);
  }, []);

  return (
    <div className="flex flex-row-reverse items-center gap-3 w-full md:w-auto relative z-20">
      
      {/* الدائرة الداكنة مع الأيقونة الذهبية لفتح/إغلاق الفلتر */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-11 h-11 shrink-0 rounded-full bg-[#1a2530] border border-[#C89355]/40 flex items-center justify-center text-[#E7C873] shadow-[0_5px_15px_rgba(38,53,68,0.4)] hover:bg-[#263544] transition-all active:scale-95 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-2"
        title="تصفية وبحث"
      >
        <SlidersHorizontal size={18} className={isExpanded ? "rotate-90 transition-transform duration-300" : "transition-transform duration-300"} />
      </button>

      {/* الحقول المنسدلة بأنيميشن سلس */}
      <div 
        className={`flex items-center gap-3 overflow-hidden transition-all duration-500 ease-in-out origin-right ${
          isExpanded ? 'max-w-150 opacity-100 scale-100 translate-x-0' : 'max-w-0 opacity-0 scale-95 translate-x-4 pointer-events-none'
        }`}
      >
        {/* فلتر الأقسام - تم إرجاع خيارات الأقسام بشكل طبيعي */}
        <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 transition-all duration-300 hover:shadow-md group shrink-0">
          <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
          <FilterIcon size={16} className="text-[#C89355] ml-2 relative z-10" />
          <select 
            value={selectedDept}
            onChange={(e) => onDeptChange(e.target.value)}
            className="bg-transparent text-sm font-black text-[#263544] outline-none cursor-pointer appearance-none pr-2 relative z-10 min-w-20"
          >
            {/* عرض كلمة "الكل" ضمن الخيارات بشكل صحيح */}
            {isHydrated && departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* شريط البحث - تم إرجاع الـ Placeholder */}
        <div className="relative group shrink-0">
          <div className="relative overflow-hidden flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-3 py-2.5 shadow-sm transition-all duration-300 focus-within:border-[#C89355] focus-within:ring-2 focus-within:ring-[#C89355]/20 hover:shadow-md w-40 md:w-56">
            <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-focus-within:border-[#C89355]/50" />
            <Search size={18} className="text-[#C89355] ml-2 shrink-0 relative z-10" />
            <input 
              type="text" 
              placeholder="ابحث بالاسم أو الكود..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-transparent text-sm font-bold text-[#263544] outline-none transition-all w-full relative z-10 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

    </div>
  );
}