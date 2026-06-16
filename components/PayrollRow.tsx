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
    <tr style={style} className="bg-white hover:bg-slate-50 transition-colors duration-200 group/row border-b border-slate-100">
      {/* الموظف */}
      <td className="px-4 py-3 text-center">
        <div className="flex flex-col items-center">
          <span className="text-sm font-black text-slate-800">{item.employeeName}</span>
          <span className="text-[11px] text-slate-400 font-mono mt-0.5">{item.employeeId}</span>
          {item.anomalies.length > 0 && (
            <span className="text-[10px] text-amber-500 flex items-center gap-1 mt-0.5 font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" /><path d="M12 17h.01" />
              </svg> تنبيه
            </span>
          )}
        </div>
      </td>

      {/* الراتب المستحق */}
      <td className="px-4 py-3 text-center font-mono font-black text-sm text-[#263544]">
        {Math.round(item.earnedSalary).toLocaleString()}
        <span className="text-[10px] text-slate-400 block">ل.س</span>
      </td>

      {/* المكافآت */}
      <td className="px-4 py-3 text-center font-mono font-black text-sm">
        {item.bonusesTotal > 0 ? (
          <span className="text-emerald-600">+{item.bonusesTotal.toLocaleString()}</span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>

      {/* الخصومات */}
      <td className="px-4 py-3 text-center font-mono font-black text-sm text-rose-600">
        {item.discountsTotal > 0 ? (
          <span>-{item.discountsTotal.toLocaleString()}</span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>

      {/* المجموع */}
      <td className="px-4 py-3 text-center font-mono font-black text-sm text-[#263544]">
        {item.netPay.toLocaleString()}
      </td>

      {/* الراتب المقبوض */}
      <td className="px-4 py-3 text-center font-black text-base text-[#1a2530] bg-[#C89355]/5 border-l-2 border-l-[#C89355]/60">
        {item.netPayRounded.toLocaleString()}
      </td>

      {/* الفرق */}
      <td className="px-4 py-3 text-center font-mono font-black text-xs text-amber-600">
        {item.roundingDifference.toLocaleString()}
      </td>

      {/* إجراء */}
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onSelectPayslip(item)}
          className="flex items-center justify-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg bg-white text-[#C89355] hover:bg-[#C89355] hover:text-white font-bold text-xs transition-all border border-[#C89355]/30 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h6" /><path d="M12 17.5v-11" />
          </svg>
          وصل
        </button>
      </td>
    </tr>
  );
};

export default React.memo(PayrollRow, areEqual);
