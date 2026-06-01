"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("App render error:", error);
  }, [error]);

  // error.tsx يُعرض داخل layout الموجود — لا يجوز استخدام <html> أو <body> هنا
  // فقط global-error.tsx هو من يحتاج <html><body>
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
      <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white shadow-sm p-6 text-right">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-600 mb-4">
          <AlertCircle size={22} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">حدث خطأ غير متوقع</h2>
        <p className="mt-2 text-sm text-slate-600 leading-7">
          تعذر عرض هذه الصفحة حالياً. يمكنك إعادة المحاولة الآن أو تحديث الصفحة.
        </p>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            <RefreshCcw size={16} />
            إعادة المحاولة
          </button>
          <button
            onClick={() => window.location.assign("/home")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}

