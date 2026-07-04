"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d1319] text-white gap-4" dir="rtl">
          <p className="text-lg font-bold text-rose-400">حدث خطأ غير متوقع</p>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-[#1a2530] border border-white/10 rounded-xl font-bold text-sm hover:bg-[#263544] transition-all"
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
