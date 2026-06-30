import React from 'react';

// Assuming AggregatedPayroll is defined in a types file
interface AggregatedPayroll {
  employeeId: string;
  employeeName: string;
  department: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  netPayRounded: number;
  roundingDifference: number;
  anomalies: string[];
  earnedSalary: number;
  bonusesTotal: number;
  discountsTotal: number;
  totalEarlyLeaveMinutes?: number;
  earlyLeaveDeduction?: number;
}

interface PayrollRowProps {
  item: AggregatedPayroll;
  onSelectPayslip: (item: AggregatedPayroll) => void;
  style: React.CSSProperties;
}

const areEqual = (prevProps: PayrollRowProps, nextProps: PayrollRowProps) => {
  // For virtualization, style prop changes on every scroll, so we ignore it.
  // We only care if the actual item data has changed.
  return prevProps.item.employeeId === nextProps.item.employeeId &&
         prevProps.item.netPayRounded === nextProps.item.netPayRounded &&
         prevProps.item.anomalies.length === nextProps.item.anomalies.length;
};

const PayrollRow: React.FC<PayrollRowProps> = ({ item, onSelectPayslip, style }) => {
  return (
    <tr 
      style={style} 
      className="bg-white hover:bg-slate-50/70 transition-colors duration-150 group/row border-b border-slate-200"
    >
      {/* الموظف - Employee */}
      <td className="px-4 py-3 border-l border-slate-200">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-slate-800 truncate" title={item.employeeName}>
            {item.employeeName}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {item.employeeId}
          </span>
          {item.anomalies.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 w-fit">
              <svg xmlns="http://www.w3.org/2000/svg" width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
              تنبيه
            </span>
          )}
        </div>
      </td>

      {/* الراتب المستحق - Due Salary */}
      <td className="px-4 py-3 border-l border-slate-200 text-center">
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold text-slate-800 font-mono">
            {Math.round(item.earnedSalary).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            ل.س
          </span>
        </div>
      </td>

      {/* المكافآت - Bonuses */}
      <td className="px-4 py-3 border-l border-slate-200 text-center">
        {item.bonusesTotal > 0 ? (
          <span className="text-sm font-semibold text-emerald-600 font-mono">
            +{item.bonusesTotal.toLocaleString()}
          </span>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </td>

      {/* الخصومات - Deductions */}
      <td className="px-4 py-3 border-l border-slate-200 text-center">
        {item.discountsTotal > 0 ? (
          <span className="text-sm font-semibold text-rose-600 font-mono">
            -{item.discountsTotal.toLocaleString()}
          </span>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </td>

      {/* المجموع - Total */}
      <td className="px-4 py-3 border-l border-slate-200 text-center">
        <span className="text-sm font-semibold text-slate-800 font-mono">
          {item.netPay.toLocaleString()}
        </span>
      </td>

      {/* الراتب المقبوض - Net Salary (highlighted) */}
      <td className="px-4 py-3 bg-gradient-to-b from-[#C89355]/10 to-[#C89355]/5 border-l-2 border-l-[#C89355]/50 text-center">
        <div className="flex flex-col items-center gap-1">
          <span className="text-base font-bold text-[#1a2530] font-mono">
            {item.netPayRounded.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-600 font-medium">
            ل.س
          </span>
        </div>
      </td>

      {/* الفرق - Difference */}
      <td className="px-4 py-3 border-l border-slate-200 text-center">
        <span className="text-xs font-semibold text-amber-600 font-mono">
          {item.roundingDifference.toLocaleString()}
        </span>
      </td>

      {/* إجراء - Action */}
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onSelectPayslip(item)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white text-[#C89355] hover:bg-[#C89355] hover:text-white font-semibold text-xs transition-all duration-150 border border-[#C89355]/40 hover:border-[#C89355] hover:shadow-md active:scale-95 whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h6" />
            <path d="M12 17.5v-11" />
          </svg>
          وصل
        </button>
      </td>
    </tr>
  );
};

export default React.memo(PayrollRow, areEqual);
