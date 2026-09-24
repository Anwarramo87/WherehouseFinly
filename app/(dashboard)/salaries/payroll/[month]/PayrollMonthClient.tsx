"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { usePayrollPageData } from "@/hooks/usePayrollPageData";

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const toNumber = (value: unknown) => {
  if (value && typeof value === "object" && "$numberDecimal" in (value as Record<string, unknown>)) {
    return Number((value as { $numberDecimal: string }).$numberDecimal || 0);
  }
  return Number(value || 0);
};

type MonthRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  earned: number;
  discounts: number;
  net: number;
  netRounded: number;
};

export default function PayrollMonthClient() {
  const params = useParams<{ month: string }>();
  const month = typeof params?.month === "string" ? params.month : "";
  const isValidMonth = MONTH_REGEX.test(month);

  // نفس مصدر صفحة التقرير النهائي — يشمل ترقيع التعديلات اليدوية
  // (زر تعديل المجاميع) فوق أي run قديم في الباك إند.
  const { payrollData, allResignedList, resignedPayrollMap, isLoading } =
    usePayrollPageData(isValidMonth ? month : "");

  const rows = useMemo<MonthRow[]>(() => {
    const actives: MonthRow[] = payrollData.map((r) => ({
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      department: r.department,
      earned: toNumber(r.earnedSalary),
      discounts: toNumber(r.discountsTotal),
      net: toNumber(r.netPay),
      netRounded: toNumber(r.netPayRounded),
    }));
    const resigned: MonthRow[] = allResignedList.map((emp) => {
      const calc = resignedPayrollMap.get(emp.employeeId);
      return {
        employeeId: emp.employeeId,
        employeeName: emp.name,
        department: emp.department || emp.profession || "—",
        earned: toNumber(calc?.earnedSalary),
        discounts: toNumber(calc?.discountsTotal),
        net: toNumber(calc?.earnedSalary) + toNumber(calc?.bonusesTotal) - toNumber(calc?.discountsTotal),
        netRounded: toNumber(calc?.netPayRounded),
      };
    });
    return [...actives, ...resigned];
  }, [payrollData, allResignedList, resignedPayrollMap]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        earned: acc.earned + r.earned,
        discounts: acc.discounts + r.discounts,
        net: acc.net + r.net,
        netRounded: acc.netRounded + r.netRounded,
      }),
      { earned: 0, discounts: 0, net: 0, netRounded: 0 },
    );
  }, [rows]);

  if (!isValidMonth) {
    return (
      <div className="p-8" dir="rtl">
        <h1 className="text-xl font-bold text-rose-700">صيغة الشهر غير صحيحة</h1>
        <p className="text-slate-600 mt-2">استخدم الصيغة YYYY-MM مثل 2026-04</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-3" dir="rtl">
        <Loader2 className="animate-spin" size={20} />
        <span>جاري تحميل تقرير الرواتب...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-slate-50" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">تفاصيل الرواتب لشهر {month}</h1>
          <p className="text-sm text-slate-500 mt-1">
            الفترة: {month}-01 إلى {month}-{String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, "0")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/payroll" className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700">
            العودة لتقارير الرواتب
          </Link>
          <Link href={`/vouchers?month=${month}`} className="px-4 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-600">
            قسائم القبض
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">إجمالي الأجور المستحقة</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totals.earned.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">إجمالي الخصومات</p>
          <p className="text-2xl font-bold text-rose-700 mt-1">{totals.discounts.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">صافي الرواتب</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{totals.net.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">إجمالي الراتب المقبض</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {totals.netRounded.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full min-w-190 text-right">
          <thead className="bg-slate-100 text-slate-700 text-sm">
            <tr>
              <th className="p-3">كود الموظف</th>
              <th className="p-3">الاسم</th>
              <th className="p-3">القسم</th>
              <th className="p-3">الراتب المستحق</th>
              <th className="p-3">خصومات</th>
              <th className="p-3">صافي</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((item) => (
                <tr key={item.employeeId} className="border-t border-slate-100 text-sm hover:bg-slate-50">
                  <td className="p-3 font-mono">{item.employeeId}</td>
                  <td className="p-3">{item.employeeName}</td>
                  <td className="p-3">{item.department || "—"}</td>
                  <td className="p-3">{item.earned.toLocaleString()}</td>
                  <td className="p-3 text-rose-700">{item.discounts.toLocaleString()}</td>
                  <td className="p-3 font-semibold text-emerald-700">{item.net.toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-5 text-center text-slate-500" colSpan={6}>
                  لا توجد تفاصيل رواتب لهذا الشهر.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
