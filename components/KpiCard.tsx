import React from "react";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  valueColorClass: string;
  borderColorClass: string;
  iconBgClass: string;
  iconColorClass: string;
  hoverShadowClass: string;
  iconHoverShadowClass: string;
  prefix?: string; // Optional prefix for the value (e.g., "+", "-")
  suffix?: string; // Optional suffix for the value (e.g., "ل.س")
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  valueColorClass,
  borderColorClass,
  iconBgClass,
  iconColorClass,
  hoverShadowClass,
  iconHoverShadowClass,
  prefix = "",
  suffix = "",
}) => {
  return (
    <div
      className={`relative bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-5 sm:p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] ${hoverShadowClass} hover:-translate-y-1 transition-all group`}
    >
      <div className={`absolute inset-1.5 rounded-[2.2rem] border border-dashed ${borderColorClass} pointer-events-none transition-colors`} />
      <div className="flex items-center gap-3 mb-3 sm:mb-4 relative z-10">
        <div className={`p-2.5 sm:p-3 ${iconBgClass} rounded-xl border ${borderColorClass} shadow-sm ${iconHoverShadowClass} transition-shadow shrink-0`}>
          <Icon className={iconColorClass} size={20} />
        </div>
        <p className="font-black text-[#263544] text-xs sm:text-sm leading-tight">{title}</p>
      </div>
      <div className="min-w-0 relative z-10">
        <p className={`text-2xl sm:text-3xl md:text-4xl font-black ${valueColorClass} drop-shadow-sm leading-tight break-all`}>
          {prefix}
          {value.toLocaleString()}
          {suffix ? <span className="text-sm sm:text-base opacity-70 mr-1">{suffix}</span> : null}
        </p>
      </div>
      <p className="text-[10px] text-slate-500 font-bold mt-2 relative z-10 leading-tight">
        {description}
      </p>
    </div>
  );
};

export default KpiCard;
