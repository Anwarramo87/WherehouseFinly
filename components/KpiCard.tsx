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
      className={`relative overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-white/90 rounded-[2.5rem] p-7 shadow-[0_15px_40px_rgba(38,53,68,0.06)] ${hoverShadowClass} hover:-translate-y-1 transition-all group`}
    >
      <div className={`absolute inset-1.5 rounded-[2.2rem] border border-dashed ${borderColorClass} pointer-events-none transition-colors`} />
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className={`p-3 ${iconBgClass} rounded-xl border ${borderColorClass} shadow-sm ${iconHoverShadowClass} transition-shadow`}>
          <Icon className={iconColorClass} size={22} />
        </div>
        <p className="font-black text-[#263544] text-sm">{title}</p>
      </div>
      <p className={`text-4xl font-black ${valueColorClass} relative z-10 drop-shadow-sm`}>
        {prefix}
        {value.toLocaleString()}
        {suffix}
      </p>
      <p className="text-[10px] text-slate-500 font-bold mt-2 relative z-10">
        {description}
      </p>
    </div>
  );
};

export default KpiCard;
