import { Suspense } from "react";
import PayrollMonthClient from "./PayrollMonthClient";

export default function PayrollMonthPage() {
  return (
    <Suspense fallback={<div className="p-8 flex items-center gap-3" dir="rtl"><span>جاري تحميل...</span></div>}>
      <PayrollMonthClient />
    </Suspense>
  );
}
