"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import usePayrollReport from "@/hooks/usePayrollReport";

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const toNumber = (value: unknown) => {
  if (value && typeof value === "object" && "$numberDecimal" in (value as Record<string, unknown>)) {
    return Number((value as { $numberDecimal: string }).$numberDecimal || 0);
  }
  return Number(value || 0);
};

export default function PayrollMonthClient() {
  const params = useParams<{ month: string }>();
  const month = typeof params?.month === "string" ? params.month : "";
  const isValidMonth = MONTH_REGEX.test(month);

  const { data, isLoading, isError, error } = usePayrollReport(month);

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

  if (isError) {
    return (
      <div className="p-8" dir="rtl">
        <h1 className="text-xl font-bold text-rose-700">تعذر تحميل التقرير</h1>
        <p className="text-slate-600 mt-2">{error instanceof Error ? error.message : "حدث خطأ غير متوقع"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-slate-50" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">تفاصيل الرواتب لشهر {month}</h1>
          <p className="text-sm text-slate-500 mt-1">
            الفترة: {data?.period.startDate} إلى {data?.period.endDate}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">إجمالي الأجور</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{toNumber(data?.totals.totalGrossPay).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">إجمالي الخصومات</p>
          <p className="text-2xl font-bold text-rose-700 mt-1">{toNumber(data?.totals.totalDeductions).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">صافي الرواتب</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{toNumber(data?.totals.totalNetPay).toLocaleString()}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full min-w-190 text-right">
          <thead className="bg-slate-100 text-slate-700 text-sm">
            <tr>
              <th className="p-3">كود الموظف</th>
              <th className="p-3">الاسم</th>
              <th className="p-3">القسم</th>
              <th className="p-3">إجمالي</th>
              <th className="p-3">خصومات</th>
              <th className="p-3">صافي</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.length ? (
              data.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 text-sm hover:bg-slate-50">
                  <td className="p-3 font-mono">{item.employeeId}</td>
                  <td className="p-3">{item.employeeName}</td>
                  <td className="p-3">{item.department || "—"}</td>
                  <td className="p-3">{toNumber(item.grossPay).toLocaleString()}</td>
                  <td className="p-3 text-rose-700">{toNumber(item.totalDeductions).toLocaleString()}</td>
                  <td className="p-3 font-semibold text-emerald-700">{toNumber(item.netPay).toLocaleString()}</td>
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
