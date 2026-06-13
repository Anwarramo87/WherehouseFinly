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
    <tr style={style} className="bg-white/40 hover:bg-white/90 transition-all duration-300 group/row hover:scale-[1.002] hover:shadow-sm">
      {/* الموظف: الاسم + الكود + التنبيهات */}
      <td className="p-4 text-center font-black text-slate-800 group-hover/row:text-[#263544] transition-colors">
        <div className="flex flex-col items-center">
          <span className="text-base">{item.employeeName}</span>
          <span className="text-xs text-slate-400 font-mono mt-0.5">{item.employeeId}</span>
          {item.anomalies.length > 0 && (
            <span className="text-[10px] text-amber-500 flex items-center gap-1 mt-1 font-bold">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={10}
                height={10}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg> تنبيه حسابي
            </span>
          )}
        </div>
      </td>

      {/* الراتب المستحق — من الدوام (ساعات × معدل الساعة) */}
      <td className="p-4 text-center font-mono font-black text-[#263544]">
        <span>{Math.round(item.earnedSalary).toLocaleString()}</span>
        <span className="text-[10px] text-slate-400 block">ل.س</span>
      </td>

      {/* المكافآت — مجموع bonusAmount + assistanceAmount من صفحة المكافآت */}
      <td className="p-4 text-center font-mono font-black">
        {item.bonusesTotal > 0 ? (
          <span className="text-emerald-600">
            +{item.bonusesTotal.toLocaleString()}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>

      {/* الخصومات — مجموع السلف والعقوبات من صفحة الخصومات */}
      <td className="p-4 text-center font-mono font-black text-rose-600 bg-rose-50/30">
        {item.discountsTotal > 0 ? (
          <span>-{item.discountsTotal.toLocaleString()}</span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>

      {/* المجموع = الراتب المستحق + المكافآت - الخصومات */}
      <td className="p-4 text-center font-mono font-black text-[#263544]">
        {item.netPay.toLocaleString()}
      </td>

      {/* الراتب المقبوض — مقرب لأقرب ألف */}
      <td className="p-4 text-center font-black text-xl text-[#1a2530] bg-linear-to-l from-[#C89355]/10 to-transparent shadow-inner border-l-4 border-l-[#C89355]">
        {item.netPayRounded.toLocaleString()}
      </td>

      {/* الفرق = الراتب المقبوض - المجموع */}
      <td className="p-4 text-center font-mono font-black text-amber-600 bg-amber-50/30">
        {item.roundingDifference.toLocaleString()}
      </td>

      {/* إجراء */}
      <td className="p-4 text-center">
        <button
          onClick={() => onSelectPayslip(item)}
          className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-xl bg-white text-[#C89355] hover:bg-[#C89355] hover:text-white font-bold text-xs transition-all shadow-sm border border-[#C89355]/30 active:scale-95 group/btn"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover/btn:scale-110 transition-transform"
          >
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h6" />
            <path d="M12 17.5v-11" />
          </svg>
          عرض الوصل
        </button>
      </td>
    </tr>
  );
};

export default React.memo(PayrollRow, areEqual);
